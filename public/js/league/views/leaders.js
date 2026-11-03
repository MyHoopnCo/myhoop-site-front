import { fetchLeaders } from "../api.js";
import { esc, loading, empty, failed } from "../ui.js";

/*
  Les leaders de la saison.

  Un joueur n'y figure qu'à partir d'un nombre minimum de matchs avec de vraies
  statistiques (réglé par saison dans l'admin, 3 pour Union League) : sinon
  quelqu'un qui a joué un seul match passerait devant tout le monde.

  Seuls les joueurs qui ont publié leur profil apparaissent ici, parce que la
  page cite des noms hors du contexte d'une équipe.
*/

const BOARDS = [
  { key: "ppg", title: "Points", unit: "PPG" },
  { key: "rpg", title: "Rebounds", unit: "RPG" },
  { key: "apg", title: "Assists", unit: "APG" },
  { key: "spg", title: "Steals", unit: "SPG" },
  { key: "bpg", title: "Blocks", unit: "BPG" },
  { key: "tpg", title: "Three-pointers", unit: "3PG" },
];

function board(def, rows) {
  if (!rows || rows.length === 0) {
    return `
      <section class="lg-leader-card">
        <h2 class="lg-leader-title">${esc(def.title)}</h2>
        ${empty("Not enough games yet.")}
      </section>`;
  }

  const items = rows.map((p, i) => {
    const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    const nameCell = p.slug
      ? `<a href="players.html?slug=${encodeURIComponent(p.slug)}">${esc(name)}</a>`
      : `<span>${esc(name)}</span>`;

    return `
      <li class="lg-leader-row ${i === 0 ? "is-top" : ""}">
        <span class="lg-leader-rank">${i + 1}</span>
        ${p.avatar_url
          ? `<img class="lg-avatar" src="${esc(p.avatar_url)}" alt="" loading="lazy" />`
          : `<span class="lg-avatar lg-avatar-empty" aria-hidden="true"></span>`}
        <span class="lg-leader-name">
          ${nameCell}
          <small>${esc(p.team_name || "—")}</small>
        </span>
        <span class="lg-leader-value">${esc(p.value ?? "—")}</span>
      </li>`;
  }).join("");

  return `
    <section class="lg-leader-card">
      <h2 class="lg-leader-title">${esc(def.title)} <span class="lg-leader-unit">${esc(def.unit)}</span></h2>
      <ol class="lg-leader-list">${items}</ol>
    </section>`;
}

export async function render(root, { season }) {
  root.innerHTML = loading("Loading leaders…");

  try {
    // Une seule requête : l'API renvoie toutes les catégories d'un coup.
    const { boards } = await fetchLeaders(season.slug, { limit: 5 });

    const anyRows = BOARDS.some((d) => (boards[d.key] || []).length > 0);
    if (!anyRows) {
      const min = season.leaders_min_games;
      root.innerHTML = empty(
        min > 1
          ? `No leaders yet — a player needs at least ${min} games with published stats.`
          : "No published player stats yet."
      );
      return;
    }

    root.innerHTML = `
      <div class="lg-leader-grid">${BOARDS.map((d) => board(d, boards[d.key])).join("")}</div>
      <p class="lg-note">
        Minimum ${esc(season.leaders_min_games)} game${season.leaders_min_games > 1 ? "s" : ""}
        with published stats to appear. Players who haven't made their profile public aren't listed.
      </p>`;
  } catch (err) {
    root.innerHTML = failed(err);
  }
}
