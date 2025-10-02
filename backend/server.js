require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Determinar si estamos en modo test
const isTestMode = process.env.TEST_MODE === 'true';

// Usar claves de Stripe según el modo
const STRIPE_SECRET_KEY = isTestMode 
    ? process.env.STRIPE_SECRET_KEY_TEST 
    : process.env.STRIPE_SECRET_KEY;

const STRIPE_PUBLISHABLE_KEY = isTestMode
    ? process.env.STRIPE_PUBLISHABLE_KEY_TEST
    : process.env.STRIPE_PUBLISHABLE_KEY;

const STRIPE_WEBHOOK_SECRET = isTestMode
    ? process.env.STRIPE_WEBHOOK_SECRET_TEST
    : process.env.STRIPE_WEBHOOK_SECRET;

const STRIPE_PRICES = {
    basico: isTestMode ? process.env.STRIPE_PRICE_BASICO_TEST : process.env.STRIPE_PRICE_BASICO,
    avanzado: isTestMode ? process.env.STRIPE_PRICE_AVANZADO_TEST : process.env.STRIPE_PRICE_AVANZADO,
    premium: isTestMode ? process.env.STRIPE_PRICE_PREMIUM_TEST : process.env.STRIPE_PRICE_PREMIUM
};

const stripe = require('stripe')(STRIPE_SECRET_KEY);
const fileUpload = require('express-fileupload');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');
const emailService = require('./email-service');

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`🚀 Servidor iniciando en modo: ${isTestMode ? 'TEST ⚠️' : 'PRODUCCIÓN ✅'}`);

// Middleware - Configuración CORS mejorada
const allowedOrigins = [
    'http://localhost:5500',
    'https://agutidesigns.vercel.app',
    'https://agutidesigns.vercel.app/',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (como Postman, apps móviles, archivos locales)
        if (!origin || origin === 'null') return callback(null, true);
        
        // Verificar si el origin está en la lista de permitidos
        if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
            callback(null, true);
        } else {
            console.log('Origen bloqueado por CORS:', origin);
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Para el webhook de Stripe, necesitamos el body sin procesar
app.use('/webhook', express.raw({ type: 'application/json' }));

// Para el resto de rutas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

// Servir archivos estáticos del dashboard
app.use('/admin', express.static(path.join(__dirname, '../admin-dashboard')));

// ===== RUTAS API =====

// 1. OBTENER CLAVE PÚBLICA DE STRIPE
app.get('/api/config', (req, res) => {
    res.json({
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        testMode: isTestMode
    });
});

// 2. CREAR SESIÓN DE CHECKOUT DE STRIPE
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { plan, formData } = req.body;

        // Usar Price ID según el modo (test/live)
        const priceId = STRIPE_PRICES[plan];
        if (!priceId) {
            return res.status(400).json({ error: 'Plan inválido' });
        }

        // Guardar datos del formulario temporalmente (pending)
        const submissionId = db.createSubmission({
            ...formData,
            plan,
            status: 'pending',
            amount: plan === 'basico' ? 35 : plan === 'avanzado' ? 49 : 65
        });

        // Crear sesión de Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            customer_email: formData.email,
            client_reference_id: String(submissionId),
            metadata: {
                submission_id: String(submissionId),
                plan: plan,
                business_name: formData.business_name
            },
            success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: process.env.CANCEL_URL,
            billing_address_collection: 'required',
        });

        res.json({ sessionId: session.id, sessionUrl: session.url });
    } catch (error) {
        console.error('Error creando sesión de checkout:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2B. CREAR SUSCRIPCIÓN CON STRIPE ELEMENTS (checkout personalizado)
app.post('/api/create-subscription', async (req, res) => {
    try {
        const { paymentMethodId, plan, formData, billingDetails } = req.body;

        // Usar Price ID según el modo (test/live)
        const priceId = STRIPE_PRICES[plan];
        if (!priceId) {
            return res.status(400).json({ error: 'Plan inválido' });
        }

        // Construir full_name desde first_name y last_name
        const fullName = formData.first_name && formData.last_name 
            ? `${formData.first_name} ${formData.last_name}`.trim()
            : (formData.full_name || 'Cliente');

        // Guardar datos del formulario temporalmente (pending)
        const submissionId = db.createSubmission({
            ...formData,
            full_name: fullName,
            plan,
            status: 'pending',
            amount: plan === 'basico' ? 35 : plan === 'avanzado' ? 49 : 65
        });

        // Crear o obtener cliente en Stripe
        const customer = await stripe.customers.create({
            payment_method: paymentMethodId,
            email: billingDetails.email,
            name: billingDetails.name,
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
            metadata: {
                submission_id: String(submissionId),
                business_name: formData.business_name || ''
            }
        });

        // Crear suscripción
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                submission_id: String(submissionId),
                plan: plan,
                business_name: formData.business_name || ''
            }
        });

        const invoice = subscription.latest_invoice;
        const paymentIntent = invoice.payment_intent;

        // Verificar si requiere acción (3D Secure)
        if (paymentIntent.status === 'requires_action') {
            return res.json({
                requiresAction: true,
                clientSecret: paymentIntent.client_secret,
                subscriptionId: subscription.id
            });
        }

        // Pago exitoso
        if (paymentIntent.status === 'succeeded') {
            // Actualizar estado a "paid"
            db.updateSubmissionStatus(submissionId, 'paid', subscription.id);

            // Obtener datos completos
            const submission = db.getSubmission(submissionId);

            // Crear cliente/usuario con contraseña hasheada (si no existe ya)
            const existingClient = db.getClientByEmail(submission.email);
            
            if (!existingClient) {
                // Hashear la contraseña desde la submission
                const passwordToHash = submission.password || formData.password || 'temp123';
                const hashedPassword = await bcrypt.hash(passwordToHash, 10);
                
                // Construir full_name correctamente
                let fullName = submission.full_name;
                if (!fullName && formData.first_name && formData.last_name) {
                    fullName = `${formData.first_name} ${formData.last_name}`;
                } else if (!fullName) {
                    fullName = 'Cliente';
                }
                
                db.createClient({
                    email: submission.email,
                    password: hashedPassword,
                    full_name: fullName,
                    business_name: submission.business_name,
                    plan: plan,
                    submission_id: submissionId,
                    stripe_customer_id: customer.id,
                    stripe_subscription_id: subscription.id,
                    payment_date: new Date().toISOString()
                });

                console.log('Cliente creado exitosamente:', submission.email);
            } else {
                console.log('Cliente ya existe, actualizando datos de suscripción');
                // Actualizar plan y payment_date
                const stmt = db.db.prepare(
                    'UPDATE clients SET plan = ?, stripe_subscription_id = ?, payment_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
                );
                stmt.run(plan, subscription.id, new Date().toISOString(), existingClient.id);
            }

            // Enviar emails
            await emailService.sendAdminNotification(submission);
            await emailService.sendClientConfirmation(submission);

            return res.json({
                success: true,
                subscriptionId: subscription.id
            });
        }

        res.json({ success: true, subscriptionId: subscription.id });

    } catch (error) {
        console.error('Error creando suscripción:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. WEBHOOK DE STRIPE (recibir eventos de pago)
app.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Manejar evento
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const submissionId = session.client_reference_id;

            // Actualizar estado a "paid"
            db.updateSubmissionStatus(submissionId, 'paid', session.id);

            // Obtener datos completos
            const submission = db.getSubmission(submissionId);

            // Enviar email al admin
            await emailService.sendAdminNotification(submission);

            // Enviar email de confirmación al cliente
            await emailService.sendClientConfirmation(submission);

            console.log(`Pago completado para submission ${submissionId}`);
            break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            console.log(`Suscripción actualizada: ${event.type}`);
            break;

        default:
            console.log(`Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });
});

// 4. OBTENER DATOS DE UNA SESIÓN
app.get('/api/session/:sessionId', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. DASHBOARD ADMIN - LOGIN
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin-token-simple' });
    } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
    }
});

// 6. DASHBOARD ADMIN - OBTENER TODAS LAS SOLICITUDES
app.get('/api/admin/submissions', (req, res) => {
    try {
        const submissions = db.getAllSubmissions();
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. DASHBOARD ADMIN - OBTENER UNA SOLICITUD
app.get('/api/admin/submissions/:id', (req, res) => {
    try {
        const submission = db.getSubmission(req.params.id);
        if (submission) {
            res.json(submission);
        } else {
            res.status(404).json({ error: 'Solicitud no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 8. DASHBOARD ADMIN - ACTUALIZAR ESTADO
app.patch('/api/admin/submissions/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        db.updateSubmissionStatus(req.params.id, status);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. DASHBOARD ADMIN - ESTADÍSTICAS
app.get('/api/admin/stats', (req, res) => {
    try {
        const stats = db.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para obtener datos de suscripción (para success page)
app.get('/api/subscription-data/:subscriptionId', async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        
        // Buscar la submission por stripe_subscription_id
        const submission = db.getSubmissionBySubscriptionId(subscriptionId);
        
        if (!submission) {
            return res.status(404).json({ error: 'Suscripción no encontrada' });
        }

        // Devolver datos necesarios para la página de éxito
        res.json({
            plan: submission.plan,
            business_name: submission.business_name,
            email: submission.email,
            full_name: submission.full_name,
            domain_name: submission.domain_name,
            status: submission.status
        });

    } catch (error) {
        console.error('Error obteniendo datos de suscripción:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ===== ENDPOINTS DE CLIENTES =====

// Registro de cliente (sin pagar)
app.post('/api/client/register', async (req, res) => {
    try {
        const { email, password, full_name, business_name, plan } = req.body;

        console.log('Intento de registro:', { email, full_name, plan });

        // Validaciones
        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
        }

        // Verificar si el cliente ya existe
        const existingClient = db.getClientByEmail(email);
        if (existingClient) {
            return res.status(400).json({ error: 'Ya existe una cuenta con este email' });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear cliente sin plan activo (plan null o 'ninguno')
        const clientId = db.createClient({
            email: email,
            password: hashedPassword,
            full_name: full_name,
            business_name: business_name || null,
            plan: plan || null,
            submission_id: null,
            stripe_customer_id: null,
            stripe_subscription_id: null
        });

        if (!clientId) {
            return res.status(500).json({ error: 'Error al crear la cuenta' });
        }

        console.log('Cliente registrado exitosamente:', { clientId, email });

        // Obtener cliente recién creado (sin contraseña)
        const client = db.getClientById(clientId);
        delete client.password;

        res.json({
            success: true,
            message: 'Cuenta creada exitosamente',
            client
        });

    } catch (error) {
        console.error('Error en registro de cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Debug: Verificar si un cliente existe por email
app.get('/api/client/check/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const client = db.getClientByEmail(email);
        
        if (!client) {
            return res.json({ 
                exists: false,
                message: 'No se encontró cliente con ese email'
            });
        }

        res.json({ 
            exists: true,
            clientId: client.id,
            email: client.email,
            full_name: client.full_name,
            plan: client.plan,
            created_at: client.created_at
        });

    } catch (error) {
        console.error('Error verificando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Login de cliente
app.post('/api/client/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Intento de login:', { email, passwordLength: password?.length });

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar cliente
        const client = db.getClientByEmail(email);
        if (!client) {
            console.log('Cliente no encontrado:', email);
            return res.status(401).json({ error: 'No existe una cuenta con este email. Por favor, verifica que hayas completado el pago.' });
        }

        console.log('Cliente encontrado:', { id: client.id, email: client.email });

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, client.password);
        if (!isValidPassword) {
            console.log('Contraseña incorrecta para:', email);
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // No enviar la contraseña al cliente
        delete client.password;

        res.json({ 
            success: true, 
            client,
            message: 'Login exitoso' 
        });

    } catch (error) {
        console.error('Error en login de cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener datos del dashboard del cliente
app.get('/api/client/dashboard/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        const dashboardData = db.getClientDashboardData(parseInt(clientId));
        
        if (!dashboardData) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // No enviar contraseña
        if (dashboardData.client) {
            delete dashboardData.client.password;
        }

        res.json(dashboardData);

    } catch (error) {
        console.error('Error obteniendo dashboard del cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Actualizar contraseña del cliente
app.post('/api/client/change-password', async (req, res) => {
    try {
        const { clientId, currentPassword, newPassword } = req.body;

        const client = db.getClientById(parseInt(clientId));
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, client.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Actualizar en la base de datos
        const stmt = require('./database').db.prepare(
            'UPDATE clients SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        );
        stmt.run(hashedPassword, clientId);

        res.json({ success: true, message: 'Contraseña actualizada' });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Actualizar información del cliente (general)
app.patch('/api/client/update-info/:clientId', async (req, res) => {
    try {
        const { clientId} = req.params;
        const { section, data } = req.body;

        console.log('Actualizando información del cliente:', clientId, section, data);

        const client = db.getClientById(parseInt(clientId));
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Verificar si puede editar (24h para clientes con plan)
        if (client.plan && client.payment_date) {
            const paymentDate = new Date(client.payment_date);
            const now = new Date();
            const hoursSincePayment = (now - paymentDate) / (1000 * 60 * 60);
            
            if (hoursSincePayment > 24) {
                return res.status(403).json({ 
                    error: 'El período de edición (24h) ha finalizado. Contacta a soporte para hacer cambios.',
                    expired: true
                });
            }
        }
        // Usuarios sin plan pueden editar siempre (no se valida)

        // Si tiene submission asociada, actualizar ahí
        if (client.submission_id) {
            let updateQuery = '';
            let updateParams = [];
            
            if (section === 'negocio') {
                updateQuery = 'UPDATE submissions SET business_name = ?, industry = ?, business_description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                updateParams = [data.business_name, data.industry, data.business_description, client.submission_id];
                
                // También actualizar en clients
                if (data.business_name) {
                    const stmtClient = db.db.prepare('UPDATE clients SET business_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
                    stmtClient.run(data.business_name, clientId);
                }
            } else if (section === 'contacto') {
                updateQuery = 'UPDATE submissions SET email_contact = ?, phone_number = ?, whatsapp_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                updateParams = [data.email_contact, data.phone_number, data.whatsapp_number, client.submission_id];
            } else if (section === 'paginas') {
                updateQuery = 'UPDATE submissions SET pages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                updateParams = [JSON.stringify(data.pages), client.submission_id];
            } else if (section === 'dominio') {
                updateQuery = 'UPDATE submissions SET domain_name = ?, keywords = ?, design_style = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                updateParams = [data.domain_name, data.keywords, data.design_style, client.submission_id];
            } else if (section === 'fiscal') {
                updateQuery = 'UPDATE submissions SET cif_nif = ?, razon_social = ?, direccion_fiscal = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                updateParams = [data.cif_nif, data.razon_social, data.direccion_fiscal, client.submission_id];
            }
            
            if (updateQuery) {
                const stmt = db.db.prepare(updateQuery);
                stmt.run(...updateParams);
            }
        }

        res.json({ success: true, message: 'Información actualizada' });

    } catch (error) {
        console.error('Error actualizando información:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// TESTING: Crear cuenta de prueba rápida
app.post('/api/create-test-account', async (req, res) => {
    try {
        const { email, password, full_name, plan } = req.body;
        
        // Validar que se proporcionen los datos básicos
        const testEmail = email || `test${Date.now()}@agutidesigns.com`;
        const testPassword = password || 'testing123';
        const testName = full_name || 'Usuario Prueba';
        const testPlan = plan || null; // null = sin plan
        
        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        
        // Crear cliente
        const clientId = db.createClient({
            email: testEmail,
            password: hashedPassword,
            full_name: testName,
            business_name: 'Empresa de Prueba',
            plan: testPlan,
            submission_id: null,
            stripe_customer_id: null,
            stripe_subscription_id: null
        });
        
        if (!clientId) {
            return res.status(500).json({ error: 'Error al crear cuenta de prueba' });
        }
        
        console.log('✅ Cuenta de prueba creada:', { clientId, email: testEmail });
        
        res.json({
            success: true,
            message: 'Cuenta de prueba creada',
            credentials: {
                email: testEmail,
                password: testPassword,
                dashboard_url: 'https://agutidesigns.vercel.app/client-dashboard/'
            },
            client: {
                id: clientId,
                email: testEmail,
                full_name: testName,
                plan: testPlan
            }
        });
        
    } catch (error) {
        console.error('Error creando cuenta de prueba:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// ENDPOINTS DE SOPORTE: TICKETS Y CHAT IA
// =============================================

// Crear ticket de soporte
app.post('/api/tickets', async (req, res) => {
    try {
        const ticketData = req.body;
        
        console.log('📩 Nuevo ticket recibido:', ticketData);
        
        // Crear ticket en la BD
        const ticket = db.createTicket(ticketData);
        
        // Enviar email al admin notificando del nuevo ticket
        try {
            await emailService.sendEmail({
                to: 'info@agutidesigns.com',
                subject: `🎫 Nuevo Ticket de Soporte #${ticket.id} - ${ticketData.priority.toUpperCase()}`,
                html: `
                    <h2>Nuevo Ticket de Soporte</h2>
                    <p><strong>ID:</strong> ${ticket.id}</p>
                    <p><strong>Cliente:</strong> ${ticketData.client_name} (${ticketData.client_email})</p>
                    <p><strong>Negocio:</strong> ${ticketData.business_name || 'N/A'}</p>
                    <p><strong>Asunto:</strong> ${ticketData.subject}</p>
                    <p><strong>Categoría:</strong> ${ticketData.category}</p>
                    <p><strong>Prioridad:</strong> ${ticketData.priority}</p>
                    <hr>
                    <h3>Descripción:</h3>
                    <p>${ticketData.description}</p>
                    <hr>
                    <p style="color: #666; font-size: 0.9rem;">Fecha: ${new Date().toLocaleString('es-ES')}</p>
                `
            });
        } catch (emailError) {
            console.error('Error enviando email de notificación:', emailError);
        }
        
        // Enviar confirmación al cliente
        try {
            await emailService.sendEmail({
                to: ticketData.client_email,
                subject: `Ticket de Soporte #${ticket.id} - agutidesigns`,
                html: `
                    <h2>¡Ticket Recibido!</h2>
                    <p>Hola ${ticketData.client_name},</p>
                    <p>Hemos recibido tu consulta y nuestro equipo la revisará pronto.</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p><strong>Ticket #${ticket.id}</strong></p>
                        <p><strong>Asunto:</strong> ${ticketData.subject}</p>
                        <p><strong>Prioridad:</strong> ${ticketData.priority}</p>
                        <p><strong>Tiempo estimado de respuesta:</strong></p>
                        <ul>
                            <li>Alta: 6 horas</li>
                            <li>Media: 24 horas</li>
                            <li>Baja: 48 horas</li>
                        </ul>
                    </div>
                    <p>Te responderemos a este email cuando tengamos una solución.</p>
                    <p>Gracias,<br>El equipo de agutidesigns</p>
                `
            });
        } catch (emailError) {
            console.error('Error enviando confirmación al cliente:', emailError);
        }
        
        res.json({
            success: true,
            ticket: ticket,
            message: 'Ticket creado correctamente'
        });
        
    } catch (error) {
        console.error('Error creando ticket:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener todos los tickets (para admin)
app.get('/api/tickets', (req, res) => {
    try {
        const tickets = db.getAllTickets();
        res.json({ tickets });
    } catch (error) {
        console.error('Error obteniendo tickets:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener tickets de un cliente
app.get('/api/tickets/client/:clientId', (req, res) => {
    try {
        const { clientId } = req.params;
        const tickets = db.getTicketsByClient(parseInt(clientId));
        res.json({ tickets });
    } catch (error) {
        console.error('Error obteniendo tickets del cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar ticket (responder o cambiar estado)
app.patch('/api/tickets/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, admin_response } = req.body;
        
        db.updateTicket(parseInt(ticketId), { status, admin_response });
        
        const ticket = db.getTicketById(parseInt(ticketId));
        
        // Si hay respuesta del admin, enviar email al cliente
        if (admin_response) {
            try {
                await emailService.sendEmail({
                    to: ticket.client_email,
                    subject: `Respuesta a tu Ticket #${ticketId} - agutidesigns`,
                    html: `
                        <h2>Respuesta a tu Consulta</h2>
                        <p>Hola ${ticket.client_name},</p>
                        <p>Hemos respondido a tu ticket:</p>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p><strong>Ticket #${ticketId}: ${ticket.subject}</strong></p>
                            <hr>
                            <h3>Respuesta:</h3>
                            <p style="white-space: pre-wrap;">${admin_response}</p>
                        </div>
                        <p>Si necesitas más ayuda, no dudes en responder a este email o crear un nuevo ticket desde tu dashboard.</p>
                        <p>Saludos,<br>El equipo de agutidesigns</p>
                    `
                });
            } catch (emailError) {
                console.error('Error enviando respuesta al cliente:', emailError);
            }
        }
        
        res.json({
            success: true,
            ticket: ticket,
            message: 'Ticket actualizado correctamente'
        });
        
    } catch (error) {
        console.error('Error actualizando ticket:', error);
        res.status(500).json({ error: error.message });
    }
});

// Chat con IA (versión básica - podrás integrar OpenAI más tarde)
app.post('/api/chat-ai', async (req, res) => {
    try {
        const { message, client_id, context } = req.body;
        
        console.log('💬 Mensaje de chat recibido:', message, 'Cliente:', client_id);
        
        // Por ahora, respuestas predefinidas basadas en keywords
        // TODO: Integrar con OpenAI API para respuestas reales
        let response = '';
        
        const messageLower = message.toLowerCase();
        
        if (messageLower.includes('editar') || messageLower.includes('cambiar') || messageLower.includes('modificar')) {
            response = `Para editar tu sitio web:\n\n1️⃣ Ve a la sección "Mi Sitio Web" en el menú lateral\n2️⃣ Haz clic en "Editar Contenido"\n3️⃣ Modifica los textos, imágenes o cualquier elemento\n4️⃣ Guarda los cambios\n\n¿Necesitas ayuda con algo específico?`;
        } else if (messageLower.includes('dominio') || messageLower.includes('url')) {
            response = `Sobre tu dominio:\n\n✓ Tu dominio está incluido en tu plan ${context?.plan || ''}\n✓ Puedes ver los detalles en "Dominio & Hosting"\n✓ El dominio se activa en 24-48h después del pago\n\n¿Quieres cambiar tu dominio o necesitas más información?`;
        } else if (messageLower.includes('precio') || messageLower.includes('plan') || messageLower.includes('pago')) {
            response = `Información de planes:\n\n📦 Plan Básico: 35€/mes + IVA (5 páginas)\n📦 Plan Avanzado: 49€/mes + IVA (10 páginas)\n📦 Plan Premium: 65€/mes + IVA (20 páginas)\n\nTodos incluyen:\n✓ Dominio .com o .es\n✓ Hosting y SSL\n✓ Soporte técnico\n✓ Actualizaciones ilimitadas\n\nVe a "Facturación" para cambiar de plan.`;
        } else if (messageLower.includes('tiempo') || messageLower.includes('cuando') || messageLower.includes('entrega')) {
            response = `⏰ Tiempos de entrega:\n\n✓ Tu web estará lista en 5 días hábiles\n✓ Recibirás actualizaciones por email\n✓ Puedes ver el progreso en tu dashboard\n\nSi ya han pasado más de 5 días, por favor crea un ticket de soporte para que nuestro equipo lo revise.`;
        } else if (messageLower.includes('soporte') || messageLower.includes('ayuda') || messageLower.includes('problema')) {
            response = `🆘 Formas de obtener ayuda:\n\n1. Chat IA (estás aquí) - Respuestas rápidas 24/7\n2. Tickets de Soporte - Para consultas detalladas\n3. Tutoriales en Video - Guías paso a paso\n\n¿Quieres que te ayude con algo específico o prefieres crear un ticket de soporte?`;
        } else if (messageLower.includes('seo') || messageLower.includes('google') || messageLower.includes('posicionamiento')) {
            response = `🚀 Optimización SEO:\n\nTu plan incluye:\n✓ Configuración básica de SEO\n✓ Meta descripciones optimizadas\n✓ Estructura de URLs amigables\n✓ Sitemap automático\n\nEn la sección "SEO & Marketing" puedes:\n- Ver tus keywords\n- Conectar Google Analytics\n- Optimizar contenido\n\n¿Te ayudo con algo más específico de SEO?`;
        } else if (messageLower.includes('imagen') || messageLower.includes('foto') || messageLower.includes('logo')) {
            response = `🖼️ Gestión de imágenes:\n\nDesde "Mi Sitio Web" puedes:\n✓ Subir nuevas imágenes (máx 5MB)\n✓ Reemplazar imágenes existentes\n✓ Optimizar automáticamente para web\n\nTodas las imágenes se optimizan para carga rápida.\n\n¿Necesitas ayuda para subir imágenes?`;
        } else {
            response = `Estoy aquí para ayudarte con tu sitio web de agutidesigns.\n\nPuedo ayudarte con:\n\n📝 Edición de contenido\n🌐 Información de dominio\n💳 Planes y facturación\n🚀 SEO y marketing\n🖼️ Gestión de imágenes\n📊 Estadísticas\n⏰ Tiempos de entrega\n\n¿Qué necesitas saber? Pregúntame algo específico o crea un ticket si necesitas ayuda personalizada.`;
        }
        
        res.json({
            success: true,
            response: response
        });
        
    } catch (error) {
        console.error('Error en chat IA:', error);
        res.status(500).json({ error: error.message });
    }
});

// Estadísticas de tickets (para admin)
app.get('/api/tickets/stats', (req, res) => {
    try {
        const stats = db.getTicketStats();
        res.json({ stats });
    } catch (error) {
        console.error('Error obteniendo estadísticas de tickets:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Dashboard admin: http://localhost:${PORT}/admin`);
    console.log(`💳 Webhook URL: http://localhost:${PORT}/webhook`);
}); 