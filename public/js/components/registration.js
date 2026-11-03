/* ═══════════════════════════════════════════════════════════
   La fenêtre d'inscription à un tournoi.
   Exposée via window.openRegistration(tournament) — appelée par calendar.js.

   Deux choses ont changé par rapport à la version précédente :

   1. Les questions ne sont plus écrites ici. Elles viennent du
      formulaire de CE tournoi (GET /registrations/form/:id), donc un
      tournoi peut demander la taille de chandail et un autre non, sans
      qu'on touche au code. Les réponses partent dans `answers`.

   2. On peut s'inscrire SANS COMPTE. Quelqu'un qui joue une fois n'a pas
      à créer un compte, et aucun profil n'est créé pour lui : on garde
      son inscription, c'est tout. Il pourra la réclamer plus tard s'il
      ouvre un compte.

   Dépend de : data/api.js, config.js (INTERAC_EMAIL), utils/escape.js
   ═══════════════════════════════════════════════════════════ */

import {
  fetchCurrentUser, fetchMyRegistrations, fetchTournamentForm,
  submitRegistration, submitGuestRegistration,
  submitPayment, submitGuestPayment,
} from "../data/api.js";
import { INTERAC_EMAIL } from "../config.js";
import { esc } from "../utils/escape.js";

const overlay = document.getElementById("reg-overlay");
const box = document.getElementById("reg-box");

const STATUS_LABELS = {
  waitlisted: "Waitlisted",
  confirmed: "Confirmed ✓",
};

/* ── Les questions du tournoi ──────────────────────────────── */

/*
  Une question du formulaire → un champ HTML.

  Le nom du champ est `answers.<clé>` : on retrouve ainsi toutes les réponses
  d'un coup à l'envoi, sans liste écrite à la main qu'on oublierait de mettre
  à jour quand l'admin ajoute une question.
*/
function questionMarkup(field) {
  const id = `q-${field.field_key}`;
  const name = `answers.${field.field_key}`;
  const required = field.is_required ? "required" : "";
  const help = field.help_text
    ? `<span class="hint">${esc(field.help_text)}</span>`
    : field.is_sensitive
      ? `<span class="hint">only the organizer sees this</span>`
      : "";

  const label = `<label for="${esc(id)}">${esc(field.label)} ${help}</label>`;

  switch (field.field_type) {
    case "consent":
    case "checkbox":
      return `
        <label class="reg-check">
          <input id="${esc(id)}" name="${esc(name)}" type="checkbox" ${required} />
          <span>${esc(field.label)}</span>
        </label>`;

    case "long_text":
      return `
        <div class="reg-field">
          ${label}
          <textarea id="${esc(id)}" name="${esc(name)}" ${required}></textarea>
        </div>`;

    case "select":
      return `
        <div class="reg-field">
          ${label}
          <select id="${esc(id)}" name="${esc(name)}" ${required}>
            <option value="">Choose…</option>
            ${(field.options || []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}
          </select>
        </div>`;

    case "multi_select":
      return `
        <div class="reg-field">
          ${label}
          <select id="${esc(id)}" name="${esc(name)}" multiple size="4" ${required}>
            ${(field.options || []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}
          </select>
        </div>`;

    default: {
      const types = { email: "email", phone: "tel", number: "number", date: "date" };
      return `
        <div class="reg-field">
          ${label}
          <input id="${esc(id)}" name="${esc(name)}"
                 type="${esc(types[field.field_type] || "text")}" ${required} />
        </div>`;
    }
  }
}

// Relit le formulaire et rassemble les réponses. Une case non cochée est
// envoyée à `false` : le serveur doit pouvoir distinguer « non » de « sans
// réponse » pour une décharge obligatoire.
function readAnswers(form, fields) {
  const answers = {};

  for (const field of fields) {
    const el = form.elements[`answers.${field.field_key}`];
    if (!el) continue;

    if (field.field_type === "checkbox" || field.field_type === "consent") {
      answers[field.field_key] = el.checked;
    } else if (field.field_type === "multi_select") {
      answers[field.field_key] = [...el.selectedOptions].map((o) => o.value);
    } else if (el.value !== "") {
      answers[field.field_key] = el.value.trim ? el.value.trim() : el.value;
    }
  }

  return answers;
}

/* ── Morceaux de la fenêtre ────────────────────────────────── */

function alreadyRegisteredMarkup(tournament, registration) {
  return `
    <div class="reg-head">
      <div><h3>Already registered</h3></div>
      <button class="reg-close" id="reg-close" aria-label="Close">✕</button>
    </div>
    <p>You're already registered for ${esc(tournament.name)}.</p>
    <span class="registration-badge ${esc(registration.status)}">${esc(STATUS_LABELS[registration.status] || registration.status)}</span>`;
}

function closedMarkup(tournament) {
  return `
    <div class="reg-head">
      <div><h3>Registration closed</h3></div>
      <button class="reg-close" id="reg-close" aria-label="Close">✕</button>
    </div>
    <p>${esc(tournament.name)} isn't taking registrations right now.</p>`;
}

// Qui s'inscrit. Connecté : on affiche simplement son nom. Sinon : le minimum
// pour le joindre et pour confirmer son paiement — et c'est tout ce qu'on garde.
function identityMarkup(user) {
  if (user) {
    return `
      <div class="reg-field">
        <label>Registering as</label>
        <input type="text" value="${esc(user.first_name)} ${esc(user.last_name)}" disabled />
      </div>`;
  }

  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  return `
    <p class="reg-field-note">
      No account needed. If you already have one,
      <a href="signin.html?redirect=${redirect}">sign in</a> first so this shows up in your profile.
    </p>

    <div class="reg-row">
      <div class="reg-field">
        <label for="reg-first">First name</label>
        <input id="reg-first" name="first_name" type="text" required />
      </div>
      <div class="reg-field">
        <label for="reg-last">Last name</label>
        <input id="reg-last" name="last_name" type="text" required />
      </div>
    </div>

    <div class="reg-row">
      <div class="reg-field">
        <label for="reg-email">Email</label>
        <input id="reg-email" name="email" type="email" required />
      </div>
      <div class="reg-field">
        <label for="reg-phone">Phone <span class="hint">optional</span></label>
        <input id="reg-phone" name="phone" type="tel" />
      </div>
    </div>`;
}

function paymentStepMarkup(entryFee, fullName, isGuest) {
  return `
    <div class="reg-payment">
      <h4>One last step — payment</h4>
      <p>Entry fee: <strong>$${esc(entryFee)}</strong></p>
      <p>Send an Interac e-Transfer to <strong>${esc(INTERAC_EMAIL)}</strong> and include
         <strong>"${esc(fullName)}"</strong> as the reference, so we can match it to your registration.</p>
      <p class="reg-waitlist-note">
        You're on the waitlist until we've seen the transfer arrive.
        ${isGuest ? "Keep this window open until you've sent it." : ""}
      </p>
      <button class="reg-submit" id="reg-payment-sent" type="button">I've sent the payment</button>
      <p class="reg-status" id="reg-payment-status"></p>
    </div>`;
}

/* ── La fenêtre ────────────────────────────────────────────── */

async function render(tournament) {
  box.innerHTML = `<p class="reg-status" data-state="pending">Loading…</p>`;

  const user = await fetchCurrentUser();
  // L'admin n'est pas un joueur : il n'a pas de profil à inscrire.
  const player = user && user.role !== "admin" ? user : null;

  if (player) {
    const mine = await fetchMyRegistrations();
    const existing = mine.find((r) => r.tournament_id === tournament.tournament_id);
    if (existing) {
      box.innerHTML = alreadyRegisteredMarkup(tournament, existing);
      box.querySelector("#reg-close").addEventListener("click", closeRegistration);
      return;
    }
  }

  // Les questions de CE tournoi. Un tournoi sans formulaire n'en a aucune :
  // on demande alors seulement l'identité, et c'est très bien.
  let fields = [];
  let fresh = tournament;
  try {
    const data = await fetchTournamentForm(tournament.tournament_id);
    fields = data.form?.fields || [];
    fresh = { ...tournament, ...data.tournament };
  } catch (err) {
    box.innerHTML = `
      <div class="reg-head">
        <div><h3>Registration</h3></div>
        <button class="reg-close" id="reg-close" aria-label="Close">✕</button>
      </div>
      <p class="reg-status" data-state="error">${esc(err.message || "Couldn't load the form.")}</p>`;
    box.querySelector("#reg-close").addEventListener("click", closeRegistration);
    return;
  }

  if (fresh.status && fresh.status !== "open") {
    box.innerHTML = closedMarkup(fresh);
    box.querySelector("#reg-close").addEventListener("click", closeRegistration);
    return;
  }

  const entryFee = Number(fresh.entry_fee) || 0;
  const starts = fresh.starts_at
    ? new Date(fresh.starts_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : "";

  box.innerHTML = `
    <div class="reg-head">
      <div>
        <h3>Register</h3>
        <p>${esc(fresh.name)}${starts ? ` · ${esc(starts)}` : ""}${fresh.location ? ` · ${esc(fresh.location)}` : ""}</p>
        <p class="reg-fee">${entryFee > 0 ? `Entry fee: $${esc(entryFee)}` : "Free entry"}</p>
      </div>
      <button class="reg-close" id="reg-close" aria-label="Close">✕</button>
    </div>
    <form class="reg-form" id="reg-form">
      ${identityMarkup(player)}
      ${fields.map(questionMarkup).join("")}
      <button class="reg-submit" type="submit">Submit registration</button>
      <p class="reg-status" id="reg-status"></p>
    </form>`;

  box.querySelector("#reg-close").addEventListener("click", closeRegistration);

  const form = box.querySelector("#reg-form");
  const status = box.querySelector("#reg-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector(".reg-submit");
    const answers = readAnswers(form, fields);

    status.textContent = "Submitting...";
    status.dataset.state = "pending";
    submitBtn.disabled = true;

    try {
      let registrationId;
      let fullName;

      if (player) {
        const result = await submitRegistration({
          player_id: player.player_id,
          tournament_id: fresh.tournament_id,
          answers,
        });
        registrationId = result.data.registration_id;
        fullName = `${player.first_name} ${player.last_name}`;
      } else {
        const registration = await submitGuestRegistration({
          tournament_id: fresh.tournament_id,
          first_name: form.elements.first_name.value.trim(),
          last_name: form.elements.last_name.value.trim(),
          email: form.elements.email.value.trim(),
          phone: form.elements.phone.value.trim() || null,
          answers,
        });
        registrationId = registration.registration_id;
        fullName = `${form.elements.first_name.value.trim()} ${form.elements.last_name.value.trim()}`;
      }

      if (entryFee > 0) {
        status.textContent = "";
        status.dataset.state = "success";
        status.insertAdjacentHTML("afterend", paymentStepMarkup(entryFee, fullName, !player));

        const payBtn = box.querySelector("#reg-payment-sent");
        const payStatus = box.querySelector("#reg-payment-status");

        payBtn.addEventListener("click", async () => {
          payBtn.disabled = true;
          payStatus.textContent = "Recording...";
          payStatus.dataset.state = "pending";

          try {
            // Le montant n'est jamais envoyé : le serveur le prend sur le
            // tournoi, pour qu'on ne puisse pas payer le prix qu'on veut.
            if (player) await submitPayment({ registration_id: registrationId, transfer_sender_name: fullName });
            else await submitGuestPayment(registrationId, fullName);

            payStatus.textContent = "Thanks — we'll check the transfer and confirm your spot.";
            payStatus.dataset.state = "success";
          } catch (err) {
            payStatus.textContent = err.message || "Something went wrong. Try again.";
            payStatus.dataset.state = "error";
            payBtn.disabled = false;
          }
        });
      } else {
        status.textContent = player
          ? "You're registered. See you there."
          : "You're registered. Give your name at the door — no account needed.";
        status.dataset.state = "success";
      }

      document.dispatchEvent(
        new CustomEvent("myhoop:registration-success", {
          detail: { tournamentId: fresh.tournament_id },
        })
      );
    } catch (err) {
      status.textContent = err.message || "Something went wrong. Try again.";
      status.dataset.state = "error";
      submitBtn.disabled = false;
    }
  });
}

export async function openRegistration(tournament) {
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  await render(tournament);
}

function closeRegistration() {
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeRegistration();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("open")) closeRegistration();
});

// calendar.js appelle via window pour que les deux morceaux restent séparés
window.openRegistration = openRegistration;
