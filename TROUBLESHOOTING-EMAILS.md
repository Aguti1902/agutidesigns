# 🔧 TROUBLESHOOTING: Emails No Llegan

## 📋 **DIAGNÓSTICO ACTUAL**

Tu email `info@agutidesigns.es` está en la **bounce list de SendGrid**.

**¿Qué significa esto?**
- SendGrid detectó que tu email "rebotó" (no se pudo entregar) anteriormente
- Para proteger tu reputación, SendGrid **bloquea automáticamente** futuros envíos a ese email
- Esto es temporal y se puede solucionar

---

## ✅ **SOLUCIÓN PASO A PASO**

### **1️⃣ Verificar que el Email Existe (Hostinger)**

1. Ve a tu panel de **Hostinger** → **Emails**
2. Verifica que `info@agutidesigns.es` existe y está activo
3. Si no existe, créalo
4. Verifica la cuota de almacenamiento (no debe estar lleno)

---

### **2️⃣ Eliminar Email de Bounce List (SendGrid)**

#### **Opción A: Dashboard Web**

1. Ve a https://app.sendgrid.com/
2. Inicia sesión con tu cuenta
3. En el menú lateral: **Suppressions** → **Bounces**
4. Busca `info@agutidesigns.es`
5. Haz clic en **Delete** (papelera) para eliminarlo de la lista
6. Confirma la eliminación

#### **Opción B: API (si no aparece en el dashboard)**

Ejecuta este comando en tu terminal:

```bash
curl --request DELETE \
  --url https://api.sendgrid.com/v3/suppression/bounces/info@agutidesigns.es \
  --header 'Authorization: Bearer TU_API_KEY_AQUI' \
  --header 'content-type: application/json'
```

**Reemplaza `TU_API_KEY_AQUI` con tu API Key de SendGrid (la misma que usas en Railway)**

---

### **3️⃣ Verificar Autenticación de Dominio (SendGrid)**

1. En SendGrid: **Settings** → **Sender Authentication**
2. Verifica que `agutidesigns.es` tiene:
   - ✅ **Domain Authentication**: Verified (verde)
   - ✅ Estado: **Valid**
3. Si no está verificado:
   - Haz clic en **Authenticate Your Domain**
   - Sigue los pasos para añadir registros DNS en IONOS
   - **Registros necesarios:**
     - `CNAME` para `em1234.agutidesigns.es` (SendGrid te da el valor exacto)
     - `CNAME` para `s1._domainkey.agutidesigns.es`
     - `CNAME` para `s2._domainkey.agutidesigns.es`

---

### **4️⃣ Probar Envío de Email**

Después de completar los pasos anteriores:

1. **Espera 5-10 minutos** (para que los cambios se propaguen)
2. Realiza una prueba de pago en tu web
3. Revisa los logs de Railway:
   ```
   ✅ [WEBHOOK EMAIL 1/2] Admin notificado: SUCCESS
   ✅ [WEBHOOK EMAIL 2/2] Cliente notificado: SUCCESS
   ```
4. Revisa tu bandeja de entrada de `info@agutidesigns.es`
5. **Revisa también SPAM/PROMOCIONES**

---

## 🔍 **VERIFICAR LOGS DE SENDGRID**

Si sigues sin recibir emails:

1. Ve a SendGrid: **Activity** → **Email Activity**
2. Busca emails enviados a `info@agutidesigns.es`
3. Verás el estado:
   - ✅ **Delivered**: Email entregado correctamente
   - ❌ **Dropped**: Bloqueado por bounce/spam list
   - ❌ **Bounced**: Email no existe o buzón lleno
   - ⏳ **Processed**: Enviado, esperando entrega

---

## 🚨 **PROBLEMAS COMUNES**

### **❌ "Email was not sent because the email address previously bounced"**
- **Solución**: Eliminar email de bounce list (Paso 2️⃣)

### **❌ "Domain authentication failed"**
- **Solución**: Configurar DNS en IONOS (Paso 3️⃣)

### **❌ "Daily sending limit reached"**
- **Solución**: Espera 24h o actualiza tu plan de SendGrid
- Plan gratuito: 100 emails/día

### **❌ "API key invalid"**
- **Solución**: Verifica `SENDGRID_API_KEY` en Railway
- Genera una nueva API Key en SendGrid si es necesario

---

## 📝 **NOTAS IMPORTANTES**

1. **Correo Corporativo vs Gmail**: SendGrid funciona mejor con dominios corporativos autenticados
2. **Evitar SPAM**: No uses palabras como "GRATIS", "URGENTE", etc. en los asuntos
3. **Reputación del Dominio**: Los primeros emails son cruciales, asegúrate de que lleguen
4. **Testing**: Usa tu email personal (Gmail, etc.) para probar primero

---

## 🆘 **SI NADA FUNCIONA**

**Plan B: Usar Gmail SMTP (temporal)**

1. En Railway, añade estas variables:
   ```
   EMAIL_SERVICE=gmail
   GMAIL_USER=tu-email@gmail.com
   GMAIL_APP_PASSWORD=contraseña-de-aplicación
   ```

2. En `backend/email-service.js`, añade soporte para Gmail:
   ```javascript
   const transporter = nodemailer.createTransport({
       service: 'gmail',
       auth: {
           user: process.env.GMAIL_USER,
           pass: process.env.GMAIL_APP_PASSWORD
       }
   });
   ```

**⚠️ Esto es solo temporal, SendGrid es la solución profesional**

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

Antes de contactar soporte:

- [ ] Email `info@agutidesigns.es` existe en Hostinger
- [ ] Email NO está en bounce list de SendGrid
- [ ] Dominio `agutidesigns.es` está autenticado en SendGrid
- [ ] API Key de SendGrid está correcta en Railway
- [ ] Logs de Railway muestran "SUCCESS" en envío de emails
- [ ] Revisé carpeta de SPAM
- [ ] Esperé al menos 10 minutos después de hacer cambios

---

## 📞 **CONTACTAR SOPORTE**

Si después de seguir todos los pasos **sigues sin recibir emails**:

1. **SendGrid Support**: https://support.sendgrid.com/
2. **Hostinger Support**: https://www.hostinger.es/contacto
3. Incluye:
   - Capturas de pantalla de logs de Railway
   - Capturas de SendGrid Email Activity
   - Mensaje de error específico

---

**Última actualización**: 9 de enero de 2025  
**Estado del código**: ✅ Correcto (el problema es configuración externa)

