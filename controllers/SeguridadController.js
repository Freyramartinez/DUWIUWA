exports.panel = (req, res) => {
  res.render('seguridad', {
    titulo: 'Seguridad Pública',
    rol: 'Seguridad Pública',
    nombre: req.session.user ? req.session.user.nombre : 'Central',
    usuario: req.session.user
  });
};

// Endpoint JSON que consulta a Node-RED
exports.estadoAlerta = async (req, res) => {
  const baseUrl = (process.env.NODERED_URL || 'http://localhost:1880/ui').replace(/\/ui\/?$/, '');
  try {
    const respuesta = await fetch(`${baseUrl}/api/estado-alerta`);
    if (!respuesta.ok) throw new Error('Node-RED no respondió');
    const data = await respuesta.json();
    res.json({ conectado: true, ...data });
  } catch (err) {
    // Si Node-RED está apagado, devuelve un estado seguro por defecto para no romper la vista
    res.json({
      conectado: false,
      alertaActiva: false,
      usuaria: 'Sin alertas activas',
      bateria: '--',
      lat: 20.1304, // Coordenadas base (Tlahuelilpan, Hgo.)
      lng: -99.2333,
      ultimaActualizacion: new Date().toLocaleTimeString()
    });
  }
};