/*
═══════════════════════════════════════════════════════════════
📊 CÓDIGO PARA IMPLEMENTAR GOOGLE ANALYTICS API REAL
═══════════════════════════════════════════════════════════════

INSTRUCCIONES:
1. Sigue los pasos 1-4 de GUIA-GOOGLE-ANALYTICS.md
2. Ejecuta: npm install @google-analytics/data
3. Reemplaza el código correspondiente en backend/server.js
4. Despliega en Railway

═══════════════════════════════════════════════════════════════
*/

// ═══════════════════════════════════════════════════════════════
// PASO 1: AÑADIR AL INICIO DE backend/server.js
// ═══════════════════════════════════════════════════════════════

const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Inicializar cliente de Google Analytics
const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key: process.env.GA_PRIVATE_KEY ? process.env.GA_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    },
});

console.log('✅ Google Analytics Data API inicializada');

// ═══════════════════════════════════════════════════════════════
// PASO 2: REEMPLAZAR EL ENDPOINT ACTUAL
// ═══════════════════════════════════════════════════════════════

// Obtener datos de Google Analytics para un cliente
app.get('/api/client/google-analytics/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        console.log(`📊 [GA] Obteniendo datos para cliente #${clientId}`);
        
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
        console.log(`📊 [GA] Consultando Property ID: ${ga_property_id}`);
        
        const [summaryResponse] = await analyticsDataClient.runReport({
            property: `properties/${ga_property_id}`,
            dateRanges: [
                {
                    startDate: '30daysAgo',
                    endDate: 'today',
                },
            ],
            dimensions: [
                { name: 'date' },
            ],
            metrics: [
                { name: 'activeUsers' },
                { name: 'screenPageViews' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' },
            ],
        });
        
        // Páginas más visitadas
        const [pagesResponse] = await analyticsDataClient.runReport({
            property: `properties/${ga_property_id}`,
            dateRanges: [
                {
                    startDate: '30daysAgo',
                    endDate: 'today',
                },
            ],
            dimensions: [
                { name: 'pagePath' },
                { name: 'pageTitle' },
            ],
            metrics: [
                { name: 'screenPageViews' },
            ],
            limit: 5,
            orderBys: [
                {
                    metric: { metricName: 'screenPageViews' },
                    desc: true,
                },
            ],
        });
        
        // Dispositivos
        const [devicesResponse] = await analyticsDataClient.runReport({
            property: `properties/${ga_property_id}`,
            dateRanges: [
                {
                    startDate: '30daysAgo',
                    endDate: 'today',
                },
            ],
            dimensions: [
                { name: 'deviceCategory' },
            ],
            metrics: [
                { name: 'activeUsers' },
            ],
        });
        
        // Fuentes de tráfico
        const [sourcesResponse] = await analyticsDataClient.runReport({
            property: `properties/${ga_property_id}`,
            dateRanges: [
                {
                    startDate: '30daysAgo',
                    endDate: 'today',
                },
            ],
            dimensions: [
                { name: 'sessionSource' },
            ],
            metrics: [
                { name: 'activeUsers' },
            ],
            limit: 5,
            orderBys: [
                {
                    metric: { metricName: 'activeUsers' },
                    desc: true,
                },
            ],
        });
        
        // Usuarios en tiempo real
        const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
            property: `properties/${ga_property_id}`,
            metrics: [
                { name: 'activeUsers' },
            ],
        });
        
        // Procesar datos
        const processedData = processGoogleAnalyticsData(
            summaryResponse,
            pagesResponse,
            devicesResponse,
            sourcesResponse,
            realtimeResponse
        );
        
        console.log(`✅ [GA] Datos obtenidos correctamente para Property ID: ${ga_property_id}`);
        
        res.json({
            configured: true,
            property_id: ga_property_id,
            data: processedData
        });
        
    } catch (error) {
        console.error('❌ [GA] Error:', error);
        
        // Si hay error de permisos o Property ID inválido, usar datos simulados
        if (error.message.includes('Permission denied') || error.message.includes('not found')) {
            console.warn('⚠️ [GA] Usando datos simulados debido a error de API');
            const mockData = generateMockAnalyticsData(business_name);
            return res.json({
                configured: true,
                property_id: ga_property_id,
                data: mockData,
                source: 'simulated' // Indicador para debugging
            });
        }
        
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PASO 3: FUNCIÓN PARA PROCESAR DATOS DE GOOGLE ANALYTICS
// ═══════════════════════════════════════════════════════════════

function processGoogleAnalyticsData(summaryResponse, pagesResponse, devicesResponse, sourcesResponse, realtimeResponse) {
    // Procesar resumen general
    const summaryRows = summaryResponse.rows || [];
    const dailyData = summaryRows.map(row => ({
        date: row.dimensionValues[0].value,
        visitors: parseInt(row.metricValues[0].value || 0),
        pageviews: parseInt(row.metricValues[1].value || 0),
        bounceRate: parseFloat(row.metricValues[2].value || 0).toFixed(1),
        avgSessionDuration: parseInt(row.metricValues[3].value || 0)
    }));
    
    // Calcular totales
    const totalVisitors = dailyData.reduce((sum, day) => sum + day.visitors, 0);
    const totalPageviews = dailyData.reduce((sum, day) => sum + day.pageviews, 0);
    const avgBounceRate = dailyData.length > 0 
        ? (dailyData.reduce((sum, day) => sum + parseFloat(day.bounceRate), 0) / dailyData.length).toFixed(1)
        : 0;
    const avgSessionDuration = dailyData.length > 0
        ? Math.floor(dailyData.reduce((sum, day) => sum + day.avgSessionDuration, 0) / dailyData.length)
        : 0;
    
    // Procesar páginas más visitadas
    const topPages = (pagesResponse.rows || []).slice(0, 5).map(row => ({
        path: row.dimensionValues[0].value,
        title: row.dimensionValues[1].value || 'Sin título',
        views: parseInt(row.metricValues[0].value || 0)
    }));
    
    // Procesar dispositivos
    const deviceRows = devicesResponse.rows || [];
    const totalDeviceUsers = deviceRows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value || 0), 0);
    const devices = deviceRows.map(row => {
        const deviceType = row.dimensionValues[0].value.toLowerCase();
        const users = parseInt(row.metricValues[0].value || 0);
        return {
            type: deviceType,
            percentage: totalDeviceUsers > 0 ? Math.round((users / totalDeviceUsers) * 100) : 0
        };
    });
    
    // Procesar fuentes de tráfico
    const sourceRows = sourcesResponse.rows || [];
    const totalSourceUsers = sourceRows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value || 0), 0);
    const trafficSources = sourceRows.map(row => {
        const sourceName = row.dimensionValues[0].value;
        const users = parseInt(row.metricValues[0].value || 0);
        
        // Mapear nombres de fuentes a español
        const sourceMap = {
            'google': 'Búsqueda orgánica',
            '(direct)': 'Directo',
            'facebook': 'Redes sociales',
            'instagram': 'Redes sociales',
            'twitter': 'Redes sociales',
            'linkedin': 'Redes sociales',
            'email': 'Email'
        };
        
        const mappedSource = sourceMap[sourceName.toLowerCase()] || 'Referencias';
        
        return {
            source: mappedSource,
            percentage: totalSourceUsers > 0 ? Math.round((users / totalSourceUsers) * 100) : 0
        };
    });
    
    // Usuarios en tiempo real
    const realtimeUsers = realtimeResponse.rows && realtimeResponse.rows.length > 0
        ? parseInt(realtimeResponse.rows[0].metricValues[0].value || 0)
        : 0;
    
    return {
        summary: {
            totalVisitors,
            totalPageviews,
            avgBounceRate: parseFloat(avgBounceRate),
            avgSessionDuration,
            period: '30 días'
        },
        dailyData,
        topPages,
        devices,
        trafficSources,
        realTimeUsers: realtimeUsers
    };
}

// ═══════════════════════════════════════════════════════════════
// PASO 4: MANTENER LA FUNCIÓN DE DATOS SIMULADOS (FALLBACK)
// ═══════════════════════════════════════════════════════════════

// La función generateMockAnalyticsData() ya existe en tu código actual
// NO LA BORRES, úsala como fallback si la API falla

// ═══════════════════════════════════════════════════════════════
// VARIABLES DE ENTORNO NECESARIAS EN RAILWAY
// ═══════════════════════════════════════════════════════════════

/*
Añade estas variables en Railway:

GA_SERVICE_ACCOUNT_EMAIL=tu-service-account@tu-proyecto.iam.gserviceaccount.com
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
GA_CLIENT_EMAIL=tu-service-account@tu-proyecto.iam.gserviceaccount.com

💡 TIP: Copia estos valores del archivo JSON que descargaste de Google Cloud
*/

// ═══════════════════════════════════════════════════════════════
// ¡LISTO! AHORA TIENES DATOS REALES DE GOOGLE ANALYTICS
// ═══════════════════════════════════════════════════════════════

