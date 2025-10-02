const nodemailer = require('nodemailer');

// Configurar transporter de nodemailer (si está disponible)
let transporter = null;

try {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
} catch (error) {
    console.warn('⚠️ Nodemailer no está configurado correctamente. Los emails no se enviarán.');
}

// Enviar notificación al admin cuando hay un nuevo pago
async function sendAdminNotification(submission) {
    const planNames = {
        'basico': 'Plan Básico',
        'avanzado': 'Plan Avanzado',
        'premium': 'Plan Premium'
    };

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #0046FE 0%, #0036C8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .section h3 { color: #0046FE; margin-top: 0; border-bottom: 2px solid #0046FE; padding-bottom: 10px; }
                .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
                .info-label { font-weight: bold; width: 180px; color: #666; }
                .info-value { flex: 1; }
                .plan-badge { display: inline-block; background: #009A62; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
                .amount { font-size: 2rem; color: #009A62; font-weight: bold; margin: 10px 0; }
                .button { display: inline-block; background: #0046FE; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💰 Nueva Solicitud Pagada</h1>
                    <p>ID: #${submission.id}</p>
                </div>
                <div class="content">
                    <div class="section">
                        <h3>📋 Plan Contratado</h3>
                        <p><span class="plan-badge">${planNames[submission.plan]}</span></p>
                        <p class="amount">${submission.amount}€/mes + IVA</p>
                    </div>

                    <div class="section">
                        <h3>🏢 Datos del Negocio</h3>
                        <div class="info-row">
                            <span class="info-label">Empresa:</span>
                            <span class="info-value">${submission.business_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Sector:</span>
                            <span class="info-value">${submission.industry}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">CIF/NIF:</span>
                            <span class="info-value">${submission.cif_nif}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${submission.business_email}</span>
                        </div>
                    </div>

                    <div class="section">
                        <h3>👤 Datos del Cliente</h3>
                        <div class="info-row">
                            <span class="info-label">Nombre:</span>
                            <span class="info-value">${submission.full_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${submission.email}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Teléfono:</span>
                            <span class="info-value">${submission.phone || 'No proporcionado'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <h3>🌐 Dominio Solicitado</h3>
                        <div class="info-row">
                            <span class="info-label">Dominio principal:</span>
                            <span class="info-value">${submission.domain_name}</span>
                        </div>
                    </div>

                    <div class="section">
                        <h3>🎨 Preferencias de Diseño</h3>
                        <div class="info-row">
                            <span class="info-label">Estilo:</span>
                            <span class="info-value">${submission.design_style}</span>
                        </div>
                    </div>

                    <center>
                        <a href="http://localhost:3000/admin" class="button">Ver Detalles Completos en Dashboard</a>
                    </center>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        if (!transporter) {
            console.log(`⚠️ Email no enviado (transporter no configurado) para solicitud #${submission.id}`);
            return;
        }
        
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: process.env.ADMIN_EMAIL,
            subject: `💰 Nueva Solicitud Pagada - ${submission.business_name} (${planNames[submission.plan]})`,
            html: html
        });
        console.log(`✅ Email enviado al admin para solicitud #${submission.id}`);
    } catch (error) {
        console.error('❌ Error enviando email al admin:', error);
    }
}

// Enviar confirmación al cliente
async function sendClientConfirmation(submission) {
    const planNames = {
        'basico': 'Plan Básico',
        'avanzado': 'Plan Avanzado',
        'premium': 'Plan Premium'
    };

    const planDetails = {
        'basico': { pages: '5 páginas', delivery: '5 días' },
        'avanzado': { pages: '10 páginas', delivery: '7 días' },
        'premium': { pages: '15 páginas', delivery: '10 días' }
    };

    const details = planDetails[submission.plan];

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #0046FE 0%, #0036C8 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .success-icon { font-size: 4rem; margin-bottom: 20px; }
                .section { background: white; padding: 25px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .section h3 { color: #0046FE; margin-top: 0; }
                .plan-info { background: #E5FC63; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .next-steps { background: #e8f4ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0046FE; }
                .next-steps li { margin: 10px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="success-icon">🎉</div>
                    <h1>¡Pago Confirmado!</h1>
                    <p>Gracias por confiar en agutidesigns</p>
                </div>
                <div class="content">
                    <div class="section">
                        <h3>✅ Tu suscripción está activa</h3>
                        <p>Hola <strong>${submission.full_name}</strong>,</p>
                        <p>Hemos recibido correctamente tu pago y ya estamos trabajando en tu web.</p>
                        
                        <div class="plan-info">
                            <h4 style="margin-top: 0;">📦 ${planNames[submission.plan]}</h4>
                            <p style="margin: 5px 0;"><strong>Precio:</strong> ${submission.amount}€/mes + IVA</p>
                            <p style="margin: 5px 0;"><strong>Incluye:</strong> ${details.pages}</p>
                            <p style="margin: 5px 0;"><strong>Entrega:</strong> ${details.delivery} hábiles</p>
                        </div>
                    </div>

                    <div class="section">
                        <h3>🚀 Próximos Pasos</h3>
                        <div class="next-steps">
                            <ol>
                                <li><strong>Revisión de datos:</strong> Estamos analizando toda la información que nos proporcionaste</li>
                                <li><strong>Configuración:</strong> Configuraremos tu dominio y hosting</li>
                                <li><strong>Diseño:</strong> Empezaremos a diseñar tu web según tus preferencias</li>
                                <li><strong>Entrega:</strong> Recibirás tu web en ${details.delivery}</li>
                                <li><strong>Dashboard:</strong> Te daremos acceso a tu panel de control</li>
                            </ol>
                        </div>
                    </div>

                    <div class="section">
                        <h3>📧 Mantente en contacto</h3>
                        <p>Te enviaremos actualizaciones sobre el progreso de tu web.</p>
                        <p>Si tienes alguna pregunta, no dudes en contactarnos respondiendo a este email.</p>
                    </div>

                    <div class="footer">
                        <p><strong>agutidesigns</strong></p>
                        <p>Tu web profesional por suscripción</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        if (!transporter) {
            console.log(`⚠️ Email no enviado (transporter no configurado) a ${submission.email}`);
            return;
        }
        
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: submission.email,
            subject: `✅ Confirmación de Pago - ${planNames[submission.plan]} - agutidesigns`,
            html: html
        });
        console.log(`✅ Email de confirmación enviado a ${submission.email}`);
    } catch (error) {
        console.error('❌ Error enviando email al cliente:', error);
    }
}

module.exports = {
    sendAdminNotification,
    sendClientConfirmation
}; 