import { GUESTS } from './codes.js';

const ACCESS_STORAGE_KEY = 'weddingAccess';

const VIEW_FILES = {
    full: './views/full.html',
    evening: './views/evening.html'
};

const DEFAULT_ERROR =
    "That code isn't recognised. Please check your invitation and try again.";

const siteRoot = document.querySelector('#site');
const accessGate = document.querySelector('#access-gate');
const accessForm = document.querySelector('#access-form');
const accessInput = document.querySelector('#access-code');
const accessError = document.querySelector('#access-error');

// Cache each view after the first load so switching guests is snappy
const loadedViews = new Map();


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


async function unlockSite(guest) {
    await loadView(guest.access);

    document.body.classList.remove('is-locked');
    accessGate.hidden = true;
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
