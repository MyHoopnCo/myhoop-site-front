import { submitSignup } from "../data/mock-data.js";

const signupHTML = `
  <section class="cta">
    <h2>Get In The Mix</h2>
    <p>Sign up to get notified about runs, events, and exposure opportunities.</p>

    <form id="signupForm" class="cta-form">
      <input id="signupName" name="name" type="text" placeholder="Full name" required>
      <input id="signupEmail" name="email" type="email" placeholder="Email" required>
      <input id="signupCity" name="city" type="text" placeholder="City">
      <button type="submit">Sign Up</button>
    </form>

    <div id="signupStatus" class="signup-status"></div>
  </section>
`;

const signupContainer = document.getElementById('signup-container');

if (signupContainer) {
  signupContainer.innerHTML = signupHTML;
}

const form = document.getElementById('signupForm');
const status = document.getElementById('signupStatus');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    city: form.elements.city.value.trim(),
  };

  if (!payload.name || !payload.email) {
    status.textContent = 'Name and email are required.';
    status.dataset.state = 'error';
    return;
  }

  status.textContent = 'Submitting...';
  status.dataset.state = 'pending';

  const result = await submitSignup(payload);

  if (result.ok) {
    status.textContent = "You're in. We'll be in touch.";
    status.dataset.state = 'success';
    form.reset();
  } else {
    status.textContent = 'Something went wrong. Try again.';
    status.dataset.state = 'error';
  }
});