// Migración automática - Se ejecuta con Railway CLI
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('🔧 Iniciando migración...\n');
        
        // Paso 1: Añadir columna
        console.log('📝 Añadiendo columna display_order...');
        await pool.query(`
            ALTER TABLE videos 
            ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999
        `);
        console.log('✅ Columna añadida\n');
        
        // Paso 2: Asignar valores
        console.log('📝 Asignando valores de orden...');
        const updateResult = await pool.query(`
            UPDATE videos 
            SET display_order = (
                SELECT COUNT(*) + 1 
                FROM videos v2 
                WHERE v2.created_at < videos.created_at
            )
            WHERE display_order IS NULL OR display_order = 999
        `);
        console.log(`✅ ${updateResult.rowCount} videos actualizados\n`);
        
        // Paso 3: Verificar
        console.log('📹 Videos con orden asignado:');
        const videos = await pool.query(`
            SELECT id, title, display_order 
            FROM videos 
            ORDER BY display_order
        `);
        
        videos.rows.forEach(v => {
            console.log(`  ${v.display_order}. ${v.title} (ID: ${v.id})`);
        });
        
        console.log('\n✅ ¡Migración completada exitosamente! 🎉\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

migrate()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n💥 Migración falló:', error);
        process.exit(1);
    });

