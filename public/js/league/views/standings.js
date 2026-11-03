import { fetchStandings } from "../api.js";
import { esc, pct, signed, gamesBehind, formPills, teamBadge, teamLink, loading, empty, failed } from "../ui.js";

/*
  Le classement, dans l'esprit de celui de la WNBA : une ligne par équipe,
  triée par la base, avec victoires, défaites, pourcentage, écart de points et
  forme récente.

  Colonne « domicile / route » volontairement absente : tous les matchs
  d'Union League se jouent au même endroit, elle ne dirait rien.
*/

const COLUMNS = [
  { key: "gp", label: "GP", title: "Games played" },
  { key: "w", label: "W", title: "Wins" },
  { key: "l", label: "L", title: "Losses" },
  { key: "pct", label: "PCT", title: "Win percentage" },
  { key: "gb", label: "GB", title: "Games behind the leader" },
  { key: "pf", label: "PF", title: "Points for" },
  { key: "pa", label: "PA", title: "Points against" },
  { key: "diff", label: "DIFF", title: "Point differential" },
  { key: "streak", label: "STRK", title: "Current streak" },
  { key: "last5", label: "LAST 5", title: "Last five games" },
];

function tableFor(rows, title) {
  const head = COLUMNS.map((c) => `<th title="${esc(c.title)}">${esc(c.label)}</th>`).join("");

  const body = rows.map((r) => `
    <tr>
      <td class="lg-rank">${esc(r.rank)}</td>
      <td class="lg-cell-team">
        ${teamBadge(r)}
        ${teamLink(r.team_id, r.team_name)}
        ${r.short_name ? `<span class="lg-short">${esc(r.short_name)}</span>` : ""}
      </td>
      <td>${esc(r.gp)}</td>
      <td class="lg-strong">${esc(r.w)}</td>
      <td>${esc(r.l)}</td>
      <td>${esc(pct(r.win_pct))}</td>
      <td>${esc(gamesBehind(r.games_behind))}</td>
      <td>${esc(r.pf)}</td>
      <td>${esc(r.pa)}</td>
      <td class="${Number(r.diff) >= 0 ? "lg-pos" : "lg-neg"}">${esc(signed(r.diff))}</td>
      <td>${esc(r.streak || "—")}</td>
      <td class="lg-cell-form">${formPills(r.last5)}</td>
    </tr>
  `).join("");

  return `
    <section class="lg-block">
      ${title ? `<h2 class="lg-block-title">${esc(title)}</h2>` : ""}
      <div class="lg-table-wrap">
        <table class="lg-table lg-standings">
          <thead><tr><th class="lg-rank-head">#</th><th class="lg-team-head">Team</th>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>
  `;
}

export async function render(root, { season, phaseId }) {
  root.innerHTML = loading("Loading standings…");

  try {
    const { standings } = await fetchStandings(season.slug, phaseId);

    if (standings.length === 0) {
      root.innerHTML = empty("No standings yet — they appear as soon as the first game is played.");
      return;
    }

    // Une saison peut avoir plusieurs tableaux (deux divisions, un tour de
    // relégation...). On rend un tableau par groupe, dans l'ordre de l'API.
    const buckets = new Map();
    for (const row of standings) {
      const key = `${row.phase_name || ""}|${row.group_name || ""}`;
      if (!buckets.has(key)) {
        const parts = [row.phase_name, row.group_name].filter(Boolean);
        buckets.set(key, { title: parts.join(" · "), rows: [] });
      }
      buckets.get(key).rows.push(row);
    }

    const single = buckets.size === 1;
    root.innerHTML = [...buckets.values()]
      .map((b) => tableFor(b.rows, single ? "" : b.title))
      .join("") + `
      <p class="lg-note">
        Ranked by win percentage, then point differential, then points scored.
        A game decided by forfeit counts as a win and a loss.
      </p>`;
  } catch (err) {
    root.innerHTML = failed(err);
  }
}
