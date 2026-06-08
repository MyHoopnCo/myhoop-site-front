const navbarHTML = `
  <nav class="navbar">
    <div class="nav-inner">

      <div class="nav-left">
        <a href="index.html" class="brand">
          <img src="images/global/Logo_NoWords.png" alt="MyHoop, Inc Logo" class="logo">
        </a>
      </div>

      <div class="nav-center">
        <a href="index.html">Home</a>
        <a href="about.html">About</a>
        <a href="calendar.html">Calendar</a>
        <a href="contact.html">Contact</a>
      </div>

      <div class="nav-right">
        <button class="hamburger" id="hamburger" aria-label="Open menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

    </div>
  </nav>

  <div class="mobile-overlay" id="mobileOverlay"></div>
  <div class="mobile-menu" id="mobileMenu">
    <button class="mobile-menu-close" id="mobileClose">✕</button>
    <nav class="mobile-nav">
      <a href="index.html">Home</a>
      <a href="about.html">About</a>
      <a href="calendar.html">Calendar</a>
      <a href="contact.html">Contact</a>
    </nav>
  </div>
`;

const navbarContainer = document.getElementById('navbar-container');

if (navbarContainer) {
  navbarContainer.innerHTML = navbarHTML;
}

const hamburger     = document.getElementById('hamburger');
const mobileMenu    = document.getElementById('mobileMenu');
const mobileOverlay = document.getElementById('mobileOverlay');
const mobileClose   = document.getElementById('mobileClose');

function openMenu() {
  mobileMenu.classList.add('open');
  mobileOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  mobileMenu.classList.remove('open');
  mobileOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', openMenu);
mobileClose.addEventListener('click', closeMenu);
mobileOverlay.addEventListener('click', closeMenu);