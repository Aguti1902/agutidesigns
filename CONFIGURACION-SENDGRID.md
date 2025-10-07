# 📧 CONFIGURACIÓN DE SENDGRID PARA EMAILS

## 🚀 PASO 1: Crear cuenta en SendGrid

1. Ve a https://signup.sendgrid.com/
2. Regístrate con tu email (info@agutidesigns.es)
3. Verifica tu email
4. **Plan recomendado:** Free (100 emails/día)

---

## 🔑 PASO 2: Crear API Key

1. Una vez dentro, ve a: **Settings** → **API Keys**
2. Click en **Create API Key**
3. **Nombre:** `agutidesigns-production`
4. **Permisos:** Selecciona **Full Access**
5. Click en **Create & View**
6. **⚠️ IMPORTANTE:** Copia la API Key (solo se muestra una vez)
   - Formato: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## ✉️ PASO 3: Verificar dominio (agutidesigns.es)

### Opción A: Verificación de dominio completo (Recomendado)

1. Ve a: **Settings** → **Sender Authentication**
2. Click en **Authenticate Your Domain**
3. Selecciona tu proveedor de DNS (ej: Hostinger)
4. Ingresa: `agutidesigns.es`
5. SendGrid te dará registros DNS para añadir:

```
Tipo: CNAME
Host: em1234.agutidesigns.es
Value: u1234567.wl123.sendgrid.net

Tipo: CNAME
Host: s1._domainkey.agutidesigns.es
Value: s1.domainkey.u1234567.wl123.sendgrid.net

Tipo: CNAME
Host: s2._domainkey.agutidesigns.es
Value: s2.domainkey.u1234567.wl123.sendgrid.net
```

6. **Añade estos registros en tu panel de Hostinger:**
   - Ve a tu panel de Hostinger
   - Busca "Zona DNS" o "DNS Management"
   - Añade los 3 registros CNAME que te dio SendGrid
   - Guarda cambios

7. Vuelve a SendGrid y click en **Verify**
   - La verificación puede tardar 24-48 horas

### Opción B: Verificación de remitente único (Más rápido)

Si no quieres esperar la verificación de dominio:

1. Ve a: **Settings** → **Sender Authentication**
2. Click en **Create New Sender**
3. Completa el formulario:
   - **From Name:** agutidesigns
   - **From Email Address:** no-reply@agutidesigns.es
   - **Reply To:** info@agutidesigns.es
   - **Company Address:** (tu dirección)
   - **City, State, Zip, Country:** (tus datos)
4. Click en **Create**
5. Recibirás un email de verificación en `no-reply@agutidesigns.es`
6. Verifica el email

---

## 🚂 PASO 4: Configurar Railway

1. Ve a tu proyecto en Railway
2. Click en tu servicio `backend`
3. Ve a **Variables**
4. Añade una nueva variable:

```
SENDGRID_API_KEY=SG.tu_api_key_aqui
```

5. Click en **Add** y luego **Deploy**

---

## ✅ PASO 5: Instalar dependencia

En tu terminal local:

```bash
cd backend
npm install @sendgrid/mail
```

O simplemente redeploy en Railway (se instalará automáticamente)

---

## 🧪 PASO 6: Probar que funciona

Una vez deployado, los emails se enviarán automáticamente en estos eventos:

### 📧 Emails al cliente:
- ✅ Bienvenida al registrarse
- ✅ Confirmación de pago
- ✅ Web entregada
- ✅ Respuesta a ticket
- ✅ Recordatorios de renovación (7, 3, 1 días)
- ✅ Alertas de pago fallido (1, 2, 3 intentos)
- ✅ Servicio suspendido
- ✅ Suscripción cancelada

### 📧 Emails al admin (info@agutidesigns.es):
- ✅ Nuevo cliente
- ✅ Nuevo pago
- ✅ Nuevo ticket
- ✅ Cliente con pago fallido
- ✅ Cliente suspendido

---

## 🔍 PASO 7: Verificar logs

En Railway logs verás:
```
✅ Email enviado: welcome → cliente@example.com
✅ Email enviado: admin-new-client → info@agutidesigns.es
```

Si ves errores, revisa que:
1. La API Key esté correcta
2. El dominio esté verificado
3. El email remitente esté verificado

---

## 📊 PASO 8: Monitorear envíos

1. Ve a SendGrid Dashboard
2. Click en **Activity**
3. Verás todos los emails enviados, abiertos, clickeados, etc.

---

## ⚠️ SOLUCIÓN DE PROBLEMAS

### Error: "The from address does not match a verified Sender Identity"

**Solución:** Verifica el remitente en SendGrid (Paso 3, Opción B)

### Error: "Daily sending limit reached"

**Solución:** Plan gratuito tiene límite de 100 emails/día. Considera upgrade si necesitas más.

### Emails llegan a spam

**Solución:** Verifica el dominio completo (Paso 3, Opción A) para mejor deliverability.

---

## 📈 UPGRADE DE PLAN (Futuro)

Si necesitas más de 100 emails/día:

| Plan | Emails/día | Precio |
|------|-----------|--------|
| Free | 100 | $0 |
| Essentials | 40,000 | $15/mes |
| Pro | 100,000 | $89/mes |

---

## ✅ CHECKLIST FINAL

- [ ] Cuenta de SendGrid creada
- [ ] API Key generada y copiada
- [ ] Remitente verificado (no-reply@agutidesigns.es)
- [ ] Variable SENDGRID_API_KEY añadida en Railway
- [ ] Dependencia instalada
- [ ] Backend redeployado
- [ ] Email de prueba enviado exitosamente

---

🎉 **¡Listo! El sistema de emails está configurado y funcionando.**

