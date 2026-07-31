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
