import * as api from "../api.js";
import { esc, dateOnly, loading, errorBox, emptyRow, statusPill, field, openModal, run, toast } from "../ui.js";

/*
  Les saisons et les tournois, vus comme des « compétitions ».

  Chaque tournoi MyHoop en devient une tout seul (la base s'en charge), donc
  cet écran sert surtout aux saisons de ligue : créer la saison, ses phases,
  ses équipes, puis la publier.

  Publier est volontairement un geste à part : tant que la saison n'est pas
  publiée, personne ne la voit. Le serveur refuse de publier une saison sans
  équipes ni calendrier — une page de ligue vide donne une mauvaise image au
  partenaire.
*/

const PHASE_KINDS = [
  { value: "regular", label: "Regular season" },
  { value: "qualifying", label: "Qualifying / relegation round" },
  { value: "playoffs", label: "Playoffs" },
  { value: "exhibition", label: "Exhibition / all-star" },
];

async function newCompetition(organizations, after) {
  openModal("New season", `
    ${field("organization_id", "League or organizer", {
      required: true,
      options: organizations.map((o) => ({ value: o.organization_id, label: `${o.name} (${o.kind})` })),
    })}
    ${field("name", "Name", { required: true, placeholder: "Union League 2026-27" })}
    ${field("season_label", "Season label", { placeholder: "2026-27", help: "Shown in the season picker on the public page." })}
    ${field("kind", "Kind", { options: [{ value: "league", label: "League season" }, { value: "tournament", label: "Tournament" }] })}
    ${field("competition_type", "Format", { options: ["5v5", "3v3", "1v1"] })}
    ${field("starts_on", "Starts on", { type: "date" })}
    ${field("ends_on", "Ends on", { type: "date" })}
    ${field("leaders_min_games", "Games needed to appear in the leaders", { type: "number", value: 3, min: 0 })}
    ${field("playoff_min_games", "Games needed for playoff eligibility", { type: "number", placeholder: "7" })}
    ${field("min_player_age", "Minimum age", { type: "number", placeholder: "18" })}`,
    {
      submitLabel: "Create season",
      wide: true,
      confirmOn: "adm-comp-toast",
      confirmText: "Season created — it is not published yet.",
      onSubmit: async (data) => {
        await api.createCompetition(data);
        await after();
      },
    });
}

async function newPhase(competition, after) {
  openModal(`New phase — ${competition.name}`, `
    <p class="adm-help">
      A phase is a part of the season with its own standings: a relegation round, the regular
      season, the playoffs. A team only appears in a standings table once it's added to that phase.
    </p>
    ${field("name", "Name", { required: true, placeholder: "Regular season" })}
    ${field("kind", "Kind", { required: true, options: PHASE_KINDS })}
    ${field("position", "Order", { type: "number", value: (competition.phases?.length || 0) + 1, min: 1 })}
    ${field("starts_on", "Starts on", { type: "date" })}
    ${field("ends_on", "Ends on", { type: "date" })}`,
    {
      submitLabel: "Create phase",
      onSubmit: async (data) => {
        await api.createPhase(competition.competition_id, data);
        await after();
      },
    });
}

async function showCompetition(id, reload) {
  const c = await api.fetchCompetition(id);

  const phases = (c.phases || []).map((p) => `
    <tr>
      <td>${esc(p.name)}</td>
      <td>${esc(p.kind)}</td>
      <td>${esc(dateOnly(p.starts_on))} → ${esc(dateOnly(p.ends_on))}</td>
      <td>${(p.groups || []).map((g) => `<span class="adm-pill">${esc(g.name)}</span>`).join("") || "—"}</td>
    </tr>`).join("") || emptyRow(4, "No phases. A season with no phase still gets one standings table.");

  const teams = (c.teams || []).map((t) => `
    <tr>
      <td>${esc(t.name)}</td>
      <td>${esc(t.short_name || "—")}</td>
      <td>${esc(t.member_count)} players</td>
    </tr>`).join("") || emptyRow(3, "No teams yet — add them in Teams & rosters.");

  openModal(c.name, `
    <div class="adm-detail">
      <p>
        ${statusPill(c.status)}
        ${c.is_public
          ? `<span class="adm-pill adm-pill-good">Published</span>`
          : `<span class="adm-pill adm-pill-warn">Not published</span>`}
        <span class="adm-pill">${esc(c.organization_name)}</span>
      </p>
      <dl class="adm-answers">
        <div><dt>Season</dt><dd>${esc(c.season_label || "—")}</dd></div>
        <div><dt>Dates</dt><dd>${esc(dateOnly(c.starts_on))} → ${esc(dateOnly(c.ends_on))}</dd></div>
        <div><dt>Leaders minimum</dt><dd>${esc(c.leaders_min_games)} games with stats</dd></div>
        <div><dt>Playoff eligibility</dt><dd>${c.playoff_min_games ? `${esc(c.playoff_min_games)} games` : "—"}</dd></div>
      </dl>

      <h3 class="adm-sub">Phases</h3>
      <table class="adm-table adm-table-tight">
        <thead><tr><th>Name</th><th>Kind</th><th>Dates</th><th>Groups</th></tr></thead>
        <tbody>${phases}</tbody>
      </table>
      <p><button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" id="adm-add-phase">Add a phase</button></p>

      <h3 class="adm-sub">Teams (${esc((c.teams || []).length)})</h3>
      <table class="adm-table adm-table-tight">
        <thead><tr><th>Name</th><th>Short</th><th>Roster</th></tr></thead>
        <tbody>${teams}</tbody>
      </table>
    </div>`,
    { submitLabel: "Close", wide: true, onSubmit: async () => {} });

  document.getElementById("adm-add-phase")?.addEventListener("click", () => {
    newPhase(c, async () => { await reload(); showCompetition(id, reload); });
  });
}

export async function render(root) {
  root.innerHTML = loading("Loading seasons…");

  try {
    const organizations = await api.fetchOrganizations();

    root.innerHTML = `
      <section class="adm-section">
        <div class="adm-section-head">
          <div>
            <h2 class="adm-section-title">Seasons &amp; tournaments</h2>
            <p class="adm-section-text">
              Every MyHoop tournament becomes one of these on its own. League seasons are created here.
              Nothing is visible to the public until you publish it.
            </p>
          </div>
          <div class="adm-section-actions">
            <button class="adm-btn adm-btn-primary" id="adm-new-comp">New season</button>
          </div>
        </div>
        <p class="adm-toast" id="adm-comp-toast"></p>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr><th>Name</th><th>Organizer</th><th>Status</th><th>Teams</th><th>Games</th><th>Public</th><th></th></tr>
            </thead>
            <tbody id="adm-comp-body"></tbody>
          </table>
        </div>
      </section>`;

    const tbody = document.getElementById("adm-comp-body");

    async function draw() {
      tbody.innerHTML = `<tr><td colspan="7" class="adm-empty">Loading…</td></tr>`;
      const rows = await api.fetchCompetitions();

      if (rows.length === 0) {
        tbody.innerHTML = emptyRow(7, "No seasons yet.");
        return;
      }

      tbody.innerHTML = rows.map((c) => `
        <tr data-comp="${esc(c.competition_id)}">
          <td>
            ${esc(c.name)}
            ${c.season_label ? `<br /><small class="adm-muted">${esc(c.season_label)}</small>` : ""}
          </td>
          <td>${esc(c.organization_name)}</td>
          <td>${statusPill(c.status)}</td>
          <td>${esc(c.team_count)}</td>
          <td>${esc(c.played_count)} / ${esc(c.match_count)}</td>
          <td>${c.is_public
            ? `<span class="adm-pill adm-pill-good">Published</span>`
            : `<span class="adm-pill adm-pill-warn">Hidden</span>`}</td>
          <td class="adm-row-actions">
            <button class="adm-btn adm-btn-ghost adm-btn-sm" data-open>Open</button>
            <button class="adm-btn ${c.is_public ? "adm-btn-bad" : "adm-btn-good"} adm-btn-sm" data-publish="${c.is_public ? "off" : "on"}">
              ${c.is_public ? "Unpublish" : "Publish"}
            </button>
          </td>
        </tr>`).join("");
    }

    document.getElementById("adm-new-comp").addEventListener("click", () => {
      newCompetition(organizations, draw);
    });

    tbody.addEventListener("click", async (e) => {
      const row = e.target.closest("tr");
      if (!row) return;

      if (e.target.closest("[data-open]")) {
        showCompetition(row.dataset.comp, draw);
        return;
      }

      const pub = e.target.closest("[data-publish]");
      if (!pub) return;

      const turningOn = pub.dataset.publish === "on";
      const name = row.querySelector("td").textContent.trim();

      if (!window.confirm(turningOn
        ? `Publish “${name}”? Anyone will be able to see its standings, schedule and rosters.`
        : `Unpublish “${name}”? It disappears from the public site right away.`)) return;

      await run(pub, "adm-comp-toast", {
        pending: turningOn ? "Publishing…" : "Unpublishing…",
        done: turningOn ? "Published — it's live on the site." : "Hidden from the public site.",
        action: () => api.publishCompetition(row.dataset.comp, turningOn),
        after: draw,
      }).catch(() => {});
    });

    await draw();
  } catch (err) {
    root.innerHTML = errorBox(err);
  }
}
