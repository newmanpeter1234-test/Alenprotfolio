/* ============================================================
   ALEN PETER PORTFOLIO — ANTIGRAVITY ENGINE
   3D Grid, Physics Tilt, Theme Manager, Scroll Animations
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ──────────────────────────────────────────────
    //  GLOBAL STATE
    // ──────────────────────────────────────────────
    const state = {
        mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        scroll: 0,
        theme: localStorage.getItem('ap-theme') || 'dark',
    };


    // ──────────────────────────────────────────────
    //  1. DYNAMIC 3D GRID BACKGROUND
    // ──────────────────────────────────────────────
    class Grid3D {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.resize();
            this.tick = 0;
            this.animate = this.animate.bind(this);
            window.addEventListener('resize', () => this.resize());
            this.animate();
        }

        resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = window.innerWidth * dpr;
            this.canvas.height = window.innerHeight * dpr;
            this.canvas.style.width = window.innerWidth + 'px';
            this.canvas.style.height = window.innerHeight + 'px';
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.w = window.innerWidth;
            this.h = window.innerHeight;
        }

        getThemeColors() {
            const style = getComputedStyle(document.documentElement);
            return {
                grid: style.getPropertyValue('--grid-color').trim(),
                bright: style.getPropertyValue('--grid-bright').trim(),
            };
        }

        animate() {
            this.tick += 0.003;
            const ctx = this.ctx;
            const { w, h } = this;
            const { grid, bright } = this.getThemeColors();

            ctx.clearRect(0, 0, w, h);

            // Cursor influence
            const mx = state.mouse.x / w;
            const my = state.mouse.y / h;

            const gridSpacing = 60;
            const perspective = 800;
            const vanishY = h * 0.35;
            const horizonOffset = (mx - 0.5) * 120;

            // Draw horizontal lines (perspective converging)
            const numH = 30;
            for (let i = 0; i <= numH; i++) {
                const t = i / numH;
                const depth = Math.pow(t, 2.2);
                const y = vanishY + (h - vanishY) * depth;
                const spread = 1 - depth * 0.4;

                const x1 = w / 2 - (w * spread) / 2 + horizonOffset * (1 - depth);
                const x2 = w / 2 + (w * spread) / 2 + horizonOffset * (1 - depth);

                // Cursor proximity glow
                const distToMouse = Math.abs(y - state.mouse.y) / h;
                const glow = Math.max(0, 1 - distToMouse * 4);

                ctx.beginPath();
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
                ctx.strokeStyle = glow > 0.1 ? bright : grid;
                ctx.lineWidth = 0.5 + glow * 1.2;
                ctx.globalAlpha = 0.3 + glow * 0.5 + Math.sin(this.tick * 2 + i * 0.3) * 0.05;
                ctx.stroke();
            }

            // Draw vertical lines (converging to vanishing point)
            const numV = 24;
            for (let i = 0; i <= numV; i++) {
                const t = (i / numV - 0.5) * 2; // -1 to 1
                const topX = w / 2 + t * 80 + horizonOffset;
                const bottomX = w / 2 + t * (w * 0.7) + horizonOffset * 0.2;

                const distToMouse = Math.abs(bottomX - state.mouse.x) / w;
                const glow = Math.max(0, 1 - distToMouse * 3);

                ctx.beginPath();
                ctx.moveTo(topX, vanishY);
                ctx.lineTo(bottomX, h + 20);
                ctx.strokeStyle = glow > 0.1 ? bright : grid;
                ctx.lineWidth = 0.4 + glow * 1;
                ctx.globalAlpha = 0.2 + glow * 0.4 + Math.sin(this.tick * 2 + i * 0.4) * 0.05;
                ctx.stroke();
            }

            // Horizon glow
            const gradient = ctx.createRadialGradient(
                w / 2 + horizonOffset, vanishY, 0,
                w / 2 + horizonOffset, vanishY, w * 0.5
            );
            const accentRGB = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
            gradient.addColorStop(0, `rgba(${accentRGB}, 0.06)`);
            gradient.addColorStop(0.5, `rgba(${accentRGB}, 0.02)`);
            gradient.addColorStop(1, 'transparent');
            ctx.globalAlpha = 1;
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Floating grid dots at intersections (sparse)
            ctx.globalAlpha = 0.4;
            for (let i = 0; i < numH; i += 3) {
                const t = i / numH;
                const depth = Math.pow(t, 2.2);
                const y = vanishY + (h - vanishY) * depth;
                const spread = 1 - depth * 0.4;

                for (let j = 0; j <= numV; j += 3) {
                    const vt = (j / numV - 0.5) * 2;
                    const x = w / 2 + vt * (w * spread * 0.5) + horizonOffset * (1 - depth);

                    const dx = x - state.mouse.x;
                    const dy = y - state.mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const glow = Math.max(0, 1 - dist / 250);

                    if (glow > 0) {
                        ctx.beginPath();
                        ctx.arc(x, y, 1.5 + glow * 2, 0, Math.PI * 2);
                        ctx.fillStyle = bright;
                        ctx.globalAlpha = 0.3 + glow * 0.7;
                        ctx.fill();
                    }
                }
            }

            ctx.globalAlpha = 1;
            requestAnimationFrame(this.animate);
        }
    }


    // ──────────────────────────────────────────────
    //  2. PHYSICS-BASED CARD TILT
    // ──────────────────────────────────────────────
    class PhysicsCard {
        constructor(element) {
            this.el = element;
            this.rotateX = 0;
            this.rotateY = 0;
            this.targetRX = 0;
            this.targetRY = 0;
            this.velX = 0;
            this.velY = 0;
            this.spring = 0.06;
            this.damping = 0.88;
            this.isHovered = false;
            this.baseTransform = '';

            this.el.addEventListener('mouseenter', () => { this.isHovered = true; });
            this.el.addEventListener('mouseleave', () => {
                this.isHovered = false;
                this.targetRX = 0;
                this.targetRY = 0;
            });
            this.el.addEventListener('mousemove', (e) => this.onMove(e));
        }

        onMove(e) {
            if (!this.isHovered) return;
            const rect = this.el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const px = (e.clientX - cx) / (rect.width / 2);
            const py = (e.clientY - cy) / (rect.height / 2);
            this.targetRY = px * 8;   // horizontal mouse → Y rotation
            this.targetRX = -py * 6;  // vertical mouse → X rotation
        }

        update() {
            const forceX = (this.targetRX - this.rotateX) * this.spring;
            const forceY = (this.targetRY - this.rotateY) * this.spring;
            this.velX = (this.velX + forceX) * this.damping;
            this.velY = (this.velY + forceY) * this.damping;
            this.rotateX += this.velX;
            this.rotateY += this.velY;

            if (Math.abs(this.velX) > 0.001 || Math.abs(this.velY) > 0.001 ||
                Math.abs(this.targetRX - this.rotateX) > 0.01 ||
                Math.abs(this.targetRY - this.rotateY) > 0.01) {
                this.el.style.transform =
                    `perspective(900px) rotateX(${this.rotateX.toFixed(2)}deg) rotateY(${this.rotateY.toFixed(2)}deg)`;
            }
        }
    }


    // ──────────────────────────────────────────────
    //  3. PHYSICS CHIP (Spring wobble)
    // ──────────────────────────────────────────────
    class PhysicsChip {
        constructor(el) {
            this.el = el;
            this.angle = 0;
            this.targetAngle = 0;
            this.velocity = 0;
            this.spring = 0.2;
            this.damping = 0.75;
            this.scale = 1;
            this.targetScale = 1;

            this.el.addEventListener('mouseenter', () => {
                this.targetAngle = (Math.random() - 0.5) * 10;
                this.targetScale = 1.08;
            });
            this.el.addEventListener('mouseleave', () => {
                this.targetAngle = 0;
                this.targetScale = 1;
            });
        }

        update() {
            const force = (this.targetAngle - this.angle) * this.spring;
            this.velocity = (this.velocity + force) * this.damping;
            this.angle += this.velocity;
            this.scale += (this.targetScale - this.scale) * 0.12;

            if (Math.abs(this.velocity) > 0.01 || Math.abs(this.targetAngle - this.angle) > 0.1 ||
                Math.abs(this.targetScale - this.scale) > 0.001) {
                this.el.style.transform =
                    `rotate(${this.angle.toFixed(2)}deg) scale(${this.scale.toFixed(3)})`;
            }
        }
    }


    // ──────────────────────────────────────────────
    //  4. THEME MANAGER
    // ──────────────────────────────────────────────
    class ThemeManager {
        constructor() {
            this.toggle = document.getElementById('theme-toggle');
            this.toggleMobile = document.getElementById('theme-toggle-mobile');
            this.apply(state.theme);
            this.toggle.addEventListener('click', () => this.switch());
            if (this.toggleMobile) {
                this.toggleMobile.addEventListener('click', () => this.switch());
            }
        }

        apply(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            state.theme = theme;
            localStorage.setItem('ap-theme', theme);
        }

        switch() {
            const next = state.theme === 'dark' ? 'light' : 'dark';
            this.apply(next);
        }
    }


    // ──────────────────────────────────────────────
    //  5. SCROLL REVEAL
    // ──────────────────────────────────────────────
    class ScrollReveal {
        constructor() {
            this.elements = document.querySelectorAll('.reveal');
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        this.observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

            this.elements.forEach(el => this.observer.observe(el));
        }
    }


    // ──────────────────────────────────────────────
    //  6. NAVIGATION ACTIVE STATE & HIDE ON SCROLL
    // ──────────────────────────────────────────────
    class NavManager {
        constructor() {
            this.nav = document.getElementById('main-nav');
            this.links = document.querySelectorAll('.nav-link');
            this.sections = ['hero', 'work-history', 'expertise', 'education'];
            this.prevScroll = 0;
            this.scrollIndicator = document.getElementById('scroll-indicator');

            window.addEventListener('scroll', () => this.onScroll(), { passive: true });

            // Smooth scroll for nav links
            this.links.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(link.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });

            // Also handle CTA buttons
            document.querySelectorAll('.btn[href^="#"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(btn.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        }

        onScroll() {
            const y = window.scrollY;

            // Hide/show nav
            if (y > 200 && y > this.prevScroll) {
                this.nav.classList.add('nav-hidden');
            } else {
                this.nav.classList.remove('nav-hidden');
            }
            this.prevScroll = y;

            // Hide scroll indicator
            if (y > 100 && this.scrollIndicator) {
                this.scrollIndicator.classList.add('hidden');
            } else if (this.scrollIndicator) {
                this.scrollIndicator.classList.remove('hidden');
            }

            // Active section
            let currentSection = '';
            this.sections.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= window.innerHeight / 3) {
                        currentSection = id;
                    }
                }
            });

            this.links.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + currentSection) {
                    link.classList.add('active');
                }
            });
        }
    }


    // ──────────────────────────────────────────────
    //  7. AMBIENT PARTICLES
    // ──────────────────────────────────────────────
    class AmbientParticles {
        constructor() {
            this.container = document.getElementById('particles-container');
            this.count = Math.min(20, Math.floor(window.innerWidth / 80));
            this.spawn();
        }

        spawn() {
            for (let i = 0; i < this.count; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = Math.random() * 100 + '%';
                p.style.animationDuration = (12 + Math.random() * 20) + 's';
                p.style.animationDelay = -(Math.random() * 25) + 's';
                p.style.setProperty('--drift-x', (Math.random() - 0.5) * 80 + 'px');
                p.style.width = (2 + Math.random() * 3) + 'px';
                p.style.height = p.style.width;
                this.container.appendChild(p);
            }
        }
    }


    // ──────────────────────────────────────────────
    //  8. MOBILE DRAWER
    // ──────────────────────────────────────────────
    class MobileDrawer {
        constructor() {
            this.hamburger = document.getElementById('hamburger-btn');
            this.drawer = document.getElementById('mobile-drawer');
            this.overlay = document.getElementById('mobile-overlay');
            this.closeBtn = document.getElementById('drawer-close');
            this.drawerLinks = document.querySelectorAll('.drawer-link');
            this.isOpen = false;

            if (!this.hamburger || !this.drawer) return;

            this.hamburger.addEventListener('click', () => this.toggle());
            this.closeBtn.addEventListener('click', () => this.close());
            this.overlay.addEventListener('click', () => this.close());

            // Close drawer when a link is clicked & smooth scroll
            this.drawerLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(link.getAttribute('href'));
                    this.close();
                    if (target) {
                        setTimeout(() => {
                            target.scrollIntoView({ behavior: 'smooth' });
                        }, 350); // wait for drawer close animation
                    }
                });
            });

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) this.close();
            });
        }

        toggle() {
            this.isOpen ? this.close() : this.open();
        }

        open() {
            this.isOpen = true;
            this.hamburger.classList.add('active');
            this.drawer.classList.add('open');
            this.overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        close() {
            this.isOpen = false;
            this.hamburger.classList.remove('active');
            this.drawer.classList.remove('open');
            this.overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }


    // ──────────────────────────────────────────────
    //  INITIALIZATION
    // ──────────────────────────────────────────────

    // Track mouse
    document.addEventListener('mousemove', (e) => {
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;
    });

    // Start systems
    const canvas = document.getElementById('grid-canvas');
    const grid = new Grid3D(canvas);
    const themeManager = new ThemeManager();
    const scrollReveal = new ScrollReveal();
    const navManager = new NavManager();
    const particles = new AmbientParticles();
    const mobileDrawer = new MobileDrawer();

    // Physics cards
    const physicsCards = [];
    document.querySelectorAll('.physics-card').forEach(el => {
        physicsCards.push(new PhysicsCard(el));
    });

    // Physics chips
    const physicsChips = [];
    document.querySelectorAll('.physics-chip').forEach(el => {
        physicsChips.push(new PhysicsChip(el));
    });

    // Main physics loop
    function physicsLoop() {
        physicsCards.forEach(c => c.update());
        physicsChips.forEach(c => c.update());
        requestAnimationFrame(physicsLoop);
    }
    physicsLoop();

    // Typewriter-like subtle entrance for hero name
    const heroName = document.getElementById('hero-name');
    if (heroName) {
        heroName.style.opacity = '0';
        heroName.style.transform = 'translateY(20px)';
        heroName.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        setTimeout(() => {
            heroName.style.opacity = '1';
            heroName.style.transform = 'translateY(0)';
        }, 300);
    }

    const heroGreeting = document.getElementById('hero-greeting');
    if (heroGreeting) {
        heroGreeting.style.opacity = '0';
        heroGreeting.style.transform = 'translateY(15px)';
        heroGreeting.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        setTimeout(() => {
            heroGreeting.style.opacity = '1';
            heroGreeting.style.transform = 'translateY(0)';
        }, 100);
    }

    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
        heroTitle.style.opacity = '0';
        heroTitle.style.transform = 'translateY(15px)';
        heroTitle.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        setTimeout(() => {
            heroTitle.style.opacity = '1';
            heroTitle.style.transform = 'translateY(0)';
        }, 500);
    }

    const heroDesc = document.getElementById('hero-description');
    if (heroDesc) {
        heroDesc.style.opacity = '0';
        heroDesc.style.transition = 'opacity 0.8s ease';
        setTimeout(() => {
            heroDesc.style.opacity = '1';
        }, 700);
    }

    console.log('✨ Antigravity Portfolio Engine initialized');
});
