const footerHTML = `
  <footer class="site-footer">
    <div class="footer-content">

      <div class="footer-brand">
        <p class="tagline">For the culture</p>
        <p class="copyright">© 2026 MyHoop, Inc. All rights reserved.</p>
      </div>

      <nav class="footer-nav">
        <a href="index.html">Home</a>
        <a href="about.html">About</a>
        <a href="calendar.html">Calendar</a>
        <a href="contact.html">Contact</a>
      </nav>

      <div class="footer-social">
        <span class="location">Edmonton, AB</span>
        <a href="https://www.instagram.com/myhoophq" target="_blank" aria-label="Instagram" rel="noopener">
          <i class="fa-brands fa-instagram"></i>
        </a>
      </div>

    </div>
  </footer>
`;

const footerContainer = document.getElementById('footer-container');

if (footerContainer) {
  footerContainer.innerHTML = footerHTML;
}