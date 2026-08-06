/* ----------------------------------------------------
   SIVAPANDI R - PORTFOLIO INTERACTIVE SCRIPT
   Theme Switcher, Scroll Animations, PDF & ZIP Download
   ---------------------------------------------------- */

const API_BASE = (window.PORTFOLIO_API_BASE || '').replace(/\/$/, '');

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for content.js to render the admin-managed content first, so every
    // listener below binds to the final DOM. Resolves to null when offline.
    if (window.portfolioContentReady) {
        await window.portfolioContentReady.catch(() => null);
    }

    initTheme();
    initScrollProgress();
    initNavbar();
    initScrollAnimations();
    initModals();
    initCopyButtons();
    initResumePdfDownload();
    initZipDownload();
    setDynamicYear();
});

/* 1. Theme Switcher (Dark / Light Mode) */
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const defaultTheme = window.PORTFOLIO_DEFAULT_THEME || 'light';
    const savedTheme = localStorage.getItem('sivapandi-theme') || defaultTheme;

    document.documentElement.setAttribute('data-theme', savedTheme);

    if (!themeToggleBtn) return;

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sivapandi-theme', newTheme);
        showToast(`Switched to ${newTheme.toUpperCase()} mode`);
    });
}

/* 2. Top Scroll Progress Bar */
function initScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = `${scrollPercent}%`;
    });
}

/* 3. Sticky Navbar & Mobile Navigation */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const backToTopBtn = document.getElementById('back-to-top');

    // Sticky shadow & Back to Top visibility
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.style.boxShadow = 'var(--shadow-md)';
            } else {
                navbar.style.boxShadow = 'none';
            }
        });
    }

    // Mobile menu toggle
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu on click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileToggle) mobileToggle.classList.remove('active');
            if (navMenu) navMenu.classList.remove('active');
        });
    });

    // Back to top button action
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Active Nav Highlight on Scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;
        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 100;
            const sectionId = current.getAttribute('id');
            const link = document.querySelector(`.nav-link[href*="${sectionId}"]`);
            
            if (link) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    });
}

/* 4. Intersection Observer for Scroll Animations */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                
                // Animate progress bars inside skills section when visible
                if (entry.target.classList.contains('skill-category-card')) {
                    const fills = entry.target.querySelectorAll('.progress-fill');
                    fills.forEach(fill => {
                        const targetWidth = fill.style.width;
                        fill.style.width = '0%';
                        setTimeout(() => {
                            fill.style.width = targetWidth;
                        }, 100);
                    });
                }

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elementsToReveal = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    elementsToReveal.forEach(el => revealObserver.observe(el));
}

/* 5. Project Details Modals */
function initModals() {
    const openModalBtns = document.querySelectorAll('.open-modal');
    const closeBtns = document.querySelectorAll('.modal-close');
    const modals = document.querySelectorAll('.modal');

    openModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            const targetModal = document.getElementById(modalId);
            if (targetModal) {
                targetModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modals.forEach(modal => modal.classList.remove('active'));
            document.body.style.overflow = 'auto';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            modals.forEach(modal => modal.classList.remove('active'));
            document.body.style.overflow = 'auto';
        }
    });
}

/* 6. Copy to Clipboard Utility */
function initCopyButtons() {
    const copyableItems = document.querySelectorAll('.copyable');
    copyableItems.forEach(item => {
        item.addEventListener('click', () => {
            const textToCopy = item.getAttribute('data-copy');
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast(`Copied to clipboard: ${textToCopy}`);
                }).catch(() => {
                    showToast('Copied to clipboard!');
                });
            }
        });
    });
}

/* 7. Download PDF Resume Functionality
      Two modes, controlled from the Admin Panel → Resume:
        'file'     -> stream the PDF uploaded by the admin
        'generate' -> build the PDF in-browser from #printable-resume        */
function initResumePdfDownload() {
    const buttons = [
        document.getElementById('download-resume-btn'),
        ...document.querySelectorAll('[data-resume-download]')
    ].filter(Boolean);
    const printableElement = document.getElementById('printable-resume');

    const resumeConfig = () => (window.portfolioContent && window.portfolioContent.resume) || {};

    const downloadUploadedFile = () => {
        const cfg = resumeConfig();
        const a = document.createElement('a');
        a.href = `${API_BASE}/api/resume`;
        a.download = cfg.fileName || 'Resume.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Resume PDF downloaded successfully!');
    };

    const generatePdf = () => {
        const cfg = resumeConfig();
        if (typeof html2pdf === 'undefined' || !printableElement) {
            window.print();
            return;
        }
        // Display hidden printable container temporarily for rendering
        printableElement.style.display = 'block';

        const opt = {
            margin:       [0.4, 0.4, 0.4, 0.4],
            filename:     cfg.fileName || 'Resume.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(printableElement).save().then(() => {
            printableElement.style.display = 'none';
            showToast('Resume PDF downloaded successfully!');
            trackEvent('resume');
        }).catch(() => {
            printableElement.style.display = 'none';
            window.print();
        });
    };

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            showToast('Preparing Sivapandi R Resume PDF...');
            const cfg = resumeConfig();
            if (cfg.mode === 'file' && cfg.uploadedFile) {
                downloadUploadedFile();
            } else {
                generatePdf();
            }
        });
    });
}

/* 8. Download ZIP Source Code Button */
function initZipDownload() {
    const zipBtn = document.getElementById('download-zip-btn');
    if (!zipBtn) return;
    zipBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = `${API_BASE}/api/download/source`;
        a.download = 'sivapandi_portfolio.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Downloading Sivapandi Portfolio ZIP Archive...');
    });
}

/* 9. Contact Form — posts to the backend inbox (Admin Panel → Messages) */
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('contact-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtn = submitBtn ? submitBtn.innerHTML : '';

    const payload = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        subject: document.getElementById('subject').value.trim(),
        message: document.getElementById('message').value.trim()
    };

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    }

    try {
        const res = await fetch(`${API_BASE}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'Message could not be sent.');
        }

        const template =
            (window.portfolioContent &&
                window.portfolioContent.contact &&
                window.portfolioContent.contact.form &&
                window.portfolioContent.contact.form.successMessage) ||
            'Thank you, {name}! Your message has been sent successfully.';

        showToast(template.replace('{name}', payload.name));
        form.reset();
    } catch (err) {
        showToast(err.message || 'Something went wrong. Please email me directly.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtn;
        }
    }
}

/* 9b. Lightweight event counter for the admin dashboard */
function trackEvent(type) {
    fetch(`${API_BASE}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
        keepalive: true
    }).catch(() => {});
}

/* 10. Toast Notification Utility */
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/* 11. Dynamic Year Footer */
function setDynamicYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}
