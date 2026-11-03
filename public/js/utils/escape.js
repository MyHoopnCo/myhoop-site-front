/* ═══════════════════════════════════════════════════════════
   Escapes a value before it is placed inside an HTML template
   string (innerHTML / insertAdjacentHTML). Use it on EVERY value
   that comes from the API or from the user, in text AND in
   attributes (alt="...", src="...", value="..."): without the
   quote escaping, a name like  x" onerror="...  breaks out of the
   attribute. For links, use encodeURIComponent() on the slug.

   For new code, prefer textContent / createElement over innerHTML.
   ═══════════════════════════════════════════════════════════ */

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
