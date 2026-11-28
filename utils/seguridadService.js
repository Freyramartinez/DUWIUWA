'use strict';
/**
 * Servicio de Seguridad Pública: reemplaza el flujo "Encriptacion" de Node-RED.
 *  - MQTT (alertas y estado cifrados AES-256-GCM) + órdenes a la pulsera
 *  - Lector de la puerta: por puerto serial local (opcional) o por POST desde Node-RED (/api/app/puerta)
 *  - Máquina de estados: emergencia -> llegó (espera confirmación) -> a salvo
 *  - WhatsApp (CallMeBot) con límite de frecuencia
 *  - Eventos en tiempo real para el panel (EventEmitter -> SSE en el controlador)
 *  - API para la aplicación móvil (signos vitales en vivo, SOS y cancelación por PIN)
 */
const crypto = require('crypto');
const EventEmitter = require('events');

const env = process.env;
const cfg = {
  mqttUrl: env.MQTT_URL || 'mqtt://broker.hivemq.com:1883',
  topicAlertas: env.MQTT_TOPIC_ALERTAS || 'instituto/mujer/alertas',
  topicEstado: env.MQTT_TOPIC_ESTADO || 'instituto/mujer/estado',
  topicCmd: env.MQTT_TOPIC_CMD || 'instituto/mujer/cmd/pulsera/shero26',
  keyHex: (env.SHIELD_KEY_HEX || '').trim(),
  serialPath: env.SERIAL_PORT || '',
  serialBaud: Number(env.SERIAL_BAUD) || 115200,
  nombreDefault: env.NOMBRE_DEFAULT || 'Julieta',
  pulseras: (env.PULSERAS || env.NOMBRE_DEFAULT || 'Julieta').split(',').map(s => s.trim()).filter(Boolean),
  sinAlertaMs: Number(env.SIN_ALERTA_MS) || 30 * 1000,         // sin PANICO durante este tiempo -> vuelve a normal
  avisoOkMs: Number(env.AVISO_OK_MS) || 2 * 60 * 1000,          // cuánto dura el aviso verde
  ignorarSosMs: 10 * 1000,                                      // ignora SOS atrasados tras la confirmación
  waIntervaloMs: Number(env.WA_INTERVALO_MS) || 3 * 60 * 1000,  // mínimo entre WhatsApp de emergencia
  puertaTtlMs: Number(env.PUERTA_TTL_MS) || 5 * 60 * 1000,      // sin datos del lector durante este tiempo -> "Desconectado"
  waContactos: (env.WA_CONTACTOS || '').split(',').map(s => s.trim()).filter(Boolean)
    .map(c => { const [telefono, apikey] = c.split(':'); return { telefono, apikey }; }),
  mapLat: Number(env.MAP_LAT) || 20.2274,
  mapLon: Number(env.MAP_LON) || -99.2281,
  tz: env.APP_TZ || 'America/Mexico_City'
};

const bus = new EventEmitter();
bus.setMaxListeners(0);

let KEY = null;
let cliente = null;
let mqttOk = false;
let serialOk = false;
let iniciado = false;
let ultimoWA = 0;
let ultimaPuerta = 0;          // última vez que llegó algo del lector (serial o Node-RED)
let puertaVivaPrev = false;
let S = null;

// ---------------------------------------------------------------- utilidades
const hora = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: cfg.tz });
const horaCorta = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: cfg.tz });
const activa = q => q.situacion === 'emergencia' || q.situacion === 'llego_espera';
const puertaViva = () => ultimaPuerta > 0 && (Date.now() - ultimaPuerta) < cfg.puertaTtlMs;

function reiniciarEstado() {
  S = { usuarias: {}, historial: [], detecciones: [], puerta: 'Esperando conexión del lector de la puerta', aviso: null, ultimo: null };
}

function persona(nombre) {
  if (!S.usuarias[nombre]) {
    S.usuarias[nombre] = {
      nombre, situacion: 'normal', nota: 'Sin alertas', hora: hora(),
      pulso: 0, oxigeno: 0, mov: 0, ax: 0, ay: 0, az: 0, lat: 0, lon: 0,
      bat: 0, ultimaLectura: 0,
      silencioHasta: 0, ackPulsera: false, tEspera: 0,
      conPulsera: cfg.pulseras.includes(nombre), tLlegada: 0, tPanico: 0,
      horaAlerta: '', horaLlegada: '', horaConfirma: ''
    };
  }
  return S.usuarias[nombre];
}

function registrar(nombre, texto, nivel) {
  S.historial.unshift({ hora: hora(), nombre, texto, nivel });
  if (S.historial.length > 30) S.historial.length = 30;
}

// Lista de personas detectadas por el lector en la puerta (tipo: alerta | pulsera | otra)
function registrarDeteccion(nombre, tipo) {
  S.detecciones.unshift({ nombre, hora: hora(), tipo, t: Date.now() });
  if (S.detecciones.length > 15) S.detecciones.length = 15;
}

function descifrar(payload) {
  const raw = Buffer.from(String(payload).trim(), 'base64');
  if (raw.length < 29) throw new Error('mensaje muy corto');
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  const txt = Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
  return JSON.parse(txt);
}

function publicarCmd(nombre, cmd) {
  if (!cliente || !mqttOk) return;
  cliente.publish(cfg.topicCmd, JSON.stringify({ comando: cmd, nombre }), { qos: 1, retain: false });
}

// ------------------------------------------------------------------ WhatsApp
async function enviarWhatsApp(d) {
  if (!cfg.waContactos.length) return;
  if (d.tipo !== 'LLEGADA') {                       // límite de frecuencia solo para emergencias
    const t = Date.now();
    if (t - ultimoWA < cfg.waIntervaloMs) return;
    ultimoWA = t;
  }
  let texto;
  if (d.tipo === 'LLEGADA') {
    texto = `AVISO DE SEGURIDAD\n\n${d.nombre} llegó a la Instancia de la Mujer y se encuentra a salvo.\n\nHora: ${horaCorta()}`;
  } else {
    let nivel = '';
    if (d.bpm > 140) nivel = ' (muy acelerado)';
    else if (d.bpm > 100) nivel = ' (acelerado)';
    else if (d.bpm > 0) nivel = ' (normal)';
    const ubic = (d.lat && d.lon) ? `https://maps.google.com/?q=${d.lat},${d.lon}` : 'Todavía no disponible';
    texto = `ALERTA DE EMERGENCIA\n\nLa pulsera de ${d.nombre} se activó. Puede estar en peligro.\n\n` +
      `Motivo: ${d.motivo}\nHora: ${horaCorta()}\n` +
      (d.bpm > 0 ? `Pulso: ${d.bpm} latidos por minuto${nivel}\n` : '') +
      `Ubicación: ${ubic}\n\nPor favor comunícate con ella o llama al 911.`;
  }
  const base = 'https://api.callmebot.com/whatsapp.php?text=' + encodeURIComponent(texto);
  for (const c of cfg.waContactos) {
    try {
      const r = await fetch(`${base}&phone=${c.telefono}&apikey=${c.apikey}`);
      console.log(`[seguridad] WhatsApp ${d.tipo} -> ${c.telefono}: HTTP ${r.status}`);
    } catch (e) {
      console.warn('[seguridad] WhatsApp falló:', e.message);
    }
  }
}

// ------------------------------------------------------- snapshot para el panel
const ETIQ = { emergencia: 'Necesita ayuda', llego_espera: 'Llegó, falta confirmar', a_salvo: 'A salvo' };
const PASOS = ['Alerta recibida', 'Llegó a la Instancia', 'La pulsera confirmó'];
const pasos = (hecho, activo, horas = []) => PASOS.map((t, i) => ({
  n: i + 1, txt: t, est: i < hecho ? 'hecho' : (i === activo ? 'activo' : 'pend'), hora: horas[i] || ''
}));
const nombres = arr => arr.join(' y ');

function snapshot() {
  const todas = Object.values(S.usuarias);
  const lista = todas.filter(q => q.conPulsera).map(q => ({
    nombre: q.nombre,
    estado: q.situacion,
    situacion: activa(q) ? 'emergencia' : q.situacion,
    etiqueta: ETIQ[q.situacion] || 'Sin alertas',
    texto: `${q.nota}, ${q.hora}`,
    pulso: q.pulso, oxigeno: q.oxigeno, mov: q.mov, ax: q.ax, ay: q.ay, az: q.az,
    lat: q.lat, lon: q.lon, bat: q.bat, ultimaLectura: q.ultimaLectura,
    horaAlerta: q.horaAlerta, horaLlegada: q.horaLlegada, horaConfirma: q.horaConfirma
  })).sort((a, b) => (b.situacion === 'emergencia') - (a.situacion === 'emergencia'));

  const otras = todas.filter(q => !q.conPulsera && q.tLlegada)
    .sort((a, b) => b.tLlegada - a.tLlegada).slice(0, 5)
    .map(q => ({ nombre: q.nombre, hora: q.hora }));

  const de = est => lista.filter(x => x.estado === est).map(x => x.nombre);
  const enEmer = de('emergencia');
  const enLleg = de('llego_espera');

  let banner;
  if (enEmer.length) {
    const q0 = S.usuarias[enEmer[0]];
    banner = {
      nivel: 'alerta', icono: '!', etiqueta: 'Emergencia en curso',
      titulo: nombres(enEmer) + (enEmer.length > 1 ? ' necesitan ayuda' : ' necesita ayuda'),
      detalle: `${q0.nota}, ${q0.hora}. Su ubicación se actualiza en el mapa.`,
      accion: 'Comuníquese con ella o llame al 911.',
      debe: enEmer.join(' y '), pasos: pasos(1, 1, [q0.horaAlerta])
    };
  } else if (enLleg.length) {
    const q0 = S.usuarias[enLleg[0]];
    const conAck = enLleg.every(n => S.usuarias[n].ackPulsera);
    banner = {
      nivel: 'llegada', icono: '2', etiqueta: 'Llegada detectada · falta confirmación de la pulsera',
      titulo: nombres(enLleg) + (enLleg.length > 1 ? ' ya están aquí' : ' ya está aquí'),
      detalle: `Su pulsera fue leída en la puerta a las ${q0.horaLlegada}. ` + (conAck ? 'La pulsera ya recibió el aviso.' : 'Esperando a la pulsera...'),
      accion: 'Su alarma sigue activa. Pídale que mantenga el botón de la pulsera 3 segundos para confirmar que está bien.',
      pasos: pasos(2, 2, [q0.horaAlerta, q0.horaLlegada])
    };
  } else if (S.aviso && S.aviso.tipo === 'segura') {
    const a = S.aviso;
    banner = a.porApp ? {
      nivel: 'ok', icono: '✓', etiqueta: 'Alarma cancelada',
      titulo: `${a.nombre} está segura y a salvo`,
      detalle: `Canceló la alarma con su PIN desde la app a las ${a.hora}.`
    } : {
      nivel: 'ok', icono: '✓', etiqueta: 'Llegada confirmada',
      titulo: `${a.nombre} está segura y a salvo`,
      detalle: (a.porUsuaria ? 'La pulsera confirmó y la alarma fue cancelada' : 'La alarma se apagó desde la pulsera') + ` a las ${a.hora}.`,
      pasos: pasos(3, -1, a.horas || [])
    };
  } else if (S.aviso && S.aviso.tipo === 'llegada') {
    banner = {
      nivel: 'ok', icono: '✓', etiqueta: 'Llegada',
      titulo: `${S.aviso.nombre} llegó a la Instancia`,
      detalle: `Se encuentra a salvo. Llegó a las ${S.aviso.hora}.`
    };
  } else {
    banner = { nivel: 'calma', icono: '✓', etiqueta: 'Todo en orden', titulo: 'Sin alertas activas', detalle: 'Todas las personas monitoreadas están tranquilas.' };
  }

  let otrasNota = 'Pasaron por la puerta. No tienen alerta.';
  if (enEmer.length) {
    otrasNota = (otras.length > 1 ? 'Ninguna es ' : 'No es ') + enEmer.join(' ni ') + '. ' +
      enEmer.join(' y ') + (enEmer.length > 1 ? ' todavía no llegan.' : ' todavía no llega.');
  } else if (enLleg.length) {
    otrasNota = 'No son la persona en alerta.';
  }

  const foco = lista.find(x => x.situacion === 'emergencia') || lista.find(x => x.nombre === S.ultimo) || lista[0] || null;

  return {
    banner, usuarias: lista, otras, otrasNota, puerta: S.puerta,
    detecciones: S.detecciones.slice(0, 10).map(d => ({ nombre: d.nombre, hora: d.hora, tipo: d.tipo })),
    historial: S.historial.slice(0, 20), foco,
    conexion: {
      mqtt: mqttOk,
      serial: cfg.serialPath ? serialOk : (puertaViva() ? true : (ultimaPuerta ? false : null)),
      puertaHora: ultimaPuerta || null
    },
    centro: { lat: cfg.mapLat, lon: cfg.mapLon }
  };
}

function emitir() {
  if (bus.listenerCount('estado') > 0) bus.emit('estado', snapshot());
}

// ------------------------------------------------------------------ handlers
function onTelemetria(d) {
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
  if (!d || typeof d !== 'object') return;

  const ahora = Date.now();
  const nombre = d.nombre || d.Nombre || d.usuaria || cfg.nombreDefault;
  const u = persona(nombre);
  u.conPulsera = true;

  const bpm = parseInt(d.bpm || d.BPM || 0) || 0;
  const spo2 = parseInt(d.spo2 || d.SPO2 || d.SpO2 || d.oxigeno || 0) || 0;
  const ax = parseFloat(d.AccX || d.ax || 0) || 0;
  const ay = parseFloat(d.AccY || d.ay || 0) || 0;
  const az = parseFloat(d.AccZ || d.az || 0) || 0;
  let acel = parseFloat(d.acel || 0) || 0;
  if (!acel && (ax || ay || az)) acel = Math.sqrt(ax * ax + ay * ay + az * az);
  const lat = parseFloat(d.lat || d.Lat || 0) || 0;
  const lon = parseFloat(d.lon || d.Lon || 0) || 0;

  const panico = (d.SOS === 1 || d.tipo === 'PANICO' || acel > 2.5);
  if (panico && ahora < u.silencioHasta) return;      // SOS atrasado tras la confirmación

  u.pulso = bpm; u.oxigeno = spo2; u.mov = acel; u.ax = ax; u.ay = ay; u.az = az;
  if (d.bat !== undefined) u.bat = Number(d.bat);
  u.ultimaLectura = ahora;
  if (lat && lon) { u.lat = lat; u.lon = lon; }
  S.ultimo = nombre;

  if (panico) {
    u.tPanico = ahora;
    const motivo = (acel > 2.5) ? 'Movimiento brusco (posible caída o forcejeo)' : 'Botón de pánico';
    if (!activa(u)) {                                  // emergencia nueva
      u.situacion = 'emergencia'; u.ackPulsera = false; u.hora = hora();
      u.horaAlerta = u.hora; u.horaLlegada = ''; u.horaConfirma = '';
      S.aviso = null;
      registrar(nombre, 'Alerta de emergencia: ' + motivo.toLowerCase(), 'alto');
    }
    if (u.situacion === 'emergencia') {                // en "llegó" no se repite el WhatsApp
      u.nota = motivo; u.hora = hora();
      enviarWhatsApp({ tipo: 'EMERGENCIA', nombre, bpm, lat: u.lat, lon: u.lon, motivo });
    }
  }

  bus.emit('telemetria', { nombre, bpm, spo2, acel, ax, ay, az, bat: u.bat, t: ahora });
  emitir();
}

function onLlegada(n) {
  const ahora = Date.now();
  const p = persona(n);
  if (p.situacion === 'emergencia') {
    p.situacion = 'llego_espera'; p.ackPulsera = false; p.tEspera = ahora; p.hora = hora();
    p.horaLlegada = p.hora;
    p.nota = 'Llegó a la Instancia, esperando que confirme con su pulsera';
    registrarDeteccion(n, 'alerta');
    registrar(n, 'Llegó a la Instancia. La alarma sigue activa: falta que confirme con su pulsera', 'alto');
    publicarCmd(n, 'LLEGADA');
  } else if (p.situacion === 'llego_espera') {
    // lectura repetida del TAG: no se hace nada
  } else if (!p.conPulsera) {
    if (ahora - p.tLlegada > 30000) {
      const hayAlerta = Object.values(S.usuarias).some(activa);
      p.situacion = 'a_salvo'; p.nota = 'Llegó a la Instancia'; p.hora = hora(); p.tLlegada = ahora;
      registrarDeteccion(n, 'otra');
      registrar(n, hayAlerta ? 'Llegó a la Instancia. No es la persona en alerta' : 'Llegó a la Instancia', 'info');
    }
  } else {
    p.situacion = 'a_salvo'; p.nota = 'Llegó a la Instancia'; p.hora = hora(); p.tLlegada = ahora;
    p.horaLlegada = p.hora;
    S.aviso = { nivel: 'ok', tipo: 'llegada', nombre: n, hora: hora(), t: ahora };
    registrarDeteccion(n, 'pulsera');
    registrar(n, 'Llegó a la Instancia de la Mujer', 'ok');
    enviarWhatsApp({ tipo: 'LLEGADA', nombre: n });
  }
  emitir();
}

function onEstado(ev) {
  const ahora = Date.now();
  const en = ev.nombre || ev.Nombre || cfg.nombreDefault;
  const qe = persona(en);
  qe.conPulsera = true;
  if (ev.evento === 'LLEGADA_RECIBIDA') {
    if (qe.situacion === 'llego_espera' && !qe.ackPulsera) {
      qe.ackPulsera = true; qe.hora = hora();
      qe.nota = 'La pulsera recibió el aviso; falta que mantenga el botón 3 s';
      registrar(en, 'La pulsera recibió el aviso de llegada', 'info');
    }
  } else if (ev.evento === 'CANCELADA') {
    if (activa(qe)) {
      const porUsuaria = (ev.por === 'usuaria');
      qe.situacion = 'a_salvo'; qe.hora = hora(); qe.ackPulsera = false;
      qe.horaConfirma = qe.hora;
      qe.silencioHasta = ahora + cfg.ignorarSosMs;
      qe.nota = porUsuaria ? 'La pulsera confirmó: alarma cancelada' : 'Alarma cancelada desde la pulsera';
      S.aviso = { nivel: 'ok', tipo: 'segura', nombre: en, hora: hora(), porUsuaria, t: ahora,
        horas: [qe.horaAlerta, qe.horaLlegada, qe.horaConfirma] };
      registrar(en, porUsuaria ? 'La pulsera confirmó: alarma cancelada por la usuaria'
        : 'La pulsera confirmó el apagado de la alarma', 'ok');
      if (porUsuaria) enviarWhatsApp({ tipo: 'LLEGADA', nombre: en });
    }
  }
  emitir();
}

function onPuerta(d) {
  const t = String(d.Estado || '');
  if (t.includes('Listo')) S.puerta = 'El lector de la puerta está conectado y funcionando';
  else if (t.includes('Sin TAG')) S.puerta = 'Esperando que alguien se acerque a la puerta';
  else S.puerta = t.slice(0, 120);
  emitir();
}

// Entrada única para todo lo que viene del lector de la puerta
// (puerto serial local o POST de Node-RED en /api/app/puerta)
function recibirPuerta(d) {
  if (!d || typeof d !== 'object') return;
  // Solo cuenta como "lector vivo" un mensaje real del lector (trae Estado).
  // Cualquier otro JSON se ignora para no mostrar "Activo" sin que el lector haya hablado.
  if (!d.Estado) return;
  ultimaPuerta = Date.now();
  const nombre = d.Nombre ? String(d.Nombre).trim().slice(0, 60) : '';
  if (d.Estado === 'A salvo' && nombre) onLlegada(nombre);
  else onPuerta(d);
}

function revisar() {
  const ahora = Date.now();
  let cambio = false;
  let cmdPend = null;
  Object.values(S.usuarias).forEach(q => {
    if (!activa(q)) return;
    if (ahora - (q.tPanico || 0) > cfg.sinAlertaMs) {
      q.situacion = 'normal'; q.ackPulsera = false; q.nota = 'Sin alertas'; q.hora = hora();
      S.aviso = null;
      registrar(q.nombre, 'La alerta terminó: la pulsera dejó de enviar el aviso de pánico', 'info');
      cambio = true;
      return;
    }
    if (q.situacion === 'llego_espera' && !cmdPend) cmdPend = q.nombre;
  });
  if (S.aviso && ahora - (S.aviso.t || 0) > cfg.avisoOkMs) { S.aviso = null; cambio = true; }
  const vivaAhora = puertaViva();
  if (vivaAhora !== puertaVivaPrev) { puertaVivaPrev = vivaAhora; cambio = true; }
  if (cmdPend) publicarCmd(cmdPend, 'LLEGADA');
  if (cmdPend || cambio) emitir();
}

const seguro = fn => (...args) => {
  try { return fn(...args); } catch (e) { console.error('[seguridad] error en handler:', e); }
};

// ------------------------------------------------------------- conexiones
function iniciarMqtt() {
  if (!/^[0-9a-fA-F]{64}$/.test(cfg.keyHex)) {
    console.error('[seguridad] SHIELD_KEY_HEX debe tener 64 caracteres hexadecimales. MQTT desactivado.');
    return;
  }
  KEY = Buffer.from(cfg.keyHex, 'hex');
  const mqtt = require('mqtt');
  cliente = mqtt.connect(cfg.mqttUrl, { reconnectPeriod: 5000, clean: true });

  cliente.on('connect', () => {
    mqttOk = true;
    cliente.subscribe({ [cfg.topicAlertas]: { qos: 2 }, [cfg.topicEstado]: { qos: 1 } }, err => {
      if (err) console.error('[seguridad] suscripción MQTT falló:', err.message);
    });
    console.log('[seguridad] MQTT conectado');
    emitir();
  });
  cliente.on('close', () => { mqttOk = false; emitir(); });
  cliente.on('error', e => console.warn('[seguridad] MQTT error:', e.message));

  cliente.on('message', seguro((topic, payload) => {
    let d;
    try { d = descifrar(payload); } catch (e) { console.warn('[seguridad] Mensaje inválido o alterado:', e.message); return; }
    if (topic === cfg.topicAlertas) onTelemetria(d);
    else if (topic === cfg.topicEstado && d && typeof d === 'object' && d.evento) onEstado(d);
  }));
}

let timerSerial = null;
function iniciarSerial() {
  if (!cfg.serialPath) return;
  let SerialPort, ReadlineParser;
  try {
    ({ SerialPort } = require('serialport'));
    ({ ReadlineParser } = require('@serialport/parser-readline'));
  } catch (e) {
    console.error('[seguridad] serialport no instalado; lector de puerta desactivado');
    return;
  }
  const reconectar = () => {
    serialOk = false; emitir();
    if (!timerSerial) timerSerial = setTimeout(() => { timerSerial = null; iniciarSerial(); }, 5000);
  };
  const port = new SerialPort({ path: cfg.serialPath, baudRate: cfg.serialBaud });
  port.on('open', () => { serialOk = true; console.log('[seguridad] Serial abierto en', cfg.serialPath); emitir(); });
  port.on('close', reconectar);
  port.on('error', e => { console.warn('[seguridad] Serial error:', e.message); reconectar(); });

  port.pipe(new ReadlineParser({ delimiter: '\n' })).on('data', seguro(linea => {
    const s = String(linea).trim();
    if (s.charAt(0) !== '{') return;
    let d;
    try { d = JSON.parse(s); } catch (e) { return; }
    recibirPuerta(d);
  }));
}

function start() {
  if (iniciado) return;
  iniciado = true;
  reiniciarEstado();
  iniciarMqtt();
  iniciarSerial();
  setInterval(seguro(revisar), 10 * 1000);
}

// -------------------------------------------------- acciones desde la App Móvil
function activarDesdeApp(nombre = cfg.nombreDefault, lat = 0, lon = 0) {
  const ahora = Date.now();
  const u = persona(nombre);
  u.conPulsera = true;
  u.tPanico = ahora;
  if (lat && lon) { u.lat = Number(lat); u.lon = Number(lon); }
  if (!activa(u)) {
    u.situacion = 'emergencia';
    u.ackPulsera = false;
    u.hora = hora();
    u.horaAlerta = u.hora; u.horaLlegada = ''; u.horaConfirma = '';
    S.aviso = null;
    registrar(nombre, 'Alerta SOS activada desde la aplicación móvil', 'alto');
  }
  u.nota = 'Botón de pánico (App Móvil)';
  S.ultimo = nombre;
  enviarWhatsApp({ tipo: 'EMERGENCIA', nombre, bpm: u.pulso, lat: u.lat, lon: u.lon, motivo: u.nota });
  emitir();
}

function cancelarDesdeApp(nombre = cfg.nombreDefault) {
  const ahora = Date.now();
  const u = persona(nombre);
  if (activa(u)) {
    u.situacion = 'a_salvo';
    u.hora = hora();
    u.ackPulsera = false;
    u.silencioHasta = ahora + cfg.ignorarSosMs;
    u.nota = 'Alarma cancelada con PIN desde la app';
    S.aviso = { nivel: 'ok', tipo: 'segura', nombre, hora: hora(), porUsuaria: true, porApp: true, t: ahora };
    registrar(nombre, 'La usuaria canceló la alerta con su PIN desde la app', 'ok');
    enviarWhatsApp({ tipo: 'LLEGADA', nombre });
    emitir();
  }
}

reiniciarEstado();

module.exports = {
  start,
  snapshot,
  bus,
  centro: () => ({ lat: cfg.mapLat, lon: cfg.mapLon }),
  recibirPuerta,
  activarDesdeApp,
  cancelarDesdeApp
};