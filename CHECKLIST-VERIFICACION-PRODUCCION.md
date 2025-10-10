# ✅ CHECKLIST DE VERIFICACIÓN PARA LANZAR CAMPAÑA

## 🎯 OBJETIVO: Verificar que los pagos mensuales y anuales funcionan en MODO LIVE

---

## 📋 PASO 1: VERIFICAR VARIABLES DE RAILWAY

Ve a Railway Dashboard → tu proyecto → Variables

### ✅ Variables obligatorias para MODO LIVE:

#### **Claves de Stripe LIVE:**
- [ ] `STRIPE_SECRET_KEY` = sk_live_51Otv6p...
- [ ] `STRIPE_PUBLISHABLE_KEY` = pk_live_51Otv6p...
- [ ] `STRIPE_WEBHOOK_SECRET` = whsec_...

#### **Price IDs MENSUALES (LIVE):**
- [ ] `STRIPE_PRICE_BASICO_MONTHLY` = price_... (35€/mes)
- [ ] `STRIPE_PRICE_AVANZADO_MONTHLY` = price_... (49€/mes)
- [ ] `STRIPE_PRICE_PREMIUM_MONTHLY` = price_... (65€/mes)

#### **Price IDs ANUALES (LIVE):**
- [ ] `STRIPE_PRICE_BASICO_ANNUAL` = price_... (336€/año = 28€/mes)
- [ ] `STRIPE_PRICE_AVANZADO_ANNUAL` = price_... (468€/año = 39€/mes)
- [ ] `STRIPE_PRICE_PREMIUM_ANNUAL` = price_... (624€/año = 52€/mes)

#### **Modo de operación:**
- [ ] `TEST_MODE` = **false** (o eliminada completamente)

**⚠️ IMPORTANTE:** Si `TEST_MODE=true`, estarás en modo prueba y NO se cobrarán pagos reales.

---

## 📋 PASO 2: VERIFICAR PRODUCTOS EN STRIPE

Ve a: https://dashboard.stripe.com/products (asegúrate de estar en modo LIVE)

### Productos Mensuales:
- [ ] Plan Básico: 35€/mes (recurrente mensual)
- [ ] Plan Avanzado: 49€/mes (recurrente mensual)
- [ ] Plan Premium: 65€/mes (recurrente mensual)

### Productos Anuales:
- [ ] Plan Básico: 336€/año (facturado anualmente)
- [ ] Plan Avanzado: 468€/año (facturado anualmente)
- [ ] Plan Premium: 624€/año (facturado anualmente)

**Cómo verificar:**
1. Click en cada producto
2. Verifica que el "Price ID" coincida con el configurado en Railway
3. Verifica que el precio sea correcto
4. Verifica que la frecuencia sea correcta (monthly/yearly)

---

## 📋 PASO 3: VERIFICAR WEBHOOK DE STRIPE

Ve a: https://dashboard.stripe.com/webhooks (modo LIVE)

- [ ] Endpoint configurado: `https://agutidesigns-production.up.railway.app/webhook`
- [ ] Estado: **✅ Activo** (no debe decir "Error")
- [ ] Eventos escuchados:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

**Signing Secret:**
- [ ] El webhook secret de Railway coincide con el de Stripe

---

## 📋 PASO 4: VERIFICAR CÓDIGO DEL BACKEND

El código ya está correcto (verificado), pero confirma:

- [x] El endpoint `/api/create-subscription` maneja `billing_cycle`
- [x] Selecciona `STRIPE_PRICES_ANNUAL` o `STRIPE_PRICES_MONTHLY` según el ciclo
- [x] Tiene logs de debug para troubleshooting

---

## 📋 PASO 5: VERIFICAR CÓDIGO DEL FRONTEND

- [x] `checkout.html` envía el parámetro `billing_cycle` correctamente
- [x] `success.html` tiene tracking de conversiones con valor dinámico
- [x] Google Tag Manager instalado en todas las páginas

---

## 📋 PASO 6: PRUEBAS FINALES ANTES DE LANZAR

### **Prueba 1: Pago Mensual**

1. Ve a: https://formulario.agutidesigns.es/formulario-membresia.html?plan=basico&billing=monthly
2. Completa el formulario
3. En la página de pago, usa una tarjeta de prueba de Stripe:
   - **Número:** 4242 4242 4242 4242
   - **Fecha:** Cualquier fecha futura
   - **CVC:** Cualquier 3 dígitos
4. Completa el pago
5. Verifica:
   - [ ] Redirige a `/success`
   - [ ] Muestra el plan correcto (Básico 35€/mes)
   - [ ] Recibes email de confirmación
   - [ ] En Stripe Dashboard aparece la suscripción
   - [ ] El precio cobrado es 35€ + IVA

### **Prueba 2: Pago Anual**

1. Ve a: https://formulario.agutidesigns.es/formulario-membresia.html?plan=premium&billing=annual
2. Completa el formulario
3. Paga con tarjeta de prueba
4. Verifica:
   - [ ] Redirige a `/success`
   - [ ] Muestra "Plan Premium Anual"
   - [ ] En Stripe aparece suscripción de 624€/año
   - [ ] El precio mostrado es correcto

### **Prueba 3: Verificar Logs de Railway**

1. Ve a Railway → Logs
2. Busca líneas como:
   ```
   💳 Creando suscripción monthly para plan basico con Price ID: price_...
   💳 Creando suscripción annual para plan premium con Price ID: price_...
   ```
3. Verifica:
   - [ ] Los Price IDs son correctos
   - [ ] No hay errores de "Plan inválido"
   - [ ] No hay errores de "No such price"

---

## 📋 PASO 7: VERIFICAR GOOGLE ADS

### **Tracking de Conversiones:**

- [ ] GTM instalado en todas las páginas
- [ ] Evento de "Compra" configurado (AW-17641289817/qddYCJSY1KobENnwgtxB)
- [ ] Evento de "Suscripción" configurado (AW-17641289817/BkePCO2_8aobENnwgtxB)
- [ ] Ambos eventos envían valor dinámico del plan

**Cómo verificar:**
1. Haz una compra de prueba
2. En la página de success, abre la consola del navegador (F12)
3. Busca el log: `🎯 Disparando eventos de conversión de Google Ads`
4. Verifica que `conversionValue` sea correcto:
   - Básico mensual: 35.0
   - Avanzado mensual: 49.0
   - Premium mensual: 65.0
   - Básico anual: 420.0 (35 × 12)
   - Avanzado anual: 588.0 (49 × 12)
   - Premium anual: 780.0 (65 × 12)

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### ❌ Error: "Plan inválido o Price ID no configurado"

**Causa:** Las variables de Railway no están bien configuradas

**Solución:**
1. Verifica que los nombres de las variables sean exactos:
   - `STRIPE_PRICE_BASICO_MONTHLY` (no `STRIPE_PRICE_BASICO`)
   - `STRIPE_PRICE_BASICO_ANNUAL`
2. Verifica que los Price IDs empiecen con `price_`
3. Haz restart del backend en Railway

---

### ❌ Error: "No such price: price_xxx"

**Causa:** Estás usando un Price ID de TEST en modo LIVE (o viceversa)

**Solución:**
1. Verifica que `TEST_MODE=false` en Railway
2. Verifica que los Price IDs sean de productos LIVE
3. En Stripe Dashboard, confirma que el producto existe en modo LIVE

---

### ❌ No recibo emails de confirmación

**Causa:** SendGrid no configurado o emails en spam

**Solución:**
1. Verifica que `SENDGRID_API_KEY` esté en Railway
2. Revisa la carpeta de spam
3. Revisa los logs de Railway para ver si hay errores de email

---

### ❌ El webhook no funciona

**Causa:** El signing secret es incorrecto

**Solución:**
1. Ve a Stripe Dashboard → Webhooks (modo LIVE)
2. Copia el "Signing secret"
3. Actualiza `STRIPE_WEBHOOK_SECRET` en Railway
4. Haz restart del backend

---

## ✅ CHECKLIST FINAL ANTES DE LANZAR CAMPAÑA

- [ ] **TEST_MODE = false** en Railway
- [ ] **6 Price IDs configurados** (3 mensuales + 3 anuales) en Railway
- [ ] **Webhook activo** y funcionando en Stripe
- [ ] **Prueba de pago mensual** completada exitosamente
- [ ] **Prueba de pago anual** completada exitosamente
- [ ] **Emails de confirmación** recibidos
- [ ] **Google Ads tracking** verificado (valores correctos en consola)
- [ ] **GTM instalado** y verificado
- [ ] **Sin errores** en logs de Railway

---

## 🚀 LISTO PARA LANZAR

Si todos los checkboxes están marcados ✅, **estás listo para lanzar tu campaña de publicidad**.

El sistema procesará pagos reales y las conversiones se registrarán correctamente en Google Ads con el valor exacto de cada plan.

---

## 📞 SOPORTE

Si necesitas ayuda adicional:
1. Revisa los logs de Railway
2. Verifica la consola del navegador (F12)
3. Comprueba el dashboard de Stripe
4. Revisa que las variables de entorno estén exactas

---

**Fecha de última actualización:** 2025-01-10
**Versión:** 2.0 (con soporte anual)

