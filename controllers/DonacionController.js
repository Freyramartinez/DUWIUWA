// controllers/DonacionController.js
const PDFDocument = require('pdfkit');

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