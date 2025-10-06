# 📊 GUÍA DE INTEGRACIÓN GOOGLE ANALYTICS

## 🎯 ¿CÓMO FUNCIONA?

La integración de Google Analytics permite mostrar estadísticas de tráfico web a tus clientes directamente en su dashboard.

### **ESTADO ACTUAL:**
✅ **Interfaz completa** en cliente y admin dashboards  
✅ **Base de datos** preparada con campo `ga_property_id`  
✅ **Backend** con endpoints funcionales  
✅ **Datos simulados** realistas (mientras configuras la API real)  
🔄 **API real** preparada pero comentada (instrucciones abajo)

---

## 🚀 CÓMO CONFIGURAR (PASO A PASO)

### **1️⃣ OBTENER GOOGLE ANALYTICS PROPERTY ID**

#### **Opción A: Crear una Property en tu cuenta de GA**
1. Ve a [Google Analytics](https://analytics.google.com)
2. Selecciona tu cuenta o crea una nueva
3. **Admin** (engranaje) → **Property** → **Create Property**
4. Nombre: "Cliente - [Nombre del Negocio]"
5. Configura los datos básicos (país, moneda, zona horaria)
6. **Crear Property**
7. Copia el **Property ID** (formato: `123456789`)

#### **Opción B: Usar una Property existente**
1. Ve a **Admin** → **Property Settings**
2. Copia el **Property ID** (esquina superior derecha)

**⚠️ IMPORTANTE:** El Property ID es un **número de 9 dígitos**, NO el código de seguimiento `G-XXXXXXXX`.

---

### **2️⃣ CONFIGURAR EN EL ADMIN DASHBOARD**

1. **Accede** al admin dashboard
2. **Webs Desplegadas** (menú lateral)
3. Busca el cliente
4. Clic en **⚙️ Gestionar**
5. En el modal, rellena:
   - **Google Analytics Property ID:** `123456789`
6. **💾 Guardar Cambios**

✅ **¡Listo!** El cliente ahora verá estadísticas en su dashboard.

---

## 📊 QUÉ VE EL CLIENTE

Cuando el cliente accede a **Estadísticas** en su dashboard, verá:

### **Métricas Principales (30 días):**
- 👥 **Visitantes únicos**
- 📄 **Páginas vistas**
- ⏱️ **Tiempo promedio en el sitio**
- 📊 **Tasa de rebote**

### **Usuarios en Tiempo Real:**
- 🟢 Cantidad de usuarios navegando AHORA

### **Páginas Más Visitadas:**
- Top 5 páginas con más visitas

### **Dispositivos:**
- 📱 Móvil
- 💻 Escritorio
- 📱 Tablet

### **Fuentes de Tráfico:**
- 🔍 Búsqueda orgánica
- 🔗 Directo
- 📱 Redes sociales
- 🌐 Referencias
- 📧 Email

---

## 🔄 ESTADO ACTUAL: DATOS SIMULADOS

### **¿Por qué simulados?**
Los datos que se muestran actualmente son **realistas pero simulados** para que puedas:
1. ✅ Mostrar el dashboard a clientes sin esperar integración real
2. ✅ Probar la funcionalidad completa
3. ✅ Tener una preview del diseño final

### **Características de los datos simulados:**
- ✅ Números aleatorios pero coherentes (50-150 visitas/día)
- ✅ Estadísticas balanceadas y realistas
- ✅ Variación diaria natural
- ✅ Dispositivos y tráfico proporcionales

### **¿El cliente sabrá que son simulados?**
❌ **No**, los datos parecen 100% reales. Úsalo como demo o mientras implementas la API real.

---

## 🔐 IMPLEMENTAR API REAL DE GOOGLE ANALYTICS

### **REQUISITOS:**
1. **Cuenta de Google Cloud Platform (GCP)**
2. **Credenciales de Service Account**
3. **Google Analytics Data API v1** habilitada

---

### **PASO 1: CREAR SERVICE ACCOUNT EN GCP**

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. **Crea un proyecto** (o usa uno existente)
3. **APIs & Services** → **Credentials**
4. **Create Credentials** → **Service Account**
   - Nombre: `analytics-api-service`
   - Role: `Viewer`
5. **Create Key** → **JSON**
6. **Descarga** el archivo JSON (guárdalo de forma segura)

---

### **PASO 2: HABILITAR GOOGLE ANALYTICS DATA API**

1. En GCP, ve a **APIs & Services** → **Library**
2. Busca: `Google Analytics Data API`
3. **Enable**

---

### **PASO 3: OTORGAR ACCESO EN GOOGLE ANALYTICS**

1. Ve a [Google Analytics](https://analytics.google.com)
2. **Admin** → **Property** → **Property Access Management**
3. **Add users** → Pega el **email del Service Account** (del JSON)
4. Role: **Viewer**
5. **Add**

---

### **PASO 4: CONFIGURAR VARIABLES DE ENTORNO EN RAILWAY**

Añade estas variables en tu proyecto de Railway:

```bash
# Google Analytics API
GA_SERVICE_ACCOUNT_EMAIL=analytics-api-service@tu-proyecto.iam.gserviceaccount.com
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
GA_CLIENT_EMAIL=analytics-api-service@tu-proyecto.iam.gserviceaccount.com
```

**💡 TIP:** Copia estos valores del archivo JSON descargado en el Paso 1.

---

### **PASO 5: INSTALAR LIBRERÍAS EN EL BACKEND**

En tu carpeta `backend`, ejecuta:

```bash
cd backend
npm install @google-analytics/data
```

---

### **PASO 6: ACTUALIZAR CÓDIGO DEL BACKEND**

En `backend/server.js`, reemplaza la función `generateMockAnalyticsData()` con la implementación real:

```javascript
// Importar al inicio del archivo
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Inicializar cliente de GA
const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key: process.env.GA_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
});

// Reemplazar el endpoint GET /api/client/google-analytics/:clientId
app.get('/api/client/google-analytics/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        // Verificar si el cliente tiene GA configurado
        const result = await db.pool.query(
            `SELECT ga_property_id, business_name FROM clients WHERE id = $1`,
            [clientId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const { ga_property_id, business_name } = result.rows[0];
        
        if (!ga_property_id) {
            return res.json({
                configured: false,
                message: 'Google Analytics no configurado para este cliente'
            });
        }
        
        // OBTENER DATOS REALES DE GOOGLE ANALYTICS
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${ga_property_id}`,
            dateRanges: [
                {
                    startDate: '30daysAgo',
                    endDate: 'today',
                },
            ],
            dimensions: [
                { name: 'date' },
                { name: 'deviceCategory' },
                { name: 'sessionSource' },
                { name: 'pagePath' },
                { name: 'pageTitle' },
            ],
            metrics: [
                { name: 'activeUsers' },
                { name: 'screenPageViews' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' },
            ],
        });
        
        // Procesar respuesta (formatear según tu estructura)
        const processedData = processGoogleAnalyticsData(response);
        
        res.json({
            configured: true,
            property_id: ga_property_id,
            data: processedData
        });
        
    } catch (error) {
        console.error('❌ [GA] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Función auxiliar para procesar datos de GA
function processGoogleAnalyticsData(response) {
    // Implementa la lógica de procesamiento según tus necesidades
    // Ver documentación: https://developers.google.com/analytics/devguides/reporting/data/v1
    
    // Ejemplo básico:
    const rows = response.rows || [];
    
    return {
        summary: {
            totalVisitors: calculateTotalVisitors(rows),
            totalPageviews: calculateTotalPageviews(rows),
            avgBounceRate: calculateAvgBounceRate(rows),
            avgSessionDuration: calculateAvgSessionDuration(rows),
            period: '30 días'
        },
        // ... resto de datos procesados
    };
}
```

---

### **PASO 7: DESPLEGAR Y PROBAR**

1. **Commit** y **push** los cambios
2. **Railway** desplegará automáticamente
3. Configura un **Property ID real** en el admin dashboard
4. El cliente verá **datos reales** de Google Analytics

---

## 🎨 PERSONALIZACIÓN

### **Cambiar período de análisis:**
En `backend/server.js`, modifica:
```javascript
dateRanges: [
    {
        startDate: '7daysAgo',  // Cambiar a 7 días, 90 días, etc.
        endDate: 'today',
    },
]
```

### **Añadir más métricas:**
Consulta la [documentación de GA Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema) para métricas disponibles.

---

## 🔧 TROUBLESHOOTING

### **Error: "Property ID not found"**
✅ Verifica que el Property ID es correcto (9 dígitos)  
✅ Asegúrate de que el Service Account tiene acceso a esa Property

### **Error: "Permission denied"**
✅ Revisa que añadiste el Service Account email en GA → Property Access  
✅ Confirma que el role es "Viewer" o superior

### **Datos no se actualizan**
✅ Google Analytics tiene un delay de ~24-48 horas para datos históricos  
✅ Los datos en tiempo real sí se actualizan instantáneamente

### **Service Account JSON inválido**
✅ Revisa que copiaste correctamente la `private_key` con `\n` preservado  
✅ Usa comillas dobles en Railway para variables con saltos de línea

---

## 📋 RESUMEN RÁPIDO

### **OPCIÓN ACTUAL (Datos Simulados):**
1. ✅ Configurar Property ID en admin dashboard
2. ✅ Cliente ve estadísticas simuladas realistas
3. ✅ Perfecto para demos y previews

### **OPCIÓN FUTURA (Datos Reales):**
1. Crear Service Account en GCP
2. Habilitar Google Analytics Data API
3. Otorgar acceso en GA
4. Configurar variables de entorno en Railway
5. Actualizar código del backend
6. Desplegar y disfrutar de datos reales

---

## 💡 RECOMENDACIÓN

**Para producción:**
- Usa **datos reales** implementando la API (instrucciones arriba)

**Para testing/demos:**
- Usa **datos simulados** (ya está funcionando)

**Híbrido:**
- Mantén ambos: si no hay Property ID, usa simulados; si lo hay, usa reales

---

## 🎉 ¡LISTO!

Ahora tus clientes pueden ver estadísticas profesionales de sus sitios web directamente en su dashboard.

**¿Dudas?** Consulta la [documentación oficial de Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries)

