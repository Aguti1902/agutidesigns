// Script para añadir la columna display_order a la tabla videos
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addDisplayOrderColumn() {
    try {
        console.log('🔧 Verificando si la columna display_order existe...');
        
        // Verificar si la columna ya existe
        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='videos' AND column_name='display_order'
        `);
        
        if (checkColumn.rows.length > 0) {
            console.log('✅ La columna display_order ya existe');
            return;
        }
        
        console.log('📝 Añadiendo columna display_order a la tabla videos...');
        
        // Añadir la columna display_order
        await pool.query(`
            ALTER TABLE videos 
            ADD COLUMN display_order INTEGER DEFAULT 999
        `);
        
        console.log('✅ Columna display_order añadida exitosamente');
        
        // Actualizar videos existentes con valores de orden basados en created_at
        console.log('📝 Asignando valores de orden a videos existentes...');
        await pool.query(`
            WITH ordered_videos AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
                FROM videos
            )
            UPDATE videos 
            SET display_order = ordered_videos.row_num
            FROM ordered_videos
            WHERE videos.id = ordered_videos.id
        `);
        
        console.log('✅ Valores de orden asignados exitosamente');
        
        // Verificar resultados
        const result = await pool.query('SELECT id, title, display_order FROM videos ORDER BY display_order');
        console.log('\n📹 Videos actualizados:');
        result.rows.forEach(video => {
            console.log(`  #${video.id} - ${video.title} - Orden: ${video.display_order}`);
        });
        
        console.log('\n✅ Migración completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Ejecutar la migración
addDisplayOrderColumn()
    .then(() => {
        console.log('\n🎉 Proceso completado');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Error fatal:', error);
        process.exit(1);
    });

