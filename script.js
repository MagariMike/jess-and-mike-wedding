import { GUESTS } from './codes.js';

const ACCESS_STORAGE_KEY = 'weddingAccess';

const VIEW_FILES = {
    full: './views/full.html',
    evening: './views/evening.html',
    'out-of-town': './views/out-of-town.html'
};

const DEFAULT_ERROR =
    "That code isn't recognised. Please check your invitation and try again.";

/* Palette-matched confetti colours (matcha, velvet, pink silk, moss + soft accents) */
const CONFETTI_COLORS = [
    '#b4a64b',
    '#591e2a',
    '#d6a6b1',
    '#464719',
    '#f3efe3',
    '#f4eaed'
];

const siteRoot = document.querySelector('#site');
const accessGate = document.querySelector('#access-gate');
const accessForm = document.querySelector('#access-form');
const accessInput = document.querySelector('#access-code');
const accessError = document.querySelector('#access-error');

// Cache each view after the first load so switching guests is snappy
const loadedViews = new Map();
let confettiRunning = false;
let rsvpConfettiTimer = null;


function findGuest(code) {
    const entered = String(code).trim().toLowerCase();

    if (!entered) {
        return null;
    }

    return GUESTS.find(
        (guest) => guest.code.toLowerCase() === entered
    ) || null;
}


function getStoredGuest() {
    try {
        const stored = localStorage.getItem(ACCESS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}


function rememberGuest(guest, enteredCode) {
    localStorage.setItem(
        ACCESS_STORAGE_KEY,
        JSON.stringify({
            code: enteredCode,
            name: guest.name,
            access: guest.access
        })
    );
}


function showError(message) {
    accessError.textContent = message;
    accessError.hidden = false;
}


function clearError() {
    accessError.hidden = true;
    accessError.textContent = DEFAULT_ERROR;
}


function layoutTimeline() {
    const items = document.querySelectorAll('.timeline-item');

    items.forEach((item, index) => {
        const isLeft = index % 2 === 0;
        item.classList.toggle('is-left', isLeft);
        item.classList.toggle('is-right', !isLeft);
    });
}


function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navigationLinks = document.querySelector('.navigation-links');

    if (!menuToggle || !navigationLinks) {
        return;
    }

    menuToggle.addEventListener('click', () => {
        const isOpen =
            menuToggle.getAttribute('aria-expanded') === 'true';

        menuToggle.setAttribute('aria-expanded', String(!isOpen));
    });
}


function setupLogout() {
    const logoutButton = document.querySelector('.nav-logout');

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener('click', () => {
        logout();
    });
}


function logout() {
    localStorage.removeItem(ACCESS_STORAGE_KEY);
    siteRoot.replaceChildren();
    accessInput.value = '';
    clearError();
    lockSite();
}


async function loadView(access) {
    const viewPath = VIEW_FILES[access];

    if (!viewPath) {
        throw new Error(`Unknown access type: ${access}`);
    }

    if (!loadedViews.has(access)) {
        const response = await fetch(viewPath);

        if (!response.ok) {
            throw new Error(`Could not load ${viewPath}`);
        }

        loadedViews.set(access, await response.text());
    }

    const html = loadedViews.get(access);
    const doc = new DOMParser().parseFromString(html, 'text/html');

    siteRoot.replaceChildren(...doc.body.childNodes);

    setupMobileMenu();
    setupLogout();
    layoutTimeline();
}


function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


function launchConfetti(options = {}) {
    if (prefersReducedMotion()) {
        return;
    }

    const mode = options.mode || 'rain';
    const duration = options.duration ?? (mode === 'explode' ? 5500 : 14000);

    // Welcome rain should still avoid stacking on itself
    if (mode === 'rain' && confettiRunning) {
        return;
    }

    if (mode === 'rain') {
        confettiRunning = true;
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const pieces = [];
    const start = performance.now();
    // Physics values were tuned for ~60fps; scale by dt so mobile
    // (often 30fps / throttled) falls at the same real-world speed.
    const FRAME_MS = 1000 / 60;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastFrame = start;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnBurst() {
        if (mode === 'explode') {
            const originX = options.x ?? width / 2;
            const originY = options.y ?? height / 2;
            const count = options.count ?? Math.min(110, Math.floor(width / 8));

            for (let i = 0; i < count; i += 1) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3.5 + Math.random() * 9;

                pieces.push({
                    x: originX + (Math.random() - 0.5) * 12,
                    y: originY + (Math.random() - 0.5) * 8,
                    w: 6 + Math.random() * 7,
                    h: 8 + Math.random() * 11,
                    color: CONFETTI_COLORS[
                        Math.floor(Math.random() * CONFETTI_COLORS.length)
                    ],
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - (1.5 + Math.random() * 3),
                    maxVy: 3.2 + Math.random() * 1.4,
                    gravity: 0.14 + Math.random() * 0.08,
                    drag: 0.985,
                    rotation: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 0.28,
                    wobble: Math.random() * Math.PI * 2,
                    wobbleSpeed: 0.03 + Math.random() * 0.05,
                    wobbleAmp: 0.4 + Math.random() * 0.7,
                    opacity: 1
                });
            }

            return;
        }

        const count = Math.min(120, Math.floor(width / 9));

        for (let i = 0; i < count; i += 1) {
            pieces.push({
                x: Math.random() * width,
                y: -30 - Math.random() * height * 0.35,
                w: 6 + Math.random() * 7,
                h: 8 + Math.random() * 11,
                color: CONFETTI_COLORS[
                    Math.floor(Math.random() * CONFETTI_COLORS.length)
                ],
                vx: (Math.random() - 0.5) * 1.2,
                vy: 0.35 + Math.random() * 0.55,
                maxVy: 0.9 + Math.random() * 0.7,
                gravity: 0.004 + Math.random() * 0.005,
                drag: 0.995,
                rotation: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.08,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.03,
                wobbleAmp: 0.6 + Math.random() * 0.9,
                opacity: 1
            });
        }
    }

    function frame(now) {
        const elapsed = now - start;
        // Cap so a backgrounded tab doesn't teleport pieces on resume
        const dt = Math.min((now - lastFrame) / FRAME_MS, 3);
        lastFrame = now;
        const fadeStart = duration * (mode === 'explode' ? 0.55 : 0.88);

        ctx.clearRect(0, 0, width, height);

        for (let i = pieces.length - 1; i >= 0; i -= 1) {
            const p = pieces[i];

            p.vy = Math.min(p.vy + p.gravity * dt, p.maxVy);
            p.vx *= Math.pow(p.drag, dt);
            p.x += (p.vx + Math.sin(p.wobble) * p.wobbleAmp) * dt;
            p.y += p.vy * dt;
            p.rotation += p.spin * dt;
            p.wobble += p.wobbleSpeed * dt;

            if (elapsed > fadeStart) {
                p.opacity = Math.max(
                    0,
                    1 - (elapsed - fadeStart) / (duration - fadeStart)
                );
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();

            if (
                p.y > height + 40
                || p.x < -60
                || p.x > width + 60
                || p.opacity <= 0
            ) {
                pieces.splice(i, 1);
            }
        }

        if (elapsed < duration || pieces.length > 0) {
            requestAnimationFrame(frame);
            return;
        }

        window.removeEventListener('resize', resize);
        canvas.remove();

        if (mode === 'rain') {
            confettiRunning = false;
        }
    }

    resize();
    spawnBurst();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
}


function burstFromElement(element, count = 100) {
    if (!element) {
        return;
    }

    const rect = element.getBoundingClientRect();

    launchConfetti({
        mode: 'explode',
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        count
    });
}


function burstRsvpConfetti() {
    burstFromElement(document.querySelector('#rsvp .button'), 100);
}


function setupRsvpConfetti() {
    if (rsvpConfettiTimer) {
        clearInterval(rsvpConfettiTimer);
        rsvpConfettiTimer = null;
    }

    if (prefersReducedMotion() || !document.querySelector('#rsvp .button')) {
        return;
    }

    rsvpConfettiTimer = setInterval(burstRsvpConfetti, 5000);
}


async function unlockSite(guest) {
    await loadView(guest.access);

    document.body.classList.remove('is-locked');
    accessGate.hidden = true;
    launchConfetti();
    setupRsvpConfetti();
}


function lockSite() {
    if (rsvpConfettiTimer) {
        clearInterval(rsvpConfettiTimer);
        rsvpConfettiTimer = null;
    }

    document.body.classList.add('is-locked');
    accessGate.hidden = false;
    accessInput.focus();
}


accessForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const enteredCode = accessInput.value.trim();
    const guest = findGuest(enteredCode);

    if (!guest) {
        showError(DEFAULT_ERROR);
        accessInput.focus();
        accessInput.select();
        return;
    }

    try {
        await unlockSite(guest);
        rememberGuest(guest, enteredCode);
        clearError();
    } catch {
        showError('Something went wrong loading the site. Please try again.');
    }
});


accessInput.addEventListener('input', () => {
    clearError();
});


async function start() {
    const stored = getStoredGuest();
    const guest = stored ? findGuest(stored.code) : null;

    if (!guest) {
        lockSite();
        return;
    }

    try {
        await unlockSite(guest);
    } catch {
        localStorage.removeItem(ACCESS_STORAGE_KEY);
        lockSite();
    }
}


start();
