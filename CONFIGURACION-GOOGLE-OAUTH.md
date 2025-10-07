# 🔐 CONFIGURACIÓN DE GOOGLE OAUTH

## 🚀 PASO 1: Crear proyecto en Google Cloud Console

1. Ve a https://console.cloud.google.com/
2. Click en **"Select a project"** (arriba a la izquierda)
3. Click en **"NEW PROJECT"**
4. **Nombre del proyecto:** `agutidesigns`
5. Click en **"CREATE"**
6. Selecciona el proyecto recién creado

---

## 🔑 PASO 2: Activar Google Sign-In API

1. En el menú lateral, ve a: **APIs & Services** → **Library**
2. Busca: `Google+ API` o `Google Sign-In`
3. Click en **Google+ API**
4. Click en **"ENABLE"** (Habilitar)

---

## 🎫 PASO 3: Configurar pantalla de consentimiento OAuth

1. Ve a: **APIs & Services** → **OAuth consent screen**
2. Selecciona: **External** (para que cualquiera pueda registrarse)
3. Click en **"CREATE"**

### Información de la app:
- **App name:** `agutidesigns`
- **User support email:** `info@agutidesigns.es`
- **App logo:** (opcional, sube tu logo)
- **Application home page:** `https://agutidesigns.es`
- **Application privacy policy link:** `https://agutidesigns.es/privacidad`
- **Application terms of service link:** `https://agutidesigns.es/terminos`
- **Authorized domains:** 
  - `agutidesigns.es`
  - `vercel.app`
- **Developer contact information:** `info@agutidesigns.es`

4. Click en **"SAVE AND CONTINUE"**

### Scopes (Permisos):
5. Click en **"ADD OR REMOVE SCOPES"**
6. Selecciona estos scopes:
   - ✅ `.../auth/userinfo.email`
   - ✅ `.../auth/userinfo.profile`
   - ✅ `openid`
7. Click en **"UPDATE"**
8. Click en **"SAVE AND CONTINUE"**

### Test users (opcional):
9. Si quieres, añade usuarios de prueba
10. Click en **"SAVE AND CONTINUE"**

### Resumen:
11. Revisa todo
12. Click en **"BACK TO DASHBOARD"**

---

## 🔐 PASO 4: Crear credenciales OAuth

1. Ve a: **APIs & Services** → **Credentials**
2. Click en **"+ CREATE CREDENTIALS"**
3. Selecciona: **OAuth client ID**

### Configurar OAuth client:
4. **Application type:** Web application
5. **Name:** `agutidesigns-web`
6. **Authorized JavaScript origins:** Añade estas URIs:
   ```
   https://agutidesigns.vercel.app
   https://agutidesigns.es
   http://localhost:3000
   ```
7. **Authorized redirect URIs:** Añade estas URIs:
   ```
   https://agutidesigns.vercel.app/
   https://agutidesigns.es/
   http://localhost:3000/
   ```
8. Click en **"CREATE"**

### Guardar credenciales:
9. Se mostrará un popup con:
   - **Client ID:** `123456789-abcdefg.apps.googleusercontent.com`
   - **Client secret:** `GOCSPX-xxxxxxxxxxxxx`
10. **⚠️ COPIA AMBOS** (los necesitarás después)
11. Click en **"OK"**

---

## 🚂 PASO 5: Configurar Railway

1. Ve a tu proyecto en Railway
2. Click en tu servicio `backend`
3. Ve a **Variables**
4. Añade estas variables:

```bash
GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

5. Click en **"Add"** para cada una
6. Railway redeployará automáticamente

---

## 💾 PASO 6: Ejecutar migración de base de datos

### Opción A: Desde Railway (Recomendado)

1. Ve a Railway → PostgreSQL service
2. Click en **"Data"**
3. Click en **"Query"**
4. Copia y pega el contenido de `MIGRACION-GOOGLE-AUTH.sql`
5. Click en **"Run"**

### Opción B: Desde psql local

```bash
# Conectar a la base de datos de Railway
psql postgresql://usuario:password@host:port/database

# Pegar el contenido de MIGRACION-GOOGLE-AUTH.sql
```

---

## 📝 PASO 7: Añadir endpoints al backend

Abre `backend/server.js` y añade estos endpoints después de los otros de autenticación:

```javascript
// Importar el módulo de Google Auth al inicio del archivo
const googleAuth = require('./google-auth');

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
```

---

## 🌐 PASO 8: Añadir Google Sign-In al formulario

Ya está implementado en tu código, solo asegúrate de que el `GOOGLE_CLIENT_ID` esté en el HTML.

En `formulario-membresia.html`, busca esta línea y reemplázala con tu Client ID:

```javascript
// Reemplaza esto:
const GOOGLE_CLIENT_ID = 'TU_GOOGLE_CLIENT_ID';

// Con tu Client ID real:
const GOOGLE_CLIENT_ID = '123456789-abcdefg.apps.googleusercontent.com';
```

---

## 🏠 PASO 9: Añadir Google Sign-In al dashboard

En `client-dashboard/index.html`, busca esta línea y reemplázala con tu Client ID:

```javascript
// Reemplaza esto:
const GOOGLE_CLIENT_ID = 'TU_GOOGLE_CLIENT_ID';

// Con tu Client ID real:
const GOOGLE_CLIENT_ID = '123456789-abcdefg.apps.googleusercontent.com';
```

---

## ✅ PASO 10: Probar que funciona

### En el formulario:
1. Ve a: https://agutidesigns.vercel.app/formulario-membresia.html
2. Click en el botón **"Continuar con Google"**
3. Selecciona tu cuenta de Google
4. Autoriza la app
5. Deberías ser redirigido al formulario con tus datos pre-llenados

### En el dashboard:
1. Ve a: https://agutidesigns.vercel.app/
2. Click en el botón **"Continuar con Google"**
3. Selecciona tu cuenta de Google
4. Deberías acceder directamente al dashboard

### Verificar en logs de Railway:
```
🔐 [GOOGLE AUTH] Verificando token de Google...
✅ [GOOGLE AUTH] Token verificado: usuario@gmail.com
✅ [GOOGLE AUTH] Usuario autenticado: usuario@gmail.com
```

---

## 🔍 SOLUCIÓN DE PROBLEMAS

### Error: "Invalid client ID"
**Solución:** Verifica que el `GOOGLE_CLIENT_ID` en Railway coincida con el de Google Cloud Console.

### Error: "redirect_uri_mismatch"
**Solución:** Añade tu URL exacta en "Authorized redirect URIs" en Google Cloud Console.

### Error: "Access blocked: This app's request is invalid"
**Solución:** Completa la pantalla de consentimiento OAuth correctamente.

### El botón de Google no aparece
**Solución:** Verifica que la librería de Google esté cargada:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

---

## 📊 FLUJO COMPLETO

```
1. Usuario click "Continuar con Google"
   ↓
2. Popup de Google OAuth
   ↓
3. Usuario autoriza la app
   ↓
4. Google retorna credential (JWT token)
   ↓
5. Frontend envía token a backend
   ↓
6. Backend verifica token con Google
   ↓
7. Backend busca/crea usuario en DB
   ↓
8. Backend retorna datos del usuario
   ↓
9. Frontend guarda sesión
   ↓
10. Usuario accede al dashboard/formulario
```

---

## 🎉 CHECKLIST FINAL

- [ ] Proyecto creado en Google Cloud Console
- [ ] Google Sign-In API activada
- [ ] Pantalla de consentimiento configurada
- [ ] OAuth credentials creadas
- [ ] Client ID y Secret copiados
- [ ] Variables añadidas en Railway
- [ ] Migración de base de datos ejecutada
- [ ] Endpoints añadidos en server.js
- [ ] Client ID actualizado en formulario
- [ ] Client ID actualizado en dashboard
- [ ] Prueba de login exitosa

---

🎉 **¡Sistema de autenticación con Google listo!**

