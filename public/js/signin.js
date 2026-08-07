/* ═══════════════════════════════════════════════════════════
   Handles the sign-in form on signin.html.
   Depends on: data/api.js (login)

   Supports an optional ?redirect=<path> query param so links like
   "Sign in required" in registration.js can send the user back to
   where they came from after a successful login.
   ═══════════════════════════════════════════════════════════ */

import { login } from "./data/api.js";
import { redirectQueryString, safeRedirect, initPasswordToggle, showAuthToast } from "./auth-utils.js";

const form = document.getElementById("signin-form");
const status = document.getElementById("signin-status");
const switchLink = document.getElementById("auth-switch-link");

switchLink.href = `signup.html${redirectQueryString()}`;
initPasswordToggle("signin-password", "signin-password-toggle");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  const submitBtn = form.querySelector("button[type=submit]");

  status.textContent = "Signing in...";
  status.dataset.state = "pending";
  submitBtn.disabled = true;

  try {
    const user = await login(email, password);
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    const name = user.role === "admin" ? "Admin" : user.first_name;

    status.textContent = "";
    status.dataset.state = "success";

    // Brief confirmation toast, then automatically take the person back
    // to wherever they were trying to go (e.g. a tournament registration)
    // instead of stranding them on this page.
    showAuthToast(`Signed in as <strong>${name}</strong>.`, () => {
      window.location.href = redirect ? safeRedirect(redirect) : "index.html";
    });
  } catch (err) {
    status.textContent = err.message || "Invalid email or password.";
    status.dataset.state = "error";
    submitBtn.disabled = false;
  }
});
