const Database = require('better-sqlite3');
const path = require('path');

// Crear/conectar base de datos
const db = new Database(path.join(__dirname, 'agutidesigns.db'));

// Crear tabla de solicitudes si no existe
db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        -- Datos del negocio
        business_name TEXT NOT NULL,
        business_description TEXT,
        industry TEXT,
        cif_nif TEXT,
        razon_social TEXT,
        direccion_fiscal TEXT,
        business_email TEXT,
        
        -- Métodos de contacto
        contact_methods TEXT,
        phone_number TEXT,
        email_contact TEXT,
        whatsapp_number TEXT,
        form_email TEXT,
        physical_address TEXT,
        instagram TEXT,
        facebook TEXT,
        linkedin TEXT,
        twitter TEXT,
        
        -- Servicios
        services TEXT,
        
        -- Objetivos
        purpose TEXT,
        target_audience TEXT,
        
        -- Páginas
        pages TEXT,
        
        -- Diseño
        design_style TEXT,
        brand_colors TEXT,
        reference_websites TEXT,
        
        -- SEO
        keywords TEXT,
        has_analytics TEXT,
        
        -- Dominio
        domain_name TEXT,
        domain_alt1 TEXT,
        domain_alt2 TEXT,
        
        -- Legal
        privacy_policy TEXT,
        
        -- Cuenta del cliente
        full_name TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        
        -- Plan y pago
        plan TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        stripe_session_id TEXT,
        stripe_subscription_id TEXT,
        
        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Crear índices para búsquedas rápidas
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_email ON submissions(email);
    CREATE INDEX IF NOT EXISTS idx_status ON submissions(status);
    CREATE INDEX IF NOT EXISTS idx_plan ON submissions(plan);
    CREATE INDEX IF NOT EXISTS idx_created_at ON submissions(created_at);
`);

// ===== FUNCIONES DE BASE DE DATOS =====

// Crear nueva solicitud
function createSubmission(data) {
    const stmt = db.prepare(`
        INSERT INTO submissions (
            business_name, business_description, industry, cif_nif, razon_social, direccion_fiscal, business_email,
            contact_methods, phone_number, email_contact, whatsapp_number, form_email, physical_address,
            instagram, facebook, linkedin, twitter,
            services, purpose, target_audience, pages,
            design_style, brand_colors, reference_websites,
            keywords, has_analytics,
            domain_name, domain_alt1, domain_alt2,
            privacy_policy,
            full_name, email, phone, address,
            plan, amount, status
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?,
            ?, ?, ?, ?,
            ?, ?, ?
        )
    `);

    const result = stmt.run(
        data.business_name || null,
        data.business_description || null,
        data.industry || null,
        data.cif_nif || null,
        data.razon_social || null,
        data.direccion_fiscal || null,
        data.business_email || null,
        JSON.stringify(data.contact_methods) || null,
        data.phone_number || null,
        data.email_contact || null,
        data.whatsapp_number || null,
        data.form_email || null,
        data.physical_address || null,
        data.instagram || null,
        data.facebook || null,
        data.linkedin || null,
        data.twitter || null,
        data.services || null,
        JSON.stringify(data.purpose) || null,
        data.target_audience || null,
        JSON.stringify(data.pages) || null,
        data.design_style || null,
        data.brand_colors || null,
        data.reference_websites || null,
        data.keywords || null,
        data.has_analytics || null,
        data.domain_name || null,
        data.domain_alt1 || null,
        data.domain_alt2 || null,
        data.privacy_policy || null,
        data.full_name || null,
        data.email,
        data.phone || null,
        data.address || null,
        data.plan,
        data.amount,
        data.status || 'pending'
    );

    return result.lastInsertRowid;
}

// Obtener una solicitud por ID
function getSubmission(id) {
    const stmt = db.prepare('SELECT * FROM submissions WHERE id = ?');
    const submission = stmt.get(id);
    
    if (submission) {
        // Parsear JSON fields
        if (submission.contact_methods) submission.contact_methods = JSON.parse(submission.contact_methods);
        if (submission.purpose) submission.purpose = JSON.parse(submission.purpose);
        if (submission.pages) submission.pages = JSON.parse(submission.pages);
    }
    
    return submission;
}

// Obtener todas las solicitudes
function getAllSubmissions() {
    const stmt = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC');
    const submissions = stmt.all();
    
    return submissions.map(sub => {
        if (sub.contact_methods) sub.contact_methods = JSON.parse(sub.contact_methods);
        if (sub.purpose) sub.purpose = JSON.parse(sub.purpose);
        if (sub.pages) sub.pages = JSON.parse(sub.pages);
        return sub;
    });
}

// Actualizar estado de solicitud
function updateSubmissionStatus(id, status, stripeSessionId = null) {
    const stmt = db.prepare(`
        UPDATE submissions 
        SET status = ?, 
            stripe_session_id = COALESCE(?, stripe_session_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    
    return stmt.run(status, stripeSessionId, id);
}

// Obtener estadísticas
function getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as total FROM submissions');
    const paidStmt = db.prepare('SELECT COUNT(*) as paid FROM submissions WHERE status = "paid"');
    const pendingStmt = db.prepare('SELECT COUNT(*) as pending FROM submissions WHERE status = "pending"');
    const revenueStmt = db.prepare('SELECT SUM(amount) as revenue FROM submissions WHERE status = "paid"');
    const byPlanStmt = db.prepare(`
        SELECT plan, COUNT(*) as count 
        FROM submissions 
        WHERE status = 'paid' 
        GROUP BY plan
    `);

    return {
        total: totalStmt.get().total,
        paid: paidStmt.get().paid,
        pending: pendingStmt.get().pending,
        revenue: revenueStmt.get().revenue || 0,
        byPlan: byPlanStmt.all()
    };
}

// Búsqueda de solicitudes
function searchSubmissions(query) {
    const stmt = db.prepare(`
        SELECT * FROM submissions 
        WHERE business_name LIKE ? 
        OR email LIKE ? 
        OR domain_name LIKE ?
        ORDER BY created_at DESC
    `);
    
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, searchTerm);
}

module.exports = {
    createSubmission,
    getSubmission,
    getAllSubmissions,
    updateSubmissionStatus,
    getStats,
    searchSubmissions
}; 