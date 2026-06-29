// Common JavaScript functionality for Smart Learning Advisor

document.addEventListener('DOMContentLoaded', function () {
    // Initialize tooltips
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="popover"]'));
    const popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Auto-hide alerts with fade-out
    const alerts = document.querySelectorAll('.alert-auto-hide');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.classList.add('fade');
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }, 500);
        }, 5000);
    });

    // Smooth scroll for anchor links with fallback
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            // fix  'querySelector' on 'Document': '#' is not a valid selector.
            if (!href || href === '#') return;
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                if ('scrollBehavior' in document.documentElement.style) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    window.scrollTo(0, target.offsetTop);
                }
            }
        });
    });

    // Loading states for forms with prevent double-submit
    const forms = document.querySelectorAll('form[data-loading]');
    forms.forEach(form => {
        form.addEventListener('submit', function (e) {
            if (form.dataset.submitted) {
                e.preventDefault(); // Already submitted
                return;
            }
            form.dataset.submitted = 'true';

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';

                // Reset as fallback
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    form.dataset.submitted = ''; // allow retry
                }, 10000);
            }
        });
    });

    updateActiveNavigation();
    observeElements();
    setupDarkModeToggle(); // Moved into the main DOMContentLoaded
});

// Update active navigation based on current page
function updateActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href) && href !== '/') {
            link.classList.add('active');
        }
    });
}

// Intersection Observer for animations with unobserve
function observeElements() {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                obs.unobserve(entry.target); // Prevent re-triggering
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.card, .alert, .table').forEach(el => {
        observer.observe(el);
    });
}

// Utility functions
window.SLA = {
    // Show notification
    showNotification: function (message, type = 'info') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show alert-auto-hide" role="alert">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        const main = document.querySelector('main');
        if (main) {
            main.insertAdjacentHTML('afterbegin', alertHtml);
        }
    },

    // Format number
    formatNumber: function (num) {
        return new Intl.NumberFormat('vi-VN').format(num);
    },

    // Format date
    formatDate: function (date) {
        return new Intl.DateTimeFormat('vi-VN').format(new Date(date));
    },

    // Copy to clipboard with fallback
    copyToClipboard: function (text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Đã sao chép vào clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Không thể sao chép!', 'danger');
            });
        } else {
            const temp = document.createElement('textarea');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            try {
                document.execCommand('copy');
                this.showNotification('Đã sao chép vào clipboard!', 'success');
            } catch (err) {
                this.showNotification('Không thể sao chép!', 'danger');
            }
            document.body.removeChild(temp);
        }
    },

    // Confirm dialog
    confirm: function (message, callback) {
        if (confirm(message)) {
            callback();
        }
    }
};

// Dark mode toggle
function setupDarkModeToggle() {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('sla-dark-mode', isDark);

            // Toggle icon
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-moon', !isDark);
                icon.classList.toggle('fa-sun', isDark);
            }
        });
        
        // Apply saved preference on load
        if (localStorage.getItem('sla-dark-mode') === 'true') {
            document.body.classList.add('dark-mode');
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    }
}

/// click to get descriptive courses from courseDescrition.json
let coursesData = [];

async function loadCourses() {
    try {
        const response = await fetch('/courseDescription.json');
        coursesData = await response.json();
        setupClickableRows();
    } catch (error) {
        console.error('Failed to load courses.json', error);
    }
}

function setupClickableRows() {
    document.querySelectorAll('.clickable-row').forEach(row => {
        row.addEventListener('click', function() {
            const courseId = this.getAttribute('data-id');
            const course = coursesData.find(c => 
                c.id.trim().toUpperCase() === courseId.trim().toUpperCase()
            );

            document.getElementById('course-id').innerText = courseId;
            document.getElementById('course-name').innerText = course?.name || 'Không tìm thấy thông tin';
            document.getElementById('course-english').innerText = course?.english || '';
            document.getElementById('course-objective').innerText = course?.objective || '';
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    loadCourses();
    updateActiveNavigation();
    observeElements();
    setupDarkModeToggle();
   
});





// fix toggle is not fined out of the scope, move it to setupDarkModeToggle()


// toggle.addEventListener('click', () => {
//     document.body.classList.toggle('dark-mode');
//     const isDark = document.body.classList.contains('dark-mode');
//     localStorage.setItem('sla-dark-mode', isDark);

//     const icon = toggle.querySelector('i');
//     icon.classList.toggle('fa-moon', !isDark);
//     icon.classList.toggle('fa-sun', isDark);
// });


// Add animation CSS if not already present
if (!document.querySelector('#animation-styles')) {
    const style = document.createElement('style');
    style.id = 'animation-styles';
    style.textContent = `
        .animate-in {
            animation: slideInUp 0.6s ease-out forwards;
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .card, .alert, .table {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.3s ease-out;
        }

        .card.animate-in, .alert.animate-in, .table.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
}
