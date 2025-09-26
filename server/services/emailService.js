import nodemailer from 'nodemailer';

// Konfiguracija za email pošiljanje
const createTransporter = () => {
  // Za razvoj uporabljamo ethereal email (test email service)
  // V produkciji bi uporabili pravi SMTP strežnik
  return nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass'
    }
  });
};

// Pošlji verifikacijski email
const sendVerificationEmail = async (email, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `http://localhost:3001/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: '"Omni Platform" <noreply@omniplatform.com>',
      to: email,
      subject: 'Potrdite svoj email naslov',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Dobrodošli na Omni Platform!</h2>
          <p>Hvala za registracijo. Za dokončanje registracije kliknite na spodnjo povezavo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Potrdite email naslov
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Če ne morete klikniti na gumb, kopirajte in prilepite to povezavo v brskalnik:
            <br>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </p>
          <p style="color: #666; font-size: 12px;">
            Ta povezava bo veljavna 24 ur. Če niste zahtevali registracije, ignorirajte ta email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verifikacijski email poslan:', info.messageId);
    
    // Za razvoj prikažemo preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Napaka pri pošiljanju emaila:', error);
    return { success: false, error: error.message };
  }
};

// Pošlji email za ponastavitev gesla
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `http://localhost:3001/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: '"Omni Platform" <noreply@omniplatform.com>',
      to: email,
      subject: 'Ponastavitev gesla',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Ponastavitev gesla</h2>
          <p>Prejeli smo zahtevo za ponastavitev vašega gesla. Kliknite na spodnjo povezavo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Ponastavi geslo
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Če ne morete klikniti na gumb, kopirajte in prilepite to povezavo v brskalnik:
            <br>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          <p style="color: #666; font-size: 12px;">
            Ta povezava bo veljavna 1 uro. Če niste zahtevali ponastavitve gesla, ignorirajte ta email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email za ponastavitev gesla poslan:', info.messageId);
    
    // Za razvoj prikažemo preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Napaka pri pošiljanju emaila:', error);
    return { success: false, error: error.message };
  }
};

export {
  sendVerificationEmail,
  sendPasswordResetEmail
};