// Script simple para añadir columna display_order
// Pega tu DATABASE_URL de Railway cuando se te pida

const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🔧 MIGRACIÓN: Añadir columna display_order a videos\n');
console.log('Ve a Railway > Postgres > Variables > DATABASE_URL');
console.log('Copia el valor completo y pégalo aquí:\n');

rl.question('DATABASE_URL: ', async (databaseUrl) => {
    rl.close();
    
    if (!databaseUrl || databaseUrl.trim() === '') {
        console.error('❌ ERROR: Debes proporcionar la DATABASE_URL');
        process.exit(1);
    }
    
    const pool = new Pool({
        connectionString: databaseUrl.trim(),
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        console.log('\n🔄 Conectando a la base de datos...');
        
        // Añadir columna
        console.log('📝 Añadiendo columna display_order...');
        await pool.query(`
            ALTER TABLE videos 
            ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999
        `);
        console.log('✅ Columna añadida exitosamente');
        
        // Asignar valores
        console.log('📝 Asignando valores de orden...');
        const result = await pool.query(`
            UPDATE videos 
            SET display_order = COALESCE(display_order, 
                (SELECT COUNT(*) + 1 FROM videos v2 WHERE v2.created_at < videos.created_at)
            )
            WHERE display_order IS NULL OR display_order = 999
            RETURNING id, title, display_order
        `);
        console.log(`✅ ${result.rowCount} videos actualizados`);
        
        // Mostrar resultados
        console.log('\n📹 Videos con orden asignado:');
        const videos = await pool.query('SELECT id, title, display_order FROM videos ORDER BY display_order');
        videos.rows.forEach(v => {
            console.log(`  ${v.display_order}. ${v.title} (ID: ${v.id})`);
        });
        
        console.log('\n✅ ¡Migración completada exitosamente!');
        console.log('Ahora puedes editar videos sin errores 🎉\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nDetalles:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
});

