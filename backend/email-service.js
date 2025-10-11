/**
 * 📧 SERVICIO DE EMAILS - agutidesigns
 * Gestión completa de emails con SendGrid
 */

const sgMail = require('@sendgrid/mail');

// Configurar SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email corporativo
const FROM_EMAIL = 'no-reply@agutidesigns.es';
const FROM_NAME = 'agutidesigns';
const ADMIN_EMAIL = 'info@agutidesigns.es';

/**
 * 🎨 PLANTILLAS DE EMAIL
 */

// Función auxiliar para crear el layout base
function createEmailLayout(content, preheader = '') {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>agutidesigns</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #0046FE 0%, #0035c9 100%); padding: 40px 20px; text-align: center; }
        .logo { color: white; font-size: 2rem; font-weight: 700; text-decoration: none; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: #0046FE; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; margin: 20px 0; }
        .button:hover { background: #0035c9; color: #ffffff !important; }
        .footer { background: #f9f9f9; padding: 30px; text-align: center; color: #666; font-size: 0.9rem; }
        .divider { border-top: 2px solid #e8eaed; margin: 30px 0; }
        h1 { color: #333; font-size: 1.8rem; margin: 0 0 20px 0; }
        p { color: #666; line-height: 1.6; margin: 15px 0; }
        .info-box { background: #f0f9ff; border-left: 4px solid #0046FE; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .warning-box { background: #fff7ed; border-left: 4px solid #fb923c; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .danger-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .success-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 8px; }
    </style>
</head>
<body>
    <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>
    <div class="container">
        <div class="header">
            <a href="https://agutidesigns.es" style="display: inline-block;">
                <img src="https://agutidesigns.vercel.app/images/Logo%20blanco.png" alt="agutidesigns" style="height: 50px; width: auto; display: block; margin: 0 auto;">
            </a>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p><strong>agutidesigns</strong><br>
            Creación de sitios web profesionales</p>
            <p>📧 info@agutidesigns.es | 🌐 <a href="https://agutidesigns.es" style="color: #0046FE;">agutidesigns.es</a></p>
            <p style="font-size: 0.8rem; color: #999; margin-top: 20px;">
                Este email fue enviado automáticamente. Por favor, no respondas a este mensaje.
            </p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * 📧 EMAILS AL CLIENTE
 */

// 1. Bienvenida al registrarse
function welcomeEmail(clientData) {
    const content = `
        <h1>🎉 ¡Bienvenido a agutidesigns!</h1>
        <p>Hola <strong>${clientData.full_name || clientData.first_name}</strong>,</p>
        <p>¡Gracias por confiar en nosotros para crear el sitio web de <strong>${clientData.business_name}</strong>!</p>
        
        <div class="info-box">
            <p style="margin: 0;"><strong>✅ Tu registro se completó exitosamente</strong></p>
        </div>
        
        <p>Hemos recibido toda tu información y comenzaremos a trabajar en tu proyecto de inmediato.</p>
        
        <h3>📊 Acceso a tu Dashboard</h3>
        <p>Puedes seguir el progreso de tu sitio web en tiempo real desde tu panel de control:</p>
        
        <div style="text-align: center;">
            <a href="https://panel.agutidesigns.es" class="button" style="color: #ffffff;">🚀 Acceder a Mi Dashboard</a>
        </div>
        
        <p><strong>Tus credenciales de acceso:</strong></p>
        <div class="info-box">
            <p style="margin: 5px 0;">📧 <strong>Email:</strong> ${clientData.email}</p>
            <p style="margin: 5px 0;">🔑 <strong>Contraseña:</strong> La que elegiste al registrarte</p>
        </div>
        
        <h3>📅 Próximos pasos</h3>
        <p>1️⃣ Recibirás confirmación de pago en breve<br>
        2️⃣ Comenzaremos a diseñar tu sitio web<br>
        3️⃣ Te notificaremos cuando esté listo para revisión<br>
        4️⃣ Entregaremos tu sitio web completamente funcional</p>
        
        <p>Si tienes alguna pregunta, no dudes en contactarnos desde tu dashboard.</p>
        
        <p>¡Estamos emocionados de trabajar contigo! 🚀</p>
        
        <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
    `;
    
    return {
        to: clientData.email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: '🎉 ¡Bienvenido a agutidesigns!',
        html: createEmailLayout(content, '¡Bienvenido! Tu registro se completó exitosamente.')
    };
}

// 2. Confirmación de pago exitoso
function paymentSuccessEmail(clientData) {
    const planNames = {
        'basico': 'Básico',
        'avanzado': 'Avanzado',
        'premium': 'Premium'
    };
    
    const planPrices = {
        'basico': '35€',
        'avanzado': '49€',
        'premium': '65€'
    };
    
    const deliveryDays = {
        'basico': '5 días',
        'avanzado': '7 días',
        'premium': '10 días'
    };
    
    const content = `
        <h1>💳 ¡Pago Confirmado!</h1>
        <p>Hola <strong>${clientData.full_name}</strong>,</p>
        <p>Hemos recibido tu pago correctamente. ¡Gracias por confiar en agutidesigns!</p>
        
        <div class="success-box">
            <p style="margin: 0;"><strong>✅ Pago procesado exitosamente</strong></p>
        </div>
        
        <h3>📋 Resumen de tu plan</h3>
        <div class="info-box">
            <p style="margin: 5px 0;"><strong>Plan:</strong> ${planNames[clientData.plan] || clientData.plan}</p>
            <p style="margin: 5px 0;"><strong>Precio:</strong> ${planPrices[clientData.plan]} + IVA / mes</p>
            <p style="margin: 5px 0;"><strong>Renovación:</strong> Automática cada mes</p>
            <p style="margin: 5px 0;"><strong>Tiempo de entrega:</strong> ${deliveryDays[clientData.plan]}</p>
        </div>
        
        <h3>🚀 ¿Qué sigue?</h3>
        <p>1️⃣ Nuestro equipo ya está trabajando en tu sitio web<br>
        2️⃣ Puedes seguir el progreso desde tu dashboard<br>
        3️⃣ Te notificaremos en cada etapa del proceso<br>
        4️⃣ Recibirás acceso completo cuando esté listo</p>
        
        <div style="text-align: center;">
            <a href="https://panel.agutidesigns.es" class="button" style="color: #ffffff;">📊 Ver Mi Dashboard</a>
        </div>
        
        <p><strong>💡 Tip:</strong> Revisa tu correo para encontrar la factura de Stripe con todos los detalles del pago.</p>
        
        <p>¡Gracias por elegirnos! 🎉</p>
        
        <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
    `;
    
    return {
        to: clientData.email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: '💳 Pago confirmado - agutidesigns',
        html: createEmailLayout(content, 'Tu pago ha sido procesado exitosamente.')
    };
}

// 3. Web entregada/activada
function websiteDeliveredEmail(clientData) {
    const content = `
        <h1>🚀 ¡Tu sitio web está listo!</h1>
        <p>Hola <strong>${clientData.full_name}</strong>,</p>
        <p>¡Tenemos excelentes noticias! Tu sitio web para <strong>${clientData.business_name}</strong> ha sido completado y ya está activo.</p>
        
        <div class="success-box">
            <p style="margin: 0;"><strong>✅ Tu sitio web está en línea</strong></p>
        </div>
        
        <h3>🌐 Accede a tu sitio web</h3>
        <div class="info-box">
            <p style="margin: 5px 0;"><strong>URL:</strong> <a href="${clientData.website_url}" style="color: #0046FE;">${clientData.website_url}</a></p>
        </div>
        
        <div style="text-align: center;">
            <a href="${clientData.website_url}" class="button" style="color: #ffffff;">🌐 Ver Mi Sitio Web</a>
        </div>
        
        <h3>🔑 Acceso a WordPress</h3>
        <p>Puedes gestionar el contenido de tu sitio web desde el panel de WordPress:</p>
        <div class="info-box">
            <p style="margin: 5px 0;"><strong>URL Admin:</strong> <a href="${clientData.wordpress_url}" style="color: #0046FE;">${clientData.wordpress_url}</a></p>
            <p style="margin: 5px 0;"><strong>Usuario:</strong> ${clientData.wordpress_username || 'admin'}</p>
            <p style="margin: 5px 0;"><strong>Contraseña:</strong> ${clientData.wordpress_password || '[Ver en tu dashboard]'}</p>
        </div>
        
        <h3>📚 Próximos pasos</h3>
        <p>1️⃣ Explora tu nuevo sitio web<br>
        2️⃣ Revisa los tutoriales en tu dashboard<br>
        3️⃣ Personaliza el contenido desde WordPress<br>
        4️⃣ Contacta al soporte si necesitas ayuda</p>
        
        <div style="text-align: center;">
            <a href="https://panel.agutidesigns.es" class="button" style="color: #ffffff;">📊 Ir a Mi Dashboard</a>
        </div>
        
        <p>¡Felicidades por tu nuevo sitio web! 🎉</p>
        
        <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
    `;
    
    return {
        to: clientData.email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: '🚀 ¡Tu sitio web está listo! - agutidesigns',
        html: createEmailLayout(content, '¡Tu sitio web ha sido entregado y está en línea!')
    };
}

// 4. Respuesta a ticket de soporte
function ticketResponseEmail(clientData, ticketData) {
    const content = `
        <h1>💬 Nueva respuesta a tu consulta</h1>
        <p>Hola <strong>${clientData.full_name}</strong>,</p>
        <p>Hemos respondido a tu ticket de soporte sobre: <strong>${ticketData.subject}</strong></p>
        
        <div class="info-box">
            <p style="margin: 0 0 10px 0;"><strong>📋 Ticket #${ticketData.id}</strong></p>
            <p style="margin: 0;"><strong>Respuesta:</strong></p>
            <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${ticketData.admin_response}</p>
        </div>
        
        <div style="text-align: center;">
            <a href="https://panel.agutidesigns.es#contactar" class="button" style="color: #ffffff;">💬 Ver Conversación Completa</a>
        </div>
        
        <p>Si tienes más preguntas, no dudes en responder desde tu dashboard.</p>
        
        <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
    `;
    
    return {
        to: clientData.email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `💬 Re: ${ticketData.subject} - agutidesigns`,
        html: createEmailLayout(content, 'Hemos respondido a tu consulta')
    };
}

// 5. Reset de contraseña
function passwordResetEmail(email, resetToken) {
    const resetUrl = `https://panel.agutidesigns.es/reset-password?token=${resetToken}`;
    
    const content = `
        <h1>🔐 Restablece tu contraseña</h1>
        <p>Hola,</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>agutidesigns</strong>.</p>
        
        <p>Si no realizaste esta solicitud, puedes ignorar este email de forma segura.</p>
        
        <div class="info-box" style="background: #fff3cd; border-left-color: #ffc107;">
            <p style="margin: 0; color: #856404;">
                <strong>⏰ Este enlace expirará en 1 hora</strong><br>
                Por motivos de seguridad, este enlace solo es válido durante 1 hora.
            </p>
        </div>
        
        <p>Para crear una nueva contraseña, haz clic en el botón de abajo:</p>
        
        <div style="text-align: center;">
            <a href="${resetUrl}" class="button" style="color: #ffffff; background: #0046FE;">🔑 Restablecer Contraseña</a>
        </div>
        
        <p style="margin-top: 30px; font-size: 0.9rem; color: #666;">
            <strong>Si el botón no funciona, copia y pega este enlace en tu navegador:</strong><br>
            <a href="${resetUrl}" style="color: #0046FE; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <div class="divider"></div>
        
        <p style="font-size: 0.85rem; color: #999;">
            <strong>💡 Consejos de seguridad:</strong><br>
            • Nunca compartas tu contraseña con nadie<br>
            • Usa una combinación de letras, números y símbolos<br>
            • No reutilices contraseñas de otros sitios
        </p>
        
        <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
    `;
    
    return {
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: '🔐 Restablece tu contraseña - agutidesigns',
        html: createEmailLayout(content, 'Solicitud de restablecimiento de contraseña')
    };
}

// 5-7. Recordatorios de renovación
function renewalReminderEmail(clientData, daysLeft) {
    let emoji, urgency, boxClass;
    
    if (daysLeft === 7) {
        emoji = '⏰';
        urgency = 'Recordatorio';
        boxClass = 'info-box';
    } else if (daysLeft === 3) {
        emoji = '⚠️';
        urgency = 'Importante';
        boxClass = 'warning-box';
    } else {
        emoji = '🚨';
        urgency = 'URGENTE';
        boxClass = 'danger-box';
    }
    
    const content = `
        <h1>${emoji} ${urgency}: Renovación próxima</h1>
        <p>Hola <strong>${clientData.full_name}</strong>,</p>
        <p>Te recordamos que tu suscripción se renovará automáticamente en <strong>${daysLeft} día${daysLeft > 1 ? 's' : ''}</strong>.</p>
        
        <div class="${boxClass}">
            <p style="margin: 0 0 10px 0;"><strong>${emoji} Renovación: ${clientData.next_billing_date}</strong></p>
            <p style="margin: 0;"><strong>Monto:</strong> ${clientData.plan_price} + IVA</p>
        </div>
        
        <p>El cargo se realizará automáticamente a tu método de pago registrado.</p>
        
        <h3>💳 Verifica tu método de pago</h3>
        <p>Asegúrate de que tu tarjeta tenga fondos suficientes para evitar interrupciones en tu servicio.</p>
        
        <div style="text-align: center;">
            <a href="https://panel.agutidesigns.es#facturacion" class="button" style="color: #ffffff;">💳 Gestionar Método de Pago</a>
        </div>
        
        <p><strong>¿Necesitas cambiar tu plan?</strong> Puedes hacerlo desde tu dashboard en cualquier momento.</p>
        
        <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
    `;
    
    return {
        to: clientData.email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `${emoji} Tu suscripción se renueva en ${daysLeft} día${daysLeft > 1 ? 's' : ''} - agutidesigns`,
        html: createEmailLayout(content, `Tu renovación está programada para ${daysLeft} día${daysLeft > 1 ? 's' : ''}`)
    };
}

// 10-13. Emails de pagos fallidos
function paymentFailedEmail(clientData, attemptNumber) {
    let content;
    
    if (attemptNumber === 1) {
        // Primer intento - Suave
        content = `
            <h1>⚠️ Problema con tu pago</h1>
            <p>Hola <strong>${clientData.full_name}</strong>,</p>
            <p>Hemos intentado procesar el pago de tu suscripción pero no fue posible completarlo.</p>
            
            <div class="warning-box">
                <p style="margin: 0 0 10px 0;"><strong>⚠️ Intento de pago fallido</strong></p>
                <p style="margin: 0;"><strong>Razón:</strong> ${clientData.failure_reason || 'Fondos insuficientes o tarjeta rechazada'}</p>
            </div>
            
            <p><strong>No te preocupes</strong>, volveremos a intentar el cobro en <strong>3 días</strong>.</p>
            
            <p>Tu sitio web sigue activo por ahora y no hay cambios en tu servicio.</p>
            
            <h3>💳 ¿Qué puedes hacer?</h3>
            <p>Te recomendamos actualizar tu método de pago para evitar futuros problemas:</p>
            
            <div style="text-align: center;">
                <a href="https://panel.agutidesigns.es#facturacion" class="button" style="color: #ffffff;">💳 Actualizar Método de Pago</a>
            </div>
            
            <p>Si necesitas ayuda, estamos disponibles para asistirte.</p>
            
            <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
        `;
        
        return {
            to: clientData.email,
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: '⚠️ Problema con tu pago - agutidesigns',
            html: createEmailLayout(content, 'Problema al procesar tu pago')
        };
        
    } else if (attemptNumber === 2) {
        // Segundo intento - Urgente
        content = `
            <h1>🚨 URGENTE: Segundo intento de pago fallido</h1>
            <p>Hola <strong>${clientData.full_name}</strong>,</p>
            <p>Este es nuestro <strong>segundo intento</strong> de procesar el pago de tu suscripción y lamentablemente no ha sido exitoso.</p>
            
            <div class="danger-box">
                <p style="margin: 0 0 10px 0;"><strong>🚨 Alerta: 2 de 3 intentos fallidos</strong></p>
                <p style="margin: 0;"><strong>Razón:</strong> ${clientData.failure_reason || 'Fondos insuficientes'}</p>
            </div>
            
            <p><strong>⚠️ IMPORTANTE:</strong> Si el próximo intento falla, tu servicio será suspendido automáticamente.</p>
            
            <h3>❌ Consecuencias de la suspensión:</h3>
            <p>• Tu sitio web será desactivado<br>
            • Perderás acceso a todas las funcionalidades<br>
            • El servicio se interrumpirá hasta que actualices tu pago</p>
            
            <p><strong>Te quedan aproximadamente 2 días</strong> antes del último intento.</p>
            
            <div style="text-align: center;">
                <a href="https://panel.agutidesigns.es#facturacion" class="button" style="background: #dc2626; font-size: 1.2rem; color: #ffffff;">💳 ACTUALIZAR TARJETA AHORA</a>
            </div>
            
            <p>Si tienes problemas o necesitas ayuda, contáctanos de inmediato: <strong>info@agutidesigns.es</strong></p>
            
            <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
        `;
        
        return {
            to: clientData.email,
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: '🚨 URGENTE: Segundo intento de pago fallido - agutidesigns',
            html: createEmailLayout(content, 'Acción requerida: Actualiza tu método de pago')
        };
        
    } else {
        // Tercer intento - Crítico
        content = `
            <h1>❌ ÚLTIMA OPORTUNIDAD - Tu sitio será suspendido</h1>
            <p>Hola <strong>${clientData.full_name}</strong>,</p>
            <p>Hemos intentado cobrar tu suscripción <strong>3 veces sin éxito</strong>.</p>
            
            <div class="danger-box">
                <p style="margin: 0 0 10px 0;"><strong>❌ CRÍTICO: 3 de 3 intentos fallidos</strong></p>
                <p style="margin: 0;">Tu suscripción se cancelará automáticamente en <strong>24 horas</strong></p>
            </div>
            
            <h3>🚨 ¿Qué va a pasar?</h3>
            <p><strong>En 24 horas:</strong><br>
            ❌ Tu sitio web será desactivado<br>
            ❌ Perderás acceso a tu dashboard<br>
            ❌ El servicio se interrumpirá completamente<br>
            ❌ Tu suscripción será cancelada</p>
            
            <h3>✅ ¿Cómo evitarlo?</h3>
            <p>Actualiza tu método de pago <strong>AHORA</strong> para evitar la suspensión:</p>
            
            <div style="text-align: center;">
                <a href="https://panel.agutidesigns.es#facturacion" class="button" style="background: #dc2626; font-size: 1.3rem; padding: 20px 50px; color: #ffffff;">💳 EVITAR SUSPENSIÓN - ACTUALIZAR PAGO</a>
            </div>
            
            <div class="info-box">
                <p style="margin: 0;"><strong>💡 ¿Necesitas ayuda?</strong><br>
                Contáctanos de inmediato: <strong>info@agutidesigns.es</strong><br>
                Estamos aquí para ayudarte a resolver este problema.</p>
            </div>
            
            <p>No queremos que pierdas tu sitio web. Actuemos juntos para resolver esto.</p>
            
            <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
        `;
        
        return {
            to: clientData.email,
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: '❌ ÚLTIMA OPORTUNIDAD - Tu sitio será suspendido - agutidesigns',
            html: createEmailLayout(content, 'Acción urgente requerida: Evita la suspensión de tu servicio')
        };
    }
}

// 14. Servicio suspendido
function serviceSuspendedEmail(clientData) {
    const content = `
        <h1>❌ Tu servicio ha sido suspendido</h1>
        <p>Hola <strong>${clientData.full_name}</strong>,</p>
        <p>Lamentamos informarte que tu servicio ha sido suspendido debido a que no pudimos procesar el pago de tu suscripción después de 3 intentos.</p>
        
        <div class="danger-box">
            <p style="margin: 0 0 10px 0;"><strong>❌ Servicio suspendido</strong></p>
            <p style="margin: 0;">Fecha de suspensión: ${new Date().toLocaleDateString('es-ES')}</p>
        </div>
        
        <h3>🔒 Estado actual</h3>
        <p>• Tu sitio web ha sido desactivado<br>
        • Tu acceso al dashboard está limitado<br>
        • Puedes ver tus datos pero no usar funcionalidades</p>
        
        <h3>✅ Buenas noticias</h3>
        <p><strong>Tus datos están seguros</strong> y los conservamos por 30 días.</p>
        <p>Puedes reactivar tu servicio en cualquier momento actualizando tu método de pago:</p>
        
        <div style="text-align: center;">
            <a href="https://panel.agutidesigns.es#facturacion" class="button" style="color: #ffffff;">🔄 Reactivar Mi Servicio</a>
        </div>
        
        <h3>💬 ¿Necesitas ayuda?</h3>
        <p>Entendemos que pueden surgir problemas. Si necesitas asistencia o quieres discutir opciones, estamos aquí para ayudarte:</p>
        
        <div class="info-box">
            <p style="margin: 0;"><strong>Contacto:</strong> info@agutidesigns.es<br>
            <strong>Horario:</strong> Lunes a Viernes, 9:00 - 18:00</p>
        </div>
        
        <p>Esperamos poder reactivar tu servicio pronto.</p>
        
        <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
    `;
    
    return {
        to: clientData.email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: '❌ Tu servicio ha sido suspendido - agutidesigns',
        html: createEmailLayout(content, 'Tu servicio ha sido suspendido por falta de pago')
    };
}

// 8. Suscripción cancelada
function subscriptionCancelledEmail(clientData) {
    const content = `
        <h1>⚠️ Confirmación de cancelación</h1>
        <p>Hola <strong>${clientData.full_name}</strong>,</p>
        <p>Confirmamos que tu suscripción ha sido cancelada según tu solicitud.</p>
        
        <div class="warning-box">
            <p style="margin: 0 0 10px 0;"><strong>⚠️ Suscripción cancelada</strong></p>
            <p style="margin: 0;">Tu servicio finalizará el: <strong>${clientData.subscription_end_date}</strong></p>
        </div>
        
        <h3>📅 ¿Qué pasa ahora?</h3>
        <p>• Tu sitio web seguirá activo hasta la fecha de finalización<br>
        • Después de esa fecha, tu sitio será desactivado<br>
        • Tus datos estarán seguros por 30 días más<br>
        • Puedes reactivar en cualquier momento</p>
        
        <h3>🔄 ¿Cambiaste de opinión?</h3>
        <p>Si decides reactivar tu suscripción, puedes hacerlo fácilmente:</p>
        
        <div style="text-align: center;">
            <a href="https://panel.agutidesigns.es#facturacion" class="button" style="color: #ffffff;">🔄 Reactivar Mi Suscripción</a>
        </div>
        
        <p>Lamentamos verte partir, pero esperamos volver a trabajar juntos en el futuro.</p>
        
        <p>Saludos,<br><strong>El equipo de agutidesigns</strong></p>
    `;
    
    return {
        to: clientData.email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: '⚠️ Confirmación de cancelación - agutidesigns',
        html: createEmailLayout(content, 'Tu suscripción ha sido cancelada')
    };
}

/**
 * 📧 EMAILS AL ADMIN
 */

// Nuevo cliente registrado
function newClientAdminEmail(clientData) {
    const content = `
        <h1>🆕 Nuevo cliente registrado</h1>
        <p>Se ha registrado un nuevo cliente en la plataforma.</p>
        
        <h3>👤 Información del cliente</h3>
        <div class="info-box">
            <p style="margin: 5px 0;"><strong>Nombre:</strong> ${clientData.full_name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${clientData.email}</p>
            <p style="margin: 5px 0;"><strong>Empresa:</strong> ${clientData.business_name}</p>
            <p style="margin: 5px 0;"><strong>Plan:</strong> ${clientData.plan}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
        </div>
        
        <div style="text-align: center;">
            <a href="https://agutidesigns-admin.vercel.app/" class="button" style="color: #ffffff;">📊 Ver en Admin Dashboard</a>
        </div>
    `;
    
    return {
        to: ADMIN_EMAIL,
        from: { email: FROM_EMAIL, name: 'Sistema agutidesigns' },
        subject: '🆕 Nuevo cliente registrado - agutidesigns',
        html: createEmailLayout(content)
    };
}

// Nuevo pago recibido
function newPaymentAdminEmail(clientData, amount) {
    const content = `
        <h1>💰 Nuevo pago recibido</h1>
        <p>Se ha procesado un nuevo pago exitosamente.</p>
        
        <h3>💳 Detalles del pago</h3>
        <div class="success-box">
            <p style="margin: 5px 0;"><strong>Cliente:</strong> ${clientData.full_name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${clientData.email}</p>
            <p style="margin: 5px 0;"><strong>Plan:</strong> ${clientData.plan}</p>
            <p style="margin: 5px 0;"><strong>Monto:</strong> ${amount}€</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
        </div>
        
        <div style="text-align: center;">
            <a href="https://agutidesigns-admin.vercel.app/" class="button" style="color: #ffffff;">📊 Ver en Admin Dashboard</a>
        </div>
    `;
    
    return {
        to: ADMIN_EMAIL,
        from: { email: FROM_EMAIL, name: 'Sistema agutidesigns' },
        subject: '💰 Nuevo pago recibido - agutidesigns',
        html: createEmailLayout(content)
    };
}

// Nuevo ticket de soporte
function newTicketAdminEmail(clientData, ticketData) {
    const priorityEmoji = {
        'alta': '🔴',
        'media': '🟡',
        'baja': '🟢'
    };
    
    const content = `
        <h1>🎫 Nuevo ticket de soporte</h1>
        <p>Un cliente ha creado un nuevo ticket de soporte.</p>
        
        <h3>📋 Información del ticket</h3>
        <div class="info-box">
            <p style="margin: 5px 0;"><strong>Ticket #:</strong> ${ticketData.id}</p>
            <p style="margin: 5px 0;"><strong>Cliente:</strong> ${clientData.full_name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${clientData.email}</p>
            <p style="margin: 5px 0;"><strong>Asunto:</strong> ${ticketData.subject}</p>
            <p style="margin: 5px 0;"><strong>Categoría:</strong> ${ticketData.category}</p>
            <p style="margin: 5px 0;"><strong>Prioridad:</strong> ${priorityEmoji[ticketData.priority] || '🟡'} ${ticketData.priority}</p>
        </div>
        
        <h3>💬 Mensaje del cliente</h3>
        <div class="info-box">
            <p style="white-space: pre-wrap; margin: 0;">${ticketData.description}</p>
        </div>
        
        <div style="text-align: center;">
            <a href="https://agutidesigns-admin.vercel.app/#tickets" class="button" style="color: #ffffff;">💬 Responder Ticket</a>
        </div>
    `;
    
    return {
        to: ADMIN_EMAIL,
        from: { email: FROM_EMAIL, name: 'Sistema agutidesigns' },
        subject: `🎫 Nuevo ticket: ${ticketData.subject} - agutidesigns`,
        html: createEmailLayout(content)
    };
}

// Cliente con pago fallido
function paymentFailedAdminEmail(clientData, attemptNumber) {
    const urgencyClass = attemptNumber === 3 ? 'danger-box' : attemptNumber === 2 ? 'warning-box' : 'info-box';
    const emoji = attemptNumber === 3 ? '❌' : attemptNumber === 2 ? '⚠️' : '⚠️';
    
    const content = `
        <h1>${emoji} Cliente con pago fallido (${attemptNumber}/3)</h1>
        <p>Un cliente tiene problemas con el procesamiento de su pago.</p>
        
        <h3>👤 Información del cliente</h3>
        <div class="${urgencyClass}">
            <p style="margin: 5px 0;"><strong>Cliente:</strong> ${clientData.full_name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${clientData.email}</p>
            <p style="margin: 5px 0;"><strong>Plan:</strong> ${clientData.plan}</p>
            <p style="margin: 5px 0;"><strong>Intentos fallidos:</strong> ${attemptNumber} de 3</p>
            <p style="margin: 5px 0;"><strong>Razón:</strong> ${clientData.failure_reason || 'Fondos insuficientes'}</p>
        </div>
        
        ${attemptNumber === 3 ? '<p><strong>⚠️ ATENCIÓN:</strong> Si el cliente no actualiza su método de pago, el servicio será suspendido automáticamente.</p>' : ''}
        
        <div style="text-align: center;">
            <a href="https://agutidesigns-admin.vercel.app/" class="button">📊 Ver Cliente en Admin</a>
        </div>
        
        <p><em>Considera contactar al cliente para ofrecer asistencia.</em></p>
    `;
    
    return {
        to: ADMIN_EMAIL,
        from: { email: FROM_EMAIL, name: 'Sistema agutidesigns' },
        subject: `${emoji} Cliente con pago fallido (${attemptNumber}/3): ${clientData.full_name} - agutidesigns`,
        html: createEmailLayout(content)
    };
}

// Checkout abandonado - Email de recordatorio
function checkoutAbandonedEmail(submissionData) {
    const planInfo = {
        'basico': { name: 'Plan Básico', price: '35€', pages: '5 páginas' },
        'avanzado': { name: 'Plan Avanzado', price: '49€', pages: '10 páginas' },
        'premium': { name: 'Plan Premium', price: '65€', pages: '20 páginas' }
    };
    
    const plan = planInfo[submissionData.plan] || planInfo.basico;
    
    const content = `
        <h1>⏰ ¿Te quedaste a medias?</h1>
        <p>Hola <strong>${submissionData.full_name}</strong>,</p>
        <p>Notamos que comenzaste el proceso para crear tu sitio web profesional pero no lo completaste.</p>
        
        <div class="warning-box">
            <p style="margin: 0;"><strong>🎯 Tu plan seleccionado:</strong> ${plan.name} - ${plan.price}/mes</p>
            <p style="margin: 5px 0 0 0;">Incluye ${plan.pages} + dominio + hosting + soporte</p>
        </div>
        
        <h3>💡 ¿Por qué completar tu pedido?</h3>
        <ul style="color: #666; line-height: 1.8;">
            <li><strong>✅ Diseño profesional</strong> - Tu web se verá increíble desde el primer día</li>
            <li><strong>✅ Optimizada para móviles</strong> - Funcionará perfecto en todos los dispositivos</li>
            <li><strong>✅ SEO incluido</strong> - Aparecerás en Google desde el inicio</li>
            <li><strong>✅ Soporte continuo</strong> - Te ayudamos siempre que lo necesites</li>
            <li><strong>✅ Sin sorpresas</strong> - Precio fijo, sin costes ocultos</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://formulario.agutidesigns.es/checkout.html?plan=${submissionData.plan}&email=${encodeURIComponent(submissionData.email)}" class="button" style="color: #ffffff;">🚀 Completar Mi Pedido</a>
        </div>
        
        <div class="info-box">
            <p style="margin: 0;"><strong>⏱️ Proceso rápido:</strong> Solo te tomará 2 minutos completar tu pedido y en 5 días tendrás tu web lista.</p>
        </div>
        
        <h3>❓ ¿Tienes dudas?</h3>
        <p>Si tienes alguna pregunta sobre el proceso o necesitas ayuda, no dudes en contactarnos:</p>
        <p>📧 <a href="mailto:info@agutidesigns.es" style="color: #0046FE;">info@agutidesigns.es</a> | 📞 Respondemos en menos de 2 horas</p>
        
        <div class="divider"></div>
        
        <p style="color: #999; font-size: 0.9rem; text-align: center;">
            <strong>💌 Oferta especial:</strong> Si completas tu pedido en las próximas 24 horas, 
            te incluimos <strong>gratis</strong> la optimización SEO avanzada (valor: 150€).
        </p>
    `;
    
    return {
        to: submissionData.email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `⏰ ¿Completamos tu sitio web de ${submissionData.business_name}? - agutidesigns`,
        html: createEmailLayout(content, `Completa tu pedido y obtén tu sitio web profesional en 5 días`)
    };
}

/**
 * 🚀 FUNCIONES DE ENVÍO
 */

async function sendEmail(type, data) {
    try {
        let emailData;
        
        switch(type) {
            // Emails al cliente
            case 'welcome':
                emailData = welcomeEmail(data);
                break;
            case 'payment-success':
                emailData = paymentSuccessEmail(data);
                break;
            case 'website-delivered':
                emailData = websiteDeliveredEmail(data);
                break;
            case 'ticket-response':
                emailData = ticketResponseEmail(data.client, data.ticket);
                break;
            case 'password-reset':
                emailData = passwordResetEmail(data.email, data.token);
                break;
            case 'renewal-reminder':
                emailData = renewalReminderEmail(data.client, data.daysLeft);
                break;
            case 'payment-failed':
                emailData = paymentFailedEmail(data.client, data.attemptNumber);
                break;
            case 'service-suspended':
                emailData = serviceSuspendedEmail(data);
                break;
            case 'subscription-cancelled':
                emailData = subscriptionCancelledEmail(data);
                break;
            case 'checkout-abandoned':
                emailData = checkoutAbandonedEmail(data);
                break;
            
            // Emails al admin
            case 'admin-new-client':
                emailData = newClientAdminEmail(data);
                break;
            case 'admin-new-payment':
                emailData = newPaymentAdminEmail(data.client, data.amount);
                break;
            case 'admin-new-ticket':
                emailData = newTicketAdminEmail(data.client, data.ticket);
                break;
            case 'admin-payment-failed':
                emailData = paymentFailedAdminEmail(data.client, data.attemptNumber);
                break;
            
            // Email personalizado (permite enviar HTML directo)
            case 'custom':
                emailData = {
                    to: data.to,
                    from: FROM_EMAIL,
                    subject: data.subject,
                    html: data.html
                };
                break;
            
            default:
                throw new Error(`Tipo de email no reconocido: ${type}`);
        }
        
        console.log(`📤 [SENDGRID] Intentando enviar email...`);
        console.log(`   Tipo: ${type}`);
        console.log(`   De: ${emailData.from}`);
        console.log(`   Para: ${emailData.to}`);
        console.log(`   Asunto: ${emailData.subject}`);
        console.log(`   API Key configurada: ${process.env.SENDGRID_API_KEY ? 'Sí (primeros 10 chars: ' + process.env.SENDGRID_API_KEY.substring(0, 10) + '...)' : 'NO ❌'}`);
        
        const result = await sgMail.send(emailData);
        console.log(`✅ Email enviado exitosamente: ${type} → ${emailData.to}`);
        console.log(`📊 [SENDGRID] Response status:`, result[0].statusCode);
        return { success: true, result };
        
    } catch (error) {
        console.error(`❌ Error enviando email (${type}):`, error);
        console.error(`❌ Error code:`, error.code);
        console.error(`❌ Error message:`, error.message);
        if (error.response) {
            console.error('❌ SendGrid response status:', error.response.statusCode);
            console.error('❌ SendGrid response body:', JSON.stringify(error.response.body, null, 2));
        }
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendEmail,
    FROM_EMAIL,
    ADMIN_EMAIL
};
