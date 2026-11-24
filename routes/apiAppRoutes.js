'use strict';
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const svc = require('../utils/seguridadService');

router.get('/estado', (req, res) => {
  const snap = svc.snapshot();
  const usuaria = snap.foco || {
    nombre: 'Julieta',
    estado: 'normal',
    situacion: 'normal',
    pulso: 0,
    oxigeno: 0,
    mov: 0,
    bat: 0,
    ultimaLectura: 0,
    lat: snap.centro.lat,
    lon: snap.centro.lon
  };
  res.json({
    ok: true,
    conectado: snap.conexion.mqtt,
    usuaria,
    historial: snap.historial
  });
});

router.post('/sos', (req, res) => {
  const { nombre, lat, lon } = req.body || {};
  svc.activarDesdeApp(nombre || 'Julieta', lat, lon);
  res.json({ ok: true, mensaje: 'Alerta enviada a Seguridad Pública' });
});

router.post('/cancelar', (req, res) => {
  const { nombre } = req.body || {};
  svc.cancelarDesdeApp(nombre || 'Julieta');
  res.json({ ok: true, mensaje: 'Alerta cancelada correctamente' });
});

// Lector de la puerta: Node-RED reenvía aquí lo que recibe del coordinador (COM13).
// Requiere la variable de entorno PUERTA_KEY y el encabezado x-puerta-key.
function claveValida(req) {
  const esperada = process.env.PUERTA_KEY || '';
  if (!esperada) return false;
  const a = Buffer.from(esperada);
  const b = Buffer.from(String(req.get('x-puerta-key') || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.post('/puerta', (req, res) => {
  if (!claveValida(req)) return res.status(401).json({ ok: false });
  const d = req.body;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return res.status(400).json({ ok: false });
  svc.recibirPuerta(d);
  res.json({ ok: true });
});

module.exports = router;