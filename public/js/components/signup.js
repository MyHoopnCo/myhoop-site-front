const googleSheetsURL =
  "https://script.google.com/macros/s/AKfycbwXBm62VWog2tXTAidiv_hWTtTHTHbfeoBsnKEcB-NFCyBbbQJWbWWbbeGuCVAyxHYN/exec";

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

  try {
    const res = await fetch(googleSheetsURL, {
      method: "POST",
      body: JSON.stringify({ form: "runs", ...payload }),
    });
    const data = await res.json();

    if (data.result === "success") {
      status.textContent = "You're in. We'll be in touch.";
      status.dataset.state = 'success';
      form.reset();
    } else if (data.result === "duplicate") {
      status.textContent = "You're already on the list.";
      status.dataset.state = 'success';
    } else {
      status.textContent = 'Something went wrong. Try again.';
      status.dataset.state = 'error';
    }
  } catch (err) {
    status.textContent = 'Server error. Try again.';
    status.dataset.state = 'error';
  }
});