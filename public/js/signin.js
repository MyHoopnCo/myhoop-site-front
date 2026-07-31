/* ═══════════════════════════════════════════════════════════
   Handles the sign-in form on signin.html.
   Depends on: data/api.js (login)

   Supports an optional ?redirect=<path> query param so links like
   "Sign in required" in registration.js can send the user back to
   where they came from after a successful login.
   ═══════════════════════════════════════════════════════════ */

import { login } from "./data/api.js";
import { redirectQueryString, safeRedirect } from "./auth-utils.js";

const form = document.getElementById("signin-form");
const status = document.getElementById("signin-status");
const switchLink = document.getElementById("auth-switch-link");

switchLink.href = `signup.html${redirectQueryString()}`;

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  const submitBtn = form.querySelector("button[type=submit]");

  status.textContent = "Signing in...";
  status.dataset.state = "pending";
  submitBtn.disabled = true;

  try {
    await login(email, password);
    status.textContent = "Signed in! Redirecting...";
    status.dataset.state = "success";

    const params = new URLSearchParams(window.location.search);
    window.location.href = safeRedirect(params.get("redirect"));
  } catch (err) {
    status.textContent = err.message || "Invalid email or password.";
    status.dataset.state = "error";
    submitBtn.disabled = false;
  }
});
