exports.requireLogin = (req, res, next) => {
  if (!req.session || !req.session.user) return res.redirect('/login');
  next();
};

exports.requireRole = (...roles) => (req, res, next) => {
  const u = req.session && req.session.user;
  if (!u) return res.redirect('/login');
  if (u.mustChangePassword) return res.redirect('/cambiar-password');
  if (!roles.includes(u.role)) {
    return res.status(403).send('No tienes permiso para ver esta página.');
  }
  next();
};
