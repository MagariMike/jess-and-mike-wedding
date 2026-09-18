
const menuToggle = document.querySelector('.menu-toggle');
const navigationLinks = document.querySelector('.navigation-links');

menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';

    menuToggle.setAttribute('aria-expanded', String(!isOpen));

    navigationLinks.style.display = isOpen ? '' : 'flex';
});

