require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fileUpload = require('express-fileupload');
const path = require('path');
const db = require('./database');
const emailService = require('./email-service');

const app = express();
const PORT = process.env.PORT || 3000;

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
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// 2. CREAR SESIÓN DE CHECKOUT DE STRIPE
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { plan, formData } = req.body;

        // Mapear plan a Price ID de Stripe
        const priceIds = {
            'basico': process.env.STRIPE_PRICE_BASICO,
            'avanzado': process.env.STRIPE_PRICE_AVANZADO,
            'premium': process.env.STRIPE_PRICE_PREMIUM
        };

        const priceId = priceIds[plan];
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

// 3. WEBHOOK DE STRIPE (recibir eventos de pago)
app.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
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