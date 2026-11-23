// controllers/DonacionController.js
const PDFDocument = require('pdfkit');
const Donacion = require('../models/Donacion');

exports.generarTicket = (req, res) => {
  try {
    // 1. Recibimos los datos que nos manda el frontend
    const { folio, donante, correo, monto, metodo, fecha } = req.body;

    // 2. Creamos el documento PDF
    const doc = new PDFDocument({ margin: 50 });

    // 3. Le decimos al navegador que esto es un PDF para descargar
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ticket-${folio}.pdf`);

    // 4. Conectamos el PDF con la respuesta HTTP
    doc.pipe(res);

    // 5. DISEÑO DEL TICKET
    doc.fontSize(22).fillColor('#6a1b9a').text('WOMEN SAFETY', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#333333').text('¡Gracias por tu apoyo!', { align: 'center' });
    doc.moveDown(2);

    // Línea
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // Datos
    doc.fontSize(12).fillColor('#000000');
    doc.text(`Folio: `, { continued: true }).font('Helvetica-Bold').text(folio);
    doc.font('Helvetica').text(`Donante: `, { continued: true }).font('Helvetica-Bold').text(donante);
    doc.font('Helvetica').text(`Correo: `, { continued: true }).font('Helvetica-Bold').text(correo);
    doc.font('Helvetica').text(`Método: `, { continued: true }).font('Helvetica-Bold').text(metodo);
    doc.font('Helvetica').text(`Fecha: `, { continued: true }).font('Helvetica-Bold').text(fecha);
    
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // Monto
    doc.fontSize(16).font('Helvetica-Bold').text(`Total donado: $${monto} MXN`, { align: 'right', color: '#6a1b9a' });
    
    doc.moveDown(3);
    
    // Pie
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Este es un comprobante de tu donación.', { align: 'center' });

    // 6. Cerramos el documento
    doc.end();

  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).send('Error al generar el ticket');
  }
};

const METODOS = ['PayPal', 'Tarjeta Crédito/Débito', 'Pago en Efectivo'];

exports.registrar = async (req, res) => {
  try {
    const { folio, donante, correo, monto, metodo, frecuencia, estado } = req.body;
    const montoNum = Number(monto);

    if (!folio || !Number.isFinite(montoNum) || montoNum < 20 || montoNum > 50000 || !METODOS.includes(metodo)) {
      return res.status(400).json({ ok: false, error: 'Datos de donación inválidos' });
    }

    await Donacion.updateOne(
      { folio: String(folio) },
      { $setOnInsert: {
          folio: String(folio),
          donante: String(donante || 'Anónimo').slice(0, 120),
          correo: String(correo || '').slice(0, 160),
          monto: montoNum,
          metodo,
          frecuencia: frecuencia === 'mensual' ? 'mensual' : 'unica',
          estado: estado === 'pendiente' ? 'pendiente' : 'completada',
          fecha: new Date()
      } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Error al registrar donación:', error);
    res.status(500).json({ ok: false, error: 'No se pudo registrar' });
  }
};

exports.historial = async (req, res) => {
  try {
    const donaciones = await Donacion.find().sort({ fecha: -1 }).lean();
    const total = donaciones
      .filter(d => d.estado === 'completada')
      .reduce((suma, d) => suma + d.monto, 0);
    res.render('historial-donaciones', { donaciones, total });
  } catch (error) {
    console.error('Error al cargar historial:', error);
    res.status(500).send('Error al cargar el historial');
  }
};