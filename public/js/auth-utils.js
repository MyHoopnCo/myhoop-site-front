/* Shared helpers for sign-in / sign-up redirect handling. */

export function safeRedirect(value) {
  if (!value || value.startsWith("//") || value.includes("://")) return "index.html";
  if (value.startsWith("/") || /^[\w.-]+\.html(\?.*)?$/.test(value)) return value;
  return "index.html";
}

export function redirectQueryString() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
}

/* Wires up a show/hide "eye" button next to a password input.
   Expects the markup produced by the .auth-password-wrap block in
   signin.html / signup.html (an <input> followed by a <button>). */
export function initPasswordToggle(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;

  button.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.classList.toggle("showing", !showing);
    button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    button.querySelector("i").className = showing ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
  });
}

/* Shows a brief floating confirmation toast, then calls onDone
   (used to redirect the person back to where they came from without
   forcing them onto a separate "you're signed in" page). */
export function showAuthToast(message, onDone, delay = 1500) {
  const toast = document.createElement("div");
  toast.className = "auth-toast";
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
  document.body.appendChild(toast);

  // trigger the enter transition
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    if (typeof onDone === "function") onDone();
  }, delay);
}
