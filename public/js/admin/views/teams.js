import * as api from "../api.js";
import { esc, loading, errorBox, emptyRow, field, openModal, run } from "../ui.js";

/*
  Les équipes d'une saison et leur effectif.

  Deux façons d'ajouter quelqu'un :
   - un joueur qui a un profil (compte MyHoop, ou joueur importé d'une ligue);
   - une personne inscrite au tournoi SANS COMPTE : on pointe son inscription,
     son nom suffit, et aucun profil n'est créé pour elle.

  Dans les deux cas, son nom apparaît dans l'équipe sur le site. Un profil
  n'est nécessaire que pour avoir une fiche à ouvrir et des statistiques.
*/

async function newTeam(competitionId, after) {
  openModal("New team", `
    ${field("name", "Name", { required: true, placeholder: "Roho Warriors" })}
    ${field("short_name", "Short name", { placeholder: "RW", help: "Up to 30 characters, used in tight spaces." })}
    ${field("primary_color", "Colour", { type: "color", value: "#111111", help: "Used on the team card and page header." })}
    ${field("logo_url", "Logo URL", { type: "url", placeholder: "https://…", help: "Must start with https://" })}`,
    {
      submitLabel: "Create team",
      confirmOn: "adm-team-toast",
      confirmText: "Team created.",
      onSubmit: async (data) => {
        await api.createTeam({ ...data, competition_id: competitionId });
        await after();
      },
    });
}

async function manageRoster(team, after) {
  const [full, players, registrations] = await Promise.all([
    api.fetchTeam(team.team_id),
    api.fetchPlayersAdmin(),
    // Les inscriptions sans compte du tournoi de cette équipe, s'il y en a un.
    team.tournament_id ? api.fetchRegistrations(team.tournament_id) : Promise.resolve([]),
  ]);

  const guests = registrations.filter((r) => r.is_guest);

  const rows = (full.members || []).length === 0
    ? emptyRow(5, "Nobody on this roster yet.")
    : full.members.map((m) => `
        <tr data-member="${esc(m.member_id)}">
          <td><input class="adm-input-sm" type="number" min="0" max="99"
                     value="${esc(m.jersey_number ?? "")}" data-jersey /></td>
          <td>
            ${esc(m.first_name)} ${esc(m.last_name)}
            ${m.is_guest ? `<span class="adm-pill">No account</span>` : ""}
            ${!m.is_guest && !m.is_public ? `<span class="adm-pill adm-pill-warn">Profile hidden</span>` : ""}
          </td>
          <td>${esc(m.role)}</td>
          <td><button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-save-member>Save</button></td>
          <td><button type="button" class="adm-btn adm-btn-bad adm-btn-sm" data-remove-member>Remove</button></td>
        </tr>`).join("");

  openModal(`Roster — ${team.name}`, `
    <table class="adm-table adm-table-tight">
      <thead><tr><th>#</th><th>Player</th><th>Role</th><th></th><th></th></tr></thead>
      <tbody id="adm-roster-body">${rows}</tbody>
    </table>

    <h3 class="adm-sub">Add someone</h3>
    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="f-player_id">A player with a profile</label>
        <select id="f-player_id" name="player_id">
          <option value="">—</option>
          ${players.filter((p) => p.is_active).map((p) => `
            <option value="${esc(p.player_id)}">${esc(p.first_name)} ${esc(p.last_name)}</option>`).join("")}
        </select>
      </div>
      <div class="adm-field">
        <label for="f-registration_id">Or someone registered without an account</label>
        <select id="f-registration_id" name="registration_id" ${guests.length ? "" : "disabled"}>
          <option value="">—</option>
          ${guests.map((r) => `
            <option value="${esc(r.registration_id)}">${esc(r.first_name)} ${esc(r.last_name)}</option>`).join("")}
        </select>
        <small class="adm-help">
          ${guests.length
            ? "Their name comes from their registration. No profile is created."
            : "Only for a tournament team, once somebody has registered without an account."}
        </small>
      </div>
      ${field("jersey_number", "Jersey number", { type: "number", min: 0 })}
      ${field("role", "Role", { options: [{ value: "member", label: "Player" }, { value: "captain", label: "Captain" }] })}
    </div>`,
    {
      submitLabel: "Add to roster",
      wide: true,
      confirmOn: "adm-team-toast",
      confirmText: "Added to the roster.",
      onSubmit: async (data) => {
        if (Boolean(data.player_id) === Boolean(data.registration_id)) {
          throw new Error("Pick either a player with a profile, or a registration — not both.");
        }
        await api.addTeamMember(team.team_id, data);
        await after();
      },
    });

  const body = document.getElementById("adm-roster-body");

  body?.addEventListener("click", async (e) => {
    const row = e.target.closest("tr");
    if (!row) return;

    const save = e.target.closest("[data-save-member]");
    if (save) {
      const jersey = row.querySelector("[data-jersey]").value;
      await run(save, "adm-modal-toast", {
        pending: "Saving…",
        done: "Number saved.",
        action: () => api.updateTeamMember(row.dataset.member, { jersey_number: jersey || null }),
      }).catch(() => {});
      return;
    }

    const remove = e.target.closest("[data-remove-member]");
    if (!remove) return;
    if (!window.confirm("Remove this person from the roster? Their past game stats stay.")) return;

    await run(remove, "adm-modal-toast", {
      pending: "Removing…",
      done: "Removed from the roster.",
      action: () => api.removeTeamMember(row.dataset.member),
      after: async () => { row.remove(); await after(); },
    }).catch(() => {});
  });
}

// La liste est triée par date de début, mais l'admin veut presque toujours la
// saison en cours : on la présélectionne au lieu de la première venue.
function defaultCompetition(competitions) {
  const pick = competitions.find((c) => c.status === "active")
            || competitions.find((c) => c.match_count > 0)
            || competitions[0];
  return pick.competition_id;
}

export async function render(root) {
  root.innerHTML = loading("Loading teams…");

  try {
    const competitions = await api.fetchCompetitions();

    if (competitions.length === 0) {
      root.innerHTML = `<p class="adm-state">Create a season first, under “Seasons”.</p>`;
      return;
    }

    const preselect = defaultCompetition(competitions);

    root.innerHTML = `
      <section class="adm-section">
        <div class="adm-section-head">
          <div>
            <h2 class="adm-section-title">Teams &amp; rosters</h2>
            <p class="adm-section-text">
              A roster can hold players with a profile and people registered without an account.
              Both show up by name on the team page.
            </p>
          </div>
          <div class="adm-section-actions">
            <select id="adm-team-comp" class="adm-select">
              ${competitions.map((c) => `<option value="${esc(c.competition_id)}" ${c.competition_id === preselect ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
            </select>
            <button class="adm-btn adm-btn-primary" id="adm-new-team">New team</button>
          </div>
        </div>
        <p class="adm-toast" id="adm-team-toast"></p>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead><tr><th>Team</th><th>Short</th><th>Roster</th><th></th></tr></thead>
            <tbody id="adm-team-body"></tbody>
          </table>
        </div>
      </section>`;

    const select = document.getElementById("adm-team-comp");
    const tbody = document.getElementById("adm-team-body");

    async function draw() {
      tbody.innerHTML = `<tr><td colspan="4" class="adm-empty">Loading…</td></tr>`;
      const full = await api.fetchCompetition(select.value);
      const teams = full.teams || [];

      if (teams.length === 0) {
        tbody.innerHTML = emptyRow(4, "No teams in this season yet.");
        return;
      }

      tbody.innerHTML = teams.map((t) => `
        <tr data-team="${esc(t.team_id)}">
          <td>
            <span class="adm-swatch" style="background:${esc(t.primary_color || "#111111")}"></span>
            ${esc(t.name)}
          </td>
          <td>${esc(t.short_name || "—")}</td>
          <td>${esc(t.member_count)}</td>
          <td><button class="adm-btn adm-btn-ghost adm-btn-sm" data-roster>Roster</button></td>
        </tr>`).join("");
    }

    select.addEventListener("change", draw);

    document.getElementById("adm-new-team").addEventListener("click", () => {
      newTeam(select.value, draw);
    });

    tbody.addEventListener("click", async (e) => {
      if (!e.target.closest("[data-roster]")) return;
      const row = e.target.closest("tr");
      const team = await api.fetchTeam(row.dataset.team);
      manageRoster(team, draw);
    });

    await draw();
  } catch (err) {
    root.innerHTML = errorBox(err);
  }
}
