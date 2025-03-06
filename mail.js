const nodemailer = require('nodemailer');

//Transporte de correo
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', 
  port: 465, 
  secure: true, 
  auth: {
    user: 'supervisorang205@gmail.com',
    pass: 'zluq nkkt bnja vhbq'
  },
  tls: {
    rejectUnauthorized: false
  }
});

//Función para enviar un correo
const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: 'supervisorang205@gmail.com',
    to: to,
    subject: subject,
    text: text
  };

  return transporter.sendMail(mailOptions)
    .then(info => {
      console.log('Correo enviado:', info.response);
    })
    .catch(error => {
      console.log('Error enviando el correo:', error);
    });
};

module.exports = { sendEmail };
