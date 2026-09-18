import { ACCESS_CODES } from './codes.js';

const ACCESS_STORAGE_KEY = 'weddingAccess';

const VIEW_FILES = {
    full: './views/full.html',
    evening: './views/evening.html'
};

const menuToggle = document.querySelector('.menu-toggle');
const navigationLinks = document.querySelector('.navigation-links');
const accessGate = document.querySelector('#access-gate');
const accessForm = document.querySelector('#access-form');
const accessInput = document.querySelector('#access-code');
const accessError = document.querySelector('#access-error');
const viewDay = document.querySelector('#view-day');
const viewFaqs = document.querySelector('#view-faqs');

const loadedViews = new Map();

function getStoredAccess() {
    try {
        const stored = localStorage.getItem(ACCESS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

function lookupAccess(code) {
    const normalised = String(code).trim();

    if (!/^\d+$/.test(normalised)) {
        return null;
    }

    return ACCESS_CODES[Number(normalised)] || null;
}

function layoutTimeline() {
    const items = [...document.querySelectorAll('.timeline-item')];

    items.forEach((item, index) => {
        item.classList.toggle('is-left', index % 2 === 0);
        item.classList.toggle('is-right', index % 2 === 1);
    });
}

async function loadView(access) {
    const viewPath = VIEW_FILES[access];

    if (!viewPath) {
        throw new Error(`No view found for access type: ${access}`);
    }

    if (!loadedViews.has(access)) {
        const response = await fetch(viewPath);

        if (!response.ok) {
            throw new Error(`Could not load ${viewPath}`);
        }

        loadedViews.set(access, await response.text());
    }

    const doc = new DOMParser().parseFromString(loadedViews.get(access), 'text/html');
    const dayContent = doc.querySelector('[data-slot="day"]');
    const faqContent = doc.querySelector('[data-slot="faqs"]');

    viewDay.replaceChildren(...(dayContent ? [...dayContent.childNodes] : []));
    viewFaqs.replaceChildren(...(faqContent ? [...faqContent.childNodes] : []));
    layoutTimeline();
}

async function unlockSite(access) {
    await loadView(access);
    document.body.classList.remove('is-locked');
    accessGate.setAttribute('aria-hidden', 'true');
}

function lockSite() {
    document.body.classList.add('is-locked');
    accessGate.removeAttribute('aria-hidden');
    accessInput.focus();
}

if (menuToggle && navigationLinks) {
    menuToggle.addEventListener('click', () => {
        if (document.body.classList.contains('is-locked')) {
            return;
        }

        const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';

        menuToggle.setAttribute('aria-expanded', String(!isOpen));
        navigationLinks.style.display = isOpen ? '' : 'flex';
    });
}

accessForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const access = lookupAccess(accessInput.value);

    if (!access) {
        accessError.hidden = false;
        accessInput.focus();
        accessInput.select();
        return;
    }

    try {
        await unlockSite(access);
        localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify({
            code: accessInput.value.trim(),
            access
        }));
        accessError.hidden = true;
    } catch {
        accessError.hidden = false;
        accessError.textContent = 'Something went wrong loading the site. Please try again.';
    }
});

accessInput.addEventListener('input', () => {
    accessError.hidden = true;
    accessError.textContent = "That code isn't recognised. Please check your invitation and try again.";
});

async function start() {
    const storedAccess = getStoredAccess();
    const restoredAccess = storedAccess ? lookupAccess(storedAccess.code) : null;

    if (!restoredAccess) {
        lockSite();
        return;
    }

    try {
        await unlockSite(restoredAccess);
    } catch {
        localStorage.removeItem(ACCESS_STORAGE_KEY);
        lockSite();
    }
}

start();
