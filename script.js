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
    layoutTimeline();
}


function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


function launchConfetti() {
    if (confettiRunning || prefersReducedMotion()) {
        return;
    }

    confettiRunning = true;

    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const pieces = [];
    const duration = 14000;
    const start = performance.now();
    let width = 0;
    let height = 0;
    let dpr = 1;

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
        const fadeStart = duration * 0.88;

        ctx.clearRect(0, 0, width, height);

        for (let i = pieces.length - 1; i >= 0; i -= 1) {
            const p = pieces[i];

            p.vy = Math.min(p.vy + p.gravity, p.maxVy);
            p.vx *= p.drag;
            p.x += p.vx + Math.sin(p.wobble) * p.wobbleAmp;
            p.y += p.vy;
            p.rotation += p.spin;
            p.wobble += p.wobbleSpeed;

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

            if (p.y > height + 40 || p.opacity <= 0) {
                pieces.splice(i, 1);
            }
        }

        if (elapsed < duration || pieces.length > 0) {
            requestAnimationFrame(frame);
            return;
        }

        window.removeEventListener('resize', resize);
        canvas.remove();
        confettiRunning = false;
    }

    resize();
    spawnBurst();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
}


async function unlockSite(guest) {
    await loadView(guest.access);

    document.body.classList.remove('is-locked');
    accessGate.hidden = true;
    launchConfetti();
}


function lockSite() {
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
