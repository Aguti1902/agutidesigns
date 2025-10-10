// Script que ejecuta la migración llamando al endpoint
const https = require('https');

console.log('🔧 Ejecutando migración automática...\n');

const options = {
    hostname: 'agutidesigns-production.up.railway.app',
    path: '/api/admin/migrate-display-order',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const result = JSON.parse(data);
                console.log('✅ ¡Migración exitosa!');
                console.log(`📹 Videos actualizados: ${result.videosUpdated}`);
                console.log(`📝 ${result.message}\n`);
                console.log('Videos con orden asignado:');
                result.videos.forEach(v => {
                    console.log(`  ${v.display_order}. ${v.title} (ID: ${v.id})`);
                });
                console.log('\n🎉 Ahora puedes editar videos sin errores!\n');
                process.exit(0);
            } catch (e) {
                console.error('Error parseando respuesta:', data);
                process.exit(1);
            }
        } else {
            console.error(`❌ Error HTTP ${res.statusCode}`);
            console.error('Respuesta:', data);
            console.error('\n⚠️  El endpoint aún no está disponible.');
            console.error('Railway puede tardar 1-2 minutos en desplegar.');
            console.error('Ejecuta este script nuevamente en un momento.\n');
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
});

req.end();

