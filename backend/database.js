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
        logo_data TEXT,
        images_data TEXT,
        
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
        password TEXT,
        
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

// Crear tabla de clientes/usuarios
db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        business_name TEXT,
        plan TEXT,
        status TEXT DEFAULT 'active',
        submission_id INTEGER,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        website_url TEXT,
        wordpress_url TEXT,
        website_screenshot_url TEXT,
        website_status TEXT DEFAULT 'en_construccion',
        payment_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_client_email ON clients(email);
    CREATE INDEX IF NOT EXISTS idx_client_status ON clients(status);
`);

// MIGRACIÓN: Recrear tabla de tickets sin FOREIGN KEY constraint
// NOTA: Esta migración ya se ejecutó en deploys anteriores.
// Mantenerla aquí por compatibilidad pero probablemente no hará nada.
try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tickets'").get();
    
    if (tableInfo && tableInfo.sql.includes('FOREIGN KEY')) {
        console.log('🔧 [DB] Detectada tabla tickets con FOREIGN KEY, migrando...');
        
        // Backup de datos existentes
        db.exec(`CREATE TABLE IF NOT EXISTS tickets_backup AS SELECT * FROM tickets;`);
        
        // Eliminar tabla antigua
        db.exec(`DROP TABLE IF EXISTS tickets;`);
        
        // Crear nueva tabla sin constraint y CON las nuevas columnas
        db.exec(`
            CREATE TABLE tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                admin_response_at DATETIME,
                client_response_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                closed_at DATETIME
            )
        `);
        
        // Restaurar datos (solo columnas que existían antes)
        db.exec(`
            INSERT INTO tickets (id, client_id, client_email, client_name, business_name, 
                                 subject, category, description, priority, status, 
                                 admin_response, created_at, updated_at, closed_at)
            SELECT id, client_id, client_email, client_name, business_name,
                   subject, category, description, priority, status,
                   admin_response, created_at, updated_at, closed_at
            FROM tickets_backup;
        `);
        
        // Eliminar backup
        db.exec(`DROP TABLE tickets_backup;`);
        
        console.log('✅ [DB] Migración de tickets completada exitosamente');
    }
} catch (error) {
    console.log('⚠️ [DB] Migración de FOREIGN KEY ya ejecutada o no necesaria:', error.message);
}

// Agregar columna client_response si no existe (migración)
try {
    db.exec(`ALTER TABLE tickets ADD COLUMN client_response TEXT;`);
    console.log('✅ [DB] Columna client_response agregada a tickets');
} catch (error) {
    // Si la columna ya existe, ignorar el error
    if (!error.message.includes('duplicate column name')) {
        console.log('⚠️ [DB] Error agregando columna client_response:', error.message);
    }
}

// Agregar columna admin_response_at si no existe (migración)
try {
    db.exec(`ALTER TABLE tickets ADD COLUMN admin_response_at DATETIME;`);
    console.log('✅ [DB] Columna admin_response_at agregada a tickets');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna admin_response_at ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna admin_response_at:', error.message);
    }
}

// Agregar columna client_response_at si no existe (migración)
try {
    db.exec(`ALTER TABLE tickets ADD COLUMN client_response_at DATETIME;`);
    console.log('✅ [DB] Columna client_response_at agregada a tickets');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna client_response_at ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna client_response_at:', error.message);
    }
}

// Agregar columna admin_unread si no existe (migración)
try {
    db.exec(`ALTER TABLE tickets ADD COLUMN admin_unread INTEGER DEFAULT 1;`);
    console.log('✅ [DB] Columna admin_unread agregada a tickets');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna admin_unread ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna admin_unread:', error.message);
    }
}

// Agregar columna client_unread si no existe (migración)
try {
    db.exec(`ALTER TABLE tickets ADD COLUMN client_unread INTEGER DEFAULT 0;`);
    console.log('✅ [DB] Columna client_unread agregada a tickets');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna client_unread ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna client_unread:', error.message);
    }
}

// Agregar columna logo_data si no existe (migración)
try {
    db.exec(`ALTER TABLE submissions ADD COLUMN logo_data TEXT;`);
    console.log('✅ [DB] Columna logo_data agregada a submissions');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna logo_data ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna logo_data:', error.message);
    }
}

// Agregar columna images_data si no existe (migración)
try {
    db.exec(`ALTER TABLE submissions ADD COLUMN images_data TEXT;`);
    console.log('✅ [DB] Columna images_data agregada a submissions');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna images_data ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna images_data:', error.message);
    }
}

// Agregar columna wordpress_url si no existe (migración)
try {
    db.exec(`ALTER TABLE clients ADD COLUMN wordpress_url TEXT;`);
    console.log('✅ [DB] Columna wordpress_url agregada a clients');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna wordpress_url ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna wordpress_url:', error.message);
    }
}

// Agregar columna website_screenshot_url si no existe (migración)
try {
    db.exec(`ALTER TABLE clients ADD COLUMN website_screenshot_url TEXT;`);
    console.log('✅ [DB] Columna website_screenshot_url agregada a clients');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna website_screenshot_url ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna website_screenshot_url:', error.message);
    }
}

// Agregar columna web_texts si no existe (migración)
try {
    db.exec(`ALTER TABLE submissions ADD COLUMN web_texts TEXT;`);
    console.log('✅ [DB] Columna web_texts agregada a submissions');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna web_texts ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna web_texts:', error.message);
    }
}

// Agregar columnas para campos dinámicos por sector
try {
    db.exec(`ALTER TABLE submissions ADD COLUMN menu_content TEXT;`);
    console.log('✅ [DB] Columna menu_content agregada a submissions');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna menu_content ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna menu_content:', error.message);
    }
}

try {
    db.exec(`ALTER TABLE submissions ADD COLUMN opening_hours TEXT;`);
    console.log('✅ [DB] Columna opening_hours agregada a submissions');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna opening_hours ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna opening_hours:', error.message);
    }
}

try {
    db.exec(`ALTER TABLE submissions ADD COLUMN portfolio_description TEXT;`);
    console.log('✅ [DB] Columna portfolio_description agregada a submissions');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ [DB] Columna portfolio_description ya existe');
    } else {
        console.log('⚠️ [DB] Error agregando columna portfolio_description:', error.message);
    }
}

// Crear tabla de tickets de soporte (si no existe)
// NOTA: NO usar FOREIGN KEY para client_id porque queremos que cualquier cliente pueda crear tickets
db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        admin_response_at DATETIME,
        client_response_at DATETIME,
        admin_unread INTEGER DEFAULT 1,
        client_unread INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME
    )
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ticket_client_id ON tickets(client_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_ticket_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_ticket_created_at ON tickets(created_at);
`);

// Crear tabla de proyectos web (Kanban)
db.exec(`
    CREATE TABLE IF NOT EXISTS client_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        submission_id INTEGER,
        project_name TEXT NOT NULL,
        business_name TEXT,
        client_email TEXT,
        plan TEXT,
        status TEXT DEFAULT 'sin_empezar',
        priority TEXT DEFAULT 'normal',
        deadline DATE,
        progress INTEGER DEFAULT 0,
        assigned_to TEXT,
        notes TEXT,
        website_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_project_client_id ON client_projects(client_id);
    CREATE INDEX IF NOT EXISTS idx_project_status ON client_projects(status);
    CREATE INDEX IF NOT EXISTS idx_project_priority ON client_projects(priority);
    CREATE INDEX IF NOT EXISTS idx_project_deadline ON client_projects(deadline);
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
            design_style, brand_colors, reference_websites, logo_data, images_data,
            keywords, has_analytics,
            domain_name, domain_alt1, domain_alt2,
            privacy_policy,
            web_texts, menu_content, opening_hours, portfolio_description,
            full_name, email, phone, address, password,
            plan, amount, status
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
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
        data.logo_data || null,  // 🆕 Logo en base64
        data.images_data || null,  // 🆕 Imágenes en base64 (JSON string)
        data.keywords || null,
        data.has_analytics || null,
        data.domain_name || null,
        data.domain_alt1 || null,
        data.domain_alt2 || null,
        data.privacy_policy || null,
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
        if (submission.images_data) {
            try {
                submission.images_data = JSON.parse(submission.images_data);
            } catch (e) {
                console.log('⚠️ Error parsing images_data:', e);
            }
        }
    }
    
    return submission;
}

// Obtener solicitud por Stripe Subscription ID
function getSubmissionBySubscriptionId(subscriptionId) {
    const stmt = db.prepare('SELECT * FROM submissions WHERE stripe_subscription_id = ?');
    const submission = stmt.get(subscriptionId);
    
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
        if (sub.images_data) {
            try {
                sub.images_data = JSON.parse(sub.images_data);
            } catch (e) {
                console.log('⚠️ Error parsing images_data:', e);
            }
        }
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

// ===== FUNCIONES DE CLIENTES =====

// Crear cliente
function createClient(data) {
    const stmt = db.prepare(`
        INSERT INTO clients (
            email, password, full_name, business_name, plan, 
            submission_id, stripe_customer_id, stripe_subscription_id, payment_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const result = stmt.run(
            data.email,
            data.password, // Ya debe estar hasheada
            data.full_name,
            data.business_name || null,
            data.plan || null,
            data.submission_id || null,
            data.stripe_customer_id || null,
            data.stripe_subscription_id || null,
            data.payment_date || null
        );
        return result.lastInsertRowid;
    } catch (error) {
        console.error('Error creating client:', error);
        return null;
    }
}

// Obtener cliente por email
function getClientByEmail(email) {
    const stmt = db.prepare('SELECT * FROM clients WHERE email = ?');
    return stmt.get(email);
}

// Obtener cliente por ID
function getClientById(id) {
    const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    return stmt.get(id);
}

// Actualizar estado del sitio web
function updateWebsiteStatus(clientId, status, url = null) {
    const stmt = db.prepare(`
        UPDATE clients 
        SET website_status = ?, 
            website_url = COALESCE(?, website_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    
    return stmt.run(status, url, clientId);
}

// Obtener dashboard data del cliente
function getClientDashboardData(clientId) {
    console.log('🔍 [DB] getClientDashboardData para cliente:', clientId);
    
    const client = getClientById(clientId);
    if (!client) {
        console.error('❌ [DB] Cliente no encontrado:', clientId);
        return null;
    }
    
    console.log('👤 [DB] Cliente encontrado:', {
        id: client.id,
        email: client.email,
        submission_id: client.submission_id,
        plan: client.plan
    });

    const submission = client.submission_id ? getSubmission(client.submission_id) : null;
    
    console.log('📋 [DB] Submission:', submission ? {
        id: submission.id,
        business_name: submission.business_name,
        email: submission.email,
        hasAllFields: !!(submission.industry && submission.phone_number && submission.domain_name)
    } : 'NO ENCONTRADA');
    
    return {
        client,
        submission
    };
}

// ===== FUNCIONES DE TICKETS =====

// Crear nuevo ticket
function createTicket(data) {
    const stmt = db.prepare(`
        INSERT INTO tickets (
            client_id, client_email, client_name, business_name,
            subject, category, description, priority, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
        data.client_id,
        data.client_email,
        data.client_name || null,
        data.business_name || null,
        data.subject,
        data.category,
        data.description,
        data.priority || 'media',
        data.status || 'abierto'
    );
    
    return {
        id: result.lastInsertRowid,
        ...data
    };
}

// Obtener todos los tickets
function getAllTickets() {
    const stmt = db.prepare(`
        SELECT * FROM tickets 
        ORDER BY 
            CASE priority 
                WHEN 'alta' THEN 1 
                WHEN 'media' THEN 2 
                WHEN 'baja' THEN 3 
            END,
            created_at DESC
    `);
    
    return stmt.all();
}

// Obtener tickets por cliente
function getTicketsByClient(clientId) {
    const stmt = db.prepare(`
        SELECT * FROM tickets 
        WHERE client_id = ?
        ORDER BY created_at DESC
    `);
    
    return stmt.all(clientId);
}

// Obtener un ticket por ID
function getTicketById(ticketId) {
    const stmt = db.prepare('SELECT * FROM tickets WHERE id = ?');
    return stmt.get(ticketId);
}

// Actualizar ticket (respuesta del admin, del cliente o cambio de estado)
function updateTicket(ticketId, updates) {
    const { status, admin_response, client_response, admin_unread, client_unread } = updates;
    
    console.log('🔧 [DB] Actualizando ticket #', ticketId);
    console.log('🔧 [DB] Updates recibidos:', { 
        status, 
        admin_response: admin_response ? 'SÍ' : 'NO', 
        client_response: client_response ? 'SÍ' : 'NO',
        admin_unread,
        client_unread
    });
    
    const stmt = db.prepare(`
        UPDATE tickets 
        SET status = COALESCE(?, status),
            admin_response = COALESCE(?, admin_response),
            client_response = COALESCE(?, client_response),
            admin_response_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE admin_response_at END,
            client_response_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE client_response_at END,
            admin_unread = COALESCE(?, admin_unread),
            client_unread = COALESCE(?, client_unread),
            updated_at = CURRENT_TIMESTAMP,
            closed_at = CASE WHEN ? = 'cerrado' THEN CURRENT_TIMESTAMP ELSE closed_at END
        WHERE id = ?
    `);
    
    const result = stmt.run(
        status, 
        admin_response, 
        client_response, 
        admin_response, 
        client_response, 
        admin_unread !== undefined ? admin_unread : null,
        client_unread !== undefined ? client_unread : null,
        status, 
        ticketId
    );
    console.log('✅ [DB] Ticket actualizado. Changes:', result.changes);
    
    return result;
}

// Estadísticas de tickets
function getTicketStats() {
    const stmt = db.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'abierto' THEN 1 ELSE 0 END) as abiertos,
            SUM(CASE WHEN status = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
            SUM(CASE WHEN status = 'cerrado' THEN 1 ELSE 0 END) as cerrados,
            SUM(CASE WHEN priority = 'alta' THEN 1 ELSE 0 END) as alta_prioridad
        FROM tickets
    `);
    
    return stmt.get();
}

// ===== FUNCIONES DE PROYECTOS (KANBAN) =====

// Crear nuevo proyecto
function createProject(data) {
    const stmt = db.prepare(`
        INSERT INTO client_projects (
            client_id, submission_id, project_name, business_name, client_email, plan,
            status, priority, deadline, progress, assigned_to, notes, website_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
        data.client_id,
        data.submission_id || null,
        data.project_name,
        data.business_name || null,
        data.client_email || null,
        data.plan || null,
        data.status || 'sin_empezar',
        data.priority || 'normal',
        data.deadline || null,
        data.progress || 0,
        data.assigned_to || null,
        data.notes || null,
        data.website_url || null
    );
    
    return result.lastInsertRowid;
}

// Obtener todos los proyectos
function getAllProjects() {
    const stmt = db.prepare(`
        SELECT * FROM client_projects 
        ORDER BY 
            CASE status
                WHEN 'sin_empezar' THEN 1
                WHEN 'en_desarrollo' THEN 2
                WHEN 'revision' THEN 3
                WHEN 'entregada' THEN 4
            END,
            deadline ASC NULLS LAST,
            created_at DESC
    `);
    
    return stmt.all();
}

// Obtener proyectos por estado
function getProjectsByStatus(status) {
    const stmt = db.prepare('SELECT * FROM client_projects WHERE status = ? ORDER BY deadline ASC NULLS LAST, created_at DESC');
    return stmt.all(status);
}

// Obtener proyectos por cliente
function getProjectsByClient(clientId) {
    const stmt = db.prepare('SELECT * FROM client_projects WHERE client_id = ? ORDER BY created_at DESC');
    return stmt.all(clientId);
}

// Obtener un proyecto por ID
function getProjectById(projectId) {
    const stmt = db.prepare('SELECT * FROM client_projects WHERE id = ?');
    return stmt.get(projectId);
}

// Actualizar proyecto
function updateProject(projectId, updates) {
    const fields = [];
    const values = [];
    
    const allowedFields = ['project_name', 'status', 'priority', 'deadline', 'progress', 'assigned_to', 'notes', 'website_url'];
    
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            fields.push(`${field} = ?`);
            values.push(updates[field]);
        }
    }
    
    // Actualizar timestamps según el estado
    if (updates.status === 'en_desarrollo' && updates.started_at === undefined) {
        fields.push('started_at = CURRENT_TIMESTAMP');
    }
    if (updates.status === 'entregada' && updates.completed_at === undefined) {
        fields.push('completed_at = CURRENT_TIMESTAMP');
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(projectId);
    
    const stmt = db.prepare(`UPDATE client_projects SET ${fields.join(', ')} WHERE id = ?`);
    return stmt.run(...values);
}

// Eliminar proyecto
function deleteProject(projectId) {
    const stmt = db.prepare('DELETE FROM client_projects WHERE id = ?');
    return stmt.run(projectId);
}

// Estadísticas de proyectos
function getProjectStats() {
    const stmt = db.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'sin_empezar' THEN 1 ELSE 0 END) as sin_empezar,
            SUM(CASE WHEN status = 'en_desarrollo' THEN 1 ELSE 0 END) as en_desarrollo,
            SUM(CASE WHEN status = 'revision' THEN 1 ELSE 0 END) as revision,
            SUM(CASE WHEN status = 'entregada' THEN 1 ELSE 0 END) as entregada,
            AVG(progress) as progreso_promedio
        FROM client_projects
    `);
    
    return stmt.get();
}

module.exports = {
    db, // Exportar db para queries directas
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
    // Tickets
    createTicket,
    getAllTickets,
    getTicketsByClient,
    getTicketById,
    updateTicket,
    getTicketStats,
    // Proyectos
    createProject,
    getAllProjects,
    getProjectsByStatus,
    getProjectsByClient,
    getProjectById,
    updateProject,
    deleteProject,
    getProjectStats
}; 