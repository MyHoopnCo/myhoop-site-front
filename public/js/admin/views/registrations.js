import * as api from "../api.js";
import { esc, dateTime, loading, errorBox, emptyRow, statusPill, openModal, run } from "../ui.js";

/*
  Les inscriptions d'un tournoi, et le formulaire qui les produit.

  Le formulaire n'est pas écrit dans le code : ses questions sont des lignes de
  la base. Les réponses de chaque inscrit sont affichées avec leur libellé, pas
  avec la clé technique. Les questions marquées « sensibles » (santé, contact
  d'urgence) sont signalées : elles ne sortent jamais sur le site public.
*/

const FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Pick one from a list" },
  { value: "multi_select", label: "Pick several from a list" },
  { value: "checkbox", label: "Yes / no" },
  { value: "consent", label: "Consent (must be ticked)" },
];

function answersList(reg) {
  const fields = reg.answered_fields || [];
  if (fields.length === 0) return `<p class="adm-muted">This tournament has no form.</p>`;

  return `<dl class="adm-answers">${fields.map((f) => {
    const v = f.value;
    const shown = v === null || v === undefined || v === ""
      ? "—"
      : Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);

    return `
      <div>
        <dt>${esc(f.label)}${f.is_sensitive ? ` <span class="adm-pill adm-pill-warn">private</span>` : ""}</dt>
        <dd>${esc(shown)}</dd>
      </div>`;
  }).join("")}</dl>`;
}

async function showRegistration(id) {
  const reg = await api.fetchRegistration(id);

  openModal(`${reg.first_name} ${reg.last_name}`, `
    <div class="adm-detail">
      <p>
        ${statusPill(reg.status)}
        ${reg.is_guest ? `<span class="adm-pill">No account</span>` : `<span class="adm-pill adm-pill-good">Has an account</span>`}
        ${reg.claimed_at ? `<span class="adm-pill adm-pill-good">Claimed</span>` : ""}
      </p>
      <dl class="adm-answers">
        <div><dt>Tournament</dt><dd>${esc(reg.tournament_name)}</dd></div>
        <div><dt>Email</dt><dd>${esc(reg.email || "—")}</dd></div>
        <div><dt>Phone</dt><dd>${esc(reg.phone || "—")}</dd></div>
        <div><dt>Entry fee</dt><dd>$${esc(reg.entry_fee)}</dd></div>
        <div><dt>Registered</dt><dd>${esc(dateTime(reg.registered_at))}</dd></div>
      </dl>
      <h3 class="adm-sub">Form answers</h3>
      ${answersList(reg)}
    </div>`,
    { submitLabel: "Close", wide: true, onSubmit: async () => {} });
}

async function manageForm(tournament, toastHost) {
  let form = await api.fetchTournamentForm(tournament.tournament_id);

  // Pas encore de formulaire : on propose de partir du modèle standard.
  if (!form) {
    const templates = await api.fetchFormTemplates();
    openModal(`Registration form — ${tournament.name}`, `
      <p class="adm-help">
        This tournament has no form yet. Start from a template and adjust it, or start empty.
        The registration page shows exactly these questions — nothing is written in the code.
      </p>
      <div class="adm-field">
        <label for="f-template_id">Start from</label>
        <select id="f-template_id" name="template_id">
          <option value="">Empty form</option>
          ${templates.map((t) => `<option value="${esc(t.form_id)}">${esc(t.name)}</option>`).join("")}
        </select>
      </div>`,
      {
        submitLabel: "Create form",
        confirmOn: "adm-reg-toast",
        confirmText: "Form created.",
        onSubmit: async (data) => {
          await api.createTournamentForm(tournament.tournament_id, data);
        },
      });
    return;
  }

  const fieldRows = form.fields.length === 0
    ? `<p class="adm-muted">No questions yet. Everyone is still asked their first name, last name and email.</p>`
    : `<table class="adm-table adm-table-tight">
        <thead><tr><th>Question</th><th>Type</th><th>Required</th><th>Private</th><th></th></tr></thead>
        <tbody>
          ${form.fields.map((f) => `
            <tr data-field="${esc(f.field_id)}">
              <td>${esc(f.label)}<br /><small class="adm-muted">${esc(f.field_key)}</small></td>
              <td>${esc(f.field_type)}</td>
              <td>${f.is_required ? "Yes" : "—"}</td>
              <td>${f.is_sensitive ? "Yes" : "—"}</td>
              <td><button type="button" class="adm-btn adm-btn-bad adm-btn-sm" data-remove-field>Remove</button></td>
            </tr>`).join("")}
        </tbody>
      </table>`;

  openModal(`Registration form — ${esc(tournament.name)}`, `
    <p class="adm-help">
      These are the questions the registration page asks. First name, last name and email are
      always asked on top of this, so a person without an account can still be reached.
    </p>
    <div id="adm-field-list">${fieldRows}</div>

    <h3 class="adm-sub">Add a question</h3>
    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="nf-label">Question shown to the player <span class="adm-req">*</span></label>
        <input id="nf-label" name="label" placeholder="T-shirt size" />
      </div>
      <div class="adm-field">
        <label for="nf-key">Short key <span class="adm-req">*</span></label>
        <input id="nf-key" name="field_key" placeholder="shirt_size" />
        <small class="adm-help">Lowercase letters, digits and _ . Never shown to the player.</small>
      </div>
      <div class="adm-field">
        <label for="nf-type">Answer type</label>
        <select id="nf-type" name="field_type">
          ${FIELD_TYPES.map((t) => `<option value="${esc(t.value)}">${esc(t.label)}</option>`).join("")}
        </select>
      </div>
      <div class="adm-field">
        <label for="nf-options">Choices (one per line)</label>
        <textarea id="nf-options" name="options" rows="3" placeholder="S&#10;M&#10;L"></textarea>
        <small class="adm-help">Only for the two “pick from a list” types.</small>
      </div>
      <div class="adm-field adm-field-check">
        <label for="nf-req">Answer required</label>
        <input id="nf-req" name="is_required" type="checkbox" />
      </div>
      <div class="adm-field adm-field-check">
        <label for="nf-sens">Private answer (health, emergency contact)</label>
        <input id="nf-sens" name="is_sensitive" type="checkbox" />
      </div>
    </div>`,
    {
      submitLabel: "Add question",
      wide: true,
      confirmOn: "adm-reg-toast",
      confirmText: "Question added to the form.",
      onSubmit: async (data) => {
        if (!data.label || !data.field_key) throw new Error("A question needs a label and a key.");

        const payload = {
          label: data.label,
          field_key: data.field_key,
          field_type: data.field_type,
          is_required: data.is_required === true,
          is_sensitive: data.is_sensitive === true,
          position: form.fields.length + 1,
        };

        if (["select", "multi_select"].includes(payload.field_type)) {
          payload.options = String(data.options || "").split("\n").map((s) => s.trim()).filter(Boolean);
          if (payload.options.length === 0) throw new Error("A list question needs at least one choice.");
        }

        await api.addFormField(form.form_id, payload);
      },
    });

  document.getElementById("adm-field-list")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-remove-field]");
    if (!btn) return;
    const row = btn.closest("tr");
    if (!window.confirm("Remove this question? Answers already given stay in the database.")) return;

    await run(btn, "adm-modal-toast", {
      pending: "Removing…",
      done: "Question removed.",
      action: () => api.removeFormField(row.dataset.field),
      after: async () => row.remove(),
    }).catch(() => {});
  });
}

export async function render(root) {
  root.innerHTML = loading("Loading registrations…");

  try {
    const tournaments = await api.fetchTournaments();

    root.innerHTML = `
      <section class="adm-section">
        <div class="adm-section-head">
          <div>
            <h2 class="adm-section-title">Registrations</h2>
            <p class="adm-section-text">
              Everyone registered for a tournament, with or without an account.
            </p>
          </div>
          <div class="adm-section-actions">
            <select id="adm-reg-tournament" class="adm-select">
              <option value="">All tournaments</option>
              ${tournaments.map((t) => `<option value="${esc(t.tournament_id)}">${esc(t.name)}</option>`).join("")}
            </select>
            <button class="adm-btn adm-btn-primary" id="adm-form-btn" disabled>Edit the form</button>
          </div>
        </div>
        <p class="adm-toast" id="adm-reg-toast"></p>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr><th>Name</th><th>Tournament</th><th>Account</th><th>Team</th><th>Status</th><th>Registered</th><th></th></tr>
            </thead>
            <tbody id="adm-reg-body"></tbody>
          </table>
        </div>
      </section>`;

    const select = document.getElementById("adm-reg-tournament");
    const formBtn = document.getElementById("adm-form-btn");
    const tbody = document.getElementById("adm-reg-body");

    async function draw() {
      tbody.innerHTML = `<tr><td colspan="7" class="adm-empty">Loading…</td></tr>`;
      const rows = await api.fetchRegistrations(select.value || undefined);

      if (rows.length === 0) {
        tbody.innerHTML = emptyRow(7, "No registrations yet.");
        return;
      }

      tbody.innerHTML = rows.map((r) => `
        <tr data-reg="${esc(r.registration_id)}">
          <td>${esc(r.first_name)} ${esc(r.last_name)}<br /><small class="adm-muted">${esc(r.email || "—")}</small></td>
          <td>${esc(r.tournament_name)}</td>
          <td>${r.is_guest ? `<span class="adm-pill">No account</span>` : "Account"}</td>
          <td>${esc(r.team_name || "—")}</td>
          <td>${statusPill(r.status)}</td>
          <td>${esc(dateTime(r.registered_at))}</td>
          <td><button class="adm-btn adm-btn-ghost adm-btn-sm" data-open>Open</button></td>
        </tr>`).join("");
    }

    select.addEventListener("change", () => {
      formBtn.disabled = !select.value;
      draw();
    });

    formBtn.addEventListener("click", () => {
      const tournament = tournaments.find((t) => t.tournament_id === select.value);
      if (tournament) manageForm(tournament, "adm-reg-toast");
    });

    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open]");
      if (btn) showRegistration(btn.closest("tr").dataset.reg);
    });

    await draw();
  } catch (err) {
    root.innerHTML = errorBox(err);
  }
}
