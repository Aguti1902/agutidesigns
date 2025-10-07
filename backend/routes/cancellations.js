const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database');

// ===== ENDPOINTS DE CLIENTE =====

// 1. CANCELAR SUSCRIPCIÓN (Cliente)
router.post('/client/cancel-subscription', async (req, res) => {
    try {
        const { client_id, reason, reason_details, apply_coupon } = req.body;
        
        console.log('🚫 [CLIENT] Cancelando suscripción para cliente #' + client_id);
        
        // Obtener cliente
        const client = await db.getClientById(client_id);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        if (!client.stripe_subscription_id) {
            return res.status(400).json({ error: 'Cliente no tiene suscripción activa' });
        }
        
        let coupon_applied = false;
        let coupon_code = null;
        
        // Verificar que la suscripción existe en Stripe
        let subscription;
        try {
            console.log('🔍 [STRIPE] Verificando suscripción:', client.stripe_subscription_id);
            subscription = await stripe.subscriptions.retrieve(client.stripe_subscription_id);
        } catch (stripeError) {
            console.error('❌ [STRIPE] Suscripción no encontrada en Stripe:', stripeError.message);
            return res.status(400).json({ 
                error: 'La suscripción no existe en Stripe. Puede que ya haya sido cancelada o eliminada. Por favor, contacta con soporte.' 
            });
        }
        
        // Si el cliente aceptó el cupón, aplicarlo ANTES de cancelar
        if (apply_coupon) {
            try {
                console.log('🎟️ [STRIPE] Aplicando cupón de retención a suscripción:', client.stripe_subscription_id);
                await stripe.subscriptions.update(client.stripe_subscription_id, {
                    coupon: 'RETENTION_20' // 20% descuento por 3 meses
                });
                coupon_applied = true;
                coupon_code = 'RETENTION_20';
                console.log('✅ [STRIPE] Cupón aplicado exitosamente');
                
                // NO cancelar, solo aplicar cupón y retornar
                return res.json({ 
                    success: true, 
                    coupon_applied: true,
                    message: 'Descuento aplicado exitosamente. Tu suscripción continúa activa con 20% de descuento por 3 meses.'
                });
            } catch (couponError) {
                console.error('❌ [STRIPE] Error aplicando cupón:', couponError);
                return res.status(500).json({ error: 'Error aplicando descuento: ' + couponError.message });
            }
        }
        
        const current_period_end = new Date(subscription.current_period_end * 1000);
        
        // Cancelar suscripción en Stripe (al final del período)
        console.log('🚫 [STRIPE] Cancelando suscripción:', client.stripe_subscription_id);
        await stripe.subscriptions.update(client.stripe_subscription_id, {
            cancel_at_period_end: true
        });
        
        console.log('✅ [STRIPE] Suscripción marcada para cancelación al final del período:', current_period_end);
        
        // Registrar cancelación en DB
        const cancellation = await db.createCancellation({
            client_id: client_id,
            subscription_id: client.stripe_subscription_id,
            effective_date: current_period_end,
            reason: reason,
            reason_details: reason_details,
            cancelled_by: 'client',
            coupon_applied: coupon_applied,
            coupon_code: coupon_code
        });
        
        // Actualizar cliente
        await db.updateClient(client_id, {
            cancellation_scheduled: true,
            cancellation_effective_date: current_period_end,
            cancellation_reason: reason
        });
        
        // Crear ticket para notificar al admin
        await db.createTicket({
            client_id: client_id,
            subject: '🚫 Cancelación de suscripción',
            category: 'cancelacion',
            priority: 'alta',
            description: `El cliente ha cancelado su suscripción.\n\nRazón: ${reason}\nDetalles: ${reason_details || 'N/A'}\nFecha efectiva: ${current_period_end.toLocaleDateString('es-ES')}\n\nEl acceso permanecerá activo hasta la fecha indicada.`,
            status: 'abierto'
        });
        
        console.log('✅ [CLIENT] Cancelación registrada exitosamente');
        
        res.json({
            success: true,
            effective_date: current_period_end,
            cancellation_id: cancellation.id,
            coupon_applied: coupon_applied
        });
        
    } catch (error) {
        console.error('❌ [CLIENT] Error cancelando suscripción:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. REACTIVAR SUSCRIPCIÓN (Cliente)
router.post('/client/reactivate-subscription', async (req, res) => {
    try {
        const { client_id } = req.body;
        
        console.log('🔄 [CLIENT] Reactivando suscripción para cliente #' + client_id);
        
        // Obtener cliente
        const client = await db.getClientById(client_id);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        if (!client.stripe_subscription_id) {
            return res.status(400).json({ error: 'Cliente no tiene suscripción' });
        }
        
        // Verificar que la suscripción existe en Stripe
        try {
            console.log('🔍 [STRIPE] Verificando suscripción:', client.stripe_subscription_id);
            await stripe.subscriptions.retrieve(client.stripe_subscription_id);
        } catch (stripeError) {
            console.error('❌ [STRIPE] Suscripción no encontrada en Stripe:', stripeError.message);
            return res.status(400).json({ 
                error: 'La suscripción no existe en Stripe. Por favor, contacta con soporte.' 
            });
        }
        
        // Reactivar en Stripe
        console.log('🔄 [STRIPE] Reactivando suscripción:', client.stripe_subscription_id);
        await stripe.subscriptions.update(client.stripe_subscription_id, {
            cancel_at_period_end: false
        });
        
        console.log('✅ [STRIPE] Suscripción reactivada exitosamente');
        
        // Marcar cancelación como reactivada en DB
        const cancellation = await db.getCancellationByClientId(client_id);
        if (cancellation) {
            await db.reactivateCancellation(cancellation.id);
        }
        
        // Actualizar cliente
        await db.updateClient(client_id, {
            cancellation_scheduled: false,
            cancellation_effective_date: null,
            cancellation_reason: null
        });
        
        // Crear ticket para notificar al admin
        await db.createTicket({
            client_id: client_id,
            subject: '🔄 Reactivación de suscripción',
            category: 'general',
            priority: 'media',
            description: `El cliente ha reactivado su suscripción. La renovación automática continuará normalmente.`,
            status: 'abierto'
        });
        
        console.log('✅ [CLIENT] Suscripción reactivada exitosamente');
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ [CLIENT] Error reactivando suscripción:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ENDPOINTS DE ADMIN =====

// 3. OBTENER TODAS LAS CANCELACIONES (Admin)
router.get('/admin/cancellations', async (req, res) => {
    try {
        console.log('📋 [ADMIN] Obteniendo todas las cancelaciones...');
        const cancellations = await db.getAllCancellations();
        console.log('✅ [ADMIN] Cancelaciones encontradas:', cancellations.length);
        res.json(cancellations);
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo cancelaciones:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. ESTADÍSTICAS DE CANCELACIONES (Admin)
router.get('/admin/cancellations/stats', async (req, res) => {
    try {
        console.log('📊 [ADMIN] Obteniendo estadísticas de cancelaciones...');
        const stats = await db.getCancellationStats();
        console.log('✅ [ADMIN] Estadísticas obtenidas:', stats);
        res.json(stats);
    } catch (error) {
        console.error('❌ [ADMIN] Error obteniendo estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// 5. CANCELAR SUSCRIPCIÓN MANUALMENTE (Admin)
router.post('/admin/cancel-subscription/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { reason, reason_details } = req.body;
        
        console.log('🚫 [ADMIN] Cancelando suscripción manualmente para cliente #' + clientId);
        
        // Obtener cliente
        const client = await db.getClientById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        if (!client.stripe_subscription_id) {
            return res.status(400).json({ error: 'Cliente no tiene suscripción activa' });
        }
        
        // Verificar que la suscripción existe en Stripe
        let subscription;
        try {
            console.log('🔍 [STRIPE] Verificando suscripción:', client.stripe_subscription_id);
            subscription = await stripe.subscriptions.retrieve(client.stripe_subscription_id);
        } catch (stripeError) {
            console.error('❌ [STRIPE] Suscripción no encontrada en Stripe:', stripeError.message);
            return res.status(400).json({ 
                error: 'La suscripción no existe en Stripe. Puede que ya haya sido cancelada o eliminada.' 
            });
        }
        
        const current_period_end = new Date(subscription.current_period_end * 1000);
        
        // Cancelar suscripción en Stripe
        console.log('🚫 [STRIPE] Cancelando suscripción:', client.stripe_subscription_id);
        await stripe.subscriptions.update(client.stripe_subscription_id, {
            cancel_at_period_end: true
        });
        
        console.log('✅ [STRIPE] Suscripción cancelada exitosamente');
        
        // Registrar cancelación en DB
        const cancellation = await db.createCancellation({
            client_id: clientId,
            subscription_id: client.stripe_subscription_id,
            effective_date: current_period_end,
            reason: reason,
            reason_details: reason_details,
            cancelled_by: 'admin',
            coupon_applied: false,
            coupon_code: null
        });
        
        // Actualizar cliente
        await db.updateClient(clientId, {
            cancellation_scheduled: true,
            cancellation_effective_date: current_period_end,
            cancellation_reason: reason
        });
        
        console.log('✅ [ADMIN] Cancelación registrada exitosamente');
        
        res.json({
            success: true,
            effective_date: current_period_end,
            cancellation_id: cancellation.id
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Error cancelando suscripción:', error);
        res.status(500).json({ error: error.message });
    }
});

// 6. LIMPIAR SUBSCRIPTIONS INVÁLIDOS (Admin)
router.post('/admin/clean-invalid-subscriptions', async (req, res) => {
    try {
        console.log('🧹 [ADMIN] Limpiando subscriptions inválidos...');
        
        // Obtener todos los clientes con subscription_id
        const clients = await db.getAllClients();
        const clientsWithSubscription = clients.filter(c => c.stripe_subscription_id);
        
        console.log('📊 [ADMIN] Clientes con subscription_id:', clientsWithSubscription.length);
        
        let invalid = 0;
        let valid = 0;
        const results = [];
        
        for (const client of clientsWithSubscription) {
            try {
                // Intentar obtener la subscription de Stripe
                await stripe.subscriptions.retrieve(client.stripe_subscription_id);
                valid++;
                results.push({
                    client_id: client.id,
                    email: client.email,
                    subscription_id: client.stripe_subscription_id,
                    status: 'valid'
                });
            } catch (error) {
                // Subscription no existe, limpiar
                console.log(`❌ Subscription inválida para cliente #${client.id} (${client.email}): ${client.stripe_subscription_id}`);
                
                await db.updateClient(client.id, {
                    stripe_subscription_id: null,
                    plan: 'sin_plan',
                    website_status: 'inactivo'
                });
                
                invalid++;
                results.push({
                    client_id: client.id,
                    email: client.email,
                    subscription_id: client.stripe_subscription_id,
                    status: 'cleaned'
                });
            }
        }
        
        console.log('✅ [ADMIN] Limpieza completada');
        console.log(`   - Válidas: ${valid}`);
        console.log(`   - Limpiadas: ${invalid}`);
        
        res.json({
            success: true,
            total: clientsWithSubscription.length,
            valid: valid,
            invalid: invalid,
            cleaned: invalid,
            results: results
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Error limpiando subscriptions:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

