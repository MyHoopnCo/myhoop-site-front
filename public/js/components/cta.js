const ctaHTML = `
  <section class="cta">
    <h2>Stay Connected</h2>
    <p>Get updates on events, drops, and community runs.</p>

    <form id="ctaSubscribe" class="cta-form">
      <input
        id="email"
        type="email"
        placeholder="Enter your email"
        required
      >
      <button type="submit">Join the Community</button>
    </form>

    <div id="subConfirmation" class="sub-confirmation"></div>

    <span class="cta-note">No spam. Just basketball news.</span>
  </section>
`;

const ctaContainer = document.getElementById('cta-container');

if (ctaContainer) {
  ctaContainer.innerHTML = ctaHTML;
}