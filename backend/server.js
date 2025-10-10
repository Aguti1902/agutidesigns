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
const googleAuth = require('./google-auth');
const OpenAI = require('openai');

// Google Analytics Data API
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Inicializar cliente de Google Analytics (solo si las credenciales están configuradas)
let analyticsDataClient = null;
if (process.env.GA_CLIENT_EMAIL && process.env.GA_PRIVATE_KEY) {
    try {
        // Decodificar la clave privada desde Base64 o usar directamente
        let privateKey;
        try {
            // Intentar decodificar desde Base64
            privateKey = Buffer.from(process.env.GA_PRIVATE_KEY, 'base64').toString('utf-8');
            console.log('🔓 Clave privada decodificada desde Base64');
        } catch (e) {
            // Si falla Base64, intentar con replace de \n
            privateKey = process.env.GA_PRIVATE_KEY.replace(/\\n/g, '\n');
            console.log('🔓 Clave privada procesada con replace');
        }
        
        analyticsDataClient = new BetaAnalyticsDataClient({
            credentials: {
                client_email: process.env.GA_CLIENT_EMAIL,
                private_key: privateKey,
            },
        });
        console.log('✅ Google Analytics Data API inicializada correctamente');
    } catch (error) {
        console.error('⚠️ Error inicializando Google Analytics API:', error.message);
        console.error('Stack:', error.stack);
    }
} else {
    console.log('⚠️ Google Analytics no configurado (usando datos simulados)');
}

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`🚀 Servidor iniciando en modo: ${isTestMode ? 'TEST ⚠️' : 'PRODUCCIÓN ✅'}`);

// ============================================
// 🕒 FUNCIÓN HELPER: Calcular deadline automático
// ============================================
function calculateDeadline(plan, paymentDate = new Date()) {
    const deadlineDays = {
        'basico': 5,      // 5 días para plan básico
        'avanzado': 7,    // 7 días para plan avanzado
        'premium': 10     // 10 días para plan premium
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
    'https://agutidesigns.es',
    'https://formulario.agutidesigns.es',
    'https://panel.agutidesigns.es',
    'https://admin.agutidesigns.es',
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
            
            // Validar que formData existe
            if (!formData) {
                console.error('❌ Error: No se recibió formData');
                return res.status(400).json({ 
                    error: 'Datos del formulario no encontrados. Por favor, recarga la página e intenta de nuevo.',
                    details: 'formData is undefined'
                });
            }
            
            const fullName = formData.first_name && formData.last_name 
                ? `${formData.first_name} ${formData.last_name}`.trim()
                : (formData.full_name || formData.email?.split('@')[0] || 'Cliente');

            const amounts = {
                monthly: { basico: 35, avanzado: 49, premium: 65 },
                annual: { basico: 336, avanzado: 468, premium: 624 }
            };
            const amount = amounts[billingCycle][plan];

            submissionData = {
                ...formData,
                full_name: fullName,
                email: formData.email || billingDetails.email,
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
                
                // Verificar si es un cambio de plan (para reiniciar ventana de edición 24h)
                const isPlanChange = existingClient.plan && existingClient.plan !== plan;
                
                // Actualizar plan, payment_date, submission_id Y plan_change_at (si es cambio de plan)
                const updateData = {
                    plan: plan,
                    billing_cycle: billingCycle,
                    stripe_customer_id: customer.id,  // ✅ CRITICAL: Vincular con Stripe Customer
                    stripe_subscription_id: subscription.id,
                    payment_date: new Date().toISOString(),
                    submission_id: finalSubmissionId
                };
                
                // Si es cambio de plan, actualizar plan_change_at para reiniciar ventana de edición
                if (isPlanChange) {
                    updateData.plan_change_at = new Date().toISOString();
                    console.log('🔄 Cambio de plan detectado:', existingClient.plan, '→', plan, '- Reiniciando ventana de edición 24h');
                }
                
                await db.updateClient(existingClient.id, updateData);
                
                console.log(`✅ Cliente ${clientId} actualizado con submission_id: ${finalSubmissionId}`);
                if (isPlanChange) {
                    console.log('⏰ plan_change_at actualizado - Temporizador de 24h reiniciado');
                }
                
                // Verificar actualización
                const updatedClient = await db.getClientById(clientId);
                console.log('🔍 Verificación después de actualizar:', {
                    id: updatedClient.id,
                    submission_id: updatedClient.submission_id,
                    plan: updatedClient.plan,
                    billing_cycle: updatedClient.billing_cycle,
                    plan_change_at: updatedClient.plan_change_at,
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
            try {
                console.log('📧 [EMAILS] Preparando envío de emails...');
                console.log('📧 [EMAILS] Datos del cliente:', {
                    email: submission.email,
                    full_name: submission.full_name,
                    business_name: submission.business_name,
                    plan: submission.plan
                });
                
                // Email 1: Admin
                console.log('📧 [EMAIL 1/2] Enviando notificación al admin...');
                const adminResult = await emailService.sendEmail('admin-new-client', submission);
                console.log('✅ [EMAIL 1/2] Admin notificado:', adminResult.success ? 'SUCCESS' : 'FAILED');
                
                // Email 2: Cliente
                console.log('📧 [EMAIL 2/2] Enviando confirmación al cliente:', submission.email);
                const clientResult = await emailService.sendEmail('payment-success', submission);
                console.log('✅ [EMAIL 2/2] Cliente notificado:', clientResult.success ? 'SUCCESS' : 'FAILED');
                
                console.log('✅ Proceso de emails completado');
            } catch (emailError) {
                console.error('❌ Error enviando emails:', emailError);
                console.error('❌ Error stack:', emailError.stack);
            }

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

            // Enviar emails
            try {
                console.log('📧 [WEBHOOK EMAILS] Preparando envío de emails...');
                console.log('📧 [WEBHOOK EMAILS] Datos:', {
                    email: submission.email,
                    full_name: submission.full_name,
                    business_name: submission.business_name
                });
                
                // Email 1: Admin
                console.log('📧 [WEBHOOK EMAIL 1/2] Enviando notificación al admin...');
                const adminResult = await emailService.sendEmail('admin-new-client', submission);
                console.log('✅ [WEBHOOK EMAIL 1/2] Admin notificado:', adminResult.success ? 'SUCCESS' : 'FAILED');
                
                // Email 2: Cliente
                console.log('📧 [WEBHOOK EMAIL 2/2] Enviando confirmación al cliente:', submission.email);
                const clientResult = await emailService.sendEmail('payment-success', submission);
                console.log('✅ [WEBHOOK EMAIL 2/2] Cliente notificado:', clientResult.success ? 'SUCCESS' : 'FAILED');
                
                console.log('✅ Proceso de emails completado (webhook)');
            } catch (emailError) {
                console.error('❌ Error enviando emails (webhook):', emailError);
                console.error('❌ Error stack:', emailError.stack);
            }

            console.log(`Pago completado para submission ${submissionId}`);
            break;

        case 'customer.subscription.updated':
            const updatedSubscription = event.data.object;
            console.log(`\n🔄 [WEBHOOK] ========== SUBSCRIPTION UPDATED ==========`);
            console.log(`📊 [WEBHOOK] Subscription ID: ${updatedSubscription.id}`);
            console.log(`📊 [WEBHOOK] Customer ID: ${updatedSubscription.customer}`);
            console.log(`📊 [WEBHOOK] Estado: ${updatedSubscription.status}`);
            console.log(`📊 [WEBHOOK] Cancel at period end: ${updatedSubscription.cancel_at_period_end}`);
            console.log(`📊 [WEBHOOK] Current period end: ${new Date(updatedSubscription.current_period_end * 1000).toISOString()}`);
            
            // Si está marcada para cancelar al final del período
            if (updatedSubscription.cancel_at_period_end === true) {
                console.log(`🚫 [WEBHOOK] ¡Detectada cancelación! Buscando cliente...`);
                try {
                    // Buscar cliente por stripe_subscription_id
                    const clientResult = await db.pool.query(
                        'SELECT id, email, full_name, subscription_status FROM clients WHERE stripe_subscription_id = $1',
                        [updatedSubscription.id]
                    );
                    
                    console.log(`🔍 [WEBHOOK] Clientes encontrados: ${clientResult.rows.length}`);
                    
                    if (clientResult.rows.length > 0) {
                        const client = clientResult.rows[0];
                        const endDate = new Date(updatedSubscription.current_period_end * 1000);
                        
                        console.log(`👤 [WEBHOOK] Cliente encontrado:`);
                        console.log(`   - ID: ${client.id}`);
                        console.log(`   - Email: ${client.email}`);
                        console.log(`   - Estado actual: ${client.subscription_status}`);
                        console.log(`   - Fecha de expiración: ${endDate.toISOString()}`);
                        
                        // Actualizar cliente como cancelado
                        try {
                            await db.pool.query(`
                                UPDATE clients
                                SET 
                                    subscription_status = 'cancelled',
                                    cancelled_at = CURRENT_TIMESTAMP,
                                    cancellation_reason = 'Cancelado desde Stripe Customer Portal',
                                    subscription_end_date = $1
                                WHERE id = $2
                            `, [endDate, client.id]);
                            
                            console.log(`✅ [WEBHOOK] Cliente #${client.id} (${client.email}) ACTUALIZADO como cancelado`);
                        } catch (updateError) {
                            console.error(`❌ [WEBHOOK] Error en UPDATE:`, updateError);
                            console.error(`   Mensaje: ${updateError.message}`);
                            console.error(`   Código: ${updateError.code}`);
                            // Si las columnas no existen, aún no se hizo redeploy
                            if (updateError.code === '42703') {
                                console.error(`⚠️ [WEBHOOK] Las columnas de cancelación NO EXISTEN. DEBES HACER REDEPLOY DE RAILWAY!`);
                            }
                        }
                    } else {
                        console.warn(`⚠️ [WEBHOOK] No se encontró cliente con subscription_id: ${updatedSubscription.id}`);
                        console.warn(`💡 [WEBHOOK] Buscando por customer_id como alternativa...`);
                        
                        // Intentar buscar por stripe_customer_id
                        const clientByCustomer = await db.pool.query(
                            'SELECT id, email, full_name FROM clients WHERE stripe_customer_id = $1',
                            [updatedSubscription.customer]
                        );
                        
                        if (clientByCustomer.rows.length > 0) {
                            console.log(`✅ [WEBHOOK] Cliente encontrado por customer_id!`);
                            const client = clientByCustomer.rows[0];
                            const endDate = new Date(updatedSubscription.current_period_end * 1000);
                            
                            try {
                                await db.pool.query(`
                                    UPDATE clients
                                    SET 
                                        subscription_status = 'cancelled',
                                        cancelled_at = CURRENT_TIMESTAMP,
                                        cancellation_reason = 'Cancelado desde Stripe Customer Portal',
                                        subscription_end_date = $1
                                    WHERE id = $2
                                `, [endDate, client.id]);
                                
                                console.log(`✅ [WEBHOOK] Cliente #${client.id} ACTUALIZADO como cancelado (via customer_id)`);
                            } catch (updateError) {
                                console.error(`❌ [WEBHOOK] Error en UPDATE:`, updateError.message);
                            }
                        } else {
                            console.error(`❌ [WEBHOOK] No se encontró cliente ni por subscription_id ni por customer_id`);
                        }
                    }
                } catch (dbError) {
                    console.error('❌ [WEBHOOK] Error en proceso de cancelación:', dbError);
                    console.error('   Stack:', dbError.stack);
                }
            } else if (updatedSubscription.cancel_at_period_end === false && updatedSubscription.status === 'active') {
                // 🔄 REACTIVACIÓN: El cliente reactivó su plan cancelado
                console.log(`♻️ [WEBHOOK] ¡Detectada REACTIVACIÓN! Buscando cliente...`);
                try {
                    // Buscar cliente por stripe_subscription_id
                    const clientResult = await db.pool.query(
                        'SELECT id, email, full_name, subscription_status FROM clients WHERE stripe_subscription_id = $1',
                        [updatedSubscription.id]
                    );
                    
                    console.log(`🔍 [WEBHOOK] Clientes encontrados: ${clientResult.rows.length}`);
                    
                    if (clientResult.rows.length > 0) {
                        const client = clientResult.rows[0];
                        
                        console.log(`👤 [WEBHOOK] Cliente encontrado:`);
                        console.log(`   - ID: ${client.id}`);
                        console.log(`   - Email: ${client.email}`);
                        console.log(`   - Estado actual: ${client.subscription_status}`);
                        
                        // Solo reactivar si estaba cancelado
                        if (client.subscription_status === 'cancelled') {
                            console.log(`♻️ [WEBHOOK] ¡Cliente estaba cancelado! Reactivando...`);
                            
                            try {
                                await db.pool.query(`
                                    UPDATE clients
                                    SET 
                                        subscription_status = 'active',
                                        cancelled_at = NULL,
                                        cancellation_reason = NULL,
                                        subscription_end_date = NULL
                                    WHERE id = $1
                                `, [client.id]);
                                
                                console.log(`✅ [WEBHOOK] Cliente #${client.id} (${client.email}) REACTIVADO exitosamente`);
                                console.log(`   ✅ subscription_status: cancelled → active`);
                                console.log(`   ✅ cancelled_at: limpiado`);
                                console.log(`   ✅ cancellation_reason: limpiado`);
                                console.log(`   ✅ subscription_end_date: limpiado`);
                            } catch (updateError) {
                                console.error(`❌ [WEBHOOK] Error en UPDATE (reactivación):`, updateError);
                                console.error(`   Mensaje: ${updateError.message}`);
                            }
                        } else {
                            console.log(`ℹ️ [WEBHOOK] Cliente ya estaba activo (${client.subscription_status}), sin cambios`);
                        }
                    } else {
                        console.warn(`⚠️ [WEBHOOK] No se encontró cliente con subscription_id: ${updatedSubscription.id}`);
                        console.warn(`💡 [WEBHOOK] Buscando por customer_id como alternativa...`);
                        
                        // Intentar buscar por stripe_customer_id
                        const clientByCustomer = await db.pool.query(
                            'SELECT id, email, full_name, subscription_status FROM clients WHERE stripe_customer_id = $1',
                            [updatedSubscription.customer]
                        );
                        
                        if (clientByCustomer.rows.length > 0) {
                            console.log(`✅ [WEBHOOK] Cliente encontrado por customer_id!`);
                            const client = clientByCustomer.rows[0];
                            
                            if (client.subscription_status === 'cancelled') {
                                console.log(`♻️ [WEBHOOK] ¡Cliente estaba cancelado! Reactivando...`);
                                
                                try {
                                    await db.pool.query(`
                                        UPDATE clients
                                        SET 
                                            subscription_status = 'active',
                                            cancelled_at = NULL,
                                            cancellation_reason = NULL,
                                            subscription_end_date = NULL
                                        WHERE id = $1
                                    `, [client.id]);
                                    
                                    console.log(`✅ [WEBHOOK] Cliente #${client.id} REACTIVADO (via customer_id)`);
                                } catch (updateError) {
                                    console.error(`❌ [WEBHOOK] Error en UPDATE:`, updateError.message);
                                }
                            }
                        } else {
                            console.error(`❌ [WEBHOOK] No se encontró cliente ni por subscription_id ni por customer_id`);
                        }
                    }
                } catch (dbError) {
                    console.error('❌ [WEBHOOK] Error en proceso de reactivación:', dbError);
                    console.error('   Stack:', dbError.stack);
                }
            } else {
                console.log(`ℹ️ [WEBHOOK] Sin cambios relevantes (cancel_at_period_end: ${updatedSubscription.cancel_at_period_end}, status: ${updatedSubscription.status})`);
            }
            console.log(`========== FIN WEBHOOK ==========\n`);
            break;

        case 'customer.subscription.deleted':
            const deletedSubscription = event.data.object;
            console.log(`🚫 [WEBHOOK] Suscripción eliminada: ${deletedSubscription.id}`);
            
            try {
                // Buscar cliente por stripe_subscription_id
                const clientResult = await db.pool.query(
                    'SELECT id, email FROM clients WHERE stripe_subscription_id = $1',
                    [deletedSubscription.id]
                );
                
                if (clientResult.rows.length > 0) {
                    const client = clientResult.rows[0];
                    
                    console.log(`🚫 [WEBHOOK] Marcando cliente ${client.email} como cancelado (suscripción eliminada)`);
                    
                    // Marcar como cancelado inmediatamente
                    await db.pool.query(`
                        UPDATE clients
                        SET 
                            subscription_status = 'cancelled',
                            cancelled_at = CURRENT_TIMESTAMP,
                            cancellation_reason = 'Suscripción eliminada en Stripe',
                            subscription_end_date = CURRENT_TIMESTAMP
                        WHERE id = $1
                    `, [client.id]);
                    
                    console.log(`✅ [WEBHOOK] Cliente #${client.id} (${client.email}) marcado como cancelado`);
                } else {
                    console.warn(`⚠️ [WEBHOOK] No se encontró cliente con subscription_id: ${deletedSubscription.id}`);
                }
            } catch (dbError) {
                console.error('❌ [WEBHOOK] Error procesando cancelación:', dbError);
            }
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

// 9. DASHBOARD ADMIN - MARCAR MODIFICACIONES COMO VISTAS
app.post('/api/admin/submissions/:id/mark-viewed', async (req, res) => {
    try {
        const submissionId = req.params.id;
        console.log(`👁️ [ADMIN] Marcando pedido #${submissionId} como visto`);
        
        // Obtener datos antes de actualizar (para debug)
        const beforeUpdate = await db.getSubmission(submissionId);
        console.log(`🔍 [DEBUG] Antes de marcar como visto:`, {
            admin_viewed_at: beforeUpdate?.admin_viewed_at,
            has_modifications: beforeUpdate?.has_modifications,
            modifications_viewed_at: beforeUpdate?.modifications_viewed_at,
            last_modified_at: beforeUpdate?.last_modified_at
        });
        
        await db.markSubmissionAsViewed(submissionId);
        
        // Verificar después de actualizar
        const afterUpdate = await db.getSubmission(submissionId);
        console.log(`🔍 [DEBUG] Después de marcar como visto:`, {
            admin_viewed_at: afterUpdate?.admin_viewed_at,
            has_modifications: afterUpdate?.has_modifications,
            modifications_viewed_at: afterUpdate?.modifications_viewed_at,
            last_modified_at: afterUpdate?.last_modified_at
        });
        
        console.log(`✅ [ADMIN] Pedido #${submissionId} marcado como visto exitosamente`);
        res.json({ success: true, timestamp: afterUpdate?.modifications_viewed_at });
    } catch (error) {
        console.error(`❌ [ADMIN] Error marcando pedido #${req.params.id} como visto:`, error);
        res.status(500).json({ error: error.message });
    }
});

// 8b. DASHBOARD ADMIN - ACTUALIZAR CAMPOS DE SUBMISSION
app.patch('/api/admin/submissions/:id', async (req, res) => {
    try {
        const submissionId = req.params.id;
        const updates = req.body;
        
        console.log(`🔧 [ADMIN] Actualizando campos del pedido #${submissionId}:`, Object.keys(updates));
        
        // Construir query dinámicamente para submissions
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        // Lista de campos permitidos para actualizar
        const allowedFields = [
            'business_name', 'business_description', 'industry', 'cif_nif', 'razon_social', 
            'direccion_fiscal', 'business_email', 'contact_methods', 'phone_number', 
            'email_contact', 'whatsapp_number', 'form_email', 'physical_address',
            'instagram', 'facebook', 'linkedin', 'twitter', 'services', 'purpose', 
            'target_audience', 'pages', 'custom_pages', 'design_style', 'brand_colors', 
            'reference_websites', 'keywords', 'has_analytics', 'domain_name', 'domain_alt1', 
            'domain_alt2', 'privacy_policy', 'privacy_text', 'web_texts', 'menu_content', 
            'opening_hours', 'portfolio_description', 'full_name', 'email', 'phone', 'address'
        ];
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = $${paramCount}`);
                
                // Si es un array, convertir a JSON
                if (Array.isArray(value)) {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
                
                paramCount++;
            }
        }
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
        }
        
        // Añadir ID al final
        values.push(submissionId);
        
        const query = `
            UPDATE submissions 
            SET ${fields.join(', ')}, 
                has_modifications = true,
                last_modified_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $${paramCount}
        `;
        
        await db.pool.query(query, values);
        console.log(`✅ [ADMIN] Submission #${submissionId} actualizada y marcada como modificada`);
        
        // ========================================
        // SINCRONIZAR CON CLIENTS Y PROJECTS
        // ========================================
        
        // Obtener el email de la submission para encontrar el cliente
        const submissionResult = await db.pool.query('SELECT email FROM submissions WHERE id = $1', [submissionId]);
        if (submissionResult.rows.length > 0) {
            const submissionEmail = submissionResult.rows[0].email;
            
            // Buscar cliente por email
            const clientResult = await db.pool.query('SELECT id FROM clients WHERE email = $1', [submissionEmail]);
            if (clientResult.rows.length > 0) {
                const clientId = clientResult.rows[0].id;
                
                // Actualizar campos relevantes en CLIENTS
                const clientUpdates = {};
                if (updates.business_name) clientUpdates.business_name = updates.business_name;
                if (updates.full_name) clientUpdates.full_name = updates.full_name;
                if (updates.email) clientUpdates.email = updates.email;
                
                if (Object.keys(clientUpdates).length > 0) {
                    const clientFields = [];
                    const clientValues = [];
                    let clientParamCount = 1;
                    
                    for (const [key, value] of Object.entries(clientUpdates)) {
                        clientFields.push(`${key} = $${clientParamCount}`);
                        clientValues.push(value);
                        clientParamCount++;
                    }
                    
                    clientValues.push(clientId);
                    
                    const clientQuery = `
                        UPDATE clients 
                        SET ${clientFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = $${clientParamCount}
                    `;
                    
                    await db.pool.query(clientQuery, clientValues);
                    console.log(`✅ [ADMIN] Cliente #${clientId} sincronizado`);
                }
                
                // Actualizar campos relevantes en PROJECTS
                const projectUpdates = {};
                if (updates.business_name) projectUpdates.business_name = updates.business_name;
                if (updates.full_name) projectUpdates.client_name = updates.full_name;
                if (updates.email) projectUpdates.client_email = updates.email;
                
                if (Object.keys(projectUpdates).length > 0) {
                    const projectFields = [];
                    const projectValues = [];
                    let projectParamCount = 1;
                    
                    for (const [key, value] of Object.entries(projectUpdates)) {
                        projectFields.push(`${key} = $${projectParamCount}`);
                        projectValues.push(value);
                        projectParamCount++;
                    }
                    
                    projectValues.push(clientId);
                    
                    const projectQuery = `
                        UPDATE projects 
                        SET ${projectFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                        WHERE client_id = $${projectParamCount}
                    `;
                    
                    await db.pool.query(projectQuery, projectValues);
                    console.log(`✅ [ADMIN] Proyectos del cliente #${clientId} sincronizados`);
                }
            }
        }
        
        console.log(`✅ [ADMIN] Pedido #${submissionId} y datos relacionados actualizados correctamente`);
        res.json({ success: true });
        
    } catch (error) {
        console.error(`❌ [ADMIN] Error actualizando pedido #${req.params.id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// 9. DASHBOARD ADMIN - ESTADÍSTICAS
app.get('/api/admin/stats', async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        console.log('📊 [ADMIN] Obteniendo estadísticas con filtros:', { filter, startDate, endDate });
        
        // Calcular fechas según filtro
        let dateFilter = {};
        if (startDate && endDate) {
            // Rango personalizado
            dateFilter.start = new Date(startDate);
            dateFilter.end = new Date(endDate);
            dateFilter.end.setHours(23, 59, 59, 999); // Incluir todo el día
        } else if (filter && filter !== 'all') {
            const now = new Date();
            dateFilter.end = new Date(); // Nueva instancia para evitar mutaciones
            
            switch(filter) {
                case 'today':
                    dateFilter.start = new Date();
                    dateFilter.start.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    dateFilter.start = new Date();
                    dateFilter.start.setDate(dateFilter.start.getDate() - 7);
                    break;
                case 'month':
                    dateFilter.start = new Date();
                    dateFilter.start.setMonth(dateFilter.start.getMonth() - 1);
                    break;
                case 'year':
                    dateFilter.start = new Date();
                    dateFilter.start.setFullYear(dateFilter.start.getFullYear() - 1);
                    break;
            }
        }
        
        console.log('📅 [ADMIN] Filtro de fecha calculado:', {
            hasFilter: Object.keys(dateFilter).length > 0,
            start: dateFilter.start?.toISOString(),
            end: dateFilter.end?.toISOString()
        });
        
        const stats = await db.getStats(dateFilter);
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

// ============================================
// 🔐 AUTENTICACIÓN CON GOOGLE
// ============================================

// Endpoint para login/registro con Google
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ error: 'Token de Google requerido' });
        }
        
        console.log('🔐 [GOOGLE AUTH] Verificando token de Google...');
        
        // Verificar token de Google
        const googleData = await googleAuth.verifyGoogleToken(credential);
        console.log('✅ [GOOGLE AUTH] Token verificado:', googleData.email);
        
        // Obtener o crear usuario
        const user = await googleAuth.getOrCreateGoogleUser(googleData, db);
        console.log('✅ [GOOGLE AUTH] Usuario autenticado:', user.email);
        
        // Retornar datos del usuario (sin contraseña)
        const { password, ...userData } = user;
        
        res.json({
            success: true,
            user: userData,
            message: 'Autenticación exitosa con Google'
        });
        
    } catch (error) {
        console.error('❌ [GOOGLE AUTH] Error:', error);
        res.status(401).json({ 
            error: 'Error en autenticación con Google',
            details: error.message 
        });
    }
});

// ==========================================
// RESET DE CONTRASEÑA
// ==========================================

// Solicitar reset de contraseña (envía email)
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email requerido' });
        }
        
        console.log('🔐 [RESET] Solicitud de reset para:', email);
        
        // Verificar que el usuario existe
        const client = await db.getClientByEmail(email);
        if (!client) {
            // Por seguridad, no revelamos si el email existe o no
            console.log('⚠️ [RESET] Email no encontrado:', email);
            return res.json({ 
                success: true, 
                message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' 
            });
        }
        
        // Generar token único
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hora
        
        // Guardar token en la BD
        await db.createPasswordResetToken(email, resetToken, expiresAt);
        console.log('✅ [RESET] Token creado para:', email);
        
        // Enviar email
        const emailResult = await emailService.sendEmail('password-reset', {
            email: email,
            token: resetToken
        });
        
        if (emailResult.success) {
            console.log('✅ [RESET] Email de reset enviado a:', email);
        } else {
            console.error('❌ [RESET] Error enviando email:', emailResult.error);
        }
        
        res.json({ 
            success: true, 
            message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' 
        });
        
    } catch (error) {
        console.error('❌ [RESET] Error:', error);
        res.status(500).json({ error: 'Error procesando solicitud' });
    }
});

// Restablecer contraseña con token
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token y contraseña requeridos' });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
        }
        
        console.log('🔐 [RESET] Intentando restablecer contraseña con token');
        
        // Verificar token
        const resetData = await db.getPasswordResetToken(token);
        
        if (!resetData) {
            console.log('❌ [RESET] Token inválido o expirado');
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }
        
        console.log('✅ [RESET] Token válido para:', resetData.email);
        
        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Actualizar contraseña del cliente
        await db.updateClient(
            (await db.getClientByEmail(resetData.email)).id,
            { password: hashedPassword }
        );
        
        // Marcar token como usado
        await db.markTokenAsUsed(token);
        
        console.log('✅ [RESET] Contraseña actualizada para:', resetData.email);
        
        res.json({ 
            success: true, 
            message: 'Contraseña actualizada exitosamente' 
        });
        
    } catch (error) {
        console.error('❌ [RESET] Error:', error);
        res.status(500).json({ error: 'Error procesando solicitud' });
    }
});

// ==========================================
// OPENAI - GENERACIÓN DE TEXTOS PARA FORMULARIO
// ==========================================

app.post('/api/generate-text', async (req, res) => {
    try {
        const { prompt, businessName, sector, tone = 'profesional' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt requerido' });
        }
        
        console.log('🤖 [OPENAI] Generando texto para:', businessName || 'N/A');
        
        // Verificar que la API key está configurada
        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ [OPENAI] OPENAI_API_KEY no configurada');
            return res.status(500).json({ 
                error: 'Generación de IA no disponible. Contacta al administrador.' 
            });
        }
        
        // Inicializar OpenAI
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Construir el prompt contextualizado
        const contextualPrompt = `
Eres un copywriter experto que ayuda a empresas a crear contenido web profesional.

CONTEXTO:
- Negocio: ${businessName || 'No especificado'}
- Sector: ${sector || 'No especificado'}
- Tono deseado: ${tone}

TAREA:
${prompt}

IMPORTANTE:
- Responde SOLO con el texto solicitado, sin introducciones ni explicaciones
- Usa un tono ${tone} y apropiado para el sector
- Máximo 150 palabras
- En español
- Sin comillas ni formato especial
        `.trim();
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "Eres un experto copywriter que crea textos profesionales para sitios web. Siempre respondes solo con el texto solicitado, sin explicaciones adicionales."
                },
                {
                    role: "user",
                    content: contextualPrompt
                }
            ],
            max_tokens: 300,
            temperature: 0.7
        });
        
        const generatedText = completion.choices[0].message.content.trim();
        
        console.log('✅ [OPENAI] Texto generado exitosamente');
        
        res.json({ 
            success: true, 
            text: generatedText 
        });
        
    } catch (error) {
        console.error('❌ [OPENAI] Error:', error.message);
        
        // Error específico de API key
        if (error.status === 401) {
            return res.status(500).json({ 
                error: 'Error de configuración de OpenAI. Contacta al administrador.' 
            });
        }
        
        res.status(500).json({ 
            error: 'Error al generar texto. Intenta de nuevo.' 
        });
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
                updateQuery = `UPDATE submissions 
                    SET business_name = $1, industry = $2, business_description = $3, 
                        has_modifications = TRUE, 
                        last_modified_at = CURRENT_TIMESTAMP,
                        modifications_viewed_at = NULL,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $4`;
                updateParams = [data.business_name, data.industry, data.business_description, client.submission_id];
                
                // También actualizar en clients
                if (data.business_name) {
                    await db.pool.query(
                        'UPDATE clients SET business_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                        [data.business_name, clientId]
                    );
                }
            } else if (section === 'contacto') {
                updateQuery = `UPDATE submissions 
                    SET email_contact = $1, phone_number = $2, whatsapp_number = $3, 
                        has_modifications = TRUE, 
                        last_modified_at = CURRENT_TIMESTAMP,
                        modifications_viewed_at = NULL,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $4`;
                updateParams = [data.email_contact, data.phone_number, data.whatsapp_number, client.submission_id];
            } else if (section === 'paginas') {
                updateQuery = `UPDATE submissions 
                    SET pages = $1, 
                        has_modifications = TRUE, 
                        last_modified_at = CURRENT_TIMESTAMP,
                        modifications_viewed_at = NULL,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $2`;
                updateParams = [JSON.stringify(data.pages), client.submission_id];
            } else if (section === 'dominio') {
                updateQuery = `UPDATE submissions 
                    SET domain_name = $1, keywords = $2, design_style = $3, 
                        has_modifications = TRUE, 
                        last_modified_at = CURRENT_TIMESTAMP,
                        modifications_viewed_at = NULL,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $4`;
                updateParams = [data.domain_name, data.keywords, data.design_style, client.submission_id];
            } else if (section === 'fiscal') {
                updateQuery = `UPDATE submissions 
                    SET cif_nif = $1, razon_social = $2, direccion_fiscal = $3, 
                        has_modifications = TRUE, 
                        last_modified_at = CURRENT_TIMESTAMP,
                        modifications_viewed_at = NULL,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $4`;
                updateParams = [data.cif_nif, data.razon_social, data.direccion_fiscal, client.submission_id];
            }
            
            if (updateQuery) {
                await db.pool.query(updateQuery, updateParams);
                console.log(`✅ [CLIENT] Modificación marcada en submission #${client.submission_id}`);
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
        const { 
            website_url, 
            wordpress_url, 
            website_screenshot_url, 
            ga_property_id,
            wordpress_username,
            wordpress_password
        } = req.body;
        
        console.log(`🔧 [ADMIN] Actualizando gestión de web para cliente #${clientId}`, {
            website_url,
            wordpress_url,
            website_screenshot_url,
            ga_property_id,
            wordpress_username: wordpress_username ? '***' : undefined,
            wordpress_password: wordpress_password ? '***' : undefined
        });
        
        await db.pool.query(`
            UPDATE clients 
            SET website_url = COALESCE($1, website_url),
                wordpress_url = COALESCE($2, wordpress_url),
                website_screenshot_url = COALESCE($3, website_screenshot_url),
                ga_property_id = COALESCE($4, ga_property_id),
                wordpress_username = COALESCE($5, wordpress_username),
                wordpress_password = COALESCE($6, wordpress_password),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
        `, [
            website_url, 
            wordpress_url, 
            website_screenshot_url, 
            ga_property_id, 
            wordpress_username, 
            wordpress_password, 
            clientId
        ]);
        
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
        
        console.log(`🔄 [CLIENT] Actualizando estado del cliente #${clientId} a: ${status}`);
        
        // Actualizar estado y URL si se proporciona (PostgreSQL)
        await db.pool.query(`
            UPDATE clients 
            SET website_status = $1, 
                website_url = COALESCE($2, website_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `, [status, website_url, clientId]);
        
        console.log(`✅ [CLIENT] Estado del cliente #${clientId} actualizado`);
        
        // Si se marcó como activo, enviar email de notificación al cliente
        if (status === 'activo') {
            const client = await db.getClientById(clientId);
            if (client) {
                console.log(`📧 [CLIENT] Enviando email de notificación a ${client.email}`);
                try {
                    await emailService.sendEmail('custom', {
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
                                        <li>✓ Accede a tu <a href="https://panel.agutidesigns.es">Dashboard</a> para ver estadísticas</li>
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
                dashboard_url: 'https://panel.agutidesigns.es'
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
        const ticket = await db.createTicket(ticketData);
        console.log('✅ [BACKEND] Ticket creado en BD, ID:', ticket.id);
        
        // Enviar email al admin notificando del nuevo ticket
        const adminEmail = process.env.ADMIN_EMAIL || 'info@agutidesigns.es';
        console.log('📧 [EMAIL] Enviando notificación de ticket al admin:', adminEmail);
        try {
            await emailService.sendEmail('custom', {
                to: adminEmail,
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
            await emailService.sendEmail('custom', {
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
        if (markAsRead === 'admin' && ticket.admin_unread === true) {
            console.log('👁️ [BACKEND] Marcando ticket como leído por admin');
            await db.updateTicket(ticketId, { admin_unread: false });
            ticket.admin_unread = false;
        } else if (markAsRead === 'client' && ticket.client_unread === true) {
            console.log('👁️ [BACKEND] Marcando ticket como leído por cliente');
            await db.updateTicket(ticketId, { client_unread: false });
            ticket.client_unread = false;
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
        
        // Obtener el ticket actual para ver si ya tiene respuestas
        const currentTicket = await db.getTicketById(parseInt(ticketId));
        
        // Si hay una nueva respuesta del cliente, concatenarla con las anteriores
        let updatedClientResponse = client_response;
        if (client_response && currentTicket && currentTicket.client_response) {
            // Agregar separador con timestamp en milisegundos (sin problemas de zona horaria)
            const timestampMs = Date.now();
            updatedClientResponse = currentTicket.client_response + 
                `\n\n--- Respuesta adicional [${timestampMs}] ---\n\n` + 
                client_response;
            console.log('💬 [BACKEND] Concatenando respuesta del cliente con historial anterior');
        }
        
        // Actualizar ticket con respuesta del cliente y cambiar estado a "en_proceso"
        await db.updateTicket(parseInt(ticketId), { 
            client_response: updatedClientResponse,
            status: 'en_proceso',
            admin_unread: true,       // Admin tiene mensaje nuevo sin leer
            client_unread: false      // Cliente lo acaba de enviar/leer
        });
        
        const ticket = await db.getTicketById(parseInt(ticketId));
        console.log('✅ [BACKEND] Ticket actualizado con respuesta del cliente');
        
        // Enviar email al admin notificando la nueva respuesta
        try {
            await emailService.sendEmail('custom', {
                to: process.env.ADMIN_EMAIL || 'info@agutidesigns.es',
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
        
        // Obtener el ticket actual para ver si ya tiene respuestas
        const currentTicket = await db.getTicketById(parseInt(ticketId));
        
        // Si hay una nueva respuesta del admin, concatenarla con las anteriores
        let updatedAdminResponse = admin_response;
        if (admin_response && currentTicket && currentTicket.admin_response) {
            // Agregar separador con timestamp en milisegundos (sin problemas de zona horaria)
            const timestampMs = Date.now();
            updatedAdminResponse = currentTicket.admin_response + 
                `\n\n--- Respuesta adicional [${timestampMs}] ---\n\n` + 
                admin_response;
            console.log('💬 [BACKEND] Concatenando respuesta con historial anterior');
        }
        
        // Actualizar ticket y marcar como leído por admin, no leído por cliente
        await db.updateTicket(parseInt(ticketId), { 
            status, 
            admin_response: updatedAdminResponse,
            admin_response_at: new Date(),
            admin_unread: false,      // Admin lo acaba de leer/responder
            client_unread: true       // Cliente tiene mensaje nuevo sin leer
        });
        console.log('🎫 [BACKEND] Ticket actualizado');
        
        const ticket = await db.getTicketById(parseInt(ticketId));
        console.log('🎫 [BACKEND] Ticket obtenido:', ticket ? `#${ticket.id}` : 'NO ENCONTRADO');
        
        // Si hay respuesta del admin, enviar email al cliente
        if (admin_response && ticket) {
            console.log('📧 [BACKEND] Enviando email al cliente:', ticket.client_email);
            try {
                await emailService.sendEmail('custom', {
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

// Estadísticas de proyectos (DEBE IR ANTES de la ruta con :id)
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

// 🔽 Endpoint temporal para corregir downgrades existentes
app.get('/api/admin/fix-downgrades', async (req, res) => {
    try {
        console.log('🔽 [ADMIN] Corrigiendo downgrades existentes...');
        
        const planOrder = { basico: 1, avanzado: 2, premium: 3 };
        
        // Obtener submissions con previous_plan
        const submissionsResult = await db.pool.query(`
            SELECT id, plan, previous_plan, has_upgrade, is_downgrade 
            FROM submissions 
            WHERE previous_plan IS NOT NULL
        `);
        
        const submissions = submissionsResult.rows;
        let fixed = 0;
        let alreadyCorrect = 0;
        const details = [];
        
        for (const sub of submissions) {
            const currentPlanOrder = planOrder[sub.plan];
            const previousPlanOrder = planOrder[sub.previous_plan];
            
            const isDowngrade = currentPlanOrder < previousPlanOrder;
            const isUpgrade = currentPlanOrder > previousPlanOrder;
            
            console.log(`📋 [SUBMISSION #${sub.id}] ${sub.previous_plan} → ${sub.plan} = ${isDowngrade ? 'DOWNGRADE' : isUpgrade ? 'UPGRADE' : 'MISMO'}`);
            
            // Verificar si necesita corrección
            const needsFix = (isDowngrade && !sub.is_downgrade) || (isUpgrade && !sub.has_upgrade);
            
            if (needsFix) {
                // Actualizar submission (mantener has_modifications si existe)
                await db.pool.query(`
                    UPDATE submissions 
                    SET is_downgrade = $1, 
                        has_upgrade = $2
                    WHERE id = $3
                `, [isDowngrade, isUpgrade, sub.id]);
                
                // Actualizar proyecto correspondiente
                await db.pool.query(`
                    UPDATE projects 
                    SET is_downgrade = $1, 
                        is_upgrade = $2
                    WHERE submission_id = $3
                `, [isDowngrade, isUpgrade, sub.id]);
                
                console.log(`✅ [SUBMISSION #${sub.id}] Corregido: is_downgrade=${isDowngrade}, has_upgrade=${isUpgrade}`);
                fixed++;
                details.push({
                    id: sub.id,
                    change: `${sub.previous_plan} → ${sub.plan}`,
                    corrected: isDowngrade ? 'DOWNGRADE' : 'UPGRADE'
                });
            } else {
                console.log(`✓ [SUBMISSION #${sub.id}] Ya está correcto`);
                alreadyCorrect++;
            }
        }
        
        res.json({
            success: true,
            total: submissions.length,
            fixed,
            alreadyCorrect,
            details
        });
        
    } catch (error) {
        console.error('❌ Error corrigiendo downgrades:', error);
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
                    console.log(`🔧 [FIX] Corrigiendo purpose: "${submission.purpose}"`);
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

// ============================================
// 🔄 CAMBIO DE PLAN
// ============================================

app.post('/api/client/change-plan', async (req, res) => {
    try {
        const { clientId, newPlan, billingCycle, pagesToRemove } = req.body;
        
        console.log(`🔄 [PLAN] Cliente #${clientId} solicita cambio a plan: ${newPlan} (${billingCycle})`);
        
        // 1️⃣ Obtener información del cliente
        const client = await db.getClientById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const oldPlan = client.plan;
        console.log(`📊 [PLAN] Plan actual: ${oldPlan} → Nuevo plan: ${newPlan}`);
        
        // Definir límites de páginas
        const planLimits = { basico: 5, avanzado: 10, premium: 20 };
        const planOrder = { basico: 1, avanzado: 2, premium: 3 };
        
        const isUpgrade = planOrder[newPlan] > planOrder[oldPlan];
        const isDowngrade = planOrder[newPlan] < planOrder[oldPlan];
        
        console.log(`🎯 [PLAN] Tipo de cambio: ${isUpgrade ? 'UPGRADE' : isDowngrade ? 'DOWNGRADE' : 'MISMO NIVEL'}`);
        
        // 2️⃣ Obtener submission y páginas actuales
        let currentPages = [];
        let submission = null; // Definir fuera del if para que esté disponible en todo el scope
        if (client.submission_id) {
            submission = await db.getSubmission(client.submission_id);
            if (submission && submission.pages) {
                currentPages = Array.isArray(submission.pages) ? submission.pages : JSON.parse(submission.pages || '[]');
            }
        }
        
        console.log(`📄 [PLAN] Páginas actuales: ${currentPages.length}`);
        
        // 3️⃣ Si es downgrade, verificar páginas
        if (isDowngrade) {
            const newLimit = planLimits[newPlan];
            if (currentPages.length > newLimit) {
                console.log(`⚠️ [PLAN] Excede límite: ${currentPages.length} > ${newLimit}`);
                
                // Verificar que se proporcionaron páginas a eliminar
                if (!pagesToRemove || pagesToRemove.length !== (currentPages.length - newLimit)) {
                    return res.status(400).json({ 
                        error: 'pages_exceed_limit',
                        currentPages: currentPages.length,
                        newLimit,
                        pagesToRemove: currentPages.length - newLimit,
                        pages: currentPages
                    });
                }
                
                // Actualizar páginas en submission
                const remainingPages = currentPages.filter(p => !pagesToRemove.includes(p));
                console.log(`🗑️ [PLAN] Eliminando páginas: ${pagesToRemove.join(', ')}`);
                console.log(`✅ [PLAN] Páginas restantes: ${remainingPages.join(', ')}`);
                
                await db.pool.query(
                    'UPDATE submissions SET pages = $1 WHERE id = $2',
                    [JSON.stringify(remainingPages), client.submission_id]
                );
                
                // Crear ticket para el admin
                await db.createTicket({
                    client_id: clientId,
                    client_email: client.email,
                    client_name: client.full_name,
                    business_name: submission?.business_name || null,
                    subject: `🔽 Downgrade de plan: ${oldPlan} → ${newPlan}`,
                    description: `El cliente ha bajado de plan.\n\nPáginas eliminadas:\n${pagesToRemove.map(p => `- ${p}`).join('\n')}\n\nPáginas activas:\n${remainingPages.map(p => `- ${p}`).join('\n')}`,
                    category: 'facturacion',
                    priority: 'normal',
                    status: 'open'
                });
            }
        }
        
        // 4️⃣ Actualizar suscripción en Stripe
        try {
            if (client.stripe_subscription_id) {
                console.log(`💳 [PLAN] Actualizando suscripción en Stripe: ${client.stripe_subscription_id}`);
                
                // Obtener price ID correcto
                const priceMap = billingCycle === 'annual' ? STRIPE_PRICES_ANNUAL : STRIPE_PRICES_MONTHLY;
                const newPriceId = priceMap[newPlan];
                
                console.log(`💳 [STRIPE] Billing cycle: ${billingCycle}`);
                console.log(`💳 [STRIPE] Price ID antiguo: ${client.stripe_price_id || 'N/A'}`);
                console.log(`💳 [STRIPE] Price ID nuevo: ${newPriceId}`);
                
                if (!newPriceId) {
                    throw new Error(`Price ID no encontrado para ${newPlan} ${billingCycle}`);
                }
                
                const subscription = await stripe.subscriptions.retrieve(client.stripe_subscription_id);
                
                console.log(`💳 [STRIPE] Suscripción actual en Stripe:`);
                console.log(`   - Status: ${subscription.status}`);
                console.log(`   - Plan actual: ${subscription.items.data[0].price.id}`);
                console.log(`   - Próxima facturación: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
                
                await stripe.subscriptions.update(client.stripe_subscription_id, {
                    items: [{
                        id: subscription.items.data[0].id,
                        price: newPriceId,
                    }],
                    proration_behavior: 'always_invoice', // Facturar prorrateado inmediatamente
                });
                
                console.log(`✅ [STRIPE] Suscripción actualizada correctamente`);
                console.log(`✅ [STRIPE] Nuevo plan en Stripe: ${newPlan} (${billingCycle})`);
                console.log(`✅ [STRIPE] Nuevo Price ID: ${newPriceId}`);
            }
        } catch (stripeError) {
            console.error(`❌ [PLAN] Error actualizando Stripe:`, stripeError);
            // Continuar de todos modos para actualizar en DB
        }
        
        // 5️⃣ Actualizar cliente en base de datos
        await db.pool.query(
            'UPDATE clients SET plan = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPlan, clientId]
        );
        
        // 6️⃣ Actualizar proyecto relacionado
        await db.pool.query(
            'UPDATE projects SET plan = $1 WHERE client_id = $2',
            [newPlan, clientId]
        );
        
        // 7️⃣ Si es upgrade, actualizar plan_change_at para reactivar 24h de edición
        if (isUpgrade) {
            await db.pool.query(
                'UPDATE clients SET plan_change_at = CURRENT_TIMESTAMP WHERE id = $1',
                [clientId]
            );
            console.log(`⏰ [PLAN] plan_change_at actualizado - Contador de 24h reactivado para edición`);
            
            // 8️⃣ Actualizar el pedido existente con el nuevo plan (NO crear uno nuevo)
            if (client.submission_id) {
                const priceMap = billingCycle === 'annual' ? {
                    basico: 420,   // 35€/mes × 12
                    avanzado: 588, // 49€/mes × 12
                    premium: 780   // 65€/mes × 12
                } : {
                    basico: 35,
                    avanzado: 49,
                    premium: 65
                };
                
                await db.pool.query(`
                    UPDATE submissions 
                    SET plan = $1, 
                        amount = $2, 
                        previous_plan = $3,
                        has_upgrade = true,
                        is_downgrade = false,
                        last_modified_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                `, [newPlan, priceMap[newPlan], oldPlan, client.submission_id]);
                
                console.log(`📋 [PLAN] Pedido #${client.submission_id} actualizado a ${newPlan} (UPGRADE de ${oldPlan})`);
                
                // Actualizar el proyecto para marcarlo como upgrade y reabrirlo si está finalizado
                const projectResult = await db.pool.query(
                    'SELECT status FROM projects WHERE client_id = $1',
                    [clientId]
                );
                
                if (projectResult.rows[0]) {
                    const currentStatus = projectResult.rows[0].status;
                    const newStatus = currentStatus === 'entregada' ? 'en_desarrollo' : currentStatus;
                    
                    if (currentStatus === 'entregada') {
                        // Si estaba entregada, reabrirla y actualizar progreso
                        await db.pool.query(
                            `UPDATE projects 
                             SET is_upgrade = true, 
                                 status = $1,
                                 progress = $2,
                                 updated_at = CURRENT_TIMESTAMP 
                             WHERE client_id = $3`,
                            [newStatus, 50, clientId]
                        );
                        console.log(`🔼 [PLAN] Proyecto marcado como UPGRADE y reabierto en "En desarrollo"`);
                    } else {
                        // Solo marcar como upgrade
                        await db.pool.query(
                            `UPDATE projects 
                             SET is_upgrade = true,
                                 updated_at = CURRENT_TIMESTAMP 
                             WHERE client_id = $1`,
                            [clientId]
                        );
                        console.log(`🔼 [PLAN] Proyecto marcado como UPGRADE`);
                    }
                    
                    // 9️⃣ ACTUALIZAR NOTAS DEL PROYECTO con info del upgrade
                    const upgradeNote = `Plan actualizado: ${oldPlan} → ${newPlan} (${billingCycle}). Upgrade confirmado. Contador de 24h reactivado.`;
                    await db.pool.query(
                        `UPDATE projects 
                         SET notes = $1 
                         WHERE client_id = $2`,
                        [upgradeNote, clientId]
                    );
                    console.log(`📝 [PLAN] Notas del proyecto actualizadas con info del upgrade`);
                }
            }
        } else if (isDowngrade) {
            // 🔽 LÓGICA PARA DOWNGRADE
            if (client.submission_id) {
                const priceMap = billingCycle === 'annual' ? {
                    basico: 420,   // 35€/mes × 12
                    avanzado: 588, // 49€/mes × 12
                    premium: 780   // 65€/mes × 12
                } : {
                    basico: 35,
                    avanzado: 49,
                    premium: 65
                };
                
                await db.pool.query(`
                    UPDATE submissions 
                    SET plan = $1, 
                        amount = $2, 
                        previous_plan = $3,
                        is_downgrade = true,
                        has_upgrade = false,
                        last_modified_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                `, [newPlan, priceMap[newPlan], oldPlan, client.submission_id]);
                
                console.log(`📋 [PLAN] Pedido #${client.submission_id} actualizado a ${newPlan} (DOWNGRADE de ${oldPlan})`);
                
                // Actualizar el proyecto para marcarlo como downgrade
                const projectResult = await db.pool.query(
                    'SELECT status FROM projects WHERE client_id = $1',
                    [clientId]
                );
                
                if (projectResult.rows[0]) {
                    // Marcar como downgrade
                    await db.pool.query(
                        `UPDATE projects 
                         SET is_upgrade = false,
                             is_downgrade = true,
                             updated_at = CURRENT_TIMESTAMP 
                         WHERE client_id = $1`,
                        [clientId]
                    );
                    console.log(`🔽 [PLAN] Proyecto marcado como DOWNGRADE`);
                    
                    // Actualizar notas del proyecto con info del downgrade
                    const downgradeNote = `Plan actualizado: ${oldPlan} → ${newPlan} (${billingCycle}). Downgrade confirmado.${pagesToRemove ? ` Páginas eliminadas: ${pagesToRemove.join(', ')}.` : ''}`;
                    await db.pool.query(
                        `UPDATE projects 
                         SET notes = $1 
                         WHERE client_id = $2`,
                        [downgradeNote, clientId]
                    );
                    console.log(`📝 [PLAN] Notas del proyecto actualizadas con info del downgrade`);
                }
            }
        }
        
        console.log(`✅ [PLAN] Cambio de plan completado: ${oldPlan} → ${newPlan}`);
        
        res.json({ 
            success: true, 
            oldPlan,
            newPlan,
            isUpgrade,
            isDowngrade,
            message: isUpgrade 
                ? 'Plan actualizado. Tienes 24 horas para personalizar tu web.' 
                : 'Plan actualizado correctamente.'
        });
        
    } catch (error) {
        console.error('❌ [PLAN] Error cambiando plan:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// FACTURAS - STRIPE INVOICES
// ========================================

// Obtener facturas de un cliente específico
app.get('/api/client/invoices/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        console.log(`🧾 [INVOICES] Obteniendo facturas para cliente #${clientId}`);
        
        // Obtener datos del cliente
        const client = await db.getClientById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        if (!client.stripe_customer_id) {
            console.log('⚠️ [INVOICES] Cliente sin stripe_customer_id');
            return res.json({ invoices: [] });
        }
        
        // Obtener facturas de Stripe
        console.log(`🔍 [INVOICES] Buscando facturas para Stripe Customer: ${client.stripe_customer_id}`);
        const invoices = await stripe.invoices.list({
            customer: client.stripe_customer_id,
            limit: 100
        });
        
        console.log(`✅ [INVOICES] ${invoices.data.length} facturas encontradas en Stripe`);
        
        // Debug: Mostrar todas las facturas antes de filtrar
        invoices.data.forEach((inv, i) => {
            console.log(`📄 [INVOICE ${i+1}] ID: ${inv.id} | Amount Paid: ${inv.amount_paid} | Amount Due: ${inv.amount_due} | Status: ${inv.status} | Number: ${inv.number}`);
        });
        
        // Filtrar y formatear datos - SOLO facturas con pago real (excluir ajustes de 0€)
        const formattedInvoices = invoices.data
            .filter(invoice => {
                // Filtrar solo facturas pagadas con monto > 0
                // O facturas pendientes con monto a pagar > 0
                const hasRealAmount = (invoice.amount_due > 0 || invoice.amount_paid > 0);
                const isNotFullyRefunded = invoice.amount_remaining !== invoice.total;
                const passFilter = hasRealAmount && isNotFullyRefunded;
                
                if (!passFilter) {
                    console.log(`❌ [FILTER] Factura ${invoice.id} RECHAZADA - hasRealAmount: ${hasRealAmount}, isNotFullyRefunded: ${isNotFullyRefunded}`);
                }
                
                return passFilter;
            })
            .map(invoice => {
                // Obtener el monto base (sin IVA)
                const baseAmount = invoice.amount_paid > 0 ? invoice.amount_paid / 100 : invoice.amount_due / 100;
                
                // Calcular IVA (21%)
                const amountWithVAT = baseAmount * 1.21;
                
                return {
                    id: invoice.id,
                    number: invoice.number || `INV-${invoice.id.slice(-8)}`,
                    amount: amountWithVAT.toFixed(2),
                    amount_without_vat: baseAmount.toFixed(2),
                    vat_amount: (amountWithVAT - baseAmount).toFixed(2),
                    currency: invoice.currency.toUpperCase(),
                    status: invoice.status,
                    created: new Date(invoice.created * 1000).toISOString(),
                    pdf_url: invoice.invoice_pdf,
                    hosted_invoice_url: invoice.hosted_invoice_url,
                    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
                    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null
                };
            });
        
        console.log(`🎯 [INVOICES] ${formattedInvoices.length} facturas pasaron el filtro (de ${invoices.data.length} totales)`);
        
        res.json({ invoices: formattedInvoices });
        
    } catch (error) {
        console.error('❌ [INVOICES] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener todas las facturas (Admin)
app.get('/api/admin/invoices', async (req, res) => {
    try {
        console.log('🧾 [ADMIN] Obteniendo todas las facturas...');
        
        // Obtener todos los clientes con Stripe
        const clients = await db.getAllClients();
        console.log(`📊 [ADMIN] Total clientes en DB: ${clients.length}`);
        
        // Debug: mostrar primeros 3 clientes para ver estructura
        if (clients.length > 0) {
            console.log('🔍 [ADMIN] Ejemplo de clientes:');
            clients.slice(0, 3).forEach((c, i) => {
                console.log(`  Cliente ${i + 1}:`, {
                    id: c.id,
                    email: c.email,
                    plan: c.plan,
                    stripe_customer_id: c.stripe_customer_id || 'NO ASIGNADO',
                    stripe_subscription_id: c.stripe_subscription_id || 'NO ASIGNADO'
                });
            });
        }
        
        const clientsWithStripe = clients.filter(c => c.stripe_customer_id);
        
        console.log(`📊 [ADMIN] ${clientsWithStripe.length} clientes con Stripe Customer ID`);
        
        let allInvoices = [];
        
        // Obtener facturas de cada cliente
        for (const client of clientsWithStripe) {
            try {
                const invoices = await stripe.invoices.list({
                    customer: client.stripe_customer_id,
                    limit: 100
                });
                
                // Filtrar y formatear - SOLO facturas con pago real
                const formattedInvoices = invoices.data
                    .filter(invoice => {
                        const hasRealAmount = (invoice.amount_due > 0 || invoice.amount_paid > 0);
                        const isNotFullyRefunded = invoice.amount_remaining !== invoice.total;
                        return hasRealAmount && isNotFullyRefunded;
                    })
                    .map(invoice => {
                        // Obtener el monto base (sin IVA)
                        const baseAmount = invoice.amount_paid > 0 ? invoice.amount_paid / 100 : invoice.amount_due / 100;
                        
                        // Calcular IVA (21%)
                        const amountWithVAT = baseAmount * 1.21;
                        
                        return {
                            id: invoice.id,
                            number: invoice.number || `INV-${invoice.id.slice(-8)}`,
                            amount: amountWithVAT.toFixed(2),
                            amount_without_vat: baseAmount.toFixed(2),
                            vat_amount: (amountWithVAT - baseAmount).toFixed(2),
                            currency: invoice.currency.toUpperCase(),
                            status: invoice.status,
                            created: new Date(invoice.created * 1000).toISOString(),
                            pdf_url: invoice.invoice_pdf,
                            hosted_invoice_url: invoice.hosted_invoice_url,
                            period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
                            period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
                            // Datos del cliente
                            client_id: client.id,
                            client_name: client.full_name,
                            client_email: client.email,
                            client_business: client.business_name
                        };
                    });
                
                allInvoices = allInvoices.concat(formattedInvoices);
            } catch (err) {
                console.warn(`⚠️ [ADMIN] Error obteniendo facturas de cliente #${client.id}:`, err.message);
            }
        }
        
        // Ordenar por fecha descendente
        allInvoices.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        console.log(`✅ [ADMIN] ${allInvoices.length} facturas totales encontradas`);
        
        if (allInvoices.length === 0 && clientsWithStripe.length === 0) {
            console.log('⚠️ [ADMIN] No hay facturas porque ningún cliente tiene stripe_customer_id asignado');
            console.log('💡 [ADMIN] Esto significa que no ha habido pagos exitosos o los clientes fueron creados sin pagar');
        }
        
        res.json({ 
            invoices: allInvoices,
            debug: {
                totalClients: clients.length,
                clientsWithStripe: clientsWithStripe.length,
                totalInvoices: allInvoices.length
            }
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// PERFIL DE USUARIO
// ========================================

// Actualizar datos de perfil del cliente
app.patch('/api/client/profile/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { full_name, email, phone, address } = req.body;
        
        console.log(`👤 [PROFILE] Actualizando perfil del cliente #${clientId}`);
        
        // Actualizar en base de datos
        await db.pool.query(
            `UPDATE clients 
             SET full_name = $1, 
                 email = $2, 
                 phone = $3, 
                 address = $4,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $5`,
            [full_name, email, phone, address, clientId]
        );
        
        console.log(`✅ [PROFILE] Perfil actualizado correctamente`);
        
        res.json({ success: true, message: 'Perfil actualizado correctamente' });
        
    } catch (error) {
        console.error('❌ [PROFILE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// MAILCHIMP INTEGRATION
// ========================================

// Guardar/actualizar configuración de Mailchimp
app.post('/api/client/mailchimp/config/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { api_key, server_prefix, audience_id } = req.body;
        
        console.log(`📧 [MAILCHIMP] Guardando configuración para cliente #${clientId}`);
        
        // Actualizar en base de datos
        await db.pool.query(
            `UPDATE clients 
             SET mailchimp_api_key = $1, 
                 mailchimp_server_prefix = $2, 
                 mailchimp_audience_id = $3,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [api_key, server_prefix, audience_id, clientId]
        );
        
        console.log(`✅ [MAILCHIMP] Configuración guardada correctamente`);
        
        res.json({ success: true, message: 'Configuración de Mailchimp guardada correctamente' });
        
    } catch (error) {
        console.error('❌ [MAILCHIMP] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener configuración de Mailchimp
app.get('/api/client/mailchimp/config/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        console.log(`📧 [MAILCHIMP] Obteniendo configuración para cliente #${clientId}`);
        
        const result = await db.pool.query(
            `SELECT mailchimp_api_key, mailchimp_server_prefix, mailchimp_audience_id 
             FROM clients 
             WHERE id = $1`,
            [clientId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const config = {
            api_key: result.rows[0].mailchimp_api_key || '',
            server_prefix: result.rows[0].mailchimp_server_prefix || '',
            audience_id: result.rows[0].mailchimp_audience_id || '',
            is_configured: !!(result.rows[0].mailchimp_api_key && result.rows[0].mailchimp_server_prefix && result.rows[0].mailchimp_audience_id)
        };
        
        console.log(`✅ [MAILCHIMP] Configuración obtenida:`, config.is_configured ? 'Configurado' : 'No configurado');
        
        res.json(config);
        
    } catch (error) {
        console.error('❌ [MAILCHIMP] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Enviar newsletter usando Mailchimp
app.post('/api/client/mailchimp/send-newsletter/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { subject, content, send_time } = req.body;
        
        console.log(`📧 [MAILCHIMP] Enviando newsletter para cliente #${clientId}`);
        
        // Obtener configuración
        const configResult = await db.pool.query(
            `SELECT mailchimp_api_key, mailchimp_server_prefix, mailchimp_audience_id, business_name 
             FROM clients 
             WHERE id = $1`,
            [clientId]
        );
        
        if (configResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const { mailchimp_api_key, mailchimp_server_prefix, mailchimp_audience_id, business_name } = configResult.rows[0];
        
        if (!mailchimp_api_key || !mailchimp_server_prefix || !mailchimp_audience_id) {
            return res.status(400).json({ error: 'Mailchimp no está configurado. Por favor, configura tu API key primero.' });
        }
        
        // Llamar a la API de Mailchimp
        const mailchimpUrl = `https://${mailchimp_server_prefix}.api.mailchimp.com/3.0/campaigns`;
        
        // Crear campaña
        const campaignResponse = await fetch(mailchimpUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mailchimp_api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'regular',
                recipients: {
                    list_id: mailchimp_audience_id
                },
                settings: {
                    subject_line: subject,
                    from_name: business_name || 'Mi Negocio',
                    reply_to: configResult.rows[0].email || 'noreply@example.com',
                    title: `Newsletter - ${subject}`
                }
            })
        });
        
        if (!campaignResponse.ok) {
            const error = await campaignResponse.json();
            console.error('❌ [MAILCHIMP] Error creando campaña:', error);
            return res.status(400).json({ error: 'Error al crear la campaña en Mailchimp: ' + (error.detail || 'Error desconocido') });
        }
        
        const campaign = await campaignResponse.json();
        const campaignId = campaign.id;
        
        // Añadir contenido a la campaña
        const contentResponse = await fetch(`https://${mailchimp_server_prefix}.api.mailchimp.com/3.0/campaigns/${campaignId}/content`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${mailchimp_api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                html: `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            ${content.replace(/\n/g, '<br>')}
                        </body>
                    </html>
                `
            })
        });
        
        if (!contentResponse.ok) {
            const error = await contentResponse.json();
            console.error('❌ [MAILCHIMP] Error añadiendo contenido:', error);
            return res.status(400).json({ error: 'Error al añadir contenido a la campaña' });
        }
        
        // Enviar campaña si es "now", o dejarla como draft si es "schedule"
        if (send_time === 'now') {
            const sendResponse = await fetch(`https://${mailchimp_server_prefix}.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mailchimp_api_key}`
                }
            });
            
            if (!sendResponse.ok) {
                const error = await sendResponse.json();
                console.error('❌ [MAILCHIMP] Error enviando campaña:', error);
                return res.status(400).json({ error: 'Error al enviar la campaña' });
            }
            
            console.log(`✅ [MAILCHIMP] Newsletter enviada exitosamente`);
            res.json({ success: true, message: 'Newsletter enviada correctamente', campaign_id: campaignId });
        } else {
            console.log(`✅ [MAILCHIMP] Campaña creada como borrador`);
            res.json({ success: true, message: 'Campaña creada. Ve a tu cuenta de Mailchimp para programar el envío.', campaign_id: campaignId });
        }
        
    } catch (error) {
        console.error('❌ [MAILCHIMP] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// GOOGLE ANALYTICS INTEGRATION
// ========================================

// Configurar Google Analytics Property ID para un cliente (ADMIN)
app.post('/api/admin/google-analytics/config/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { ga_property_id } = req.body;
        
        console.log(`📊 [GA] Configurando Google Analytics para cliente #${clientId}`);
        
        // Actualizar en base de datos
        await db.pool.query(
            `UPDATE clients 
             SET ga_property_id = $1,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [ga_property_id, clientId]
        );
        
        console.log(`✅ [GA] Google Analytics configurado: ${ga_property_id}`);
        
        res.json({ success: true, message: 'Google Analytics configurado correctamente' });
        
    } catch (error) {
        console.error('❌ [GA] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener datos de Google Analytics para un cliente
app.get('/api/client/google-analytics/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        console.log(`📊 [GA] Obteniendo datos para cliente #${clientId}`);
        
        // Verificar si el cliente tiene GA configurado
        const result = await db.pool.query(
            `SELECT ga_property_id, business_name FROM clients WHERE id = $1`,
            [clientId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const { ga_property_id, business_name } = result.rows[0];
        
        if (!ga_property_id) {
            return res.json({
                configured: false,
                message: 'Google Analytics no configurado para este cliente'
            });
        }
        
        // Si el cliente de Analytics está configurado, intentar obtener datos reales
        if (analyticsDataClient) {
            try {
                console.log(`📊 [GA] Consultando API real para Property ID: ${ga_property_id}`);
                
                // Obtener datos de resumen
                const [summaryResponse] = await analyticsDataClient.runReport({
                    property: `properties/${ga_property_id}`,
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    dimensions: [{ name: 'date' }],
                    metrics: [
                        { name: 'activeUsers' },
                        { name: 'screenPageViews' },
                        { name: 'bounceRate' },
                        { name: 'averageSessionDuration' }
                    ]
                });
                
                // Páginas más visitadas
                const [pagesResponse] = await analyticsDataClient.runReport({
                    property: `properties/${ga_property_id}`,
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
                    metrics: [{ name: 'screenPageViews' }],
                    limit: 5,
                    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
                });
                
                // Dispositivos
                const [devicesResponse] = await analyticsDataClient.runReport({
                    property: `properties/${ga_property_id}`,
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    dimensions: [{ name: 'deviceCategory' }],
                    metrics: [{ name: 'activeUsers' }]
                });
                
                // Fuentes de tráfico
                const [sourcesResponse] = await analyticsDataClient.runReport({
                    property: `properties/${ga_property_id}`,
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    dimensions: [{ name: 'sessionSource' }],
                    metrics: [{ name: 'activeUsers' }],
                    limit: 5,
                    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
                });
                
                // Usuarios en tiempo real
                const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
                    property: `properties/${ga_property_id}`,
                    metrics: [{ name: 'activeUsers' }]
                });
                
                // Procesar datos reales
                const processedData = processGoogleAnalyticsData(
                    summaryResponse,
                    pagesResponse,
                    devicesResponse,
                    sourcesResponse,
                    realtimeResponse
                );
                
                console.log(`✅ [GA] Datos reales obtenidos para Property ID: ${ga_property_id}`);
                
                return res.json({
                    configured: true,
                    property_id: ga_property_id,
                    data: processedData,
                    source: 'real'
                });
                
            } catch (gaError) {
                console.error('⚠️ [GA] Error consultando API real:', gaError.message);
                console.log('🔄 [GA] Usando datos simulados como fallback');
                
                // Si falla la API real, usar datos simulados
                const mockData = generateMockAnalyticsData(business_name);
                return res.json({
                    configured: true,
                    property_id: ga_property_id,
                    data: mockData,
                    source: 'simulated'
                });
            }
        } else {
            // Si no hay cliente de Analytics, usar datos simulados
            console.log(`🔄 [GA] API no configurada, usando datos simulados para Property ID: ${ga_property_id}`);
            const mockData = generateMockAnalyticsData(business_name);
            return res.json({
                configured: true,
                property_id: ga_property_id,
                data: mockData,
                source: 'simulated'
            });
        }
        
    } catch (error) {
        console.error('❌ [GA] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Función para generar datos simulados realistas
function generateMockAnalyticsData(businessName) {
    const today = new Date();
    const last30Days = [];
    
    // Generar datos de los últimos 30 días
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generar números aleatorios pero realistas
        const baseVisits = 50 + Math.floor(Math.random() * 100);
        const variance = Math.random() * 0.3 + 0.85; // 85% - 115%
        
        last30Days.push({
            date: date.toISOString().split('T')[0],
            visitors: Math.floor(baseVisits * variance),
            pageviews: Math.floor(baseVisits * variance * (1.5 + Math.random() * 0.5)),
            bounceRate: (30 + Math.random() * 25).toFixed(1), // 30-55%
            avgSessionDuration: Math.floor(120 + Math.random() * 180) // 2-5 mins
        });
    }
    
    // Calcular totales
    const totalVisitors = last30Days.reduce((sum, day) => sum + day.visitors, 0);
    const totalPageviews = last30Days.reduce((sum, day) => sum + day.pageviews, 0);
    const avgBounceRate = (last30Days.reduce((sum, day) => sum + parseFloat(day.bounceRate), 0) / 30).toFixed(1);
    const avgSessionDuration = Math.floor(last30Days.reduce((sum, day) => sum + day.avgSessionDuration, 0) / 30);
    
    // Top páginas
    const topPages = [
        { path: '/', views: Math.floor(totalPageviews * 0.35), title: 'Inicio' },
        { path: '/servicios', views: Math.floor(totalPageviews * 0.20), title: 'Servicios' },
        { path: '/contacto', views: Math.floor(totalPageviews * 0.15), title: 'Contacto' },
        { path: '/nosotros', views: Math.floor(totalPageviews * 0.12), title: 'Nosotros' },
        { path: '/blog', views: Math.floor(totalPageviews * 0.10), title: 'Blog' }
    ];
    
    // Dispositivos
    const devices = [
        { type: 'mobile', percentage: 55 + Math.floor(Math.random() * 10) },
        { type: 'desktop', percentage: 30 + Math.floor(Math.random() * 10) },
        { type: 'tablet', percentage: 10 + Math.floor(Math.random() * 5) }
    ];
    
    // Fuentes de tráfico
    const trafficSources = [
        { source: 'Búsqueda orgánica', percentage: 40 + Math.floor(Math.random() * 15) },
        { source: 'Directo', percentage: 25 + Math.floor(Math.random() * 10) },
        { source: 'Redes sociales', percentage: 15 + Math.floor(Math.random() * 10) },
        { source: 'Referencias', percentage: 10 + Math.floor(Math.random() * 5) },
        { source: 'Email', percentage: 5 + Math.floor(Math.random() * 5) }
    ];
    
    return {
        summary: {
            totalVisitors,
            totalPageviews,
            avgBounceRate: parseFloat(avgBounceRate),
            avgSessionDuration,
            period: '30 días'
        },
        dailyData: last30Days,
        topPages,
        devices,
        trafficSources,
        realTimeUsers: Math.floor(Math.random() * 15) + 1
    };
}

// Función para procesar datos reales de Google Analytics
function processGoogleAnalyticsData(summaryResponse, pagesResponse, devicesResponse, sourcesResponse, realtimeResponse) {
    // Procesar resumen general
    const summaryRows = summaryResponse.rows || [];
    const dailyData = summaryRows.map(row => ({
        date: row.dimensionValues[0].value,
        visitors: parseInt(row.metricValues[0].value || 0),
        pageviews: parseInt(row.metricValues[1].value || 0),
        bounceRate: parseFloat(row.metricValues[2].value || 0).toFixed(1),
        avgSessionDuration: parseInt(row.metricValues[3].value || 0)
    }));
    
    // Calcular totales
    const totalVisitors = dailyData.reduce((sum, day) => sum + day.visitors, 0);
    const totalPageviews = dailyData.reduce((sum, day) => sum + day.pageviews, 0);
    const avgBounceRate = dailyData.length > 0 
        ? (dailyData.reduce((sum, day) => sum + parseFloat(day.bounceRate), 0) / dailyData.length).toFixed(1)
        : 0;
    const avgSessionDuration = dailyData.length > 0
        ? Math.floor(dailyData.reduce((sum, day) => sum + day.avgSessionDuration, 0) / dailyData.length)
        : 0;
    
    // Procesar páginas más visitadas
    const topPages = (pagesResponse.rows || []).slice(0, 5).map(row => ({
        path: row.dimensionValues[0].value,
        title: row.dimensionValues[1].value || 'Sin título',
        views: parseInt(row.metricValues[0].value || 0)
    }));
    
    // Procesar dispositivos
    const deviceRows = devicesResponse.rows || [];
    const totalDeviceUsers = deviceRows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value || 0), 0);
    const devices = deviceRows.map(row => {
        const deviceType = row.dimensionValues[0].value.toLowerCase();
        const users = parseInt(row.metricValues[0].value || 0);
        return {
            type: deviceType,
            percentage: totalDeviceUsers > 0 ? Math.round((users / totalDeviceUsers) * 100) : 0
        };
    });
    
    // Procesar fuentes de tráfico
    const sourceRows = sourcesResponse.rows || [];
    const totalSourceUsers = sourceRows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value || 0), 0);
    
    // Mapear nombres de fuentes a español
    const sourceMap = {
        'google': 'Búsqueda orgánica',
        '(direct)': 'Directo',
        'facebook': 'Redes sociales',
        'instagram': 'Redes sociales',
        'twitter': 'Redes sociales',
        'linkedin': 'Redes sociales',
        'email': 'Email',
        '(not set)': 'Directo'
    };
    
    // Agrupar fuentes similares
    const trafficGroups = {};
    sourceRows.forEach(row => {
        const sourceName = row.dimensionValues[0].value.toLowerCase();
        const users = parseInt(row.metricValues[0].value || 0);
        const mappedSource = sourceMap[sourceName] || 'Referencias';
        
        if (trafficGroups[mappedSource]) {
            trafficGroups[mappedSource] += users;
        } else {
            trafficGroups[mappedSource] = users;
        }
    });
    
    const trafficSources = Object.entries(trafficGroups).map(([source, users]) => ({
        source,
        percentage: totalSourceUsers > 0 ? Math.round((users / totalSourceUsers) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage).slice(0, 5);
    
    // Usuarios en tiempo real
    const realtimeUsers = realtimeResponse.rows && realtimeResponse.rows.length > 0
        ? parseInt(realtimeResponse.rows[0].metricValues[0].value || 0)
        : 0;
    
    return {
        summary: {
            totalVisitors,
            totalPageviews,
            avgBounceRate: parseFloat(avgBounceRate),
            avgSessionDuration,
            period: '30 días'
        },
        dailyData,
        topPages,
        devices,
        trafficSources,
        realTimeUsers: realtimeUsers
    };
}

// ========================================
// DOMAIN AVAILABILITY CHECKER
// ========================================

// Verificar disponibilidad de dominio
app.get('/api/check-domain/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        
        console.log(`🔍 [DOMAIN] Verificando disponibilidad: ${domain}`);
        
        // Limpiar el dominio (eliminar espacios, convertir a minúsculas)
        const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
        
        // Validar formato de dominio
        const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
        if (!domainRegex.test(cleanDomain)) {
            return res.status(400).json({ 
                error: 'Formato de dominio inválido',
                available: false 
            });
        }
        
        // Intentar con RapidAPI primero
        if (process.env.RAPIDAPI_KEY) {
            try {
                console.log('📡 [DOMAIN] Consultando RapidAPI...');
                
                const response = await fetch(`https://domains-api.p.rapidapi.com/tlds/${cleanDomain}`, {
                    method: 'GET',
                    headers: {
                        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                        'X-RapidAPI-Host': 'domains-api.p.rapidapi.com'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    console.log('✅ [DOMAIN] RapidAPI response:', data);
                    
                    return res.json({
                        domain: cleanDomain,
                        available: data.available || false,
                        price: data.price || 'N/A',
                        currency: data.currency || 'USD',
                        registrar: data.registrar || 'N/A',
                        source: 'rapidapi'
                    });
                }
            } catch (rapidError) {
                console.warn('⚠️ [DOMAIN] RapidAPI falló, usando fallback:', rapidError.message);
            }
        }
        
        // Fallback 1: DNS Checker (más confiable)
        console.log('🔄 [DOMAIN] Usando DNS checker como fallback...');
        
        try {
            const dnsResponse = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=A`);
            
            if (dnsResponse.ok) {
                const dnsData = await dnsResponse.json();
                
                console.log('📡 [DOMAIN] DNS response:', dnsData);
                
                // Si tiene registros A, el dominio está registrado y activo
                const isRegistered = dnsData.Answer && dnsData.Answer.length > 0;
                
                console.log(`✅ [DOMAIN] DNS check - Registrado: ${isRegistered}`);
                
                return res.json({
                    domain: cleanDomain,
                    available: !isRegistered,
                    price: !isRegistered ? '12-15 €/año' : 'N/A',
                    currency: 'EUR',
                    registrar: isRegistered ? 'Registrado (activo)' : 'N/A',
                    source: 'dns'
                });
            }
        } catch (dnsError) {
            console.warn('⚠️ [DOMAIN] DNS fallback falló:', dnsError.message);
        }
        
        // Fallback 2: WHOIS público
        console.log('🔄 [DOMAIN] Intentando WHOIS como último recurso...');
        
        try {
            const whoisResponse = await fetch(`https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_free&domainName=${cleanDomain}&outputFormat=JSON`);
            
            console.log('📡 [DOMAIN] WHOIS status:', whoisResponse.status);
            
            if (whoisResponse.ok) {
                const whoisData = await whoisResponse.json();
                
                console.log('📡 [DOMAIN] WHOIS data keys:', Object.keys(whoisData));
                
                // Si el dominio está registrado, WhoisRecord existirá
                const isRegistered = whoisData.WhoisRecord && whoisData.WhoisRecord.registryData;
                
                console.log(`✅ [DOMAIN] WHOIS público - Disponible: ${!isRegistered}`);
                
                return res.json({
                    domain: cleanDomain,
                    available: !isRegistered,
                    price: !isRegistered ? '12-15 €/año' : 'N/A',
                    currency: 'EUR',
                    registrar: isRegistered ? (whoisData.WhoisRecord.registrarName || 'Desconocido') : 'N/A',
                    source: 'whois'
                });
            } else {
                console.warn(`⚠️ [DOMAIN] WHOIS HTTP error: ${whoisResponse.status}`);
            }
        } catch (whoisError) {
            console.warn('⚠️ [DOMAIN] WHOIS público falló:', whoisError.message);
        }
        
        // Si todo falla, devolver respuesta genérica
        console.log('⚠️ [DOMAIN] Todas las APIs fallaron, respuesta genérica');
        
        res.json({
            domain: cleanDomain,
            available: null,
            message: 'No se pudo verificar la disponibilidad. Por favor, intenta más tarde.',
            source: 'fallback'
        });
        
    } catch (error) {
        console.error('❌ [DOMAIN] Error:', error);
        res.status(500).json({ 
            error: 'Error al verificar dominio',
            available: false 
        });
    }
});

// ========================================
// ENDPOINT TEMPORAL: ARREGLAR PEDIDOS EXISTENTES
// ========================================

app.post('/api/admin/fix-tracking', async (req, res) => {
    try {
        console.log('🔧 [ADMIN] Sincronizando pedidos con estado real del cliente...');
        
        // 1️⃣ Obtener el cliente por email
        const email = process.env.ADMIN_EMAIL || 'info@agutidesigns.es';
        const clientResult = await db.pool.query(`SELECT * FROM clients WHERE email = $1`, [email]);
        
        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const client = clientResult.rows[0];
        console.log(`👤 Cliente #${client.id}`);
        console.log(`   Plan ACTUAL: ${client.plan}`);
        console.log(`   Stripe Subscription: ${client.stripe_subscription_id}`);
        console.log(`   Submission ID: ${client.submission_id}`);
        
        // 2️⃣ Obtener info de Stripe para saber el billing_cycle
        let billingCycle = 'monthly'; // default
        let correctAmount = 39; // default para avanzado mensual
        
        if (client.stripe_subscription_id) {
            try {
                const subscription = await stripe.subscriptions.retrieve(client.stripe_subscription_id);
                const interval = subscription.items.data[0].plan.interval;
                billingCycle = interval === 'year' ? 'annual' : 'monthly';
                console.log(`   Billing Cycle desde Stripe: ${billingCycle}`);
            } catch (e) {
                console.log('   ⚠️ No se pudo obtener billing cycle de Stripe, usando monthly');
            }
        }
        
        // 3️⃣ Calcular monto correcto
        const priceMap = billingCycle === 'annual' ? {
            basico: 420,   // 35€/mes × 12
            avanzado: 588, // 49€/mes × 12
            premium: 780   // 65€/mes × 12
        } : {
            basico: 35,
            avanzado: 49,
            premium: 65
        };
        
        correctAmount = priceMap[client.plan] || 49;
        console.log(`   Monto correcto: ${correctAmount}€ (${billingCycle})`);
        
        // 4️⃣ Verificar pedidos existentes
        const pedido8Result = await db.pool.query(`SELECT * FROM submissions WHERE id = 8`);
        const pedido9Result = await db.pool.query(`SELECT * FROM submissions WHERE id = 9`);
        
        const pedido8 = pedido8Result.rows[0];
        const pedido9 = pedido9Result.rows.length > 0 ? pedido9Result.rows[0] : null;
        
        console.log(`📋 Pedido #8: ${pedido8?.plan} - ${pedido8?.amount}€`);
        if (pedido9) console.log(`📋 Pedido #9: ${pedido9?.plan} - ${pedido9?.amount}€`);
        
        // 5️⃣ Detectar si hubo upgrade comparando pedido original con actual
        let hasUpgrade = false;
        let previousPlan = null;
        
        if (pedido9) {
            // Si existe #9, significa que hubo un cambio
            // Comparar plan de #8 original vs plan actual
            if (pedido8.plan !== client.plan) {
                hasUpgrade = true;
                previousPlan = pedido8.plan;
                console.log(`🔼 UPGRADE detectado: ${pedido8.plan} → ${client.plan}`);
            }
        }
        
        // 6️⃣ Actualizar pedido #8 con TODA la info correcta
        await db.pool.query(`
            UPDATE submissions 
            SET plan = $1,
                amount = $2,
                billing_cycle = $3,
                business_name = $4,
                has_upgrade = $5,
                has_modifications = $6,
                previous_plan = $7,
                last_modified_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 8
        `, [
            client.plan,
            correctAmount,
            billingCycle,
            client.business_name,
            hasUpgrade,
            true, // always mark as modified since we're fixing
            previousPlan
        ]);
        
        console.log(`✅ Pedido #8 actualizado completamente`);
        
        // 7️⃣ Vincular cliente al pedido #8 y eliminar #9
        await db.pool.query(`UPDATE clients SET submission_id = 8 WHERE id = $1`, [client.id]);
        
        if (pedido9) {
            await db.pool.query(`DELETE FROM submissions WHERE id = 9`);
            console.log('✅ Pedido #9 eliminado');
        }
        
        console.log(`✅ [ADMIN] Sincronización completada`);
        res.json({ 
            success: true, 
            message: `Sincronizado: ${client.plan.toUpperCase()} (${correctAmount}€)`,
            currentPlan: client.plan,
            amount: correctAmount,
            billingCycle,
            hasUpgrade,
            previousPlan
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Error sincronizando:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// STRIPE CUSTOMER PORTAL
// ========================================

app.post('/api/create-customer-portal-session', async (req, res) => {
    try {
        const { clientId } = req.body;
        
        console.log(`💳 [PORTAL] Cliente #${clientId} solicitando portal de Stripe`);
        
        // Obtener información del cliente
        const client = await db.getClientById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        if (!client.stripe_customer_id) {
            return res.status(400).json({ error: 'Cliente no tiene cuenta en Stripe' });
        }
        
        console.log(`💳 [PORTAL] Stripe Customer ID: ${client.stripe_customer_id}`);
        
        // Crear sesión del Customer Portal
        const session = await stripe.billingPortal.sessions.create({
            customer: client.stripe_customer_id,
            return_url: `${process.env.CLIENT_DASHBOARD_URL || 'https://panel.agutidesigns.es'}`,
        });
        
        console.log(`✅ [PORTAL] Sesión creada: ${session.url}`);
        
        res.json({ url: session.url });
        
    } catch (error) {
        console.error('❌ [PORTAL] Error creando sesión:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 🚫 ENDPOINTS DE CANCELACIONES
// ============================================

// Obtener todas las cancelaciones (para admin dashboard)
app.get('/api/admin/cancelaciones', async (req, res) => {
    try {
        console.log('🚫 [ADMIN] Obteniendo cancelaciones...');
        
        // Primero verificar si las columnas existen
        let cancellations = [];
        try {
            const result = await db.pool.query(`
                SELECT 
                    id, email, full_name, business_name, plan, 
                    subscription_status, cancelled_at, cancellation_reason, subscription_end_date
                FROM clients
                WHERE subscription_status = 'cancelled'
                ORDER BY cancelled_at DESC
            `);
            cancellations = result.rows;
        } catch (dbError) {
            console.warn('⚠️ [ADMIN] Columnas de cancelación no existen todavía:', dbError.message);
            console.log('💡 [ADMIN] Las columnas se crearán en el próximo reinicio del servidor');
            // Devolver datos vacíos si las columnas no existen
            cancellations = [];
        }
        
        // Calcular estadísticas
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const stats = {
            total: cancellations.length,
            pending: cancellations.filter(c => c.subscription_end_date && new Date(c.subscription_end_date) > now).length,
            thisMonth: cancellations.filter(c => c.cancelled_at && new Date(c.cancelled_at) >= startOfMonth).length,
            lostRevenue: cancellations.reduce((sum, c) => {
                const planPrices = { basico: 35, avanzado: 49, premium: 65 };
                return sum + (planPrices[c.plan] || 0);
            }, 0)
        };
        
        console.log('✅ [ADMIN] Cancelaciones obtenidas:', { total: stats.total, stats });
        
        // Devolver solo el array de cancelaciones para el badge
        // Si necesitas stats, crear un endpoint separado /api/admin/cancelaciones/stats
        res.json(cancellations);
        
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo cancelaciones:', error);
        res.status(500).json({ 
            error: error.message,
            cancellations: [],
            stats: { total: 0, pending: 0, thisMonth: 0, lostRevenue: 0 }
        });
    }
});

// Marcar cliente como cancelado (solo visual, desde admin dashboard)
app.post('/api/admin/cancel-subscription/:clientId', async (req, res) => {
    try {
        const clientId = parseInt(req.params.clientId);
        const { reason } = req.body;
        
        console.log(`🚫 [ADMIN] Marcando cliente #${clientId} como cancelado (solo visual)`);
        
        // Obtener cliente
        const client = await db.getClientById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        // Calcular fecha de expiración (30 días desde ahora)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        
        // Actualizar estado del cliente SOLO EN NUESTRA DB (no toca Stripe)
        await db.pool.query(`
            UPDATE clients
            SET 
                subscription_status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                cancellation_reason = $1,
                subscription_end_date = $2
            WHERE id = $3
        `, [reason || 'Marcado como cancelado desde panel de admin', endDate, clientId]);
        
        console.log(`✅ [ADMIN] Cliente #${clientId} marcado como cancelado (visual)`);
        console.log(`💡 [ADMIN] Nota: Esto NO cancela la suscripción en Stripe, solo marca visualmente en el panel`);
        
        res.json({ 
            success: true, 
            message: 'Cliente marcado como cancelado en el panel',
            subscription_end_date: endDate,
            note: 'Esto no cancela la suscripción en Stripe, solo es visual'
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Error marcando como cancelado:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🗑️ ENDPOINT DE LIMPIEZA TOTAL (ADMIN ONLY)
// ==========================================
app.delete('/api/admin/cleanup-all', async (req, res) => {
    try {
        console.log('🗑️ [ADMIN] ========== LIMPIEZA TOTAL INICIADA ==========');
        
        const deletedData = {
            tickets: 0,
            projects: 0,
            submissions: 0,
            clients: 0,
            tokens: 0
        };
        
        // 1. Eliminar todos los tickets
        const ticketsResult = await db.pool.query('DELETE FROM tickets RETURNING id');
        deletedData.tickets = ticketsResult.rows.length;
        console.log(`🗑️ [ADMIN] Tickets eliminados: ${deletedData.tickets}`);
        
        // 2. Eliminar todos los proyectos
        const projectsResult = await db.pool.query('DELETE FROM projects RETURNING id');
        deletedData.projects = projectsResult.rows.length;
        console.log(`🗑️ [ADMIN] Proyectos eliminados: ${deletedData.projects}`);
        
        // 3. Eliminar todas las submissions
        const submissionsResult = await db.pool.query('DELETE FROM submissions RETURNING id');
        deletedData.submissions = submissionsResult.rows.length;
        console.log(`🗑️ [ADMIN] Submissions eliminados: ${deletedData.submissions}`);
        
        // 4. Eliminar todos los tokens de reset password
        const tokensResult = await db.pool.query('DELETE FROM password_reset_tokens RETURNING id');
        deletedData.tokens = tokensResult.rows.length;
        console.log(`🗑️ [ADMIN] Tokens de reset eliminados: ${deletedData.tokens}`);
        
        // 5. Eliminar todos los clientes (excepto admin si existe)
        const clientsResult = await db.pool.query(`
            DELETE FROM clients 
            WHERE email != 'admin@agutidesigns.es' 
            RETURNING id
        `);
        deletedData.clients = clientsResult.rows.length;
        console.log(`🗑️ [ADMIN] Clientes eliminados: ${deletedData.clients}`);
        
        console.log('✅ [ADMIN] ========== LIMPIEZA TOTAL COMPLETADA ==========');
        console.log('📊 [ADMIN] Resumen:', deletedData);
        
        res.json({
            success: true,
            message: 'Base de datos limpiada exitosamente',
            deleted: deletedData,
            note: 'Los clientes siguen existiendo en Stripe. Para cancelar suscripciones, hazlo manualmente desde Stripe.'
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Error en limpieza total:', error);
        res.status(500).json({ 
            error: error.message,
            note: 'La limpieza puede haber sido parcial. Revisa los logs.'
        });
    }
});

// ========== ENDPOINTS DE VIDEOS ==========

// Obtener todos los videos
app.get('/api/videos', async (req, res) => {
    try {
        const videos = await db.getAllVideos();
        res.json(videos);
    } catch (error) {
        console.error('❌ [VIDEOS] Error obteniendo videos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener videos por categoría
app.get('/api/videos/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const videos = await db.getVideosByCategory(category);
        res.json(videos);
    } catch (error) {
        console.error('❌ [VIDEOS] Error obteniendo videos por categoría:', error);
        res.status(500).json({ error: error.message });
    }
});

// Crear un nuevo video
app.post('/api/admin/videos', async (req, res) => {
    try {
        const { title, description, url, category, duration, thumbnail_url, display_order } = req.body;
        
        console.log('📹 [ADMIN] Creando nuevo video:', title);
        
        const video = await db.createVideo({
            title,
            description,
            url,
            category,
            duration,
            thumbnail_url,
            display_order
        });
        
        console.log('✅ [ADMIN] Video creado exitosamente:', video.id);
        res.json({ success: true, video });
    } catch (error) {
        console.error('❌ [ADMIN] Error creando video:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar un video
app.put('/api/admin/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, url, category, duration, thumbnail_url, display_order } = req.body;
        
        console.log(`📹 [ADMIN] Actualizando video #${id}`);
        
        const video = await db.updateVideo(id, {
            title,
            description,
            url,
            category,
            duration,
            thumbnail_url,
            display_order
        });
        
        console.log('✅ [ADMIN] Video actualizado exitosamente');
        res.json({ success: true, video });
    } catch (error) {
        console.error('❌ [ADMIN] Error actualizando video:', error);
        res.status(500).json({ error: error.message });
    }
});

// Eliminar un video
app.delete('/api/admin/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🗑️ [ADMIN] Eliminando video #${id}`);
        
        await db.deleteVideo(id);
        
        console.log('✅ [ADMIN] Video eliminado exitosamente');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ [ADMIN] Error eliminando video:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🔧 ENDPOINT DE MIGRACIÓN: Añadir columna display_order
app.post('/api/admin/migrate-display-order', async (req, res) => {
    try {
        console.log('🔧 [MIGRACIÓN] Añadiendo columna display_order a videos...');
        
        // Añadir columna si no existe
        await db.pool.query(`
            ALTER TABLE videos 
            ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999
        `);
        console.log('✅ [MIGRACIÓN] Columna añadida');
        
        // Asignar valores de orden
        const updateResult = await db.pool.query(`
            UPDATE videos 
            SET display_order = (
                SELECT COUNT(*) + 1 
                FROM videos v2 
                WHERE v2.created_at < videos.created_at
            )
            WHERE display_order IS NULL OR display_order = 999
        `);
        console.log(`✅ [MIGRACIÓN] ${updateResult.rowCount} videos actualizados`);
        
        // Obtener resultados
        const videos = await db.pool.query(`
            SELECT id, title, display_order 
            FROM videos 
            ORDER BY display_order
        `);
        
        console.log('✅ [MIGRACIÓN] Migración completada exitosamente');
        
        res.json({ 
            success: true, 
            message: 'Migración completada',
            videosUpdated: updateResult.rowCount,
            videos: videos.rows
        });
    } catch (error) {
        console.error('❌ [MIGRACIÓN] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🧪 ENDPOINT DE TEST: Forzar modificación en un pedido
app.post('/api/admin/force-modification/:submissionId', async (req, res) => {
    try {
        const submissionId = req.params.submissionId;
        
        console.log(`🧪 [TEST] Forzando modificación en submission #${submissionId}`);
        
        await db.pool.query(`
            UPDATE submissions 
            SET has_modifications = TRUE,
                last_modified_at = CURRENT_TIMESTAMP,
                modifications_viewed_at = NULL
            WHERE id = $1
        `, [submissionId]);
        
        const result = await db.pool.query('SELECT id, business_name, has_modifications, last_modified_at, modifications_viewed_at FROM submissions WHERE id = $1', [submissionId]);
        
        console.log(`✅ [TEST] Modificación forzada exitosamente:`, result.rows[0]);
        
        res.json({ 
            success: true, 
            message: 'Modificación forzada para testing',
            submission: result.rows[0]
        });
    } catch (error) {
        console.error('❌ [TEST] Error forzando modificación:', error);
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Dashboard admin: http://localhost:${PORT}/admin`);
    console.log(`💳 Webhook URL: http://localhost:${PORT}/webhook`);
}); 