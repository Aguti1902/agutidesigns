# 🔍 Debug de Emails - No llegan a info@agutidesigns.es

## 🐛 Problema Identificado y Arreglado

**ANTES:** Los emails se enviaban a `info@agutidesigns.com` ❌  
**AHORA:** Los emails se envían a `info@agutidesigns.es` ✅

---

## 🔧 Cambios Realizados

### 1. Server.js - Notificaciones de Tickets
```javascript
// ANTES:
to: 'info@agutidesigns.com'  ❌

// AHORA:
to: process.env.ADMIN_EMAIL || 'info@agutidesigns.es'  ✅
```

### 2. Logs Agregados
```javascript
console.log('📧 [EMAIL] Enviando notificación al admin:', adminEmail);
```

---

## ✅ Verificación en Railway

### 1. Verificar Variable de Entorno
1. Abre Railway → Tu proyecto
2. Ve a **"Variables"**
3. Busca: `ADMIN_EMAIL`
4. Debe ser: `info@agutidesigns.es`

Si no existe, agrégala:
```
Name: ADMIN_EMAIL
Value: info@agutidesigns.es
```

### 2. Verificar Logs Después de Deploy
1. Railway → **"Deployments"** → **"View Logs"**
2. Busca estos mensajes cuando crees un ticket:
```
📧 [EMAIL] Enviando notificación al admin: info@agutidesigns.es
📧 [EMAIL] Enviando email a: info@agutidesigns.es
✅ [EMAIL] Email enviado exitosamente
```

---

## 📧 Verificación en SendGrid

### 1. Ver Actividad de Emails
1. Ve a [app.sendgrid.com/email_activity](https://app.sendgrid.com/email_activity)
2. Busca emails enviados a: `info@agutidesigns.es`
3. Revisa el estado:
   - ✅ **Delivered** - Email entregado
   - ⚠️ **Processed** - En proceso
   - ❌ **Bounced** - Rebotado (email no existe)
   - ❌ **Dropped** - Descartado (spam)

### 2. Verificar Dominio
1. Ve a **"Settings"** → **"Sender Authentication"**
2. Verifica que `agutidesigns.es` esté:
   - ✅ Verificado
   - ✅ DNS configurado
   - ✅ SPF, DKIM activos

### 3. Revisar Suppression Lists
1. Ve a **"Suppressions"**
2. Busca `info@agutidesigns.es`
3. Si aparece, **elimínala** de la lista

---

## 🧪 Prueba Completa

### Paso 1: Crear un Ticket de Prueba
1. Ve al dashboard de cliente (con cuenta de prueba)
2. Ve a **"Contactar"**
3. Crea un ticket:
   - Asunto: "Prueba de email"
   - Categoría: Soporte técnico
   - Descripción: "Test"
4. Envía el ticket

### Paso 2: Verificar Logs de Railway
```bash
# Busca estos logs:
📧 [EMAIL] Enviando notificación al admin: info@agutidesigns.es
📧 [EMAIL] Enviando email a: info@agutidesigns.es
📧 [EMAIL] Subject: 🎫 Nuevo Ticket de Soporte...
✅ [EMAIL] Email enviado exitosamente
```

### Paso 3: Verificar SendGrid Activity
1. Ve a SendGrid → Email Activity
2. Busca el email más reciente
3. Click en el email para ver detalles
4. Verifica estado: **Delivered**

### Paso 4: Revisar Bandeja de Entrada
1. Abre `info@agutidesigns.es` (Hostinger webmail o cliente)
2. Busca email de **"noreply@agutidesigns.es"**
3. Revisa carpeta de **Spam** también

---

## 🚨 Problemas Comunes

### 1. Email en Spam
**Solución:**
- Marca como "No spam"
- Agrega `noreply@agutidesigns.es` a contactos
- Configura filtro para mover a bandeja principal

### 2. SendGrid dice "Dropped"
**Causas:**
- Email en lista de supresión
- Dominio no verificado
- Sin método de pago en SendGrid

**Solución:**
- Verifica dominio en SendGrid
- Elimina email de suppression lists
- Agrega método de pago

### 3. Railway logs: "Error: Missing API key"
**Causa:** `SENDGRID_API_KEY` no configurada

**Solución:**
```
Railway → Variables → SENDGRID_API_KEY = SG.xxxxx
```

### 4. No aparece nada en SendGrid Activity
**Causa:** Los emails no se están enviando desde el backend

**Solución:**
- Verifica que `emailService.sendEmail()` se llame
- Revisa logs de Railway para errores
- Verifica conexión con SendGrid

---

## 📊 Tipos de Emails al Admin

| **Evento** | **Cuándo** | **Asunto** |
|-----------|------------|-----------|
| Nuevo cliente | Registro + pago | 🆕 Nuevo cliente registrado |
| Pago recibido | Pago exitoso | 💰 Nuevo pago recibido |
| Nuevo ticket | Cliente crea ticket | 🎫 Nuevo Ticket de Soporte |
| Respuesta cliente | Cliente responde ticket | 🔔 Nueva Respuesta del Cliente |
| Pago fallido | Renovación falla | ⚠️ Cliente con pago fallido |

---

## ✅ Checklist de Verificación

- [ ] Variable `ADMIN_EMAIL` configurada en Railway
- [ ] Valor correcto: `info@agutidesigns.es` (no .com)
- [ ] Railway redesplegado con los cambios
- [ ] Logs muestran email correcto
- [ ] SendGrid muestra email como "Delivered"
- [ ] Dominio verificado en SendGrid
- [ ] Email no está en suppression lists
- [ ] Revisado carpeta de spam
- [ ] Ticket de prueba creado
- [ ] Email recibido en bandeja

---

## 🆘 Si Aún No Llegan

1. **Copia los logs de Railway** completos cuando crees un ticket
2. **Screenshot de SendGrid Activity** del email más reciente
3. **Verifica la configuración de Hostinger** para `info@agutidesigns.es`
4. **Prueba con otro email** (tu email personal) para descartar problema con `info@agutidesigns.es`

---

**Después del próximo deploy (2-3 min), crea un ticket de prueba y revisa estos puntos!** 🔍

