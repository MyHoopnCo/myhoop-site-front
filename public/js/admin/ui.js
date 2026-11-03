/* ═══════════════════════════════════════════════════════════
   Briques partagées par les écrans de l'admin.

   Règle : toute valeur venue de l'API passe par esc() avant d'entrer
   dans du HTML. Les écrans d'admin affichent des courriels et des
   contacts d'urgence — des noms tapés par n'importe qui — donc c'est
   ici que ça compte le plus.
   ═══════════════════════════════════════════════════════════ */

import { esc } from "../utils/escape.js";

export { esc };

/* ── Dates ────────────────────────────────────────────────── */

export function dateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export function dateOnly(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

// Valeur pour un <input type="datetime-local"> : il veut l'heure LOCALE
// sans fuseau, alors que l'API renvoie de l'UTC.
export function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── États ────────────────────────────────────────────────── */

export const loading = (msg = "Loading…") => `<p class="adm-state">${esc(msg)}</p>`;
export const emptyRow = (cols, msg) => `<tr><td colspan="${cols}" class="adm-empty">${esc(msg)}</td></tr>`;
export const errorBox = (err) => `<p class="adm-state adm-state-error">${esc(err?.message || "Something went wrong.")}</p>`;

export function pill(text, kind = "") {
  return `<span class="adm-pill ${kind ? `adm-pill-${esc(kind)}` : ""}">${esc(text)}</span>`;
}

const STATUS_KIND = {
  confirmed: "good", active: "good", open: "good", completed: "good",
  pending: "warn", waitlisted: "warn", draft: "warn", scheduled: "warn",
  cancelled: "bad", inactive: "bad", postponed: "bad", refunded: "bad",
};

export const statusPill = (status) => pill(status || "—", STATUS_KIND[status] || "");

/* ── Messages ─────────────────────────────────────────────── */

// Un seul bandeau par écran : on dit ce qui vient de se passer, puis on
// l'efface tout seul pour ne pas laisser traîner un vieux message.
export function toast(host, message, state = "success") {
  const el = typeof host === "string" ? document.getElementById(host) : host;
  if (!el) return;

  el.textContent = message;
  el.dataset.state = state;

  clearTimeout(el._timer);
  if (state !== "error") {
    el._timer = setTimeout(() => {
      el.textContent = "";
      delete el.dataset.state;
    }, 4000);
  }
}

/*
  Une action qui écrit : le bouton se bloque, on dit ce qui se passe, et on
  remet tout en état quoi qu'il arrive. Sans ça, un double-clic envoie deux
  fois la même chose (deux paiements, deux inscriptions).
*/
export async function run(button, toastEl, { pending, done, action, after }) {
  const original = button ? button.textContent : null;
  if (button) {
    button.disabled = true;
    button.textContent = "…";
  }
  toast(toastEl, pending, "pending");

  try {
    const result = await action();
    toast(toastEl, typeof done === "function" ? done(result) : done, "success");
    if (after) await after(result);
    return result;
  } catch (err) {
    toast(toastEl, err.message || "Something went wrong.", "error");
    throw err;
  } finally {
    if (button) {
      button.disabled = false;
      if (original !== null) button.textContent = original;
    }
  }
}

/* ── Formulaires ──────────────────────────────────────────── */

export function field(name, label, { type = "text", value = "", required = false, options, placeholder, help, step, min } = {}) {
  const id = `f-${name}`;
  const req = required ? "required" : "";

  let input;
  if (options) {
    input = `<select id="${esc(id)}" name="${esc(name)}" ${req}>
      ${options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`;
      }).join("")}
    </select>`;
  } else if (type === "textarea") {
    input = `<textarea id="${esc(id)}" name="${esc(name)}" rows="3" ${req}
       placeholder="${esc(placeholder || "")}">${esc(value)}</textarea>`;
  } else if (type === "checkbox") {
    input = `<input id="${esc(id)}" name="${esc(name)}" type="checkbox" ${value ? "checked" : ""} />`;
  } else {
    input = `<input id="${esc(id)}" name="${esc(name)}" type="${esc(type)}"
       value="${esc(value)}" ${req}
       ${step ? `step="${esc(step)}"` : ""} ${min !== undefined ? `min="${esc(min)}"` : ""}
       placeholder="${esc(placeholder || "")}" />`;
  }

  return `
    <div class="adm-field ${type === "checkbox" ? "adm-field-check" : ""}">
      <label for="${esc(id)}">${esc(label)}${required ? ` <span class="adm-req">*</span>` : ""}</label>
      ${input}
      ${help ? `<small class="adm-help">${esc(help)}</small>` : ""}
    </div>`;
}

// Lit un <form> en objet, en laissant tomber les champs vides : le backend
// garde alors la valeur existante au lieu de l'effacer.
export function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") out[el.name] = el.checked;
    else if (el.value !== "") out[el.name] = el.value;
  }
  return out;
}

/* ── Fenêtre modale ───────────────────────────────────────── */

export function openModal(title, bodyHtml, { submitLabel = "Save", onSubmit, wide = false, confirmOn, confirmText } = {}) {
  const host = document.getElementById("adm-modal");
  host.innerHTML = `
    <div class="adm-modal-backdrop" data-close></div>
    <div class="adm-modal-box ${wide ? "is-wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="adm-modal-head">
        <h2>${esc(title)}</h2>
        <button class="adm-modal-close" data-close aria-label="Close">✕</button>
      </header>
      <form class="adm-modal-body" id="adm-modal-form">${bodyHtml}</form>
      <p class="adm-toast" id="adm-modal-toast"></p>
      <footer class="adm-modal-foot">
        <button type="button" class="adm-btn adm-btn-ghost" data-close>Cancel</button>
        <button type="submit" form="adm-modal-form" class="adm-btn adm-btn-primary">${esc(submitLabel)}</button>
      </footer>
    </div>`;
  host.classList.add("is-open");

  const close = () => {
    host.classList.remove("is-open");
    host.innerHTML = "";
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };

  document.addEventListener("keydown", onKey);
  host.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", close));

  host.querySelector("#adm-modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submit = host.querySelector(".adm-btn-primary");
    try {
      await run(submit, "adm-modal-toast", {
        pending: "Saving…",
        done: "Saved.",
        action: () => onSubmit(readForm(e.target), e.target),
      });
      close();
      // La fenêtre disparaît : sans ça, l'écran du dessous ne dirait rien et on
      // ne saurait pas si le geste est passé.
      if (confirmOn) toast(confirmOn, confirmText || "Saved.", "success");
    } catch (_) {
      /* le message d'erreur reste affiché dans la fenêtre */
    }
  });

  const first = host.querySelector("input, select, textarea");
  if (first) first.focus();

  return close;
}
