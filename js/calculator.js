class StepBudgetCalculator {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        this.form = document.getElementById('stepForm');
        this.totalAmountElement = document.getElementById('totalAmount');
        this.priceBreakdownElement = document.getElementById('priceBreakdown');
        this.breakdownList = this.priceBreakdownElement.querySelector('.breakdown-list');
        this.progressFill = document.getElementById('progressFill');
        this.nextBtn = document.getElementById('nextBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.submitBtn = document.getElementById('submitBtn');
        
        this.prices = {
            projectType: {
                landing: { name: 'Landing Page', price: 500 },
                corporate: { name: 'Web Corporativa', price: 1200 },
                ecommerce: { name: 'Tienda Online', price: 2500 },

            },
            landingSections: {
                basic: { name: 'Landing básica', price: 0 },
                standard: { name: 'Landing estándar', price: 150 },
                complete: { name: 'Landing completa', price: 300 },
                premium: { name: 'Landing premium', price: 500 }
            },
            pageCount: {
                basic: { name: 'Web básica (5-8 páginas)', price: 0 },
                standard: { name: 'Web estándar (9-15 páginas)', price: 400 },
                extensive: { name: 'Web extensa (16-25 páginas)', price: 800 },
                enterprise: { name: 'Web empresarial (+25 páginas)', price: 1200 }
            },
            categoryCount: {
                basic: { name: 'Categorías básicas (1-10)', price: 0 },
                standard: { name: 'Categorías estándar (11-25)', price: 300 },
                extensive: { name: 'Categorías extensas (26-50)', price: 600 },
                enterprise: { name: 'Categorías empresariales (+50)', price: 1000 }
            },
            productCount: {
                basic: { name: 'Productos básicos (1-100)', price: 0 },
                standard: { name: 'Productos estándar (101-500)', price: 200 },
                extensive: { name: 'Productos extensos (501-1000)', price: 500 },
                enterprise: { name: 'Productos empresariales (+1000)', price: 800 }
            },

            hostingDomain: {
                'need-help': { name: 'Ayuda con hosting/dominio', price: 0 },
                'manage': { name: 'Gestión completa hosting/dominio', price: 0 }
            },
            translation: {
                translation: { name: 'Traducción de contenido', price: 0 } // El precio se calcula según idiomas
            },
            contentMigration: {
                'content-migration': { name: 'Migración de contenido', price: 150 }
            },
            languageCount: {
                '1': { name: 'Traducción a 1 idioma', price: 200 },
                '2': { name: 'Traducción a 2 idiomas', price: 400 },
                '3': { name: 'Traducción a 3 idiomas', price: 600 },
                '4': { name: 'Traducción a 4 idiomas', price: 800 },
                '5': { name: 'Traducción a 5 idiomas', price: 1000 },
                '6+': { name: 'Traducción a más de 5 idiomas', price: 1200 }
            },
            textStatus: {
                partial: { name: 'Revisión de textos existentes', price: 150 },
                none: { name: 'Creación de todos los textos', price: 400 }
            },
            media: {
                'stock-images': { name: 'Imágenes de stock premium', price: 200 }
            },
            imageStatus: {
                some: { name: 'Búsqueda de imágenes adicionales', price: 100 },
                none: { name: 'Búsqueda y selección de todas las imágenes', price: 200 }
            },
            videoNeeds: {
                basic: { name: 'Integración básica de vídeos', price: 200 },
                advanced: { name: 'Vídeos personalizados y optimización', price: 400 }
            },
            designLevel: {
                template: { name: 'Plantilla Premium', price: 0 },
                custom: { name: 'Diseño Personalizado', price: 800 },
                premium: { name: 'Diseño Premium', price: 1500 }
            },
            designExtras: {
                animations: { name: 'Animaciones CSS', price: 300 },
                icons: { name: 'Iconografía personalizada', price: 200 },
                illustrations: { name: 'Ilustraciones personalizadas', price: 400 },
                'dark-mode': { name: 'Modo oscuro', price: 250 }
            },
            branding: {
                partial: { name: 'Desarrollo de branding', price: 200 },
                none: { name: 'Creación de identidad completa', price: 500 }
            },
            basicFunctions: {
                'contact-forms': { name: 'Formularios de contacto', price: 200 },
                newsletter: { name: 'Newsletter/Suscripción', price: 300 },
                search: { name: 'Buscador interno', price: 250 },
                'user-accounts': { name: 'Sistema de usuarios', price: 400 }
            },
            advancedFunctions: {
                booking: { name: 'Sistema de reservas', price: 500 },
                payment: { name: 'Pagos online', price: 600 },
                chat: { name: 'Chat en vivo', price: 400 },
                api: { name: 'Integraciones API', price: 800 }
            },
            ecommerceFunctions: {
                inventory: { name: 'Gestión de inventario', price: 300 },
                coupons: { name: 'Sistema de cupones', price: 200 },
                shipping: { name: 'Cálculo de envíos', price: 400 },
                'multi-vendor': { name: 'Multi-vendedor', price: 500 }
            },
            seoServices: {
                'basic-seo': { name: 'SEO Básico', price: 300 },
                'advanced-seo': { name: 'SEO Avanzado', price: 600 },
                'google-ads': { name: 'Configuración Google Ads', price: 400 },
                analytics: { name: 'Analytics y seguimiento', price: 250 }
            },
            maintenance: {
                'basic-maintenance': { name: 'Mantenimiento básico (3 meses)', price: 100 },
                'premium-maintenance': { name: 'Mantenimiento premium (1 año)', price: 300 },
                training: { name: 'Formación para gestionar la web', price: 200 },
                backup: { name: 'Copias de seguridad automáticas', price: 150 }
            },
            timeline: {
                standard: { name: 'Plazo estándar', price: 0 },
                fast: { name: 'Entrega rápida', price: 400 },
                express: { name: 'Entrega express', price: 800 }
            }
        };
        
        this.selectedOptions = {};
        this.init();
    }
    
    init() {
        this.attachEventListeners();
        this.updateProgress();
        this.updatePrice();
        this.initializeAnimations();
        this.initializeCheckboxStates();
    }
    
    attachEventListeners() {
        // Navigation buttons
        this.nextBtn.addEventListener('click', () => this.nextStep());
        this.prevBtn.addEventListener('click', () => this.prevStep());
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Form inputs
        this.form.addEventListener('change', (e) => {
            this.handleInputChange(e);
            this.updatePrice();
        });
        
        // Add hover effects
        this.addHoverEffects();
    }
    
    handleInputChange(e) {
        const input = e.target;
        const name = input.name;
        const value = input.value;
        
        if (input.type === 'radio') {
            this.selectedOptions[name] = value;
            this.animateSelection(input.closest('.option-card, .radio-inline, .radio-option-text'));
            
            // Show/hide specific questions based on project type
            if (name === 'projectType') {
                this.toggleProjectSpecificQuestions(value);
            }
            
            // Show/hide multimedia question based on image status
            if (name === 'imageStatus') {
                this.toggleMultimediaQuestion(value);
            }
            
            // Update price after radio change
            this.updatePrice();
        } else if (input.type === 'checkbox') {
            if (!this.selectedOptions[name]) {
                this.selectedOptions[name] = [];
            }
            
            const checkboxCard = input.closest('.checkbox-card');
            
            if (input.checked) {
                this.selectedOptions[name].push(value);
                checkboxCard.classList.add('checked');
            } else {
                this.selectedOptions[name] = this.selectedOptions[name].filter(v => v !== value);
                checkboxCard.classList.remove('checked');
            }
            
            this.animateSelection(checkboxCard);
            
            // Show/hide translation question based on content selection
            this.toggleTranslationQuestion();
            
            // Update price after checkbox change
            this.updatePrice();
        } else if (input.type === 'select-one') {
            this.selectedOptions[name] = value;
            // Update price after select change
            this.updatePrice();
        }
    }
    
    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.showStep(this.currentStep);
                this.updateProgress();
                this.updateNavigation();
            }
        }
    }
    
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep(this.currentStep);
            this.updateProgress();
            this.updateNavigation();
        }
    }
    
    validateCurrentStep() {
        const currentStepElement = document.getElementById(`step${this.currentStep}`);
        const requiredInputs = currentStepElement.querySelectorAll('input[required], select[required]');
        
        // Validación específica por paso
        switch (this.currentStep) {
            case 1:
                if (!this.selectedOptions.projectType) {
                    this.showNotification('Por favor, selecciona el tipo de proyecto', 'warning');
                    return false;
                }
                break;
            case 6:
                const name = currentStepElement.querySelector('input[name="name"]').value;
                const email = currentStepElement.querySelector('input[name="email"]').value;
                const privacy = currentStepElement.querySelector('input[name="privacy"]').checked;
                
                if (!name || !email || !privacy) {
                    this.showNotification('Por favor, completa los campos obligatorios', 'warning');
                    return false;
                }
                
                if (!this.validateEmail(email)) {
                    this.showNotification('Por favor, introduce un email válido', 'warning');
                    return false;
                }
                break;
        }
        
        return true;
    }
    
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        document.getElementById(`step${stepNumber}`).classList.add('active');
        
        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNum === stepNumber) {
                step.classList.add('active');
            } else if (stepNum < stepNumber) {
                step.classList.add('completed');
            }
        });
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    updateProgress() {
        // Actualizar clases de los pasos
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < this.currentStep) {
                step.classList.add('completed');
            } else if (index + 1 === this.currentStep) {
                step.classList.add('active');
            }
        });
        
        // Calcular el ancho de la barra de progreso
        if (this.currentStep === 1) {
            this.progressFill.style.width = '0%';
        } else {
            // La barra debe llenar el espacio disponible (83.33% del total)
            const progressPercentage = ((this.currentStep - 1) / (this.totalSteps - 1)) * 83.33;
            this.progressFill.style.width = `${progressPercentage}%`;
        }
    }
    
    updateNavigation() {
        // Previous button
        this.prevBtn.style.display = this.currentStep > 1 ? 'flex' : 'none';
        
        // Next/Submit button
        if (this.currentStep === this.totalSteps) {
            this.nextBtn.style.display = 'none';
            this.submitBtn.style.display = 'flex';
        } else {
            this.nextBtn.style.display = 'flex';
            this.submitBtn.style.display = 'none';
        }
    }
    
    toggleProjectSpecificQuestions(projectType) {
        // Hide all specific questions first
        const questionElements = [
            'landing-question',
            'corporate-question',
            'ecommerce-categories', 
            'ecommerce-products'
        ];
        
        questionElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
                // Clear the select value when hiding
                const select = element.querySelector('select');
                if (select) {
                    select.selectedIndex = 0;
                    // Remove from selectedOptions
                    delete this.selectedOptions[select.name];
                }
            }
        });

        // Hide/show e-commerce functions section
        const ecommerceFunctions = document.getElementById('ecommerce-functions');
        if (ecommerceFunctions) {
            if (projectType === 'ecommerce') {
                ecommerceFunctions.style.display = 'block';
            } else {
                ecommerceFunctions.style.display = 'none';
                // Clear e-commerce function selections when hiding
                const checkboxes = ecommerceFunctions.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                    const card = checkbox.closest('.checkbox-card');
                    if (card) card.classList.remove('checked');
                });
                // Remove from selectedOptions
                delete this.selectedOptions.ecommerceFunctions;
            }
        }
        
        // Show relevant questions based on project type
        switch (projectType) {
            case 'landing':
                document.getElementById('landing-question').style.display = 'block';
                break;
            case 'corporate':
                document.getElementById('corporate-question').style.display = 'block';
                break;
            case 'ecommerce':
                document.getElementById('ecommerce-categories').style.display = 'block';
                document.getElementById('ecommerce-products').style.display = 'block';
                break;
        }
    }
    
    toggleTranslationQuestion() {
        const translationQuestion = document.getElementById('translation-question');
        const translationCheckbox = document.getElementById('translation');
        
        if (translationCheckbox && translationCheckbox.checked) {
            translationQuestion.style.display = 'block';
        } else {
            translationQuestion.style.display = 'none';
            // Clear language count selection when hiding
            const languageSelect = translationQuestion.querySelector('select[name="languageCount"]');
            if (languageSelect) {
                languageSelect.selectedIndex = 0;
                delete this.selectedOptions.languageCount;
            }
        }
    }
    
    toggleMultimediaQuestion(imageStatus) {
        const multimediaQuestion = document.getElementById('multimedia-question');
        
        if (imageStatus === 'some' || imageStatus === 'none') {
            multimediaQuestion.style.display = 'block';
        } else {
            multimediaQuestion.style.display = 'none';
            // Clear multimedia selections when hiding
            const checkboxes = multimediaQuestion.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                const card = checkbox.closest('.checkbox-card');
                if (card) card.classList.remove('checked');
            });
            // Remove from selectedOptions
            if (this.selectedOptions.media) {
                this.selectedOptions.media = this.selectedOptions.media.filter(
                    item => !['stock-images'].includes(item)
                );
            }
        }
    }
    
    calculateTotal() {
        let total = 0;
        let breakdown = [];
        
        // Add base project price first
        if (this.selectedOptions.projectType && this.prices.projectType[this.selectedOptions.projectType]) {
            const basePrice = this.prices.projectType[this.selectedOptions.projectType].price;
            total += basePrice;
            breakdown.push({
                name: this.prices.projectType[this.selectedOptions.projectType].name,
                price: basePrice
            });
        }
        
        // Process all other selected options (excluding projectType to avoid duplication)
        for (const [category, value] of Object.entries(this.selectedOptions)) {
            if (!value || (Array.isArray(value) && value.length === 0) || category === 'projectType') continue;
            
            if (Array.isArray(value)) {
                // Multiple selection (checkboxes)
                value.forEach(item => {
                    if (this.prices[category] && this.prices[category][item]) {
                        const itemData = this.prices[category][item];
                        // Skip translation if languageCount is selected (to avoid duplication)
                        if (item === 'translation' && this.selectedOptions.languageCount) {
                            return;
                        }
                        total += itemData.price;
                        if (itemData.price > 0) {
                            breakdown.push({
                                name: itemData.name,
                                price: itemData.price
                            });
                        }
                    }
                });
            } else {
                // Single selection (radio, select)
                if (this.prices[category] && this.prices[category][value]) {
                    const itemData = this.prices[category][value];
                    total += itemData.price;
                    if (itemData.price > 0) {
                        breakdown.push({
                            name: itemData.name,
                            price: itemData.price
                        });
                    }
                }
            }
        }
        
        return { total, breakdown };
    }
    
    updatePrice() {
        const { total, breakdown } = this.calculateTotal();
        
        // Animate price change
        this.animatePrice(total);
        
        // Update breakdown
        this.updateBreakdown(breakdown);
    }
    
    animatePrice(newPrice) {
        const currentPrice = parseInt(this.totalAmountElement.textContent.replace(/[^\d]/g, '')) || 0;
        
        if (currentPrice === newPrice) return;
        
        const duration = 800;
        const steps = 30;
        const increment = (newPrice - currentPrice) / steps;
        let step = 0;
        
        const animate = () => {
            step++;
            const currentValue = Math.round(currentPrice + (increment * step));
            this.totalAmountElement.textContent = this.formatNumber(currentValue);
            
            if (step < steps) {
                requestAnimationFrame(animate);
            } else {
                this.totalAmountElement.textContent = this.formatNumber(newPrice);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    updateBreakdown(breakdown) {
        this.breakdownList.innerHTML = '';
        
        if (breakdown.length === 0) {
            this.breakdownList.innerHTML = `
                <div class="breakdown-placeholder">
                    <i class="fas fa-arrow-left"></i>
                    <span>Selecciona opciones para ver el desglose</span>
                </div>
            `;
            return;
        }
        
        breakdown.forEach((item, index) => {
            const breakdownItem = document.createElement('div');
            breakdownItem.className = 'breakdown-item';
            breakdownItem.style.animationDelay = `${index * 0.1}s`;
            breakdownItem.innerHTML = `
                <span class="breakdown-item-name">${item.name}</span>
                <span class="breakdown-item-price">€${this.formatNumber(item.price)}</span>
            `;
            this.breakdownList.appendChild(breakdownItem);
        });
        
        // Add total line if multiple items
        if (breakdown.length > 1) {
            const totalItem = document.createElement('div');
            totalItem.className = 'breakdown-item';
            totalItem.style.borderTop = '2px solid var(--gray-200)';
            totalItem.style.marginTop = '0.5rem';
            totalItem.style.paddingTop = '0.75rem';
            totalItem.style.fontWeight = '700';
            totalItem.innerHTML = `
                <span class="breakdown-item-name">Total</span>
                <span class="breakdown-item-price">€${this.formatNumber(this.calculateTotal().total)}</span>
            `;
            this.breakdownList.appendChild(totalItem);
        }
    }
    
    formatNumber(num) {
        return new Intl.NumberFormat('es-ES').format(num);
    }
    
    animateSelection(element) {
        if (!element) return;
        
        element.style.transform = 'scale(0.95)';
        element.style.transition = 'transform 0.1s ease';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.transition = 'transform 0.3s ease';
        }, 100);
    }
    
    addHoverEffects() {
        document.querySelectorAll('.option-card, .checkbox-card, .radio-inline, .radio-option-text').forEach(option => {
            option.addEventListener('mouseenter', () => {
                if (!option.querySelector('input').checked) {
                    option.style.transform = 'translateY(-2px)';
                }
            });
            
            option.addEventListener('mouseleave', () => {
                if (!option.querySelector('input').checked) {
                    option.style.transform = 'translateY(0)';
                }
            });
        });
    }
    
    initializeAnimations() {
        // Intersection Observer for step animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1
        });
        
        // Apply animations to sections
        document.querySelectorAll('.content-section, .design-section, .functions-section, .extras-section').forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = `all 0.6s ease ${index * 0.1}s`;
            observer.observe(section);
        });
    }
    
    initializeCheckboxStates() {
        // Ensure all checkboxes start unchecked and remove any stuck 'checked' classes
        document.querySelectorAll('.checkbox-card').forEach(card => {
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = false;
                card.classList.remove('checked');
            }
        });
        
        // Clear any existing selections
        this.selectedOptions = {};
        this.updatePrice();
    }
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateCurrentStep()) {
            return;
        }
        
        const submitBtn = e.target.querySelector('#submitBtn');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        try {
            // Collect form data
            const formData = this.collectFormData();
            
            // Simulate form submission
            await this.simulateFormSubmission(formData);
            
            // Show success message
            this.showSuccessMessage(formData);
            
        } catch (error) {
            console.error('Error al enviar el formulario:', error);
            this.showNotification('Hubo un error al enviar el formulario. Por favor, inténtalo de nuevo.', 'error');
        } finally {
            // Restore button
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = originalText;
        }
    }
    
    collectFormData() {
        const formData = new FormData(this.form);
        const data = {
            personalInfo: {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                company: formData.get('company'),
                projectDescription: formData.get('projectDescription'),
                budgetRange: formData.get('budgetRange'),
                deadline: formData.get('deadline'),
                newsletter: formData.get('newsletter') === 'yes'
            },
            projectDetails: this.selectedOptions,
            pricing: this.calculateTotal(),
            timestamp: new Date().toISOString(),
            stepData: this.getStepSummary()
        };
        
        return data;
    }
    
    getStepSummary() {
        return {
            step1: {
                projectType: this.selectedOptions.projectType,
                pageCount: this.selectedOptions.pageCount,
                hostingDomain: this.selectedOptions.hostingDomain
            },
            step2: {
                content: this.selectedOptions.content || [],
                textStatus: this.selectedOptions.textStatus,
                media: this.selectedOptions.media || [],
                imageStatus: this.selectedOptions.imageStatus
            },
            step3: {
                designLevel: this.selectedOptions.designLevel,
                designExtras: this.selectedOptions.designExtras || [],
                branding: this.selectedOptions.branding
            },
            step4: {
                basicFunctions: this.selectedOptions.basicFunctions || [],
                advancedFunctions: this.selectedOptions.advancedFunctions || [],
                ecommerceFunctions: this.selectedOptions.ecommerceFunctions || []
            },
            step5: {
                seoServices: this.selectedOptions.seoServices || [],
                maintenance: this.selectedOptions.maintenance || [],
                timeline: this.selectedOptions.timeline
            }
        };
    }
    
    async simulateFormSubmission(data) {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Datos del presupuesto detallado:', data);
                resolve();
            }, 2000);
        });
    }
    
    showSuccessMessage(data) {
        // Prepare data for the thank you page
        const budgetSummary = {
            projectType: this.prices.projectType[data.projectDetails.projectType]?.name || 'Proyecto web',
            total: data.pricing.total,
            breakdown: data.pricing.breakdown,
            contactInfo: {
                email: data.personalInfo.email,
                phone: data.personalInfo.phone,
                company: data.personalInfo.company,
                name: data.personalInfo.name
            },
            projectDetails: data.projectDetails,
            timeline: data.timeline,
            description: data.description
        };
        
        // Save to localStorage
        localStorage.setItem('budgetSummary', JSON.stringify(budgetSummary));
        
        // Redirect to thank you page
        window.location.href = 'gracias.html';
    }
    

    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add notification styles if not exists
        if (!document.querySelector('#notification-styles')) {
            const notificationStyles = document.createElement('style');
            notificationStyles.id = 'notification-styles';
            notificationStyles.textContent = `
                .notification {
                    position: fixed;
                    top: 2rem;
                    right: 2rem;
                    background: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    box-shadow: var(--shadow-lg);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    z-index: 9999;
                    animation: slideInRight 0.3s ease-out;
                    max-width: 400px;
                    border-left: 4px solid var(--primary-blue);
                }
                
                .notification-error {
                    border-left-color: #ef4444;
                    color: #dc2626;
                }
                
                .notification-warning {
                    border-left-color: #f59e0b;
                    color: #d97706;
                }
                
                .notification-info {
                    border-left-color: var(--primary-blue);
                    color: var(--primary-blue);
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: opacity 0.2s ease;
                    padding: 0.25rem;
                }
                
                .notification-close:hover {
                    opacity: 1;
                }
                
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                
                @media (max-width: 768px) {
                    .notification {
                        top: 1rem;
                        right: 1rem;
                        left: 1rem;
                        max-width: none;
                    }
                }
            `;
            document.head.appendChild(notificationStyles);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize the calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new StepBudgetCalculator();
    
    // Additional enhancements
    initializeEnhancements();
});

function initializeEnhancements() {
    // Smooth scroll for internal navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Enhanced keyboard navigation
    document.querySelectorAll('.option-card, .checkbox-card, .radio-inline, .radio-option-text').forEach(option => {
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const input = option.querySelector('input');
                if (input) {
                    input.click();
                }
            }
        });
        
        // Make focusable
        option.setAttribute('tabindex', '0');
    });
    
    // Auto-save to localStorage (optional)
    const form = document.getElementById('stepForm');
    if (form) {
        form.addEventListener('change', debounce(() => {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            localStorage.setItem('budgetCalculatorData', JSON.stringify(data));
        }, 1000));
        
        // Load saved data
        const savedData = localStorage.getItem('budgetCalculatorData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                Object.entries(data).forEach(([name, value]) => {
                    const input = form.querySelector(`[name="${name}"]`);
                    if (input) {
                        if (input.type === 'checkbox' || input.type === 'radio') {
                            if (input.value === value) {
                                input.checked = true;
                            }
                        } else {
                            input.value = value;
                        }
                    }
                });
            } catch (e) {
                console.log('Error loading saved data:', e);
            }
        }
    }
    
    // Add tooltips for complex options (optional)
    addTooltips();
    
    // Performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`Calculator loaded in ${loadTime}ms`);
        });
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function addTooltips() {
    // Add tooltips for complex features
    const tooltipElements = [
        { selector: '[data-tooltip]', position: 'top' }
    ];
    
    tooltipElements.forEach(({ selector, position }) => {
        document.querySelectorAll(selector).forEach(element => {
            element.addEventListener('mouseenter', showTooltip);
            element.addEventListener('mouseleave', hideTooltip);
        });
    });
}

function showTooltip(e) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = e.target.dataset.tooltip;
    document.body.appendChild(tooltip);
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
    tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
    tooltip.style.zIndex = '10000';
    tooltip.style.background = 'var(--gray-800)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '0.5rem';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '0.8rem';
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.2s ease';
    
    setTimeout(() => tooltip.style.opacity = '1', 10);
}

function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Chat functionality
function toggleChatWidget() {
    const chatWidget = document.getElementById('chatWidget');
    chatWidget.classList.toggle('active');
}

function openVirtualAssistant() {
    const chatWidget = document.getElementById('chatWidget');
    chatWidget.classList.add('active');
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message) {
        addUserMessage(message);
        input.value = '';
        
        // Simulate bot response
        setTimeout(() => {
            addBotResponse(message);
        }, 1000);
    }
}

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function askQuestion(question) {
    addUserMessage(question);
    setTimeout(() => {
        addBotResponse(question);
    }, 1000);
}

function addUserMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <p>${message}</p>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addBotResponse(userMessage) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    let response = getBotResponse(userMessage);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <p>${response}</p>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getBotResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('tipo de web') || lowerMessage.includes('recomiendas')) {
        return "Te recomiendo elegir según tu objetivo: <br><br>🎯 <strong>Landing Page</strong> - Para promocionar un producto/servicio específico<br>🏢 <strong>Web Corporativa</strong> - Para presentar tu empresa profesionalmente<br>🛒 <strong>Tienda Online</strong> - Para vender productos online<br><br>¿Cuál se adapta mejor a tus necesidades?";
    }
    
    if (lowerMessage.includes('tiempo') || lowerMessage.includes('tarda')) {
        return "Los tiempos estimados son:<br><br>⚡ <strong>Landing Page:</strong> 1-2 semanas<br>🏢 <strong>Web Corporativa:</strong> 2-4 semanas<br>🛒 <strong>Tienda Online:</strong> 3-6 semanas<br><br>El tiempo puede variar según la complejidad y si tienes listos los contenidos (textos, imágenes, etc.)";
    }
    
    if (lowerMessage.includes('precio') || lowerMessage.includes('incluye')) {
        return "El precio incluye:<br><br>✅ Diseño responsive (móvil, tablet, desktop)<br>✅ Optimización SEO básica<br>✅ Formularios de contacto<br>✅ Integración con redes sociales<br>✅ Panel de administración<br>✅ 1 mes de soporte gratuito<br><br>Los extras como hosting, contenidos adicionales o funcionalidades especiales se calculan aparte.";
    }
    
    if (lowerMessage.includes('hosting') || lowerMessage.includes('dominio')) {
        return "Sobre hosting y dominio:<br><br>🌐 Si ya tienes hosting y dominio, perfecto - no hay costo adicional<br>🔧 Si necesitas ayuda, te incluyo el alojamiento en mi servidor con pago mensual aparte<br>📋 Te ayudo con toda la configuración sin complicaciones<br><br>¿Ya tienes hosting y dominio o necesitas que me encargue yo?";
    }
    
    if (lowerMessage.includes('pago') || lowerMessage.includes('forma de pago')) {
        return "Las formas de pago son flexibles:<br><br>💳 <strong>Pago único:</strong> Al entregar el proyecto<br>📅 <strong>Pago fraccionado:</strong> 50% al inicio, 50% al finalizar<br>🔄 <strong>Proyectos grandes:</strong> En 3 partes (inicio, avance, entrega)<br><br>Acepto transferencia bancaria, PayPal y otros métodos. ¿Cuál prefieres?";
    }
    
    if (lowerMessage.includes('contenido') || lowerMessage.includes('textos') || lowerMessage.includes('imágenes')) {
        return "Sobre el contenido:<br><br>📝 <strong>Textos:</strong> Puedo redactar contenido profesional (+€400) o revisar los tuyos (+€150)<br>📸 <strong>Imágenes:</strong> Te ayudo a buscar imágenes profesionales (+€200) o uso las que tengas<br>🌐 <strong>Traducción:</strong> Traduzco a otros idiomas (+€200 por idioma)<br><br>¿Ya tienes preparados los textos e imágenes?";
    }
    
    if (lowerMessage.includes('seo') || lowerMessage.includes('google')) {
        return "Sobre SEO y posicionamiento:<br><br>🔍 <strong>SEO Básico (+€300):</strong> Optimización on-page, meta tags, estructura<br>🚀 <strong>SEO Avanzado (+€600):</strong> Análisis de palabras clave, contenido optimizado<br>📊 <strong>Google Analytics (+€250):</strong> Configuración completa de seguimiento<br><br>El SEO básico suele ser suficiente para empezar. ¿Te interesa?";
    }
    
    // Respuesta por defecto
    return "Gracias por tu pregunta. Te puedo ayudar con información sobre:<br><br>🎯 Tipos de web y recomendaciones<br>⏱️ Tiempos de desarrollo<br>💰 Precios y qué incluyen<br>🌐 Hosting y dominios<br>📝 Contenidos y textos<br>🔍 SEO y posicionamiento<br><br>¿Sobre qué te gustaría saber más?";
} 