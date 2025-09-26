/**
 * Email Service za pošiljanje opomnikov o licencah
 * Uporablja Nodemailer za pošiljanje e-poštnih sporočil
 */

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    /**
     * Inicializiraj email transporter
     */
    initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransporter({
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: process.env.EMAIL_USER || 'noreply@omni.si',
                    pass: process.env.EMAIL_PASS || 'your-app-password'
                },
                secure: true,
                port: 465,
                tls: {
                    rejectUnauthorized: false
                }
            });

            console.log('✅ Email service inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji email servisa:', error);
        }
    }

    /**
     * Pošlji opomnik o potekanju licence
     */
    async sendLicenseExpirationReminder(licenseData, daysUntilExpiry) {
        try {
            const { client_id, company_name, contact_email, expires_at, plan } = licenseData;
            
            if (!contact_email) {
                console.warn(`⚠️ Ni email naslova za klienta ${client_id}`);
                return false;
            }

            const expiryDate = new Date(expires_at).toLocaleDateString('sl-SI');
            const subject = `Opomnik: Licenca bo potekla čez ${daysUntilExpiry} dni`;
            
            const htmlContent = this.generateExpirationReminderHTML({
                company_name,
                client_id,
                plan,
                daysUntilExpiry,
                expiryDate
            });

            const textContent = this.generateExpirationReminderText({
                company_name,
                client_id,
                plan,
                daysUntilExpiry,
                expiryDate
            });

            const mailOptions = {
                from: `"Omni Licenčni Sistem" <${process.env.EMAIL_USER || 'noreply@omni.si'}>`,
                to: contact_email,
                subject: subject,
                text: textContent,
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`📧 Opomnik poslan za ${client_id} na ${contact_email}`);
            
            return {
                success: true,
                messageId: result.messageId,
                recipient: contact_email
            };

        } catch (error) {
            console.error('❌ Napaka pri pošiljanju opomnika:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Pošlji obvestilo o blokadi licence
     */
    async sendLicenseBlockedNotification(licenseData, reason) {
        try {
            const { client_id, company_name, contact_email, plan } = licenseData;
            
            if (!contact_email) {
                console.warn(`⚠️ Ni email naslova za klienta ${client_id}`);
                return false;
            }

            const subject = `Pomembno: Licenca je bila blokirana`;
            
            const htmlContent = this.generateBlockedNotificationHTML({
                company_name,
                client_id,
                plan,
                reason
            });

            const textContent = this.generateBlockedNotificationText({
                company_name,
                client_id,
                plan,
                reason
            });

            const mailOptions = {
                from: `"Omni Licenčni Sistem" <${process.env.EMAIL_USER || 'noreply@omni.si'}>`,
                to: contact_email,
                subject: subject,
                text: textContent,
                html: htmlContent,
                priority: 'high'
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`🚫 Obvestilo o blokadi poslano za ${client_id} na ${contact_email}`);
            
            return {
                success: true,
                messageId: result.messageId,
                recipient: contact_email
            };

        } catch (error) {
            console.error('❌ Napaka pri pošiljanju obvestila o blokadi:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Pošlji obvestilo o podaljšanju licence
     */
    async sendLicenseRenewalNotification(licenseData) {
        try {
            const { client_id, company_name, contact_email, expires_at, plan } = licenseData;
            
            if (!contact_email) {
                console.warn(`⚠️ Ni email naslova za klienta ${client_id}`);
                return false;
            }

            const newExpiryDate = new Date(expires_at).toLocaleDateString('sl-SI');
            const subject = `Licenca uspešno podaljšana`;
            
            const htmlContent = this.generateRenewalNotificationHTML({
                company_name,
                client_id,
                plan,
                newExpiryDate
            });

            const textContent = this.generateRenewalNotificationText({
                company_name,
                client_id,
                plan,
                newExpiryDate
            });

            const mailOptions = {
                from: `"Omni Licenčni Sistem" <${process.env.EMAIL_USER || 'noreply@omni.si'}>`,
                to: contact_email,
                subject: subject,
                text: textContent,
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Obvestilo o podaljšanju poslano za ${client_id} na ${contact_email}`);
            
            return {
                success: true,
                messageId: result.messageId,
                recipient: contact_email
            };

        } catch (error) {
            console.error('❌ Napaka pri pošiljanju obvestila o podaljšanju:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generiraj HTML vsebino za opomnik o potekanju
     */
    generateExpirationReminderHTML({ company_name, client_id, plan, daysUntilExpiry, expiryDate }) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 Opomnik o potekanju licence</h1>
        </div>
        <div class="content">
            <p>Spoštovani,</p>
            
            <div class="warning">
                <strong>⚠️ Vaša licenca bo potekla čez ${daysUntilExpiry} dni!</strong>
            </div>
            
            <p><strong>Podrobnosti licence:</strong></p>
            <ul>
                <li><strong>Podjetje:</strong> ${company_name}</li>
                <li><strong>Client ID:</strong> ${client_id}</li>
                <li><strong>Plan:</strong> ${plan}</li>
                <li><strong>Datum poteka:</strong> ${expiryDate}</li>
            </ul>
            
            <p>Za neprekinjeno uporabo storitev prosimo, da licenco podaljšate pravočasno.</p>
            
            <a href="mailto:support@omni.si?subject=Podaljšanje licence ${client_id}" class="button">
                Kontaktiraj podporo
            </a>
            
            <p>Če imate vprašanja, se obrnite na našo podporo.</p>
            
            <p>Lep pozdrav,<br>
            <strong>Omni Support Team</strong></p>
        </div>
        <div class="footer">
            <p>© 2024 Omni AI Platform. Vse pravice pridržane.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generiraj tekstovno vsebino za opomnik o potekanju
     */
    generateExpirationReminderText({ company_name, client_id, plan, daysUntilExpiry, expiryDate }) {
        return `
🔔 OPOMNIK O POTEKANJU LICENCE

Spoštovani,

⚠️ Vaša licenca bo potekla čez ${daysUntilExpiry} dni!

Podrobnosti licence:
• Podjetje: ${company_name}
• Client ID: ${client_id}
• Plan: ${plan}
• Datum poteka: ${expiryDate}

Za neprekinjeno uporabo storitev prosimo, da licenco podaljšate pravočasno.

Kontakt za podporo: support@omni.si

Lep pozdrav,
Omni Support Team

© 2024 Omni AI Platform. Vse pravice pridržane.
        `;
    }

    /**
     * Generiraj HTML vsebino za obvestilo o blokadi
     */
    generateBlockedNotificationHTML({ company_name, client_id, plan, reason }) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; color: #721c24; }
        .button { display: inline-block; background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚫 Licenca blokirana</h1>
        </div>
        <div class="content">
            <p>Spoštovani,</p>
            
            <div class="alert">
                <strong>🚫 Vaša licenca je bila blokirana!</strong><br>
                Razlog: ${reason}
            </div>
            
            <p><strong>Podrobnosti licence:</strong></p>
            <ul>
                <li><strong>Podjetje:</strong> ${company_name}</li>
                <li><strong>Client ID:</strong> ${client_id}</li>
                <li><strong>Plan:</strong> ${plan}</li>
            </ul>
            
            <p>Dostop do storitev je trenutno onemogočen. Za ponovno aktivacijo se obrnite na našo podporo.</p>
            
            <a href="mailto:support@omni.si?subject=Blokirana licenca ${client_id}" class="button">
                Kontaktiraj podporo
            </a>
            
            <p>Lep pozdrav,<br>
            <strong>Omni Support Team</strong></p>
        </div>
        <div class="footer">
            <p>© 2024 Omni AI Platform. Vse pravice pridržane.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generiraj tekstovno vsebino za obvestilo o blokadi
     */
    generateBlockedNotificationText({ company_name, client_id, plan, reason }) {
        return `
🚫 LICENCA BLOKIRANA

Spoštovani,

🚫 Vaša licenca je bila blokirana!
Razlog: ${reason}

Podrobnosti licence:
• Podjetje: ${company_name}
• Client ID: ${client_id}
• Plan: ${plan}

Dostop do storitev je trenutno onemogočen. Za ponovno aktivacijo se obrnite na našo podporo.

Kontakt za podporo: support@omni.si

Lep pozdrav,
Omni Support Team

© 2024 Omni AI Platform. Vse pravice pridržane.
        `;
    }

    /**
     * Generiraj HTML vsebino za obvestilo o podaljšanju
     */
    generateRenewalNotificationHTML({ company_name, client_id, plan, newExpiryDate }) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; color: #155724; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Licenca podaljšana</h1>
        </div>
        <div class="content">
            <p>Spoštovani,</p>
            
            <div class="success">
                <strong>✅ Vaša licenca je bila uspešno podaljšana!</strong>
            </div>
            
            <p><strong>Podrobnosti licence:</strong></p>
            <ul>
                <li><strong>Podjetje:</strong> ${company_name}</li>
                <li><strong>Client ID:</strong> ${client_id}</li>
                <li><strong>Plan:</strong> ${plan}</li>
                <li><strong>Nov datum poteka:</strong> ${newExpiryDate}</li>
            </ul>
            
            <p>Hvala za zaupanje. Lahko nadaljujete z uporabo naših storitev.</p>
            
            <p>Lep pozdrav,<br>
            <strong>Omni Support Team</strong></p>
        </div>
        <div class="footer">
            <p>© 2024 Omni AI Platform. Vse pravice pridržane.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generiraj tekstovno vsebino za obvestilo o podaljšanju
     */
    generateRenewalNotificationText({ company_name, client_id, plan, newExpiryDate }) {
        return `
✅ LICENCA PODALJŠANA

Spoštovani,

✅ Vaša licenca je bila uspešno podaljšana!

Podrobnosti licence:
• Podjetje: ${company_name}
• Client ID: ${client_id}
• Plan: ${plan}
• Nov datum poteka: ${newExpiryDate}

Hvala za zaupanje. Lahko nadaljujete z uporabo naših storitev.

Lep pozdrav,
Omni Support Team

© 2024 Omni AI Platform. Vse pravice pridržane.
        `;
    }

    /**
     * Testiraj email povezavo
     */
    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email povezava uspešno testirana');
            return true;
        } catch (error) {
            console.error('❌ Napaka pri testiranju email povezave:', error);
            return false;
        }
    }
}

module.exports = EmailService;