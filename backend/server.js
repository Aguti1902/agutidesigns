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
        // Permitir requests sin origin (como Postman o apps móviles)
        if (!origin) return callback(null, true);
        
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
                    stripe_subscription_id: subscription.id
                });

                console.log('Cliente creado exitosamente:', submission.email);
            } else {
                console.log('Cliente ya existe, actualizando datos de suscripción');
                // TODO: Actualizar cliente existente con datos de Stripe
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