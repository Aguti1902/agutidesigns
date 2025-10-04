const { Pool } = require('pg');

// Configurar conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test de conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conectado a PostgreSQL');
        release();
    }
});

// Inicializar tablas
async function initializeTables() {
    const client = await pool.connect();
    try {
        // Crear tabla de submissions
        await client.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                business_name TEXT NOT NULL,
                business_description TEXT,
                industry TEXT,
                cif_nif TEXT,
                razon_social TEXT,
                direccion_fiscal TEXT,
                business_email TEXT,
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
                services TEXT,
                purpose TEXT,
                target_audience TEXT,
                pages TEXT,
                custom_pages TEXT,
                design_style TEXT,
                brand_colors TEXT,
                reference_websites TEXT,
                logo_data TEXT,
                images_data TEXT,
                keywords TEXT,
                has_analytics TEXT,
                domain_name TEXT,
                domain_alt1 TEXT,
                domain_alt2 TEXT,
                privacy_policy TEXT,
                privacy_text TEXT,
                privacy_file_data TEXT,
                privacy_file_name TEXT,
                web_texts TEXT,
                menu_content TEXT,
                opening_hours TEXT,
                portfolio_description TEXT,
                full_name TEXT,
                email TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                password TEXT,
                plan TEXT NOT NULL,
                amount DECIMAL NOT NULL,
                status TEXT DEFAULT 'pending',
                stripe_session_id TEXT,
                stripe_subscription_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Índices para submissions
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_plan ON submissions(plan)`);

        // Crear tabla de clients
        await client.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                business_name TEXT,
                plan TEXT,
                status TEXT DEFAULT 'active',
                submission_id INTEGER,
                website_status TEXT DEFAULT 'en_construccion',
                website_url TEXT,
                wordpress_url TEXT,
                website_screenshot_url TEXT,
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                payment_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)`);

        // Crear tabla de tickets
        await client.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                client_id INTEGER,
                client_email TEXT NOT NULL,
                client_name TEXT,
                business_name TEXT,
                subject TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                priority TEXT DEFAULT 'media',
                status TEXT DEFAULT 'abierto',
                admin_response TEXT,
                client_response TEXT,
                admin_response_at TIMESTAMP,
                client_response_at TIMESTAMP,
                admin_unread BOOLEAN DEFAULT FALSE,
                client_unread BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`);

        // Crear tabla de projects
        await client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL,
                client_name TEXT,
                business_name TEXT NOT NULL,
                plan TEXT NOT NULL,
                status TEXT DEFAULT 'sin_empezar',
                delivery_date TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);

        console.log('✅ Tablas PostgreSQL inicializadas correctamente');
    } catch (error) {
        console.error('❌ Error inicializando tablas:', error);
    } finally {
        client.release();
    }
}

// Inicializar tablas al cargar el módulo
initializeTables();

// ===== FUNCIONES DE BASE DE DATOS =====

async function createSubmission(data) {
    const result = await pool.query(`
        INSERT INTO submissions (
            business_name, business_description, industry, cif_nif, razon_social, direccion_fiscal, business_email,
            contact_methods, phone_number, email_contact, whatsapp_number, form_email, physical_address,
            instagram, facebook, linkedin, twitter,
            services, purpose, target_audience, pages, custom_pages,
            design_style, brand_colors, reference_websites, logo_data, images_data,
            keywords, has_analytics,
            domain_name, domain_alt1, domain_alt2,
            privacy_policy, privacy_text, privacy_file_data, privacy_file_name,
            web_texts, menu_content, opening_hours, portfolio_description,
            full_name, email, phone, address, password,
            plan, amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48)
        RETURNING id
    `, [
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
        data.services_list || data.services || null,
        JSON.stringify(data.purpose) || null,
        data.target_audience || null,
        JSON.stringify(data.pages) || null,
        JSON.stringify(data.custom_pages) || null,
        data.design_style || null,
        data.brand_colors || null,
        data.reference_websites || null,
        data.logo_data || null,
        data.images_data || null,
        data.keywords || null,
        data.has_analytics || null,
        data.domain_name || null,
        data.domain_alt1 || null,
        data.domain_alt2 || null,
        data.privacy_policy || null,
        data.privacy_text || null,
        data.privacy_file_data || null,
        data.privacy_file_name || null,
        data.web_texts || null,
        data.menu_content || null,
        data.opening_hours || null,
        data.portfolio_description || null,
        data.full_name || null,
        data.email,
        data.phone || null,
        data.address || null,
        data.password || null,
        data.plan,
        data.amount,
        data.status || 'pending'
    ]);
    return result.rows[0].id;
}

async function getSubmission(id) {
    const result = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
    const submission = result.rows[0];
    
    if (submission) {
        // Parsear JSON fields
        if (submission.contact_methods) submission.contact_methods = JSON.parse(submission.contact_methods);
        if (submission.purpose) submission.purpose = JSON.parse(submission.purpose);
        if (submission.pages) submission.pages = JSON.parse(submission.pages);
        if (submission.custom_pages) submission.custom_pages = JSON.parse(submission.custom_pages);
        if (submission.images_data) {
            try {
                submission.images_data = JSON.parse(submission.images_data);
            } catch (e) {
                console.log('⚠️ Error parsing images_data:', e);
            }
        }
        submission.services_list = submission.services;
    }
    
    return submission;
}

async function getSubmissionBySubscriptionId(subscriptionId) {
    const result = await pool.query(
        'SELECT * FROM submissions WHERE stripe_subscription_id = $1',
        [subscriptionId]
    );
    return result.rows[0];
}

async function getAllSubmissions() {
    const result = await pool.query(`
        SELECT id, business_name, email, plan, amount, status, created_at 
        FROM submissions 
        ORDER BY created_at DESC
    `);
    return result.rows;
}

async function updateSubmissionStatus(id, status, stripeSessionId = null) {
    if (stripeSessionId) {
        await pool.query(
            'UPDATE submissions SET status = $1, stripe_session_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [status, stripeSessionId, id]
        );
    } else {
        await pool.query(
            'UPDATE submissions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, id]
        );
    }
}

async function getStats() {
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM submissions');
    const pendingResult = await pool.query("SELECT COUNT(*) as count FROM submissions WHERE status = 'pending'");
    const completedResult = await pool.query("SELECT COUNT(*) as count FROM submissions WHERE status = 'completed'");
    const revenueResult = await pool.query("SELECT COALESCE(SUM(amount), 0) as revenue FROM submissions WHERE status = 'completed'");
    
    return {
        total: parseInt(totalResult.rows[0].count),
        pending: parseInt(pendingResult.rows[0].count),
        completed: parseInt(completedResult.rows[0].count),
        revenue: parseFloat(revenueResult.rows[0].revenue)
    };
}

async function searchSubmissions(query) {
    const result = await pool.query(`
        SELECT * FROM submissions 
        WHERE business_name ILIKE $1 OR email ILIKE $1 
        ORDER BY created_at DESC
    `, [`%${query}%`]);
    return result.rows;
}

async function createClient(data) {
    const result = await pool.query(`
        INSERT INTO clients (email, password, full_name, business_name, plan, submission_id, stripe_customer_id, stripe_subscription_id, payment_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
    `, [
        data.email,
        data.password,
        data.full_name,
        data.business_name || null,
        data.plan || null,
        data.submission_id || null,
        data.stripe_customer_id || null,
        data.stripe_subscription_id || null,
        data.payment_date || null
    ]);
    return result.rows[0].id;
}

async function getClientByEmail(email) {
    const result = await pool.query('SELECT * FROM clients WHERE email = $1', [email]);
    return result.rows[0];
}

async function getClientById(id) {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    return result.rows[0];
}

async function updateWebsiteStatus(clientId, status, url = null) {
    if (url) {
        await pool.query(
            'UPDATE clients SET website_status = $1, website_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [status, url, clientId]
        );
    } else {
        await pool.query(
            'UPDATE clients SET website_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, clientId]
        );
    }
}

async function getClientDashboardData(clientId) {
    console.log(`📊 [DB] Obteniendo datos del dashboard para cliente #${clientId}`);
    
    const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    const client = clientResult.rows[0];
    
    if (!client) {
        console.log('❌ [DB] Cliente no encontrado');
        return null;
    }
    
    console.log('✅ [DB] Cliente encontrado:', client.email);
    console.log('🔗 [DB] submission_id:', client.submission_id);
    
    let submission = null;
    if (client.submission_id) {
        submission = await getSubmission(client.submission_id);
        console.log('📋 [DB] Submission:', submission ? 'Encontrada' : 'No encontrada');
    }
    
    return { client, submission };
}

async function createTicket(data) {
    const result = await pool.query(`
        INSERT INTO tickets (
            client_id, client_email, client_name, business_name,
            subject, category, description, priority, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
    `, [
        data.client_id,
        data.client_email,
        data.client_name || null,
        data.business_name || null,
        data.subject,
        data.category,
        data.description,
        data.priority || 'media',
        data.status || 'abierto'
    ]);
    return result.rows[0].id;
}

async function getAllTickets() {
    const result = await pool.query(`
        SELECT * FROM tickets 
        ORDER BY created_at DESC
    `);
    return result.rows;
}

async function getTicketsByClient(clientId) {
    const result = await pool.query(
        'SELECT * FROM tickets WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
    );
    return result.rows;
}

async function getTicketById(ticketId) {
    const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    return result.rows[0];
}

async function updateTicket(ticketId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);
    }
    if (updates.admin_response !== undefined) {
        fields.push(`admin_response = $${paramCount++}`);
        values.push(updates.admin_response);
        fields.push(`admin_response_at = CURRENT_TIMESTAMP`);
        if (updates.client_unread === undefined) {
            fields.push(`client_unread = TRUE`);
        }
    }
    if (updates.client_response !== undefined) {
        fields.push(`client_response = $${paramCount++}`);
        values.push(updates.client_response);
        fields.push(`client_response_at = CURRENT_TIMESTAMP`);
        if (updates.admin_unread === undefined) {
            fields.push(`admin_unread = TRUE`);
        }
    }
    if (updates.admin_unread !== undefined) {
        fields.push(`admin_unread = $${paramCount++}`);
        values.push(updates.admin_unread);
    }
    if (updates.client_unread !== undefined) {
        fields.push(`client_unread = $${paramCount++}`);
        values.push(updates.client_unread);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(ticketId);
    
    await pool.query(
        `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        values
    );
}

async function getTicketStats() {
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM tickets');
    const openResult = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'abierto'");
    const closedResult = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'cerrado'");
    
    return {
        total: parseInt(totalResult.rows[0].count),
        abiertos: parseInt(openResult.rows[0].count),
        cerrados: parseInt(closedResult.rows[0].count)
    };
}

async function createProject(data) {
    const result = await pool.query(`
        INSERT INTO projects (client_id, client_name, business_name, plan, status, delivery_date, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `, [
        data.client_id,
        data.client_name || null,
        data.business_name,
        data.plan,
        data.status || 'sin_empezar',
        data.delivery_date || null,
        data.notes || null
    ]);
    return result.rows[0].id;
}

async function getAllProjects() {
    const result = await pool.query(`
        SELECT * FROM projects 
        ORDER BY created_at DESC
    `);
    return result.rows;
}

async function getProjectsByStatus(status) {
    const result = await pool.query(
        'SELECT * FROM projects WHERE status = $1 ORDER BY created_at DESC',
        [status]
    );
    return result.rows;
}

async function getProjectsByClient(clientId) {
    const result = await pool.query(
        'SELECT * FROM projects WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
    );
    return result.rows;
}

async function getProjectById(projectId) {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    return result.rows[0];
}

async function updateProject(projectId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);
    }
    if (updates.delivery_date !== undefined) {
        fields.push(`delivery_date = $${paramCount++}`);
        values.push(updates.delivery_date);
    }
    if (updates.notes !== undefined) {
        fields.push(`notes = $${paramCount++}`);
        values.push(updates.notes);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(projectId);
    
    await pool.query(
        `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        values
    );
}

async function deleteProject(projectId) {
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
}

async function getProjectStats() {
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM projects');
    const sinEmpezarResult = await pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'sin_empezar'");
    const enDesarrolloResult = await pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'en_desarrollo'");
    const entregadaResult = await pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'entregada'");
    
    return {
        total: parseInt(totalResult.rows[0].count),
        sin_empezar: parseInt(sinEmpezarResult.rows[0].count),
        en_desarrollo: parseInt(enDesarrolloResult.rows[0].count),
        entregada: parseInt(entregadaResult.rows[0].count)
    };
}

module.exports = {
    pool,
    db: pool, // Alias para compatibilidad
    createSubmission,
    getSubmission,
    getSubmissionBySubscriptionId,
    getAllSubmissions,
    updateSubmissionStatus,
    getStats,
    searchSubmissions,
    createClient,
    getClientByEmail,
    getClientById,
    updateWebsiteStatus,
    getClientDashboardData,
    createTicket,
    getAllTickets,
    getTicketsByClient,
    getTicketById,
    updateTicket,
    getTicketStats,
    createProject,
    getAllProjects,
    getProjectsByStatus,
    getProjectsByClient,
    getProjectById,
    updateProject,
    deleteProject,
    getProjectStats
};
