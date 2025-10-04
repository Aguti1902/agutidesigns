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

// Price IDs mensuales
const STRIPE_PRICES_MONTHLY = {
    basico: isTestMode ? process.env.STRIPE_PRICE_BASICO_MONTHLY_TEST : process.env.STRIPE_PRICE_BASICO_MONTHLY,
    avanzado: isTestMode ? process.env.STRIPE_PRICE_AVANZADO_MONTHLY_TEST : process.env.STRIPE_PRICE_AVANZADO_MONTHLY,
    premium: isTestMode ? process.env.STRIPE_PRICE_PREMIUM_MONTHLY_TEST : process.env.STRIPE_PRICE_PREMIUM_MONTHLY
};

// Price IDs anuales
const STRIPE_PRICES_ANNUAL = {
    basico: isTestMode ? process.env.STRIPE_PRICE_BASICO_ANNUAL_TEST : process.env.STRIPE_PRICE_BASICO_ANNUAL,
    avanzado: isTestMode ? process.env.STRIPE_PRICE_AVANZADO_ANNUAL_TEST : process.env.STRIPE_PRICE_AVANZADO_ANNUAL,
    premium: isTestMode ? process.env.STRIPE_PRICE_PREMIUM_ANNUAL_TEST : process.env.STRIPE_PRICE_PREMIUM_ANNUAL
};

// Mantener compatibilidad hacia atrás (por defecto mensual)
const STRIPE_PRICES = STRIPE_PRICES_MONTHLY;

const stripe = require('stripe')(STRIPE_SECRET_KEY);
const fileUpload = require('express-fileupload');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');
const emailService = require('./email-service');

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`🚀 Servidor iniciando en modo: ${isTestMode ? 'TEST ⚠️' : 'PRODUCCIÓN ✅'}`);

// ============================================
// 🕒 FUNCIÓN HELPER: Calcular deadline automático
// ============================================
function calculateDeadline(plan, paymentDate = new Date()) {
    const deadlineDays = {
        'basico': 5,      // 5 días para plan básico
        'avanzado': 10,   // 10 días para plan avanzado
        'premium': 15     // 15 días para plan premium
    };
    
    const days = deadlineDays[plan?.toLowerCase()] || 7; // Default: 7 días
    const deadline = new Date(paymentDate);
    deadline.setDate(deadline.getDate() + days);
    
    const formattedDeadline = deadline.toISOString().split('T')[0]; // Formato: YYYY-MM-DD
    console.log(`⏰ [DEADLINE] Plan: ${plan} → ${days} días → Deadline: ${formattedDeadline}`);
    return formattedDeadline;
}

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
// Aumentar límite de payload para imágenes en base64
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
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
        const submissionId = await db.createSubmission({
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
        const { paymentMethodId, plan, billing_cycle, submissionId, formData, billingDetails } = req.body;

        // Determinar qué Price IDs usar según billing_cycle
        const billingCycle = billing_cycle || 'monthly';
        const PRICES = billingCycle === 'annual' ? STRIPE_PRICES_ANNUAL : STRIPE_PRICES_MONTHLY;
        
        console.log('🔍 Debug checkout:');
        console.log('- Plan:', plan);
        console.log('- Billing Cycle:', billingCycle);
        console.log('- Submission ID:', submissionId);
        console.log('- Prices disponibles:', PRICES);
        
        // Usar Price ID según el plan y billing_cycle
        const priceId = PRICES[plan];
        if (!priceId) {
            console.error('❌ Price ID no encontrado para:', plan, billingCycle);
            console.error('❌ PRICES object:', JSON.stringify(PRICES, null, 2));
            return res.status(400).json({ 
                error: 'Plan inválido o Price ID no configurado',
                debug: {
                    plan,
                    billingCycle,
                    availablePlans: Object.keys(PRICES),
                    pricesConfig: PRICES
                }
            });
        }

        console.log(`💳 Creando suscripción ${billingCycle} para plan ${plan} con Price ID:`, priceId);

        // 🆕 Si tenemos submissionId, obtener datos de la base de datos
        let finalSubmissionId;
        let submissionData;
        
        if (submissionId) {
            console.log('📦 Obteniendo submission existente #', submissionId);
            submissionData = await db.getSubmission(submissionId);
            
            if (!submissionData) {
                console.error('❌ Submission no encontrada:', submissionId);
                return res.status(404).json({ error: 'Submission no encontrada' });
            }
            
            console.log('✅ Submission encontrada:', {
                email: submissionData.email,
                business_name: submissionData.business_name,
                plan: submissionData.plan
            });
            
            finalSubmissionId = submissionId;
            
        } else {
            // Flujo anterior: crear submission desde formData (para compatibilidad)
            console.log('⚠️ Creando submission desde formData (flujo antiguo)');
            
            const fullName = formData.first_name && formData.last_name 
                ? `${formData.first_name} ${formData.last_name}`.trim()
                : (formData.full_name || 'Cliente');

            const amounts = {
                monthly: { basico: 35, avanzado: 49, premium: 65 },
                annual: { basico: 336, avanzado: 468, premium: 624 }
            };
            const amount = amounts[billingCycle][plan];

            submissionData = {
                ...formData,
                full_name: fullName,
                plan,
                billing_cycle: billingCycle,
                status: 'pending',
                amount: amount
            };
            
            finalSubmissionId = await db.createSubmission(submissionData);
            console.log(`✅ Submission ${finalSubmissionId} creada`);
        }


        // Crear o obtener cliente en Stripe
        const customer = await stripe.customers.create({
            payment_method: paymentMethodId,
            email: billingDetails.email || submissionData.email,
            name: billingDetails.name || submissionData.full_name,
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
            metadata: {
                submission_id: String(finalSubmissionId),
                business_name: submissionData.business_name || ''
            }
        });

        // Crear suscripción
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                submission_id: String(finalSubmissionId),
                plan: plan,
                billing_cycle: billingCycle,
                business_name: submissionData.business_name || ''
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
            await db.updateSubmissionStatus(finalSubmissionId, 'paid', subscription.id);

            // Obtener datos completos (actualizado)
            const submission = await db.getSubmission(finalSubmissionId);

            // Crear cliente/usuario con contraseña hasheada (si no existe ya)
            const existingClient = await db.getClientByEmail(submission.email);
            
            let clientId;
            if (!existingClient) {
                // Hashear la contraseña desde la submission
                const passwordToHash = submission.password || 'temp123';
                const hashedPassword = await bcrypt.hash(passwordToHash, 10);
                
                // Construir full_name correctamente
                let fullName = submission.full_name || 'Cliente';
                
                const clientData = {
                    email: submission.email,
                    password: hashedPassword,
                    full_name: fullName,
                    business_name: submission.business_name,
                    plan: plan,
                    submission_id: finalSubmissionId,
                    stripe_customer_id: customer.id,
                    stripe_subscription_id: subscription.id,
                    payment_date: new Date().toISOString(),
                    website_status: 'en_construccion'
                };
                
                console.log('👤 Creando cliente con datos:', {
                    email: clientData.email,
                    business_name: clientData.business_name,
                    plan: clientData.plan,
                    submission_id: clientData.submission_id,
                    website_status: clientData.website_status
                });
                
                clientId = await db.createClient(clientData);

                console.log(`✅ Cliente ${clientId} creado exitosamente:`, submission.email);
                console.log('🔗 submission_id vinculado:', finalSubmissionId);
                
                // Verificar que se creó correctamente
                const createdClient = await db.getClientById(clientId);
                console.log('🔍 Verificación cliente creado:', {
                    id: createdClient.id,
                    email: createdClient.email,
                    submission_id: createdClient.submission_id,
                    plan: createdClient.plan
                });
            } else {
                console.log('Cliente ya existe, actualizando datos de suscripción');
                clientId = existingClient.id;
                console.log('📦 Cliente existente ID:', clientId);
                console.log('🔗 Vinculando submission_id:', finalSubmissionId);
                
                // Actualizar plan, payment_date Y submission_id
                await db.updateClient(existingClient.id, {
                    plan: plan,
                    stripe_subscription_id: subscription.id,
                    payment_date: new Date().toISOString(),
                    submission_id: finalSubmissionId
                });
                
                console.log(`✅ Cliente ${clientId} actualizado con submission_id: ${finalSubmissionId}`);
                
                // Verificar actualización
                const updatedClient = await db.getClientById(clientId);
                console.log('🔍 Verificación después de actualizar:', {
                    id: updatedClient.id,
                    submission_id: updatedClient.submission_id,
                    plan: updatedClient.plan,
                    website_status: updatedClient.website_status
                });
            }

            // CREAR PROYECTO AUTOMÁTICAMENTE en "Sin empezar"
            try {
                const paymentDate = new Date();
                const autoDeadline = calculateDeadline(plan, paymentDate);
                
                const projectId = await db.createProject({
                    client_id: clientId,
                    submission_id: finalSubmissionId,
                    project_name: submission.business_name || `Web de ${submission.full_name}`,
                    business_name: submission.business_name,
                    client_email: submission.email,
                    plan: plan,
                    status: 'sin_empezar',
                    priority: 'normal',
                    deadline: autoDeadline,
                    progress: 0,
                    notes: `Proyecto creado automáticamente. Plan: ${plan} ${billingCycle}. Pago confirmado.`
                });
                console.log(`✅ Proyecto ${projectId} creado automáticamente para cliente ${clientId} con deadline: ${autoDeadline}`);
            } catch (projectError) {
                console.error('❌ Error creando proyecto automáticamente:', projectError);
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
            await db.updateSubmissionStatus(submissionId, 'paid', session.id);

            // Obtener datos completos
            const submission = await db.getSubmission(submissionId);

            // Buscar o crear cliente
            let client = await db.getClientByEmail(submission.email);
            
            // Crear proyecto automáticamente en "Sin empezar"
            if (client) {
                try {
                    const paymentDate = new Date(client.payment_date || Date.now());
                    const autoDeadline = calculateDeadline(submission.plan, paymentDate);
                    
                    const projectId = await db.createProject({
                        client_id: client.id,
                        submission_id: submissionId,
                        project_name: submission.business_name || `Web de ${submission.full_name}`,
                        business_name: submission.business_name,
                        client_email: submission.email,
                        plan: submission.plan,
                        status: 'sin_empezar',
                        priority: 'normal',
                        deadline: autoDeadline,
                        progress: 0,
                        notes: `Proyecto creado automáticamente desde el pago. Plan: ${submission.plan}`
                    });
                    console.log(`✅ Proyecto ${projectId} creado automáticamente para cliente ${client.id} con deadline: ${autoDeadline}`);
                } catch (projectError) {
                    console.error('Error creando proyecto automáticamente:', projectError);
                }
            }

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
app.get('/api/admin/submissions', async (req, res) => {
    try {
        console.log('📋 [ADMIN] Obteniendo todos los pedidos (submissions)...');
        const submissions = await db.getAllSubmissions();
        console.log(`✅ [ADMIN] Pedidos encontrados: ${submissions.length}`);
        res.json(submissions);
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo pedidos:', error);
        res.status(500).json({ error: error.message });
    }
});

// 7. DASHBOARD ADMIN - OBTENER UNA SOLICITUD
app.get('/api/admin/submissions/:id', async (req, res) => {
    try {
        console.log(`📋 [ADMIN] Obteniendo pedido #${req.params.id}`);
        const submission = await db.getSubmission(req.params.id);
        if (submission) {
            console.log(`✅ [ADMIN] Pedido #${req.params.id} encontrado`);
            res.json(submission);
        } else {
            console.log(`❌ [ADMIN] Pedido #${req.params.id} no encontrado`);
            res.status(404).json({ error: 'Solicitud no encontrada' });
        }
    } catch (error) {
        console.error(`❌ [ADMIN] Error obteniendo pedido #${req.params.id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// 8. DASHBOARD ADMIN - ACTUALIZAR ESTADO
app.patch('/api/admin/submissions/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        console.log(`🔧 [ADMIN] Actualizando estado del pedido #${req.params.id} a: ${status}`);
        await db.updateSubmissionStatus(req.params.id, status);
        console.log(`✅ [ADMIN] Estado del pedido #${req.params.id} actualizado`);
        res.json({ success: true });
    } catch (error) {
        console.error(`❌ [ADMIN] Error actualizando estado del pedido #${req.params.id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// 9. DASHBOARD ADMIN - ESTADÍSTICAS
app.get('/api/admin/stats', async (req, res) => {
    try {
        console.log('📊 [ADMIN] Obteniendo estadísticas generales...');
        const stats = await db.getStats();
        console.log('✅ [ADMIN] Estadísticas obtenidas:', stats);
        res.json(stats);
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para obtener datos de suscripción (para success page)
app.get('/api/subscription-data/:subscriptionId', async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        
        // Buscar la submission por stripe_subscription_id
        const submission = await db.getSubmissionBySubscriptionId(subscriptionId);
        
        if (!submission) {
            return res.status(404).json({ error: 'Suscripción no encontrada' });
        }

        // Devolver datos necesarios para la página de éxito
        res.json({
            plan: submission.plan,
            billing_cycle: submission.billing_cycle || 'monthly',
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

// Endpoint para crear submission desde formulario (con imágenes en base64)
app.post('/api/submissions/create', async (req, res) => {
    try {
        console.log('📝 [SUBMISSION] Creando nueva submission desde formulario');
        const formData = req.body;
        
        // Validar datos requeridos
        if (!formData.email || !formData.plan) {
            return res.status(400).json({ error: 'Email y plan son requeridos' });
        }
        
        // 🆕 LOGS EXTENSIVOS para debugging
        console.log('═══════════════════════════════════════');
        console.log('📋 DATOS RECIBIDOS EN EL BACKEND:');
        console.log('═══════════════════════════════════════');
        console.log('🏢 Negocio:');
        console.log('  - business_name:', formData.business_name || 'NO RECIBIDO');
        console.log('  - business_description:', formData.business_description || 'NO RECIBIDO');
        console.log('  - industry:', formData.industry || 'NO RECIBIDO');
        console.log('📞 Contacto Web:');
        console.log('  - contact_methods:', formData.contact_methods || 'NO RECIBIDO');
        console.log('  - phone_number:', formData.phone_number || 'NO RECIBIDO');
        console.log('  - email_contact:', formData.email_contact || 'NO RECIBIDO');
        console.log('  - whatsapp_number:', formData.whatsapp_number || 'NO RECIBIDO');
        console.log('  - physical_address:', formData.physical_address || 'NO RECIBIDO');
        console.log('📱 Redes Sociales:');
        console.log('  - instagram:', formData.instagram || 'NO RECIBIDO');
        console.log('  - facebook:', formData.facebook || 'NO RECIBIDO');
        console.log('  - linkedin:', formData.linkedin || 'NO RECIBIDO');
        console.log('  - twitter:', formData.twitter || 'NO RECIBIDO');
        console.log('💼 Servicios:');
        console.log('  - services:', formData.services || 'NO RECIBIDO');
        console.log('  - services_list:', formData.services_list || 'NO RECIBIDO');
        console.log('🍽️ Campos Dinámicos por Sector:');
        console.log('  - menu_content:', formData.menu_content || 'NO RECIBIDO');
        console.log('  - opening_hours:', formData.opening_hours || 'NO RECIBIDO');
        console.log('  - portfolio_description:', formData.portfolio_description || 'NO RECIBIDO');
        console.log('🎯 Objetivos:');
        console.log('  - purpose:', formData.purpose || 'NO RECIBIDO');
        console.log('  - target_audience:', formData.target_audience || 'NO RECIBIDO');
        console.log('📄 Páginas:');
        console.log('  - pages:', formData.pages || 'NO RECIBIDO');
        console.log('🎨 Diseño:');
        console.log('  - design_style:', formData.design_style || 'NO RECIBIDO');
        console.log('  - brand_colors:', formData.brand_colors || 'NO RECIBIDO');
        console.log('  - reference_websites:', formData.reference_websites || 'NO RECIBIDO');
        console.log('🔍 SEO:');
        console.log('  - keywords:', formData.keywords || 'NO RECIBIDO');
        console.log('  - has_analytics:', formData.has_analytics || 'NO RECIBIDO');
        console.log('🌐 Dominio:');
        console.log('  - domain_name:', formData.domain_name || 'NO RECIBIDO');
        console.log('  - domain_alt1:', formData.domain_alt1 || 'NO RECIBIDO');
        console.log('  - domain_alt2:', formData.domain_alt2 || 'NO RECIBIDO');
        console.log('⚖️ Datos Fiscales:');
        console.log('  - cif_nif:', formData.cif_nif || 'NO RECIBIDO');
        console.log('  - razon_social:', formData.razon_social || 'NO RECIBIDO');
        console.log('  - direccion_fiscal:', formData.direccion_fiscal || 'NO RECIBIDO');
        console.log('  - business_email:', formData.business_email || 'NO RECIBIDO');
        console.log('═══════════════════════════════════════');
        
        console.log(`📧 Email: ${formData.email}`);
        console.log(`📋 Plan: ${formData.plan}`);
        console.log(`🎨 Logo: ${formData.logo_data ? 'Sí (' + Math.round(formData.logo_data.length / 1024) + ' KB)' : 'No'}`);
        
        if (formData.images_data) {
            try {
                const images = JSON.parse(formData.images_data);
                const totalSize = images.reduce((sum, img) => sum + img.length, 0);
                console.log(`🖼️ Imágenes: ${images.length} archivos (${Math.round(totalSize / 1024)} KB total)`);
            } catch (e) {
                console.log(`🖼️ Imágenes: Sí`);
            }
        }
        
        // Calcular monto según plan y ciclo de facturación
        let amount;
        const billing_cycle = formData.billing_cycle || 'monthly';
        
        if (billing_cycle === 'annual') {
            amount = formData.plan === 'basico' ? 350 : 
                     formData.plan === 'avanzado' ? 490 : 650;
        } else {
            amount = formData.plan === 'basico' ? 35 : 
                     formData.plan === 'avanzado' ? 49 : 65;
        }
        
        console.log(`💰 Monto calculado: ${amount}€ (${billing_cycle})`);
        
        // Mapear campos del formulario a nombres de la base de datos
        const mappedData = {
            ...formData,
            // Mapear services_list a services
            services: formData.services_list || formData.services,
            amount,
            status: 'pending'
        };
        
        // Eliminar el campo duplicado
        delete mappedData.services_list;
        
        // Crear submission con todos los datos (incluyendo imágenes en base64)
        const submissionId = await db.createSubmission(mappedData);
        
        console.log(`✅ [SUBMISSION] Submission #${submissionId} creada exitosamente`);
        
        res.json({ 
            success: true, 
            submissionId,
            message: 'Submission creada correctamente'
        });
        
    } catch (error) {
        console.error('❌ [SUBMISSION] Error creando submission:', error);
        res.status(500).json({ error: error.message });
    }
});

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
        const client = await db.getClientByEmail(email);
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
        
        console.log('📊 [API] Solicitando dashboard para cliente:', clientId);
        
        const dashboardData = await db.getClientDashboardData(parseInt(clientId));
        
        console.log('📦 [API] Dashboard data obtenida:', {
            hasClient: !!dashboardData?.client,
            hasSubmission: !!dashboardData?.submission,
            clientId: dashboardData?.client?.id,
            clientEmail: dashboardData?.client?.email,
            submissionId: dashboardData?.client?.submission_id,
            submissionExists: !!dashboardData?.submission
        });
        
        if (!dashboardData) {
            console.error('❌ [API] Cliente no encontrado:', clientId);
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        if (!dashboardData.submission && dashboardData.client?.submission_id) {
            console.warn('⚠️ [API] Cliente tiene submission_id pero no se cargó submission');
            console.warn('⚠️ [API] submission_id:', dashboardData.client.submission_id);
        }

        // No enviar contraseña
        if (dashboardData.client) {
            delete dashboardData.client.password;
        }

        res.json(dashboardData);

    } catch (error) {
        console.error('❌ [API] Error obteniendo dashboard del cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// 🆕 ENDPOINT: Actualizar submission completa (para re-edición)
app.put('/api/submissions/:submissionId', (req, res) => {
    try {
        const { submissionId } = req.params;
        const data = req.body;
        
        console.log('📝 [API] Actualizando submission #', submissionId);
        console.log('📦 [API] Datos recibidos:', Object.keys(data));
        
        // Mapear services_list a services
        const mappedData = {
            ...data,
            services: data.services_list || data.services
        };
        delete mappedData.services_list;
        
        const stmt = db.db.prepare(`
            UPDATE submissions 
            SET business_name = ?,
                business_description = ?,
                industry = ?,
                cif_nif = ?,
                razon_social = ?,
                direccion_fiscal = ?,
                business_email = ?,
                contact_methods = ?,
                phone_number = ?,
                email_contact = ?,
                whatsapp_number = ?,
                form_email = ?,
                physical_address = ?,
                instagram = ?,
                facebook = ?,
                linkedin = ?,
                twitter = ?,
                services = ?,
                purpose = ?,
                target_audience = ?,
                pages = ?,
                design_style = ?,
                brand_colors = ?,
                reference_websites = ?,
                logo_data = COALESCE(?, logo_data),
                images_data = COALESCE(?, images_data),
                keywords = ?,
                has_analytics = ?,
                domain_name = ?,
                domain_alt1 = ?,
                domain_alt2 = ?,
                privacy_policy = ?,
                web_texts = ?,
                menu_content = ?,
                opening_hours = ?,
                portfolio_description = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.run(
            mappedData.business_name || null,
            mappedData.business_description || null,
            mappedData.industry || null,
            mappedData.cif_nif || null,
            mappedData.razon_social || null,
            mappedData.direccion_fiscal || null,
            mappedData.business_email || null,
            JSON.stringify(mappedData.contact_methods) || null,
            mappedData.phone_number || null,
            mappedData.email_contact || null,
            mappedData.whatsapp_number || null,
            mappedData.form_email || null,
            mappedData.physical_address || null,
            mappedData.instagram || null,
            mappedData.facebook || null,
            mappedData.linkedin || null,
            mappedData.twitter || null,
            mappedData.services || null,
            JSON.stringify(mappedData.purpose) || null,
            mappedData.target_audience || null,
            JSON.stringify(mappedData.pages) || null,
            mappedData.design_style || null,
            mappedData.brand_colors || null,
            mappedData.reference_websites || null,
            mappedData.logo_data || null,
            mappedData.images_data || null,
            mappedData.keywords || null,
            mappedData.has_analytics || null,
            mappedData.domain_name || null,
            mappedData.domain_alt1 || null,
            mappedData.domain_alt2 || null,
            mappedData.privacy_policy || null,
            mappedData.web_texts || null,
            mappedData.menu_content || null,
            mappedData.opening_hours || null,
            mappedData.portfolio_description || null,
            submissionId
        );
        
        console.log('✅ [API] Submission actualizada correctamente');
        
        res.json({
            success: true,
            message: 'Submission actualizada correctamente',
            submissionId: parseInt(submissionId)
        });
        
    } catch (error) {
        console.error('❌ [API] Error actualizando submission:', error);
        res.status(500).json({ error: error.message });
    }
});

// ====== ENDPOINT: Actualizar datos del cliente (con validación 24h) ======
app.put('/api/client/update-data/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const updatedData = req.body;
        
        console.log(`📝 [CLIENT] Cliente #${clientId} solicita actualizar datos`);
        console.log('📦 [CLIENT] Datos recibidos:', Object.keys(updatedData));
        
        // 1. Obtener información del cliente
        const client = await db.getClientById(parseInt(clientId));
        
        if (!client) {
            console.log('❌ [CLIENT] Cliente no encontrado');
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        
        // 2. Validar período de 24h
        const paymentDate = new Date(client.payment_date || client.created_at);
        const now = new Date();
        const hoursSincePayment = (now - paymentDate) / (1000 * 60 * 60);
        
        console.log('⏰ [CLIENT] Horas desde el pago:', hoursSincePayment.toFixed(2));
        
        if (hoursSincePayment > 24) {
            console.log('❌ [CLIENT] Período de edición expirado');
            return res.status(403).json({ 
                success: false, 
                message: 'El período de edición de 24 horas ha expirado. Contacta a soporte para hacer cambios.' 
            });
        }
        
        // 3. Actualizar submission (si existe)
        if (client.submission_id) {
            console.log(`📝 [CLIENT] Actualizando submission #${client.submission_id}`);
            
            await db.pool.query(`
                UPDATE submissions 
                SET business_name = COALESCE($1, business_name),
                    business_description = COALESCE($2, business_description),
                    industry = COALESCE($3, industry),
                    cif_nif = COALESCE($4, cif_nif),
                    razon_social = COALESCE($5, razon_social),
                    direccion_fiscal = COALESCE($6, direccion_fiscal),
                    contact_methods = COALESCE($7, contact_methods),
                    phone_number = COALESCE($8, phone_number),
                    email_contact = COALESCE($9, email_contact),
                    whatsapp_number = COALESCE($10, whatsapp_number),
                    form_email = COALESCE($11, form_email),
                    physical_address = COALESCE($12, physical_address),
                    instagram = COALESCE($13, instagram),
                    facebook = COALESCE($14, facebook),
                    linkedin = COALESCE($15, linkedin),
                    twitter = COALESCE($16, twitter),
                    purpose = COALESCE($17, purpose),
                    target_audience = COALESCE($18, target_audience),
                    pages = COALESCE($19, pages),
                    custom_pages = COALESCE($20, custom_pages),
                    services = COALESCE($21, services),
                    web_texts = COALESCE($22, web_texts),
                    menu_content = COALESCE($23, menu_content),
                    opening_hours = COALESCE($24, opening_hours),
                    portfolio_description = COALESCE($25, portfolio_description),
                    design_style = COALESCE($26, design_style),
                    brand_colors = COALESCE($27, brand_colors),
                    reference_websites = COALESCE($28, reference_websites),
                    keywords = COALESCE($29, keywords),
                    has_analytics = COALESCE($30, has_analytics),
                    domain_name = COALESCE($31, domain_name),
                    domain_alt1 = COALESCE($32, domain_alt1),
                    domain_alt2 = COALESCE($33, domain_alt2),
                    privacy_text = COALESCE($34, privacy_text),
                    privacy_file_data = COALESCE($35, privacy_file_data),
                    privacy_file_name = COALESCE($36, privacy_file_name),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $37
            `, [
                updatedData.business_name || null,
                updatedData.business_description || null,
                updatedData.industry || null,
                updatedData.cif_nif || null,
                updatedData.razon_social || null,
                updatedData.direccion_fiscal || null,
                // Arrays que necesitan JSON.stringify
                updatedData.contact_methods ? (Array.isArray(updatedData.contact_methods) ? JSON.stringify(updatedData.contact_methods) : updatedData.contact_methods) : null,
                updatedData.phone_number || null,
                updatedData.email_contact || null,
                updatedData.whatsapp_number || null,
                updatedData.form_email || null,
                updatedData.physical_address || null,
                updatedData.instagram || null,
                updatedData.facebook || null,
                updatedData.linkedin || null,
                updatedData.twitter || null,
                // Arrays que necesitan JSON.stringify
                updatedData.purpose ? (Array.isArray(updatedData.purpose) ? JSON.stringify(updatedData.purpose) : updatedData.purpose) : null,
                updatedData.target_audience || null,
                // Arrays que necesitan JSON.stringify
                updatedData.pages ? (Array.isArray(updatedData.pages) ? JSON.stringify(updatedData.pages) : updatedData.pages) : null,
                updatedData.custom_pages ? (Array.isArray(updatedData.custom_pages) ? JSON.stringify(updatedData.custom_pages) : updatedData.custom_pages) : null,
                updatedData.services_list || updatedData.services || null,
                updatedData.web_texts || null,
                updatedData.menu_content || null,
                updatedData.opening_hours || null,
                updatedData.portfolio_description || null,
                updatedData.design_style || null,
                updatedData.brand_colors || null,
                updatedData.reference_websites || null,
                updatedData.keywords || null,
                updatedData.has_analytics || null,
                updatedData.domain_name || null,
                updatedData.domain_alt1 || null,
                updatedData.domain_alt2 || null,
                updatedData.privacy_text || null,
                updatedData.privacy_file_data || null,
                updatedData.privacy_file_name || null,
                client.submission_id
            ]);
            
            console.log('✅ [CLIENT] Submission actualizada correctamente');
        } else {
            console.log('⚠️ [CLIENT] Cliente sin submission_id, no se actualizan datos de formulario');
        }
        
        // 4. Responder éxito
        res.json({
            success: true,
            message: 'Datos actualizados correctamente',
            hoursRemaining: (24 - hoursSincePayment).toFixed(2)
        });
        
    } catch (error) {
        console.error('❌ [CLIENT] Error actualizando datos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== ENDPOINT TEMPORAL: Actualizar cliente para testing ======
app.post('/api/test/update-client', (req, res) => {
    try {
        const { clientId, plan, website_status, payment_date, submission_id } = req.body;
        
        console.log(`🔧 [TEST] Actualizando cliente #${clientId} para testing`);
        console.log('📦 [TEST] Datos:', { plan, website_status, payment_date, submission_id });
        
        // Construir la query dinámicamente según los campos proporcionados
        const updates = [];
        const values = [];
        
        if (plan) {
            updates.push('plan = ?');
            values.push(plan);
        }
        
        if (website_status) {
            updates.push('website_status = ?');
            values.push(website_status);
        }
        
        if (payment_date) {
            updates.push('payment_date = ?');
            values.push(payment_date);
        }
        
        if (submission_id) {
            updates.push('submission_id = ?');
            values.push(submission_id);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No hay campos para actualizar' 
            });
        }
        
        // Añadir clientId al final
        values.push(clientId);
        
        const query = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        
        console.log('🔍 [TEST] Query:', query);
        console.log('🔍 [TEST] Values:', values);
        
        const stmt = db.db.prepare(query);
        const result = stmt.run(...values);
        
        if (result.changes === 0) {
            console.log('⚠️ [TEST] Cliente no encontrado');
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            });
        }
        
        console.log('✅ [TEST] Cliente actualizado correctamente');
        
        res.json({
            success: true,
            message: 'Cliente actualizado correctamente',
            changes: result.changes
        });
        
    } catch (error) {
        console.error('❌ [TEST] Error actualizando cliente:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 🆕 ENDPOINT TEMPORAL: Vincular submission_id a clientes existentes
app.post('/api/admin/fix-client-submissions', (req, res) => {
    try {
        console.log('🔧 [ADMIN] Corrigiendo submission_id en clientes...');
        
        // Obtener todos los clientes sin submission_id pero con email
        const clientsStmt = db.db.prepare('SELECT * FROM clients WHERE submission_id IS NULL');
        const clients = clientsStmt.all();
        
        console.log(`📊 Clientes sin submission_id: ${clients.length}`);
        
        let fixed = 0;
        let notFound = 0;
        
        for (const client of clients) {
            // Buscar submission por email
            const submissionStmt = db.db.prepare('SELECT id FROM submissions WHERE email = ? ORDER BY created_at DESC LIMIT 1');
            const submission = submissionStmt.get(client.email);
            
            if (submission) {
                // Actualizar cliente con submission_id
                const updateStmt = db.db.prepare('UPDATE clients SET submission_id = ? WHERE id = ?');
                updateStmt.run(submission.id, client.id);
                
                console.log(`✅ Cliente ${client.id} (${client.email}) vinculado con submission ${submission.id}`);
                fixed++;
            } else {
                console.log(`⚠️ No se encontró submission para ${client.email}`);
                notFound++;
            }
        }
        
        res.json({
            success: true,
            message: `Corrección completada`,
            fixed: fixed,
            notFound: notFound,
            total: clients.length
        });
        
    } catch (error) {
        console.error('❌ Error corrigiendo submissions:', error);
        res.status(500).json({ error: error.message });
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

// Actualizar estado del sitio web (cuando se entrega el proyecto)
// 🆕 Endpoint para actualizar datos de gestión de web (WordPress, Screenshot)
app.patch('/api/admin/website-management/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { wordpress_url, website_screenshot_url } = req.body;
        
        console.log(`🔧 [ADMIN] Actualizando gestión de web para cliente #${clientId}`, {
            wordpress_url,
            website_screenshot_url
        });
        
        await db.pool.query(`
            UPDATE clients 
            SET wordpress_url = COALESCE($1, wordpress_url),
                website_screenshot_url = COALESCE($2, website_screenshot_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `, [wordpress_url, website_screenshot_url, clientId]);
        
        console.log(`✅ [ADMIN] Gestión de web actualizada para cliente #${clientId}`);
        
        res.json({ 
            success: true, 
            message: 'Datos de gestión actualizados correctamente' 
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Error actualizando gestión de web:', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/client/website-status/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { status, website_url } = req.body;
        
        // Actualizar estado y URL si se proporciona
        const stmt = db.db.prepare(`
            UPDATE clients 
            SET website_status = ?, 
                website_url = COALESCE(?, website_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(status, website_url, clientId);
        
        // Si se marcó como activo, enviar email de notificación al cliente
        if (status === 'activo') {
            const client = db.getClientById(clientId);
            if (client) {
                try {
                    await emailService.sendEmail({
                        to: client.email,
                        subject: '🎉 ¡Tu sitio web está listo! - agutidesigns',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h1 style="color: #0046FE; text-align: center;">🎉 ¡Tu Web Está Lista!</h1>
                                <p>Hola ${client.full_name},</p>
                                <p>¡Tenemos excelentes noticias! Tu sitio web ha sido completado y está ahora <strong>activo</strong>.</p>
                                
                                ${website_url ? `
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${website_url}" style="background: #0046FE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                            Ver Mi Sitio Web
                                        </a>
                                    </div>
                                ` : ''}
                                
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                    <h3 style="color: #333; margin-top: 0;">Próximos Pasos:</h3>
                                    <ul style="line-height: 1.8;">
                                        <li>✓ Revisa tu sitio web y navega por todas las páginas</li>
                                        <li>✓ Accede a tu <a href="https://agutidesigns.vercel.app/client-dashboard/">Dashboard</a> para ver estadísticas</li>
                                        <li>✓ Puedes solicitar cambios menores en las próximas 48h sin costo</li>
                                        <li>✓ Si tienes dudas, crea un ticket de soporte</li>
                                    </ul>
                                </div>
                                
                                <p>Recuerda que incluimos:</p>
                                <ul>
                                    <li>🔒 Certificado SSL (https)</li>
                                    <li>📱 Diseño responsive</li>
                                    <li>🚀 Optimización SEO básica</li>
                                    <li>🎨 Edición ilimitada de contenido</li>
                                    <li>💬 Soporte técnico continuo</li>
                                </ul>
                                
                                <p>Si necesitas ayuda o tienes alguna pregunta, estamos aquí para ti.</p>
                                
                                <p style="margin-top: 30px;">
                                    <strong>¡Gracias por confiar en agutidesigns!</strong><br>
                                    <span style="color: #666;">El equipo de agutidesigns</span>
                                </p>
                            </div>
                        `
                    });
                    console.log(`📧 Email de entrega enviado a ${client.email}`);
                } catch (emailError) {
                    console.error('Error enviando email de notificación:', emailError);
                }
            }
        }
        
        res.json({ success: true, message: 'Estado del sitio actualizado' });
    } catch (error) {
        console.error('Error actualizando estado del sitio:', error);
        res.status(500).json({ error: error.message });
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
        
        console.log('🎫 [BACKEND] Nuevo ticket recibido del cliente:', ticketData.client_name);
        console.log('🎫 [BACKEND] Datos del ticket:', {
            subject: ticketData.subject,
            category: ticketData.category,
            priority: ticketData.priority,
            client_id: ticketData.client_id
        });
        
        // Crear ticket en la BD
        const ticket = db.createTicket(ticketData);
        console.log('✅ [BACKEND] Ticket creado en BD, ID:', ticket.id);
        
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
            console.log('✅ [BACKEND] Email de notificación enviado al admin');
        } catch (emailError) {
            console.error('❌ [BACKEND] Error enviando email de notificación al admin:', emailError);
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
            console.log('✅ [BACKEND] Email de confirmación enviado al cliente');
        } catch (emailError) {
            console.error('❌ [BACKEND] Error enviando confirmación al cliente:', emailError);
        }
        
        console.log('✅ [BACKEND] Ticket procesado completamente, ID:', ticket.id);
        
        res.json({
            success: true,
            ticketId: ticket.id,
            ticket: ticket,
            message: 'Ticket creado correctamente'
        });
        
    } catch (error) {
        console.error('❌ [BACKEND] Error crítico creando ticket:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener todos los tickets (para admin)
app.get('/api/tickets', async (req, res) => {
    try {
        console.log('🎫 [BACKEND] Admin solicitando todos los tickets...');
        const tickets = await db.getAllTickets();
        console.log(`✅ [BACKEND] Tickets encontrados: ${tickets ? tickets.length : 0}`);
        res.json(tickets || []);
    } catch (error) {
        console.error('❌ [BACKEND] Error obteniendo tickets:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener un ticket individual por ID
app.get('/api/tickets/:id', async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { markAsRead } = req.query;
        console.log('🎫 [BACKEND] Solicitando ticket #', ticketId, 'markAsRead:', markAsRead);
        
        const ticket = await db.getTicketById(ticketId);
        
        if (!ticket) {
            console.warn('⚠️ [BACKEND] Ticket no encontrado:', ticketId);
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }
        
        // Si se solicita marcar como leído, actualizar según quién lo lea
        if (markAsRead === 'admin' && ticket.admin_unread === 1) {
            console.log('👁️ [BACKEND] Marcando ticket como leído por admin');
            await db.updateTicket(ticketId, { admin_unread: 0 });
            ticket.admin_unread = 0;
        } else if (markAsRead === 'client' && ticket.client_unread === 1) {
            console.log('👁️ [BACKEND] Marcando ticket como leído por cliente');
            await db.updateTicket(ticketId, { client_unread: 0 });
            ticket.client_unread = 0;
        }
        
        console.log('✅ [BACKEND] Ticket encontrado:', ticket.id);
        console.log('🔍 [BACKEND] ¿Tiene admin_response?', ticket.admin_response ? 'SÍ' : 'NO');
        console.log('🔍 [BACKEND] ¿Tiene client_response?', ticket.client_response ? 'SÍ' : 'NO');
        console.log('🔍 [BACKEND] Valor de client_response:', ticket.client_response);
        res.json(ticket);
    } catch (error) {
        console.error('❌ [BACKEND] Error obteniendo ticket:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener tickets de un cliente
app.get('/api/tickets/client/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        console.log(`🎫 [BACKEND] Obteniendo tickets del cliente #${clientId}`);
        const tickets = await db.getTicketsByClient(parseInt(clientId));
        console.log(`✅ [BACKEND] Tickets del cliente #${clientId}: ${tickets ? tickets.length : 0}`);
        res.json({ tickets: tickets || [] });
    } catch (error) {
        console.error('❌ [BACKEND] Error obteniendo tickets del cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cliente responde a un ticket
app.post('/api/tickets/:ticketId/client-response', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { client_response, client_id } = req.body;
        
        console.log('💬 [BACKEND] Cliente respondiendo al ticket #', ticketId);
        console.log('💬 [BACKEND] Respuesta del cliente:', client_response.substring(0, 50) + '...');
        
        // Actualizar ticket con respuesta del cliente y cambiar estado a "en_proceso"
        await db.updateTicket(parseInt(ticketId), { 
            client_response,
            status: 'en_proceso',
            admin_unread: 1,      // Admin tiene mensaje nuevo sin leer
            client_unread: 0      // Cliente lo acaba de enviar/leer
        });
        
        const ticket = await db.getTicketById(parseInt(ticketId));
        console.log('✅ [BACKEND] Ticket actualizado con respuesta del cliente');
        
        // Enviar email al admin notificando la nueva respuesta
        try {
            await emailService.sendEmail({
                to: 'info@agutidesigns.com',
                subject: `🔔 Nueva Respuesta del Cliente - Ticket #${ticketId}`,
                html: `
                    <h2>El cliente ha respondido</h2>
                    <p><strong>Ticket #${ticketId}</strong></p>
                    <p><strong>Cliente:</strong> ${ticket.client_name} (${ticket.client_email})</p>
                    <p><strong>Asunto:</strong> ${ticket.subject}</p>
                    <hr>
                    <h3>Respuesta del Cliente:</h3>
                    <p>${client_response}</p>
                    <hr>
                    <p style="color: #666; font-size: 0.9rem;">Fecha: ${new Date().toLocaleString('es-ES')}</p>
                `
            });
            console.log('✅ [BACKEND] Email de notificación enviado al admin');
        } catch (emailError) {
            console.error('❌ [BACKEND] Error enviando email al admin:', emailError);
        }
        
        res.json({
            success: true,
            message: 'Respuesta del cliente guardada correctamente',
            ticket
        });
        
    } catch (error) {
        console.error('❌ [BACKEND] Error guardando respuesta del cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar ticket (responder o cambiar estado)
app.patch('/api/tickets/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, admin_response } = req.body;
        
        console.log('🎫 [BACKEND] PATCH /api/tickets/:ticketId');
        console.log('🎫 [BACKEND] ticketId:', ticketId);
        console.log('🎫 [BACKEND] Body:', { status, admin_response: admin_response ? 'SÍ' : 'NO' });
        
        // Actualizar ticket y marcar como leído por admin, no leído por cliente
        await db.updateTicket(parseInt(ticketId), { 
            status, 
            admin_response,
            admin_unread: 0,      // Admin lo acaba de leer/responder
            client_unread: 1      // Cliente tiene mensaje nuevo sin leer
        });
        console.log('🎫 [BACKEND] Ticket actualizado');
        
        const ticket = await db.getTicketById(parseInt(ticketId));
        console.log('🎫 [BACKEND] Ticket obtenido:', ticket ? `#${ticket.id}` : 'NO ENCONTRADO');
        
        // Si hay respuesta del admin, enviar email al cliente
        if (admin_response && ticket) {
            console.log('📧 [BACKEND] Enviando email al cliente:', ticket.client_email);
            try {
                await emailService.sendEmail({
                    to: ticket.client_email,
                    subject: `Respuesta a tu Ticket #${ticketId} - agutidesigns`,
                    html: `
                        <h2>Respuesta a tu Consulta</h2>
                        <p>Hola ${ticket.client_name || 'Cliente'},</p>
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
                console.log('✅ [BACKEND] Email enviado correctamente');
            } catch (emailError) {
                console.error('❌ [BACKEND] Error enviando respuesta al cliente:', emailError);
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

// =============================================
// ENDPOINTS DE PROYECTOS (KANBAN)
// =============================================

// Crear nuevo proyecto
app.post('/api/admin/projects', async (req, res) => {
    try {
        const projectData = req.body;
        
        // Validar datos requeridos
        if (!projectData.client_id || !projectData.project_name) {
            return res.status(400).json({ error: 'client_id y project_name son requeridos' });
        }
        
        // Obtener info del cliente para autocompletar
        const client = await db.getClientById(projectData.client_id);
        if (client) {
            projectData.business_name = projectData.business_name || client.business_name;
            projectData.client_email = projectData.client_email || client.email;
            projectData.plan = projectData.plan || client.plan;
        }
        
        const projectId = await db.createProject(projectData);
        const project = await db.getProjectById(projectId);
        
        res.json({ success: true, project });
    } catch (error) {
        console.error('Error creando proyecto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener todos los proyectos
app.get('/api/admin/projects', async (req, res) => {
    try {
        console.log('📋 [ADMIN] Obteniendo todos los proyectos...');
        const projects = await db.getAllProjects();
        console.log(`✅ [ADMIN] Proyectos encontrados: ${projects.length}`);
        res.json(projects);
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo proyectos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener proyectos por estado (para el Kanban)
app.get('/api/admin/projects/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        console.log(`📋 [ADMIN] Obteniendo proyectos con estado: ${status}`);
        const projects = await db.getProjectsByStatus(status);
        console.log(`✅ [ADMIN] Proyectos encontrados: ${projects.length}`);
        res.json(projects);
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo proyectos por estado:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener un proyecto por ID
app.get('/api/admin/projects/:id', async (req, res) => {
    try {
        console.log(`📋 [ADMIN] Obteniendo proyecto #${req.params.id}`);
        const project = await db.getProjectById(req.params.id);
        if (!project) {
            console.log(`❌ [ADMIN] Proyecto #${req.params.id} no encontrado`);
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        console.log(`✅ [ADMIN] Proyecto #${req.params.id} encontrado`);
        res.json(project);
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo proyecto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar proyecto
app.patch('/api/admin/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log(`🔧 [ADMIN] Actualizando proyecto #${id}:`, updates);
        await db.updateProject(id, updates);
        const updatedProject = await db.getProjectById(id);
        
        console.log(`✅ [ADMIN] Proyecto #${id} actualizado`);
        res.json({ success: true, project: updatedProject });
    } catch (error) {
        console.error('❌ [ADMIN] Error actualizando proyecto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Eliminar proyecto
app.delete('/api/admin/projects/:id', async (req, res) => {
    try {
        console.log(`🗑️ [ADMIN] Eliminando proyecto #${req.params.id}`);
        await db.deleteProject(req.params.id);
        console.log(`✅ [ADMIN] Proyecto #${req.params.id} eliminado`);
        res.json({ success: true, message: 'Proyecto eliminado' });
    } catch (error) {
        console.error('❌ [ADMIN] Error eliminando proyecto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Estadísticas de proyectos
app.get('/api/admin/projects/stats', async (req, res) => {
    try {
        console.log('📊 [ADMIN] Obteniendo estadísticas de proyectos...');
        const stats = await db.getProjectStats();
        console.log('✅ [ADMIN] Estadísticas obtenidas:', stats);
        res.json(stats);
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo estadísticas de proyectos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ⏰ ENDPOINT TEMPORAL: Actualizar deadline de proyectos existentes
app.get('/api/admin/fix-deadlines', async (req, res) => {
    try {
        console.log('⏰ [ADMIN] Actualizando deadlines de proyectos...');
        
        // Obtener todos los proyectos
        const projectsResult = await db.pool.query(`
            SELECT p.id, p.deadline, p.plan, c.payment_date, c.created_at 
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
        `);
        
        const projects = projectsResult.rows;
        let updated = 0;
        let skipped = 0;
        
        for (const project of projects) {
            if (project.deadline) {
                console.log(`⏩ [PROYECTO #${project.id}] Ya tiene deadline: ${project.deadline}`);
                skipped++;
                continue;
            }
            
            const paymentDate = new Date(project.payment_date || project.created_at || Date.now());
            const newDeadline = calculateDeadline(project.plan, paymentDate);
            
            await db.pool.query(
                'UPDATE projects SET deadline = $1 WHERE id = $2',
                [newDeadline, project.id]
            );
            
            console.log(`✅ [PROYECTO #${project.id}] Deadline actualizado: ${newDeadline}`);
            updated++;
        }
        
        res.json({
            success: true,
            total: projects.length,
            updated,
            skipped
        });
    } catch (error) {
        console.error('❌ Error actualizando deadlines:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 📊 ENDPOINTS DE ADMIN - CLIENTES
// ============================================

// Obtener todos los clientes (para admin dashboard)
app.get('/api/clients', async (req, res) => {
    try {
        console.log('📋 [ADMIN] Obteniendo todos los clientes...');
        const clients = await db.getAllClients();
        console.log(`✅ [ADMIN] Clientes encontrados: ${clients.length}`);
        res.json(clients);
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo clientes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener un cliente específico con detalles completos
app.get('/api/clients/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        console.log(`📋 [ADMIN] Obteniendo detalles del cliente #${clientId}...`);
        
        const client = await db.getClientWithDetails(parseInt(clientId));
        
        if (!client) {
            console.log(`❌ [ADMIN] Cliente #${clientId} no encontrado`);
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        console.log(`✅ [ADMIN] Detalles del cliente #${clientId} obtenidos`);
        res.json(client);
    } catch (error) {
        console.error(`❌ [ADMIN] Error obteniendo cliente #${req.params.clientId}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 🔧 ENDPOINT TEMPORAL: Reparar datos corruptos
// ============================================
// 🔍 Endpoint de diagnóstico para ver el estado actual
app.get('/api/admin/diagnose', async (req, res) => {
    console.log('🔍 [DIAGNÓSTICO] Iniciando diagnóstico completo...');
    
    try {
        // 1. Verificar clientes
        const clientsResult = await db.pool.query('SELECT * FROM clients ORDER BY created_at DESC');
        const clients = clientsResult.rows;
        
        // 2. Verificar proyectos
        const projectsResult = await db.pool.query('SELECT * FROM projects ORDER BY created_at DESC');
        const projects = projectsResult.rows;
        
        // 3. Verificar submissions
        const submissionsResult = await db.pool.query('SELECT id, business_name, email, plan, status FROM submissions ORDER BY created_at DESC');
        const submissions = submissionsResult.rows;
        
        console.log('\n==================================================');
        console.log('📊 DIAGNÓSTICO COMPLETO:');
        console.log('==================================================');
        console.log(`\n👥 CLIENTES: ${clients.length}`);
        clients.forEach(c => {
            console.log(`  - Cliente #${c.id}: ${c.email}`);
            console.log(`    Plan: ${c.plan || 'SIN PLAN'}`);
            console.log(`    Submission ID: ${c.submission_id || 'NO VINCULADO'}`);
            console.log(`    Website Status: ${c.website_status || 'N/A'}`);
        });
        
        console.log(`\n📋 PROYECTOS: ${projects.length}`);
        projects.forEach(p => {
            console.log(`  - Proyecto #${p.id}: ${p.project_name || p.business_name || 'SIN NOMBRE'}`);
            console.log(`    Cliente ID: ${p.client_id}`);
            console.log(`    Estado: ${p.status}`);
            console.log(`    Plan: ${p.plan}`);
        });
        
        console.log(`\n📄 SUBMISSIONS: ${submissions.length}`);
        submissions.forEach(s => {
            console.log(`  - Submission #${s.id}: ${s.business_name || 'SIN NOMBRE'}`);
            console.log(`    Email: ${s.email}`);
            console.log(`    Plan: ${s.plan || 'N/A'}`);
            console.log(`    Status: ${s.status}`);
        });
        console.log('==================================================\n');
        
        res.json({
            success: true,
            counts: {
                clients: clients.length,
                projects: projects.length,
                submissions: submissions.length,
                clientsWithPlan: clients.filter(c => c.plan).length
            },
            clients: clients.map(c => ({
                id: c.id,
                email: c.email,
                plan: c.plan,
                submission_id: c.submission_id,
                website_status: c.website_status
            })),
            projects: projects.map(p => ({
                id: p.id,
                project_name: p.project_name,
                business_name: p.business_name,
                client_id: p.client_id,
                status: p.status,
                plan: p.plan
            })),
            submissions: submissions.map(s => ({
                id: s.id,
                business_name: s.business_name,
                email: s.email,
                plan: s.plan,
                status: s.status
            }))
        });
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔧 Endpoint temporal para verificar y arreglar proyectos
app.get('/api/admin/fix-projects', async (req, res) => {
    console.log('🔧 [ADMIN] Verificando y arreglando proyectos...');
    
    try {
        // PRIMERO: Arreglar estados incorrectos de proyectos existentes
        console.log('🔧 [ADMIN] PASO 1: Corrigiendo estados incorrectos...');
        const incorrectStates = await db.pool.query(`
            UPDATE projects 
            SET status = 'en_desarrollo' 
            WHERE status = 'desarrollo'
            RETURNING id, project_name, status
        `);
        
        if (incorrectStates.rows.length > 0) {
            console.log(`✅ Corregidos ${incorrectStates.rows.length} proyectos con estado 'desarrollo' → 'en_desarrollo'`);
            incorrectStates.rows.forEach(p => {
                console.log(`  - Proyecto #${p.id} "${p.project_name}": estado corregido`);
            });
        }
        
        // Obtener todos los clientes con plan
        console.log('🔧 [ADMIN] PASO 2: Verificando clientes con plan...');
        const clientsResult = await db.pool.query(`
            SELECT * FROM clients 
            WHERE plan IS NOT NULL AND plan != ''
            ORDER BY created_at DESC
        `);
        const clients = clientsResult.rows;
        
        console.log(`📊 Total de clientes con plan: ${clients.length}`);
        
        const report = {
            statesCorrected: incorrectStates.rows.length,
            clientsWithPlan: clients.length,
            projectsCreated: 0,
            projectsUpdated: 0,
            projectsAlreadyOk: 0,
            details: []
        };
        
        for (const client of clients) {
            console.log(`\n👤 [CLIENTE #${client.id}] ${client.email}`);
            
            // Verificar si ya tiene proyecto
            const projectResult = await db.pool.query(
                'SELECT * FROM projects WHERE client_id = $1',
                [client.id]
            );
            
            // Obtener submission si existe
            let submission = null;
            if (client.submission_id) {
                const subResult = await db.pool.query(
                    'SELECT * FROM submissions WHERE id = $1',
                    [client.submission_id]
                );
                submission = subResult.rows[0];
            }
            
            if (projectResult.rows.length === 0) {
                // No tiene proyecto, crear uno
                console.log(`🆕 [PROYECTO] Cliente sin proyecto, creando...`);
                
                const paymentDate = new Date(client.payment_date || Date.now());
                const autoDeadline = calculateDeadline(client.plan, paymentDate);
                
                const projectData = {
                    client_id: client.id,
                    submission_id: client.submission_id || null,
                    project_name: submission?.business_name || client.business_name || `Web de ${client.full_name}`,
                    business_name: submission?.business_name || client.business_name || 'Sin especificar',
                    client_email: client.email,
                    plan: client.plan,
                    status: 'sin_empezar',
                    priority: 'normal',
                    deadline: autoDeadline,
                    progress: 0,
                    notes: `Proyecto creado automáticamente desde fix-projects. Plan: ${client.plan}`
                };
                
                const projectId = await db.createProject(projectData);
                console.log(`✅ [PROYECTO] Proyecto #${projectId} creado`);
                
                report.projectsCreated++;
                report.details.push({
                    clientId: client.id,
                    action: 'created',
                    projectId,
                    projectName: projectData.project_name
                });
                
            } else {
                // Ya tiene proyecto, verificar que tenga todos los campos
                const project = projectResult.rows[0];
                console.log(`📋 [PROYECTO] Ya existe proyecto #${project.id}`);
                
                const updates = [];
                const values = [];
                let paramCount = 1;
                let needsUpdate = false;
                
                // Verificar project_name
                if (!project.project_name || project.project_name === 'undefined') {
                    const newName = submission?.business_name || client.business_name || `Web de ${client.full_name}`;
                    updates.push(`project_name = $${paramCount++}`);
                    values.push(newName);
                    needsUpdate = true;
                    console.log(`🔧 Actualizando project_name: ${newName}`);
                }
                
                // Verificar business_name
                if (!project.business_name || project.business_name === 'Sin especificar') {
                    const newBusinessName = submission?.business_name || client.business_name || 'Sin especificar';
                    updates.push(`business_name = $${paramCount++}`);
                    values.push(newBusinessName);
                    needsUpdate = true;
                    console.log(`🔧 Actualizando business_name: ${newBusinessName}`);
                }
                
                // Verificar client_email
                if (!project.client_email) {
                    updates.push(`client_email = $${paramCount++}`);
                    values.push(client.email);
                    needsUpdate = true;
                    console.log(`🔧 Actualizando client_email: ${client.email}`);
                }
                
                // Verificar submission_id
                if (!project.submission_id && client.submission_id) {
                    updates.push(`submission_id = $${paramCount++}`);
                    values.push(client.submission_id);
                    needsUpdate = true;
                    console.log(`🔧 Actualizando submission_id: ${client.submission_id}`);
                }
                
                // Verificar priority
                if (!project.priority) {
                    updates.push(`priority = $${paramCount++}`);
                    values.push('normal');
                    needsUpdate = true;
                    console.log(`🔧 Actualizando priority: normal`);
                }
                
                // Verificar progress
                if (project.progress === null || project.progress === undefined) {
                    updates.push(`progress = $${paramCount++}`);
                    values.push(0);
                    needsUpdate = true;
                    console.log(`🔧 Actualizando progress: 0`);
                }
                
                if (needsUpdate) {
                    values.push(project.id);
                    const query = `UPDATE projects SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`;
                    await db.pool.query(query, values);
                    console.log(`✅ [PROYECTO] Proyecto #${project.id} actualizado`);
                    
                    report.projectsUpdated++;
                    report.details.push({
                        clientId: client.id,
                        action: 'updated',
                        projectId: project.id,
                        fields: updates.length
                    });
                } else {
                    console.log(`✅ [PROYECTO] Proyecto #${project.id} ya está correcto`);
                    report.projectsAlreadyOk++;
                }
            }
        }
        
        console.log('\n==================================================');
        console.log('✅ REPORTE FINAL:');
        console.log(`🔄 Estados corregidos (desarrollo → en_desarrollo): ${report.statesCorrected}`);
        console.log(`📊 Clientes con plan: ${report.clientsWithPlan}`);
        console.log(`🆕 Proyectos creados: ${report.projectsCreated}`);
        console.log(`🔧 Proyectos actualizados: ${report.projectsUpdated}`);
        console.log(`✅ Proyectos ya correctos: ${report.projectsAlreadyOk}`);
        console.log('==================================================\n');
        
        res.json({
            success: true,
            ...report
        });
        
    } catch (error) {
        console.error('❌ Error arreglando proyectos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/fix-corrupted-data', async (req, res) => {
    console.log('🔧 [ADMIN] Ejecutando script de reparación de datos...');
    
    try {
        const result = await db.pool.query('SELECT id, contact_methods, purpose, pages, custom_pages FROM submissions');
        const submissions = result.rows;
        
        console.log(`📊 Total de submissions: ${submissions.length}`);
        
        let fixedCount = 0;
        const fixes = [];
        
        for (const submission of submissions) {
            const updates = [];
            const values = [];
            let paramCount = 1;
            let needsUpdate = false;
            const fixLog = { id: submission.id, fixed: [] };
            
            // Verificar y arreglar contact_methods
            if (submission.contact_methods && typeof submission.contact_methods === 'string') {
                try {
                    JSON.parse(submission.contact_methods);
                } catch (e) {
                    const fixedValue = JSON.stringify([submission.contact_methods]);
                    updates.push(`contact_methods = $${paramCount++}`);
                    values.push(fixedValue);
                    needsUpdate = true;
                    fixLog.fixed.push(`contact_methods: "${submission.contact_methods}" → ${fixedValue}`);
                }
            }
            
            // Verificar y arreglar purpose
            if (submission.purpose && typeof submission.purpose === 'string') {
                try {
                    JSON.parse(submission.purpose);
                } catch (e) {
                    const fixedValue = JSON.stringify([submission.purpose]);
                    updates.push(`purpose = $${paramCount++}`);
                    values.push(fixedValue);
                    needsUpdate = true;
                    fixLog.fixed.push(`purpose: "${submission.purpose}" → ${fixedValue}`);
                }
            }
            
            // Verificar y arreglar pages
            if (submission.pages && typeof submission.pages === 'string') {
                try {
                    JSON.parse(submission.pages);
                } catch (e) {
                    const fixedValue = JSON.stringify([submission.pages]);
                    updates.push(`pages = $${paramCount++}`);
                    values.push(fixedValue);
                    needsUpdate = true;
                    fixLog.fixed.push(`pages: "${submission.pages}" → ${fixedValue}`);
                }
            }
            
            // Verificar y arreglar custom_pages
            if (submission.custom_pages && typeof submission.custom_pages === 'string') {
                try {
                    JSON.parse(submission.custom_pages);
                } catch (e) {
                    const fixedValue = JSON.stringify([submission.custom_pages]);
                    updates.push(`custom_pages = $${paramCount++}`);
                    values.push(fixedValue);
                    needsUpdate = true;
                    fixLog.fixed.push(`custom_pages: "${submission.custom_pages}" → ${fixedValue}`);
                }
            }
            
            // Si hay updates, ejecutar
            if (needsUpdate) {
                values.push(submission.id);
                const query = `UPDATE submissions SET ${updates.join(', ')} WHERE id = $${paramCount}`;
                
                await db.pool.query(query, values);
                fixedCount++;
                fixes.push(fixLog);
            }
        }
        
        console.log(`✅ Corrección completada: ${fixedCount}/${submissions.length}`);
        
        res.json({
            success: true,
            total: submissions.length,
            fixed: fixedCount,
            alreadyCorrect: submissions.length - fixedCount,
            details: fixes
        });
        
    } catch (error) {
        console.error('❌ Error reparando datos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Dashboard admin: http://localhost:${PORT}/admin`);
    console.log(`💳 Webhook URL: http://localhost:${PORT}/webhook`);
}); 