const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixCorruptedData() {
    console.log('🔧 Iniciando corrección de datos corruptos...\n');
    
    try {
        // 1. Obtener todas las submissions
        const result = await pool.query('SELECT id, contact_methods, purpose, pages, custom_pages FROM submissions');
        const submissions = result.rows;
        
        console.log(`📊 Total de submissions encontradas: ${submissions.length}\n`);
        
        let fixedCount = 0;
        
        for (const submission of submissions) {
            const updates = [];
            const values = [];
            let paramCount = 1;
            let needsUpdate = false;
            
            // Verificar y arreglar contact_methods
            if (submission.contact_methods && typeof submission.contact_methods === 'string') {
                try {
                    JSON.parse(submission.contact_methods);
                    console.log(`✅ [${submission.id}] contact_methods ya es JSON válido`);
                } catch (e) {
                    // Es un string corrupto, convertir a array
                    const fixedValue = JSON.stringify([submission.contact_methods]);
                    updates.push(`contact_methods = $${paramCount++}`);
                    values.push(fixedValue);
                    needsUpdate = true;
                    console.log(`🔧 [${submission.id}] contact_methods: "${submission.contact_methods}" → ${fixedValue}`);
                }
            }
            
            // Verificar y arreglar purpose
            if (submission.purpose && typeof submission.purpose === 'string') {
                try {
                    JSON.parse(submission.purpose);
                    console.log(`✅ [${submission.id}] purpose ya es JSON válido`);
                } catch (e) {
                    // Es un string corrupto, convertir a array
                    const fixedValue = JSON.stringify([submission.purpose]);
                    updates.push(`purpose = $${paramCount++}`);
                    values.push(fixedValue);
                    needsUpdate = true;
                    console.log(`🔧 [${submission.id}] purpose: "${submission.purpose}" → ${fixedValue}`);
                }
            }
            
            // Verificar y arreglar pages
            if (submission.pages && typeof submission.pages === 'string') {
                try {
                    JSON.parse(submission.pages);
                    console.log(`✅ [${submission.id}] pages ya es JSON válido`);
                } catch (e) {
                    // Es un string corrupto, convertir a array
                    const fixedValue = JSON.stringify([submission.pages]);
                    updates.push(`pages = $${paramCount++}`);
                    values.push(fixedValue);
                    needsUpdate = true;
                    console.log(`🔧 [${submission.id}] pages: "${submission.pages}" → ${fixedValue}`);
                }
            }
            
            // Verificar y arreglar custom_pages
            if (submission.custom_pages && typeof submission.custom_pages === 'string') {
                try {
                    JSON.parse(submission.custom_pages);
                    console.log(`✅ [${submission.id}] custom_pages ya es JSON válido`);
                } catch (e) {
                    // Es un string corrupto, convertir a array
                    const fixedValue = JSON.stringify([submission.custom_pages]);
                    updates.push(`custom_pages = $${paramCount++}`);
                    values.push(fixedValue);
                    needsUpdate = true;
                    console.log(`🔧 [${submission.id}] custom_pages: "${submission.custom_pages}" → ${fixedValue}`);
                }
            }
            
            // Si hay updates, ejecutar
            if (needsUpdate) {
                values.push(submission.id);
                const query = `UPDATE submissions SET ${updates.join(', ')} WHERE id = $${paramCount}`;
                
                await pool.query(query, values);
                fixedCount++;
                console.log(`✅ [${submission.id}] Datos corregidos\n`);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log(`🎉 Corrección completada!`);
        console.log(`📊 Total de submissions: ${submissions.length}`);
        console.log(`🔧 Submissions corregidas: ${fixedCount}`);
        console.log(`✅ Submissions ya correctas: ${submissions.length - fixedCount}`);
        console.log('='.repeat(50) + '\n');
        
    } catch (error) {
        console.error('❌ Error corrigiendo datos:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar
fixCorruptedData();

