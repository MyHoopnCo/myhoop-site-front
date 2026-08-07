/* ═══════════════════════════════════════════════════════════
   Handles the account-creation form on signup.html.
   Depends on: data/api.js (signup)

   Named signup-page.js (not signup.js) to avoid clashing with
   js/components/signup.js, which is the unrelated "Get In The
   Mix" newsletter widget used elsewhere on the site.
   ═══════════════════════════════════════════════════════════ */

import { signup } from "./data/api.js";
import { redirectQueryString, safeRedirect, initPasswordToggle, showAuthToast } from "./auth-utils.js";

const form = document.getElementById("signup-form");
const status = document.getElementById("signup-status");
const switchLink = document.getElementById("auth-switch-link");

switchLink.href = `signin.html${redirectQueryString()}`;
initPasswordToggle("signup-password", "signup-password-toggle");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = form.querySelector("button[type=submit]");

  const payload = {
    first_name: form.elements.first_name.value.trim(),
    last_name: form.elements.last_name.value.trim(),
    email: form.elements.email.value.trim(),
    password: form.elements.password.value,
    age: form.elements.age.value ? Number(form.elements.age.value) : null,
    phone: form.elements.phone.value.trim() || null,
    city: form.elements.city.value.trim() || null,
    height_cm: form.elements.height_cm.value ? Number(form.elements.height_cm.value) : null,
    school_level: form.elements.school_level.value || null,
  };

  const age = form.elements.age.value;
  const phone = form.elements.phone.value.trim();
  const city = form.elements.city.value.trim();
  if (age) payload.age = Number(age);
  if (phone) payload.phone = phone;
  if (city) payload.city = city;

  status.textContent = "Creating your account...";
  status.dataset.state = "pending";
  submitBtn.disabled = true;

  try {
    const user = await signup(payload);
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    status.textContent = "";
    status.dataset.state = "success";

    // Brief confirmation toast, then automatically take the person back
    // to wherever they were trying to go instead of stranding them here.
    showAuthToast(`Welcome, <strong>${user.first_name}</strong> — your account is ready.`, () => {
      window.location.href = redirect ? safeRedirect(redirect) : "index.html";
    });

  } catch (err) {
    status.textContent = err.message || "Something went wrong. Try again.";
    status.dataset.state = "error";
    submitBtn.disabled = false;
  }
});
