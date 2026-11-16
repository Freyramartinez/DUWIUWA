const svc = require('../utils/seguridadService');

exports.panel = (req, res) => {
  res.render('seguridad', {
    titulo: 'Seguridad Pública',
    rol: 'Seguridad Pública',
    nombre: req.session.user ? req.session.user.nombre : 'Central',
    usuario: req.session.user,
    centro: svc.centro()
  });
};

// Foto del estado actual (útil para pruebas y como respaldo)
exports.estadoAlerta = (req, res) => {
  res.json(svc.snapshot());
};

// Tiempo real: Server-Sent Events (el navegador reconecta solo)
exports.eventos = (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  const enviar = (evento, datos) => {
    res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);
    if (typeof res.flush === 'function') res.flush();   // por si hay compression()
  };

  enviar('estado', svc.snapshot());
  const onEstado = s => enviar('estado', s);
  const onTelemetria = t => enviar('telemetria', t);
  svc.bus.on('estado', onEstado);
  svc.bus.on('telemetria', onTelemetria);

  const latido = setInterval(() => { res.write(': ping\n\n'); }, 25000);

  req.on('close', () => {
    clearInterval(latido);
    svc.bus.off('estado', onEstado);
    svc.bus.off('telemetria', onTelemetria);
  });
};