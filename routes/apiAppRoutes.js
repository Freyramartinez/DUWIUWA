'use strict';
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

module.exports = router;