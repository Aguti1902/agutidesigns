# 📧 CONFIGURAR EMAILS PARA CHECKOUT ABANDONADO

## 🎯 OBJETIVO
Enviar emails automáticos a usuarios que llegan al checkout pero no completan el pago.

---

## ✅ CÓDIGO IMPLEMENTADO

### 1. **Backend actualizado** ✅
- ✅ Webhook maneja evento `checkout.session.expired`
- ✅ Template de email creado (`checkoutAbandonedEmail`)
- ✅ Función `sendEmail` actualizada con caso `checkout-abandoned`

### 2. **Funcionalidad** ✅
- ✅ Detecta automáticamente checkouts abandonados
- ✅ Envía email personalizado con plan seleccionado
- ✅ Incluye botón para completar pedido
- ✅ Oferta especial de 24 horas

---

## 🔧 CONFIGURACIÓN NECESARIA EN STRIPE

### **PASO 1: Configurar Webhook en Stripe**

1. **Ve a Stripe Dashboard** (modo LIVE):
   - https://dashboard.stripe.com/webhooks

2. **Busca tu webhook existente:**
   - Endpoint: `https://agutidesigns-production.up.railway.app/webhook`

3. **Añade el nuevo evento:**
   - Click en "Select events to listen to"
   - Busca: `checkout.session.expired`
   - ✅ Actívalo
   - Guarda cambios

### **PASO 2: Verificar eventos actuales**

Tu webhook debe escuchar estos eventos:
```
✅ checkout.session.completed
✅ checkout.session.expired          ← NUEVO
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
✅ invoice.payment_failed
```

---

## 📧 CONTENIDO DEL EMAIL

### **Asunto:**
`⏰ ¿Completamos tu sitio web de [NOMBRE_EMPRESA]? - agutidesigns`

### **Contenido:**
- ✅ Saludo personalizado con nombre del cliente
- ✅ Recordatorio del plan seleccionado
- ✅ Beneficios de completar el pedido
- ✅ Botón "Completar Mi Pedido" (redirige a checkout)
- ✅ Información de contacto
- ✅ **Oferta especial:** SEO avanzado gratis si completa en 24h

### **Ejemplo:**
```
Hola Juan,

Notamos que comenzaste el proceso para crear tu sitio web 
profesional pero no lo completaste.

🎯 Tu plan seleccionado: Plan Premium - 65€/mes
Incluye 20 páginas + dominio + hosting + soporte

💡 ¿Por qué completar tu pedido?
✅ Diseño profesional
✅ Optimizada para móviles  
✅ SEO incluido
✅ Soporte continuo
✅ Sin sorpresas

🚀 [Completar Mi Pedido]

💌 Oferta especial: Si completas en 24h, 
te incluimos gratis la optimización SEO avanzada (150€)
```

---

## 🧪 CÓMO PROBAR

### **PASO 1: Crear sesión de prueba**
1. Ve a tu formulario
2. Completa datos hasta checkout
3. **NO completes el pago**
4. Cierra la ventana

### **PASO 2: Esperar expiración**
- Las sesiones de Stripe expiran automáticamente en **24 horas**
- O puedes configurar una expiración más corta en el código

### **PASO 3: Verificar email**
- Revisa el email del cliente
- Debería recibir el email de checkout abandonado

---

## 📊 BENEFICIOS ESPERADOS

### **Métricas típicas de email marketing:**
- **Tasa de apertura:** 20-30%
- **Tasa de clics:** 3-8%
- **Conversión de recuperación:** 10-25%

### **Para tu negocio:**
- ✅ **Recuperar ventas perdidas**
- ✅ **Aumentar conversión general**
- ✅ **Mejorar ROI de marketing**
- ✅ **Reducir abandono de checkout**

---

## 🎯 OPTIMIZACIONES FUTURAS

### **Email 2 (si no convierte en 24h):**
- Descuento del 10%
- Casos de éxito de clientes
- Testimonios

### **Email 3 (si no convierte en 72h):**
- Oferta de contacto directo
- Consultoría gratuita
- Plan personalizado

### **Segmentación:**
- Diferentes emails según el plan seleccionado
- Personalización por industria
- Timing optimizado según comportamiento

---

## 🚨 IMPORTANTE

### **Cumplimiento legal:**
- ✅ El usuario ya dio su email voluntariamente
- ✅ Puede darse de baja del email
- ✅ Contenido relevante al proceso iniciado
- ✅ No es spam (solicitado implícitamente)

### **Configuración GDPR:**
- Incluir enlace de darse de baja
- Política de privacidad clara
- Consentimiento explícito si es necesario

---

## 📞 SOPORTE

### **Si no funcionan los emails:**
1. **Verifica webhook en Stripe:**
   - Evento `checkout.session.expired` activado
   - Webhook sin errores

2. **Revisa logs de Railway:**
   - Busca: `[WEBHOOK ABANDON]`
   - Verifica errores de SendGrid

3. **Verifica SendGrid:**
   - API Key configurada
   - Dominio verificado
   - Límites de envío

---

**Fecha:** 2025-01-10
**Estado:** ✅ Implementado y listo para configurar
