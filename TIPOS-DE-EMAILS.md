# 📧 TIPOS DE EMAILS DEL SISTEMA - agutidesigns

Este documento lista todos los emails automatizados que se envían desde el sistema.

---

## 📬 EMAILS AL CLIENTE (9 tipos)

### 1. **`welcome`** - Email de Bienvenida
**Cuándo se envía:** Al registrarse un nuevo cliente
**Contenido:**
- Saludo personalizado con nombre y empresa
- Bienvenida a agutidesigns
- Confirmación del plan contratado
- Información sobre los próximos pasos
- Invitación a acceder al dashboard

**Destinatario:** Email del cliente
**Asunto:** 🎉 ¡Bienvenido a agutidesigns!

---

### 2. **`payment-success`** - Confirmación de Pago
**Cuándo se envía:** Después de un pago exitoso
**Contenido:**
- Confirmación de pago recibido
- Resumen del plan contratado
- Precio y renovación automática
- Tiempo de entrega (5/7/10 días según plan)
- Información sobre acceso al dashboard
- CTA: Acceder a Mi Dashboard

**Destinatario:** Email del cliente
**Asunto:** 💳 ¡Pago Confirmado! - agutidesigns

---

### 3. **`website-delivered`** - Web Entregada
**Cuándo se envía:** Cuando el admin marca la web como "activa"
**Contenido:**
- ¡Tu sitio web está listo!
- URL del sitio web
- Invitación a revisarlo
- Información sobre cambios y ajustes
- CTA: Ver Mi Sitio Web

**Destinatario:** Email del cliente
**Asunto:** 🎉 ¡Tu sitio web está listo!

---

### 4. **`ticket-response`** - Respuesta a Ticket
**Cuándo se envía:** Cuando el admin responde a un ticket del cliente
**Contenido:**
- Notificación de nueva respuesta
- Asunto del ticket
- Extracto de la respuesta del admin
- CTA: Ver Respuesta Completa

**Destinatario:** Email del cliente
**Asunto:** 💬 Nueva respuesta a tu ticket - agutidesigns

---

### 5. **`renewal-reminder`** - Recordatorio de Renovación
**Cuándo se envía:** X días antes de la renovación automática
**Contenido:**
- Recordatorio de próxima renovación
- Días restantes hasta la renovación
- Monto a cobrar
- Información sobre cómo actualizar datos de pago
- CTA: Actualizar Método de Pago

**Destinatario:** Email del cliente
**Asunto:** 🔔 Renovación próxima - agutidesigns

---

### 6. **`payment-failed`** - Pago Fallido
**Cuándo se envía:** Cuando falla un intento de cobro (1º, 2º o 3º intento)
**Contenido:**
- Notificación de pago fallido
- Número de intento (1/3, 2/3, 3/3)
- Razón del fallo (si está disponible)
- Próximo intento de cobro
- Advertencia sobre suspensión del servicio
- CTA: Actualizar Método de Pago

**Destinatario:** Email del cliente
**Asunto:** ⚠️ Error en el pago - Acción requerida

---

### 7. **`service-suspended`** - Servicio Suspendido
**Cuándo se envía:** Después de 3 intentos de pago fallidos
**Contenido:**
- Notificación de suspensión del servicio
- Razón de la suspensión
- Información sobre cómo reactivar
- Plazo para reactivación antes de cancelación definitiva
- CTA: Reactivar Servicio

**Destinatario:** Email del cliente
**Asunto:** 🚫 Servicio suspendido - agutidesigns

---

### 8. **`subscription-cancelled`** - Suscripción Cancelada
**Cuándo se envía:** Cuando el cliente cancela su suscripción
**Contenido:**
- Confirmación de cancelación
- Fecha de fin de servicio
- Información sobre acceso hasta el fin del periodo
- Invitación a reactivar si cambia de opinión
- Agradecimiento por haber sido cliente
- CTA: Reactivar Suscripción

**Destinatario:** Email del cliente
**Asunto:** ❌ Suscripción cancelada - agutidesigns

---

### 9. **`plan-changed`** - Cambio de Plan (NO IMPLEMENTADO AÚN)
**Cuándo se envía:** Cuando el cliente cambia de plan (upgrade/downgrade)
**Contenido:**
- Confirmación del cambio de plan
- Plan anterior → Plan nuevo
- Nueva fecha de facturación
- Nuevas características disponibles
- CTA: Ver Nuevo Dashboard

**Destinatario:** Email del cliente
**Asunto:** 🔄 Plan actualizado - agutidesigns

---

## 👨‍💼 EMAILS AL ADMIN (4 tipos)

### 1. **`admin-new-client`** - Nuevo Cliente Registrado
**Cuándo se envía:** Cuando se registra un nuevo cliente
**Contenido:**
- Alerta de nuevo cliente
- Nombre y email del cliente
- Empresa/negocio
- Plan contratado
- Fecha de registro
- CTA: Ver en Admin Dashboard

**Destinatario:** `info@agutidesigns.es`
**Asunto:** 🎉 Nuevo cliente registrado - agutidesigns

---

### 2. **`admin-new-payment`** - Nuevo Pago Recibido
**Cuándo se envía:** Cuando se recibe un pago exitoso
**Contenido:**
- Notificación de nuevo pago
- Cliente que pagó
- Plan y monto
- Método de pago
- Fecha y hora
- CTA: Ver Detalles

**Destinatario:** `info@agutidesigns.es`
**Asunto:** 💰 Nuevo pago recibido - agutidesigns

---

### 3. **`admin-new-ticket`** - Nuevo Ticket de Soporte
**Cuándo se envía:** Cuando un cliente crea un nuevo ticket
**Contenido:**
- Alerta de nuevo ticket
- Cliente que lo creó
- Asunto y categoría
- Prioridad
- Extracto del mensaje
- CTA: Responder Ticket

**Destinatario:** `info@agutidesigns.es`
**Asunto:** 🎫 Nuevo ticket de soporte - agutidesigns

---

### 4. **`admin-payment-failed`** - Alerta de Pago Fallido
**Cuándo se envía:** Cuando falla un intento de cobro a un cliente
**Contenido:**
- Alerta de pago fallido
- Cliente afectado
- Plan y monto
- Número de intento
- Razón del fallo
- Próxima acción recomendada
- CTA: Ver Cliente

**Destinatario:** `info@agutidesigns.es`
**Asunto:** ⚠️ Pago fallido - Acción requerida

---

## 📊 RESUMEN

| Tipo | Destinatario | Cuándo se envía |
|------|--------------|-----------------|
| **welcome** | Cliente | Al registrarse |
| **payment-success** | Cliente | Después de pagar |
| **website-delivered** | Cliente | Web lista/activa |
| **ticket-response** | Cliente | Admin responde ticket |
| **renewal-reminder** | Cliente | X días antes de renovación |
| **payment-failed** | Cliente | Falla intento de cobro |
| **service-suspended** | Cliente | 3 intentos fallidos |
| **subscription-cancelled** | Cliente | Cancela suscripción |
| **admin-new-client** | Admin | Nuevo registro |
| **admin-new-payment** | Admin | Pago recibido |
| **admin-new-ticket** | Admin | Nuevo ticket creado |
| **admin-payment-failed** | Admin | Fallo en cobro |

---

## 🔧 CÓMO USAR

### Desde el código backend:

```javascript
const emailService = require('./email-service');

// Email al cliente
await emailService.sendEmail('payment-success', {
    full_name: 'Juan Pérez',
    email: 'juan@example.com',
    business_name: 'Mi Empresa',
    plan: 'premium'
});

// Email al admin
await emailService.sendEmail('admin-new-client', {
    full_name: 'Juan Pérez',
    email: 'juan@example.com',
    business_name: 'Mi Empresa',
    plan: 'premium'
});
```

---

## 📧 CONFIGURACIÓN

**Email remitente:** `no-reply@agutidesigns.es`
**Email admin:** `info@agutidesigns.es`
**Servicio:** SendGrid

**Variables de entorno requeridas:**
- `SENDGRID_API_KEY`: API Key de SendGrid

---

## 🎨 DISEÑO DE LOS EMAILS

Todos los emails incluyen:
- ✅ Logo blanco de agutidesigns en header azul
- ✅ Diseño responsive (móvil y desktop)
- ✅ Colores corporativos (#0046FE)
- ✅ Botones CTA destacados
- ✅ Footer con información de contacto
- ✅ Link a agutidesigns.es

---

## ⚠️ EMAILS PENDIENTES DE IMPLEMENTAR

Estos tipos de emails están **planeados pero NO implementados**:

- `plan-changed` - Notificar cambio de plan
- `invoice-generated` - Enviar factura mensual
- `admin-client-cancelled` - Notificar admin de cancelación
- `admin-client-suspended` - Notificar admin de suspensión

---

**Última actualización:** Octubre 2024

