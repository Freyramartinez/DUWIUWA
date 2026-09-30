const express = require('express');
const router = express.Router();
router.use(express.urlencoded({ extended: true })); // lee los datos de los formularios (req.body)
const { requireLogin, requireRole } = require('../middleware/auth');
const Account = require('../controllers/AccountController');
const Jefe = require('../controllers/JefeController');
const Psicologa = require('../controllers/PsicologaController');
const Victima = require('../controllers/VictimaController');

// Cambio de contraseña (obligatorio en el primer inicio de las psicólogas)
router.get('/cambiar-password', requireLogin, Account.form);
router.post('/cambiar-password', requireLogin, Account.cambiar);

// Jefe
router.get('/jefe', requireRole('jefe'), Jefe.panel);
router.post('/jefe/psicologas', requireRole('jefe'), Jefe.crearPsicologa);
router.post('/jefe/psicologas/:id/validar', requireRole('jefe'), Jefe.validar);

// Psicóloga
router.get('/psicologa', requireRole('psicologa'), Psicologa.panel);
router.post('/psicologa/victimas', requireRole('psicologa'), Psicologa.registrarVictima);
router.post('/psicologa/citas', requireRole('psicologa'), Psicologa.crearCita);
router.post('/psicologa/citas/:id/cancelar', requireRole('psicologa'), Psicologa.cancelarCita);

// Víctima
router.get('/victima', requireRole('victima'), Victima.panel);
router.post('/victima/citas/:id/cancelar', requireRole('victima'), Victima.cancelar);

module.exports = router;