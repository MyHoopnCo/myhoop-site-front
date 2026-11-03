import * as api from "../api.js";
import { esc, dateTime, loading, errorBox, statusPill } from "../ui.js";

/*
  Ce qui attend l'admin, en une page : les paiements à vérifier, les
  inscriptions en attente, et les matchs joués dont le score n'est pas entré.

  Chaque bloc renvoie à l'écran qui permet d'agir, plutôt que de refaire
  l'action ici : une seule façon de faire chaque chose.
*/

function card(title, count, text, link, linkLabel, urgent = false) {
  return `
    <article class="adm-card ${urgent && count > 0 ? "is-urgent" : ""}">
      <p class="adm-card-count">${esc(count)}</p>
      <h3 class="adm-card-title">${esc(title)}</h3>
      <p class="adm-card-text">${esc(text)}</p>
      ${count > 0 ? `<a class="adm-card-link" href="#${esc(link)}">${esc(linkLabel)} →</a>` : ""}
    </article>`;
}

export async function render(root) {
  root.innerHTML = loading("Loading…");

  try {
    const [payments, registrations, competitions] = await Promise.all([
      api.fetchPendingPayments(),
      api.fetchRegistrations(),
      api.fetchCompetitions(),
    ]);

    const waitlisted = registrations.filter((r) => r.status === "waitlisted");

    // Un match joué dont le score n'est pas entré : la base le compte encore
    // comme « à venir », donc il manque au classement.
    const liveSeasons = competitions.filter((c) => ["active", "upcoming"].includes(c.status));
    const missingScores = liveSeasons.reduce(
      (sum, c) => sum + Math.max(0, c.match_count - c.played_count), 0
    );

    const unpublished = competitions.filter((c) => !c.is_public && c.status !== "cancelled");

    root.innerHTML = `
      <div class="adm-cards">
        ${card("Payments to confirm", payments.length,
          "Check the e-Transfer arrived, then confirm. This also confirms the registration.",
          "payments", "Open payments", true)}
        ${card("Registrations waiting", waitlisted.length,
          "Waiting for payment or for you to confirm a spot.",
          "registrations", "Open registrations")}
        ${card("Games without a score", missingScores,
          "Scheduled games in a live season. Standings only count games with a score.",
          "schedule", "Open schedule")}
        ${card("Seasons not published", unpublished.length,
          "Nobody can see these yet. Publish once the teams and schedule are in.",
          "competitions", "Open seasons")}
      </div>

      <section class="adm-section">
        <h2 class="adm-section-title">Latest registrations</h2>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr><th>Name</th><th>Tournament</th><th>Account</th><th>Status</th><th>Registered</th></tr>
            </thead>
            <tbody>
              ${registrations.slice(0, 8).map((r) => `
                <tr>
                  <td>${esc(r.first_name)} ${esc(r.last_name)}</td>
                  <td>${esc(r.tournament_name)}</td>
                  <td>${r.is_guest ? `<span class="adm-muted">No account</span>` : "Account"}</td>
                  <td>${statusPill(r.status)}</td>
                  <td>${esc(dateTime(r.registered_at))}</td>
                </tr>`).join("") ||
                `<tr><td colspan="5" class="adm-empty">No registrations yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>`;
  } catch (err) {
    root.innerHTML = errorBox(err);
  }
}
