# ✅ CHECKLIST DE IMPLEMENTACIÓN

## 🎯 OBJETIVO: Configurar subdominios en 25 minutos

---

## 📋 ANTES DE EMPEZAR

- [ ] Tienes acceso a WordPress (agutidesigns.es)
- [ ] Tienes acceso a Vercel
- [ ] Tienes acceso a IONOS
- [ ] Tienes acceso a Railway
- [ ] El código está pusheado en GitHub ✅ (YA HECHO)

---

## 1️⃣ WORDPRESS (2 minutos)

### Acción: Cambiar enlace del botón CTA

- [ ] Acceder a WordPress: https://agutidesigns.es/wp-admin
- [ ] Ir a: Páginas → Tu landing page
- [ ] Editar la página
- [ ] Buscar el botón CTA principal
- [ ] Cambiar enlace a: `https://formulario.agutidesigns.es`
- [ ] Guardar cambios
- [ ] Publicar

**✅ Verificar:** El botón ahora apunta a `formulario.agutidesigns.es`

---

## 2️⃣ VERCEL - FORMULARIO (5 minutos)

### Acción: Añadir subdominio al proyecto actual

- [ ] Ir a: https://vercel.com
- [ ] Seleccionar tu proyecto actual (donde está el formulario)
- [ ] Click en: **Settings** → **Domains**
- [ ] Click en: **Add Domain**
- [ ] Escribir: `formulario.agutidesigns.es`
- [ ] Click en: **Add**
- [ ] **Copiar información DNS** que te muestra Vercel (algo como):
  ```
  Type: CNAME
  Name: formulario
  Value: cname.vercel-dns.com
  ```

**✅ Verificar:** Vercel muestra el dominio (puede estar en "Pending" por ahora)

---

## 3️⃣ VERCEL - PANEL CLIENTE (8 minutos)

### Acción: Crear nuevo proyecto para dashboard cliente

#### A. Crear proyecto

- [ ] Ir a: https://vercel.com/new
- [ ] Click en: **Import Git Repository**
- [ ] Seleccionar repositorio: `agutidesigns` (o el nombre de tu repo)
- [ ] **IMPORTANTE:** Click en **Edit** al lado de "Root Directory"
- [ ] Escribir en Root Directory: `client-dashboard`
- [ ] Framework Preset: **Other**
- [ ] Build Command: **(dejar vacío)**
- [ ] Output Directory: **(dejar vacío)**
- [ ] Click en: **Deploy**

#### B. Esperar deployment

- [ ] Esperar que termine (1-2 minutos)
- [ ] Verás mensaje: "Congratulations!"

#### C. Añadir subdominio

- [ ] En el proyecto → **Settings** → **Domains**
- [ ] Click en: **Add Domain**
- [ ] Escribir: `panel.agutidesigns.es`
- [ ] Click en: **Add**
- [ ] **Copiar información DNS** que te muestra

#### D. Añadir variables de entorno

- [ ] En el proyecto → **Settings** → **Environment Variables**
- [ ] Click en: **Add New**
- [ ] Key: `API_URL`
- [ ] Value: `https://agutidesigns-production.up.railway.app`
- [ ] Click en: **Save**
- [ ] Ir a: **Deployments** → Click en el último deployment
- [ ] Click en los 3 puntos (•••) → **Redeploy**

**✅ Verificar:** Proyecto creado, dominio añadido, variables configuradas

---

## 4️⃣ VERCEL - ADMIN DASHBOARD (8 minutos)

### Acción: Crear nuevo proyecto para dashboard admin

#### A. Crear proyecto

- [ ] Ir a: https://vercel.com/new
- [ ] Click en: **Import Git Repository**
- [ ] Seleccionar repositorio: `agutidesigns`
- [ ] **IMPORTANTE:** Click en **Edit** al lado de "Root Directory"
- [ ] Escribir en Root Directory: `admin-dashboard`
- [ ] Framework Preset: **Other**
- [ ] Build Command: **(dejar vacío)**
- [ ] Output Directory: **(dejar vacío)**
- [ ] Click en: **Deploy**

#### B. Esperar deployment

- [ ] Esperar que termine (1-2 minutos)

#### C. Añadir subdominio

- [ ] En el proyecto → **Settings** → **Domains**
- [ ] Click en: **Add Domain**
- [ ] Escribir: `admin.agutidesigns.es`
- [ ] Click en: **Add**
- [ ] **Copiar información DNS** que te muestra

#### D. Añadir variables de entorno

- [ ] En el proyecto → **Settings** → **Environment Variables**
- [ ] Click en: **Add New**
- [ ] Key: `API_URL`
- [ ] Value: `https://agutidesigns-production.up.railway.app`
- [ ] Click en: **Save**
- [ ] Redeploy el proyecto (Deployments → •••  → Redeploy)

**✅ Verificar:** Proyecto creado, dominio añadido, variables configuradas

---

## 5️⃣ IONOS - DNS (3 minutos)

### Acción: Añadir 3 registros CNAME

- [ ] Ir a: https://www.ionos.es
- [ ] Iniciar sesión
- [ ] Ir a: **Dominios y SSL**
- [ ] Seleccionar: `agutidesigns.es`
- [ ] Click en: **DNS** o **Configuración DNS**

### ⚠️ IMPORTANTE: NO TOQUES REGISTROS EXISTENTES (A, MX, TXT)

#### Añadir Registro 1:

- [ ] Click en: **Añadir registro** o **Add Record**
- [ ] Tipo: **CNAME**
- [ ] Nombre/Host: `formulario`
- [ ] Destino/Target/Value: `cname.vercel-dns.com`
- [ ] TTL: `3600` (o dejar automático)
- [ ] Guardar

#### Añadir Registro 2:

- [ ] Click en: **Añadir registro**
- [ ] Tipo: **CNAME**
- [ ] Nombre: `panel`
- [ ] Destino: `cname.vercel-dns.com`
- [ ] TTL: `3600`
- [ ] Guardar

#### Añadir Registro 3:

- [ ] Click en: **Añadir registro**
- [ ] Tipo: **CNAME**
- [ ] Nombre: `admin`
- [ ] Destino: `cname.vercel-dns.com`
- [ ] TTL: `3600`
- [ ] Guardar

**✅ Verificar:** 3 nuevos registros CNAME creados

---

## 6️⃣ RAILWAY - VARIABLES (2 minutos)

### Acción: Actualizar variables de entorno

- [ ] Ir a: https://railway.app
- [ ] Seleccionar tu proyecto (backend)
- [ ] Click en: **Variables**

### Añadir/Actualizar estas 4 variables:

#### Variable 1:

- [ ] Buscar: `FRONTEND_URL` (o crear nueva)
- [ ] Valor: `https://formulario.agutidesigns.es`
- [ ] Guardar

#### Variable 2:

- [ ] Buscar: `CLIENT_DASHBOARD_URL` (o crear nueva)
- [ ] Valor: `https://panel.agutidesigns.es`
- [ ] Guardar

#### Variable 3:

- [ ] Buscar: `ADMIN_DASHBOARD_URL` (o crear nueva)
- [ ] Valor: `https://admin.agutidesigns.es`
- [ ] Guardar

#### Variable 4:

- [ ] Buscar: `ALLOWED_ORIGINS`
- [ ] Actualizar/Crear con: `https://agutidesigns.es,https://formulario.agutidesigns.es,https://panel.agutidesigns.es,https://admin.agutidesigns.es`
- [ ] Guardar

**✅ Verificar:** 4 variables configuradas, Railway se redespliega automáticamente

---

## ⏱️ ESPERAR PROPAGACIÓN DNS (15-30 minutos)

- [ ] Esperar 15-30 minutos para que DNS propague
- [ ] Mientras esperas, puedes verificar en: https://dnschecker.org
- [ ] Escribe: `formulario.agutidesigns.es` y verifica que apunte a Vercel

**Tip:** Aprovecha para tomar un café ☕

---

## ✅ VERIFICACIÓN FINAL

### Después de la propagación DNS:

#### Verificar subdominios:

- [ ] Abrir: `https://formulario.agutidesigns.es` → Debe mostrar el formulario
- [ ] Abrir: `https://panel.agutidesigns.es` → Debe mostrar login de cliente
- [ ] Abrir: `https://admin.agutidesigns.es` → Debe mostrar login de admin

#### Verificar SSL:

En Vercel, cada dominio debe tener:
- [ ] `formulario.agutidesigns.es` → SSL: ✅ Valid
- [ ] `panel.agutidesigns.es` → SSL: ✅ Valid
- [ ] `admin.agutidesigns.es` → SSL: ✅ Valid

Si dice "Pending", espera 10-15 minutos más.

---

## 🧪 PROBAR FLUJO COMPLETO

### Test end-to-end:

1. [ ] Ir a: `https://agutidesigns.es`
2. [ ] Click en botón CTA
3. [ ] Verificar redirección a: `https://formulario.agutidesigns.es`
4. [ ] Rellenar formulario con datos de prueba
5. [ ] Click en "Ir al pago"
6. [ ] Verificar redirección a: `https://formulario.agutidesigns.es/checkout`
7. [ ] Usar tarjeta de prueba Stripe:
   - Número: `4242 4242 4242 4242`
   - Fecha: `12/34`
   - CVC: `123`
8. [ ] Completar pago
9. [ ] Verificar redirección a: `https://formulario.agutidesigns.es/success`
10. [ ] Click en "Acceder a Mi Dashboard"
11. [ ] Verificar redirección a: `https://panel.agutidesigns.es`
12. [ ] Iniciar sesión con el email del formulario
13. [ ] Verificar que dashboard cargue correctamente
14. [ ] Verificar que muestre datos del formulario

### Verificar admin:

15. [ ] Ir a: `https://admin.agutidesigns.es`
16. [ ] Iniciar sesión con cuenta admin
17. [ ] Verificar nuevo cliente en "Clientes"
18. [ ] Verificar nuevo proyecto en Kanban
19. [ ] Verificar estadísticas actualizadas

---

## 🎉 ¡COMPLETADO!

Si todos los checkboxes están marcados:

✅ WordPress funcionando en `agutidesigns.es`
✅ Formulario funcionando en `formulario.agutidesigns.es`
✅ Dashboard cliente funcionando en `panel.agutidesigns.es`
✅ Dashboard admin funcionando en `admin.agutidesigns.es`
✅ Flujo completo probado y funcionando
✅ Todos los dominios con SSL válido

---

## 🆘 TROUBLESHOOTING RÁPIDO

### Si algo falla:

| Error | Causa | Solución |
|-------|-------|----------|
| DNS_PROBE_FINISHED_NXDOMAIN | DNS no propagado | Espera 15-30 min más |
| ERR_SSL | SSL generándose | Espera 10-15 min |
| 404 Not Found | Root Directory incorrecto | Verifica en Vercel Settings |
| CORS error | ALLOWED_ORIGINS mal | Verifica Railway variables |
| Formulario no envía | API_URL falta | Añade en Vercel variables |

---

## 📞 SIGUIENTE PASO

Si TODO funciona → **¡Celebra! 🎉** Tu sistema está completo.

Si algo falla → Consulta: `GUIA-RAPIDA-SUBDOMINIO.md` (sección Troubleshooting)

---

**Tiempo total estimado: 25 min + 15-30 min de propagación DNS**

**¡Éxito!** 🚀

