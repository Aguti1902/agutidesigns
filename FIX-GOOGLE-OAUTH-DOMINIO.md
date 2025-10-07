# 🔧 FIX: Autorizar dominio en Google OAuth

## ❌ PROBLEMA ACTUAL:

Google muestra el error:
```
"La integración con Google estará disponible próximamente.
Por ahora, completa el registro manualmente."
```

**Causa:** El dominio `agutidesigns.vercel.app` no está autorizado en Google Cloud Console.

---

## ✅ SOLUCIÓN (5 minutos):

### **PASO 1: Ir a Google Cloud Console**

1. Abre: https://console.cloud.google.com/apis/credentials
2. **Inicia sesión** con tu cuenta de Google
3. Asegúrate de estar en el proyecto correcto (el que tiene tu Client ID)

---

### **PASO 2: Editar las credenciales de OAuth**

1. En la lista de "OAuth 2.0 Client IDs", busca tu Client ID:
   ```
   27242010279-amuh9oqm83sdi24hq65ptdqaotpkk094.apps.googleusercontent.com
   ```

2. **Haz click en el nombre** o en el icono del lápiz ✏️ (Editar)

---

### **PASO 3: Añadir los orígenes autorizados**

Busca la sección **"Authorized JavaScript origins"** (Orígenes de JavaScript autorizados)

**Añade estas 3 URLs:**

```
https://agutidesigns.vercel.app
http://localhost:3000
https://www.agutidesigns.vercel.app
```

**⚠️ IMPORTANTE:**
- ✅ Incluye `https://` (con la "s")
- ❌ NO pongas `/` al final
- ✅ Añade cada URL y presiona Enter

Debería verse así:
```
┌─────────────────────────────────────────────┐
│ Authorized JavaScript origins               │
├─────────────────────────────────────────────┤
│ https://agutidesigns.vercel.app             │
│ http://localhost:3000                       │
│ https://www.agutidesigns.vercel.app         │
└─────────────────────────────────────────────┘
```

---

### **PASO 4: Configurar URIs de redirección (Opcional pero recomendado)**

Busca la sección **"Authorized redirect URIs"** (URIs de redireccionamiento autorizados)

**Añade estas URLs:**

```
https://agutidesigns.vercel.app/client-dashboard/
https://agutidesigns.vercel.app
http://localhost:3000
```

---

### **PASO 5: Guardar los cambios**

1. Haz scroll hasta abajo
2. Click en el botón azul **"SAVE"** o **"GUARDAR"**
3. Espera la confirmación (puede tardar unos segundos)

---

### **PASO 6: Verificar la pantalla de consentimiento**

1. En el menú lateral, click en **"OAuth consent screen"**
2. Verifica que esté en modo **"External"** (Externo)
3. Si está en modo **"Testing"**, añade tu email a la lista de **"Test users"**

**Cómo añadir Test Users:**
1. Click en **"ADD USERS"**
2. Añade tu email (el que usarás para probar)
3. Click en **"SAVE"**

---

### **PASO 7: Probar nuevamente**

1. Ve a tu dashboard: https://agutidesigns.vercel.app/client-dashboard/
2. Haz un **Hard Refresh** (Ctrl+Shift+R o Cmd+Shift+R)
3. Click en el botón **"Continuar con Google"**
4. Ahora debería funcionar ✅

---

## 🔍 VERIFICACIÓN:

Si la configuración es correcta, deberías ver:

**✅ ANTES del error:**
- Pantalla de selección de cuenta de Google
- Lista de permisos que solicita la app
- Botón "Continuar" o "Permitir"

**❌ SI SIGUE FALLANDO:**
- Revisa que los dominios estén escritos correctamente
- Verifica que no haya espacios extras
- Confirma que el proyecto de Google Cloud sea el correcto
- Asegúrate de haber guardado los cambios

---

## 📸 CAPTURAS DE REFERENCIA:

### Dónde encontrar "Authorized JavaScript origins":

```
Google Cloud Console
└── APIs & Services
    └── Credentials
        └── OAuth 2.0 Client IDs
            └── [Tu Client ID]
                └── ✏️ Edit
                    └── Authorized JavaScript origins
                        └── [Aquí añades los dominios]
```

---

## ⚠️ ERRORES COMUNES:

### Error 1: "Origin mismatch"
**Causa:** El dominio tiene un typo o falta `https://`
**Solución:** Revisa que sea exactamente `https://agutidesigns.vercel.app`

### Error 2: "This app is blocked"
**Causa:** La app está en modo "Testing" y tu email no está en Test Users
**Solución:** Ve a "OAuth consent screen" → "Test users" → Añade tu email

### Error 3: "The developer hasn't given you access to this app"
**Causa:** Tu email no está en la lista de Test Users
**Solución:** Añade tu email en la pantalla de consentimiento

---

## 🎯 CHECKLIST FINAL:

- [ ] Client ID correcto en el código (ya está ✅)
- [ ] Variables en Railway configuradas (ya está ✅)
- [ ] Dominio `agutidesigns.vercel.app` añadido a "Authorized JavaScript origins"
- [ ] (Opcional) URIs de redirección configurados
- [ ] Email añadido a "Test users" si la app está en Testing
- [ ] Cambios guardados en Google Cloud Console
- [ ] Hard refresh en el navegador

---

## 📞 SI SIGUE SIN FUNCIONAR:

Envíame una captura de pantalla de:
1. La sección "Authorized JavaScript origins" en Google Cloud Console
2. La consola del navegador (F12) cuando haces click en el botón
3. El error completo que aparece

---

**Tiempo estimado:** 5 minutos
**Dificultad:** Fácil
**Impacto:** Alto - Desbloquea Google OAuth completamente

