import { fetchTeam } from "../api.js";
import { esc, pct, signed, formPills, teamBadge, matchRow, groupByDay, loading, empty, failed } from "../ui.js";

/*
  La fiche d'une équipe : son bilan, sa composition, ses matchs.

  Deux sortes de monde dans la composition :
   - un joueur dont le profil est public : son nom renvoie à sa fiche;
   - quelqu'un qui n'a pas publié de profil, ou qui s'est inscrit sans compte :
     seulement son nom. Une équipe doit montrer qui en fait partie.
*/

function header(team, standing) {
  const s = standing[0];
  const record = s
    ? `${esc(s.w)}–${esc(s.l)} <span class="lg-head-pct">${esc(pct(s.win_pct))}</span>`
    : `<span class="lg-muted">No games yet</span>`;

  const extra = s ? `
    <div class="lg-head-stats">
      <div><span>Rank</span><strong>#${esc(s.rank)}</strong></div>
      <div><span>Points for</span><strong>${esc(s.pf)}</strong></div>
      <div><span>Points against</span><strong>${esc(s.pa)}</strong></div>
      <div><span>Diff</span><strong class="${Number(s.diff) >= 0 ? "lg-pos" : "lg-neg"}">${esc(signed(s.diff))}</strong></div>
      <div><span>Streak</span><strong>${esc(s.streak || "—")}</strong></div>
      <div><span>Last 5</span><strong class="lg-cell-form">${formPills(s.last5)}</strong></div>
    </div>` : "";

  return `
    <header class="lg-team-head" style="--team-color:${esc(team.primary_color || "#111111")}">
      <a class="lg-back" href="league.html?tab=teams">← All teams</a>
      <div class="lg-team-head-main">
        ${teamBadge(team, "xl")}
        <div>
          <p class="lg-team-head-league">${esc(team.organization_name)} · ${esc(team.competition_name)}</p>
          <h1 class="lg-team-head-name">${esc(team.name)}</h1>
          <p class="lg-team-head-record">${record}</p>
        </div>
      </div>
      ${extra}
    </header>`;
}

function rosterTable(roster) {
  if (roster.length === 0) {
    return empty("The roster hasn't been published yet.");
  }

  const rows = roster.map((p) => {
    const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    // Pas de fiche publique : on affiche le nom sans lien. C'est le cas d'un
    // joueur importé de la ligue et de quelqu'un inscrit sans compte.
    const nameCell = p.slug
      ? `<a href="players.html?slug=${encodeURIComponent(p.slug)}">${esc(name)}</a>`
      : `<span>${esc(name)}</span>`;

    const avatar = p.avatar_url
      ? `<img class="lg-avatar" src="${esc(p.avatar_url)}" alt="" loading="lazy" />`
      : `<span class="lg-avatar lg-avatar-empty" aria-hidden="true"></span>`;

    const num = (v) => (v === null || v === undefined ? "—" : esc(v));

    return `
      <tr>
        <td class="lg-jersey">${p.jersey_number ?? "—"}</td>
        <td class="lg-cell-player">
          ${avatar}
          ${nameCell}
          ${p.role === "captain" ? `<span class="lg-tag">C</span>` : ""}
        </td>
        <td>${num(p.gp)}</td>
        <td>${num(p.ppg)}</td>
        <td>${num(p.rpg)}</td>
        <td>${num(p.apg)}</td>
      </tr>`;
  }).join("");

  return `
    <div class="lg-table-wrap">
      <table class="lg-table lg-roster">
        <thead>
          <tr>
            <th>#</th><th class="lg-team-head">Player</th>
            <th title="Games played">GP</th>
            <th title="Points per game">PPG</th>
            <th title="Rebounds per game">RPG</th>
            <th title="Assists per game">APG</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="lg-note">A dash means the game stats haven't been published for that player yet.</p>`;
}

function matchesBlock(matches) {
  if (matches.length === 0) return empty("No games on the schedule.");

  const played = matches.filter((m) => m.status === "completed").reverse();
  const upcoming = matches.filter((m) => m.status !== "completed");

  const block = (title, list) => list.length === 0 ? "" : `
    <section class="lg-block">
      <h2 class="lg-block-title">${esc(title)}</h2>
      ${groupByDay(list).map((d) => `
        <section class="lg-day">
          <h3 class="lg-day-title">${esc(d.label)}</h3>
          <div class="lg-day-games">${d.matches.map(matchRow).join("")}</div>
        </section>`).join("")}
    </section>`;

  return block("Upcoming", upcoming) + block("Results", played);
}

export async function render(root, { teamId }) {
  root.innerHTML = loading("Loading team…");

  try {
    const { team, roster, standing, matches } = await fetchTeam(teamId);

    root.innerHTML = `
      ${header(team, standing)}
      <section class="lg-block">
        <h2 class="lg-block-title">Roster</h2>
        ${rosterTable(roster)}
      </section>
      ${matchesBlock(matches)}`;
  } catch (err) {
    root.innerHTML = failed(err);
  }
}
