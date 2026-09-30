require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

(async () => {
  console.log('Iniciando seeder del jefe...');
  await connectDB();

  const email = (process.env.JEFE_EMAIL || '').trim().toLowerCase();
  const password = process.env.JEFE_PASSWORD || '';
  if (!email || password.length < 8) throw new Error('Define JEFE_EMAIL y JEFE_PASSWORD (mín. 8 caracteres) en .env');

  const datos = { role: 'jefe', isVerified: true, validada: true };
  const existe = await User.findOne({ email });
  if (existe) {
    await User.updateOne({ _id: existe._id }, datos);
    console.log('Usuario existente convertido en jefe:', email);
  } else {
    await User.create({
      nombre: process.env.JEFE_NOMBRE || 'Jefe',
      email,
      password: await bcrypt.hash(password, 10),
      ...datos
    });
    console.log('Jefe creado:', email);
  }
  await mongoose.disconnect();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });