// controllers/ContactController.js

exports.index = (req, res) => {
  try {
    const infoContacto = {
      empresa: 'SHERO S.A.P.I. de C.V.',
      institucion: 'ITSOEH - Instituto Tecnológico Superior del Occidente del Estado de Hidalgo',
      ubicacion: 'Mixquiahuala de Juárez, Hidalgo',
      email: 'contacto@shero.com.mx'
    };

    res.render('contacto', { infoContacto });
  } catch (error) {
    console.error('Error al cargar la vista de contacto:', error);
    res.status(500).send('Error interno del servidor');
  }
};