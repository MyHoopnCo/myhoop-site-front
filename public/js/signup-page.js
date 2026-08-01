/* ═══════════════════════════════════════════════════════════
   Handles the account-creation form on signup.html.
   Depends on: data/api.js (signup)

   Named signup-page.js (not signup.js) to avoid clashing with
   js/components/signup.js, which is the unrelated "Get In The
   Mix" newsletter widget used elsewhere on the site.
   ═══════════════════════════════════════════════════════════ */

import { signup } from "./data/api.js";
import { redirectQueryString, safeRedirect } from "./auth-utils.js";

const form = document.getElementById("signup-form");
const status = document.getElementById("signup-status");
const switchLink = document.getElementById("auth-switch-link");

switchLink.href = `signin.html${redirectQueryString()}`;

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
 
    // Show a clear confirmation instead of silently redirecting away —
    // the person can see the account was actually created before moving on.
    form.style.display = "none";
    status.dataset.state = "success";
    status.innerHTML = `
      Welcome, <strong>${user.first_name}</strong> — your account is ready.
      <a href="${redirect || "index.html"}" style="color: var(--orange); font-weight: 700;">
        ${redirect ? "Continue" : "Go to homepage"}
      </a>
    `;
    
  } catch (err) {
    status.textContent = err.message || "Something went wrong. Try again.";
    status.dataset.state = "error";
    submitBtn.disabled = false;
  }
});
