import * as api from "../api.js";
import { esc, dateTime, toLocalInput, loading, errorBox, emptyRow, statusPill, field, openModal, run } from "../ui.js";

/*
  Le calendrier et la saisie des résultats : l'écran que l'admin ouvre le plus
  souvent, le soir des matchs.

  Trois gestes :
   1. planifier un match (les équipes peuvent n'être qu'un libellé, « Seed 1 »,
      tant que le tour précédent n'est pas joué);
   2. entrer le score — la base crée alors une ligne par joueur des deux
      effectifs, avec victoire ou défaite;
   3. remplir la feuille de pointage — elle COMPLÈTE ces lignes. C'est pour ça
      que le code envoie une mise à jour et non une création : sinon la base
      répondrait « cette ligne existe déjà ».

  Un score déjà entré peut être corrigé : la base recalcule les bilans, et
  l'ancienne valeur reste dans le journal.
*/

async function scheduleMatch(competition, venues, after) {
  const teams = competition.teams || [];
  const phases = competition.phases || [];
  const teamOptions = [{ value: "", label: "— not known yet —" }]
    .concat(teams.map((t) => ({ value: t.team_id, label: t.name })));

  openModal(`Schedule a game — ${competition.name}`, `
    <div class="adm-grid-2">
      ${field("team_a_id", "Home team", { options: teamOptions })}
      ${field("team_b_id", "Away team", { options: teamOptions })}
      ${field("team_a_label", "…or a label for the home side", { placeholder: "Seed 1" })}
      ${field("team_b_label", "…or a label for the away side", { placeholder: "Winner of round 1" })}
      ${field("scheduled_at", "Date and time", { type: "datetime-local", required: true })}
      ${field("venue_id", "Venue", {
        options: [{ value: "", label: "—" }].concat(venues.map((v) => ({ value: v.venue_id, label: v.name }))),
      })}
      ${field("court", "Court", { placeholder: "Court 1" })}
      ${field("week_number", "Week", { type: "number", min: 1 })}
      ${phases.length
        ? field("phase_id", "Phase", {
            options: [{ value: "", label: "—" }].concat(phases.map((p) => ({ value: p.phase_id, label: p.name }))),
          })
        : ""}
      ${field("round", "Round label", { placeholder: "Quarter-final" })}
    </div>
    <p class="adm-help">
      Leave a side empty and write a label instead when you don't know who plays yet.
      A game with a label can't be marked as played until a real team is set.
    </p>`,
    {
      submitLabel: "Schedule",
      wide: true,
      confirmOn: "adm-sch-toast",
      confirmText: "Game added to the schedule.",
      onSubmit: async (data) => {
        const payload = { ...data, competition_id: competition.competition_id };
        // Un côté ne peut pas être à la fois une équipe et un libellé.
        if (payload.team_a_id) delete payload.team_a_label;
        if (payload.team_b_id) delete payload.team_b_label;
        await api.createMatch(payload);
        await after();
      },
    });
}

async function enterResult(match, after) {
  const teamA = match.team_a_name || "Home";
  const teamB = match.team_b_name || "Away";

  openModal(`Result — ${teamA} vs ${teamB}`, `
    <div class="adm-grid-2">
      ${field("score_a", `${teamA} score`, { type: "number", min: 0, required: true, value: match.score_a ?? "" })}
      ${field("score_b", `${teamB} score`, { type: "number", min: 0, required: true, value: match.score_b ?? "" })}
      ${field("result_type", "Result type", {
        value: match.result_type || "normal",
        options: [
          { value: "normal", label: "Normal" },
          { value: "overtime", label: "Overtime" },
          { value: "forfeit", label: "Forfeit" },
        ],
      })}
      ${field("forfeited_by", "Forfeited by", {
        value: match.forfeited_by || "",
        options: [{ value: "", label: "—" }, { value: "a", label: teamA }, { value: "b", label: teamB }],
      })}
    </div>
    ${field("video_url", "Video link", { type: "url", value: match.video_url || "", placeholder: "https://…" })}
    <p class="adm-help">
      Saving creates one line per player on both rosters, with the win or the loss.
      Basketball has no tie, so two equal scores are refused unless it's a forfeit.
      ${match.status === "completed" ? "This game already has a score — saving corrects it and the standings follow." : ""}
    </p>`,
    {
      submitLabel: match.status === "completed" ? "Correct the score" : "Save result",
      confirmOn: "adm-sch-toast",
      confirmText: match.status === "completed"
        ? "Score corrected — standings and win/loss updated."
        : "Result saved — every player on both rosters now has a win or a loss.",
      onSubmit: async (data) => {
        await api.recordResult(match.match_id, {
          score_a: Number(data.score_a),
          score_b: Number(data.score_b),
          result_type: data.result_type,
          forfeited_by: data.forfeited_by || null,
          video_url: data.video_url || null,
        });
        await after();
      },
    });
}

async function reschedule(match, venues, after) {
  openModal(`Reschedule — ${match.team_a_name || "TBD"} vs ${match.team_b_name || "TBD"}`, `
    ${field("scheduled_at", "New date and time", { type: "datetime-local", value: toLocalInput(match.scheduled_at) })}
    ${field("venue_id", "Venue", {
      value: match.venue_id || "",
      options: [{ value: "", label: "—" }].concat(venues.map((v) => ({ value: v.venue_id, label: v.name }))),
    })}
    ${field("court", "Court", { value: match.court || "" })}
    ${field("status", "Status", {
      value: match.status,
      options: [
        { value: "scheduled", label: "Scheduled" },
        { value: "postponed", label: "Postponed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    })}
    ${field("notes", "Note", { type: "textarea", value: match.notes || "", placeholder: "Why it moved" })}`,
    {
      submitLabel: "Save",
      confirmOn: "adm-sch-toast",
      confirmText: "Game moved.",
      onSubmit: async (data) => {
        await api.updateMatchSchedule(match.match_id, data);
        await after();
      },
    });
}

/*
  La feuille de pointage.

  Les lignes existent déjà (créées quand le score a été saisi) : on les
  complète. Une ligne vide reste vide — un joueur sans statistique affiche un
  tiret sur le site, pas un « 0 » trompeur qui ferait croire qu'il a mal joué.
*/
async function boxScore(matchId, after) {
  const { match, rows } = await api.fetchBoxScore(matchId);

  if (rows.length === 0) {
    openModal("Box score", `
      <p class="adm-state">
        Neither roster has players with a profile, so there's nothing to fill in.
        Add players under “Teams &amp; rosters” first.
      </p>`, { submitLabel: "Close", onSubmit: async () => {} });
    return;
  }

  const num = (v) => (v === null || v === undefined ? "" : esc(v));

  const body = rows.map((r) => `
    <tr data-player="${esc(r.player_id)}" data-team="${esc(r.team_id)}">
      <td class="adm-bs-team">${esc(r.team_name)}</td>
      <td>${esc(r.jersey_number ?? "—")} ${esc(r.first_name)} ${esc(r.last_name)}</td>
      <td><input class="adm-input-sm" type="number" min="0" value="${num(r.points)}" data-k="points" /></td>
      <td><input class="adm-input-sm" type="number" min="0" value="${num(r.rebounds)}" data-k="rebounds" /></td>
      <td><input class="adm-input-sm" type="number" min="0" value="${num(r.assists)}" data-k="assists" /></td>
      <td><input class="adm-input-sm" type="number" min="0" value="${num(r.steals)}" data-k="steals" /></td>
      <td><input class="adm-input-sm" type="number" min="0" value="${num(r.blocks)}" data-k="blocks" /></td>
      <td><input class="adm-input-sm" type="number" min="0" value="${num(r.threes_made)}" data-k="threes_made" /></td>
      <td>
        <select class="adm-input-sm" data-k="participation">
          <option value="played" ${r.participation === "played" ? "selected" : ""}>Played</option>
          <option value="assumed" ${r.participation === "assumed" || !r.participation ? "selected" : ""}>Not entered</option>
          <option value="dnp" ${r.participation === "dnp" ? "selected" : ""}>Did not play</option>
        </select>
      </td>
      <td class="adm-bs-result">${r.win ? "W" : r.loss ? "L" : "—"}</td>
    </tr>`).join("");

  openModal(`Box score — ${match.team_a_name || "?"} ${match.score_a ?? ""}–${match.score_b ?? ""} ${match.team_b_name || "?"}`, `
    <p class="adm-help">
      Leave a box empty when you don't have the number — the site shows a dash, not a zero.
      The W/L column comes from the game result and isn't edited here.
    </p>
    <div class="adm-table-wrap">
      <table class="adm-table adm-table-tight adm-boxscore">
        <thead>
          <tr>
            <th>Team</th><th>Player</th>
            <th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>3PM</th>
            <th>Status</th><th>W/L</th>
          </tr>
        </thead>
        <tbody id="adm-bs-body">${body}</tbody>
      </table>
    </div>`,
    {
      submitLabel: "Save box score",
      wide: true,
      confirmOn: "adm-sch-toast",
      confirmText: "Box score saved.",
      onSubmit: async () => {
        const lines = [...document.querySelectorAll("#adm-bs-body tr")].map((tr) => {
          const line = { player_id: tr.dataset.player, team_id: tr.dataset.team || null };
          tr.querySelectorAll("[data-k]").forEach((input) => {
            const key = input.dataset.k;
            line[key] = input.value === "" ? null : (key === "participation" ? input.value : Number(input.value));
          });
          return line;
        });
        await api.saveBoxScore(matchId, lines);
        await after();
      },
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
  root.innerHTML = loading("Loading schedule…");

  try {
    const [competitions, venues] = await Promise.all([api.fetchCompetitions(), api.fetchVenues()]);

    if (competitions.length === 0) {
      root.innerHTML = `<p class="adm-state">Create a season first, under “Seasons”.</p>`;
      return;
    }

    const preselect = defaultCompetition(competitions);

    root.innerHTML = `
      <section class="adm-section">
        <div class="adm-section-head">
          <div>
            <h2 class="adm-section-title">Schedule &amp; results</h2>
            <p class="adm-section-text">
              Standings only count games with a score. Entering one creates a line for every
              player on both rosters.
            </p>
          </div>
          <div class="adm-section-actions">
            <select id="adm-sch-comp" class="adm-select">
              ${competitions.map((c) => `<option value="${esc(c.competition_id)}" ${c.competition_id === preselect ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
            </select>
            <select id="adm-sch-status" class="adm-select">
              <option value="">All games</option>
              <option value="scheduled" selected>To be played</option>
              <option value="completed">Played</option>
              <option value="postponed">Postponed</option>
            </select>
            <button class="adm-btn adm-btn-primary" id="adm-new-match">Schedule a game</button>
          </div>
        </div>
        <p class="adm-toast" id="adm-sch-toast"></p>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr><th>When</th><th>Game</th><th>Where</th><th>Phase</th><th>Score</th><th>Status</th><th></th></tr>
            </thead>
            <tbody id="adm-sch-body"></tbody>
          </table>
        </div>
      </section>`;

    const compSelect = document.getElementById("adm-sch-comp");
    const statusSelect = document.getElementById("adm-sch-status");
    const tbody = document.getElementById("adm-sch-body");

    async function draw() {
      tbody.innerHTML = `<tr><td colspan="7" class="adm-empty">Loading…</td></tr>`;
      const matches = await api.fetchCompetitionMatches(compSelect.value, { status: statusSelect.value });

      if (matches.length === 0) {
        tbody.innerHTML = emptyRow(7, "No games match this filter.");
        return;
      }

      // 60 lignes suffisent à une soirée de travail; au-delà on filtre.
      tbody.innerHTML = matches.slice(0, 60).map((m) => {
        const done = m.status === "completed";
        const playable = m.team_a_id && m.team_b_id;

        return `
          <tr data-match="${esc(m.match_id)}">
            <td>${esc(dateTime(m.scheduled_at || m.played_at))}</td>
            <td>
              ${esc(m.team_a_name || "TBD")} <span class="adm-muted">vs</span> ${esc(m.team_b_name || "TBD")}
              ${playable ? "" : `<span class="adm-pill adm-pill-warn">teams not set</span>`}
            </td>
            <td>${esc([m.venue_name, m.court].filter(Boolean).join(" · ") || "—")}</td>
            <td>${esc(m.phase_name || "—")}</td>
            <td class="adm-score">${done ? `${esc(m.score_a)}–${esc(m.score_b)}` : "—"}</td>
            <td>${statusPill(m.status)}</td>
            <td class="adm-row-actions">
              ${playable
                ? `<button class="adm-btn ${done ? "adm-btn-ghost" : "adm-btn-good"} adm-btn-sm" data-result>
                     ${done ? "Correct" : "Enter score"}
                   </button>`
                : ""}
              ${done ? `<button class="adm-btn adm-btn-ghost adm-btn-sm" data-box>Box score</button>` : ""}
              <button class="adm-btn adm-btn-ghost adm-btn-sm" data-move>Move</button>
            </td>
          </tr>`;
      }).join("") + (matches.length > 60
        ? `<tr><td colspan="7" class="adm-empty">Showing 60 of ${matches.length}. Use the filters above.</td></tr>`
        : "");
    }

    compSelect.addEventListener("change", draw);
    statusSelect.addEventListener("change", draw);

    document.getElementById("adm-new-match").addEventListener("click", async () => {
      const competition = await api.fetchCompetition(compSelect.value);
      scheduleMatch(competition, venues, draw);
    });

    tbody.addEventListener("click", async (e) => {
      const row = e.target.closest("tr[data-match]");
      if (!row) return;

      const matches = await api.fetchCompetitionMatches(compSelect.value, { status: statusSelect.value });
      const match = matches.find((m) => m.match_id === row.dataset.match);
      if (!match) return;

      if (e.target.closest("[data-result]")) enterResult(match, draw);
      else if (e.target.closest("[data-box]")) boxScore(match.match_id, draw);
      else if (e.target.closest("[data-move]")) reschedule(match, venues, draw);
    });

    await draw();
  } catch (err) {
    root.innerHTML = errorBox(err);
  }
}
