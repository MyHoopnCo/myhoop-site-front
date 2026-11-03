import { fetchTeams } from "../api.js";
import { esc, pct, teamBadge, loading, empty, failed } from "../ui.js";

/*
  La grille des équipes, dans l'esprit de wnba.com/teams : une carte par
  équipe, avec sa couleur, son bilan, et un lien vers sa fiche.
*/

function card(team) {
  const record = team.gp !== null && team.gp !== undefined
    ? `${esc(team.w)}–${esc(team.l)} <span class="lg-card-pct">${esc(pct(team.win_pct))}</span>`
    : `<span class="lg-muted">No games yet</span>`;

  const rank = team.rank
    ? `<span class="lg-card-rank">#${esc(team.rank)}${team.group_name ? ` · ${esc(team.group_name)}` : ""}</span>`
    : "";

  return `
    <a class="lg-team-card" href="league.html?team=${encodeURIComponent(team.team_id)}"
       style="--team-color:${esc(team.primary_color || "#111111")}">
      <div class="lg-team-card-top">${teamBadge(team, "lg")}</div>
      <div class="lg-team-card-body">
        <h3 class="lg-team-card-name">${esc(team.name)}</h3>
        <p class="lg-team-card-record">${record}</p>
        ${rank}
      </div>
    </a>`;
}

export async function render(root, { season }) {
  root.innerHTML = loading("Loading teams…");

  try {
    const { teams } = await fetchTeams(season.slug);

    if (teams.length === 0) {
      root.innerHTML = empty("No teams in this season yet.");
      return;
    }

    root.innerHTML = `
      <p class="lg-count">${esc(teams.length)} teams</p>
      <div class="lg-team-grid">${teams.map(card).join("")}</div>`;
  } catch (err) {
    root.innerHTML = failed(err);
  }
}
