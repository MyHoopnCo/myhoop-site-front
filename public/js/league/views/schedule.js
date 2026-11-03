import { fetchMatches } from "../api.js";
import { esc, matchRow, groupByDay, loading, empty, failed } from "../ui.js";

/*
  Calendrier et résultats.

  Par défaut on ouvre sur ce qui vient : c'est ce qu'un joueur regarde au bord
  du terrain. L'onglet « Results » montre les matchs joués, du plus récent au
  plus ancien, parce qu'on cherche le score d'hier, pas celui de septembre.
*/

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "results", label: "Results" },
  { key: "all", label: "All" },
];

function tabBar(active) {
  return `
    <div class="lg-subtabs" role="tablist">
      ${TABS.map((t) => `
        <button class="lg-subtab ${t.key === active ? "is-active" : ""}"
                role="tab" aria-selected="${t.key === active}" data-sub="${esc(t.key)}">
          ${esc(t.label)}
        </button>`).join("")}
    </div>`;
}

/*
  Une saison complète fait presque 200 matchs. Les afficher d'un coup donne une
  page interminable, où ce qui intéresse (le prochain match, le score d'hier)
  est noyé. On montre donc quelques journées, et un bouton en révèle d'autres.
*/
const DAYS_PER_STEP = 4;

function listFor(matches, view, shownDays) {
  if (matches.length === 0) {
    return empty(view === "results"
      ? "No games have been played yet."
      : "No games scheduled right now.");
  }

  const days = groupByDay(matches);
  const visible = days.slice(0, shownDays);
  const remaining = days.length - visible.length;

  const list = visible.map((day) => `
    <section class="lg-day">
      <h3 class="lg-day-title">${esc(day.label)}</h3>
      <div class="lg-day-games">${day.matches.map(matchRow).join("")}</div>
    </section>
  `).join("");

  const more = remaining > 0
    ? `<button class="lg-more" data-more>
         Show more — ${esc(remaining)} more game day${remaining > 1 ? "s" : ""}
       </button>`
    : "";

  return list + more;
}

export async function render(root, { season, phaseId }) {
  let view = "upcoming";
  let shownDays = DAYS_PER_STEP;
  let lastMatches = [];

  async function draw() {
    const body = root.querySelector("[data-schedule-body]");
    body.innerHTML = loading("Loading games…");

    try {
      // « Upcoming » demande aussi les matchs reportés : un match sans date
      // reste une information utile, il ne doit pas disparaître de la page.
      const [scheduled, postponed, completed] = await Promise.all([
        view === "results" ? { matches: [] } : fetchMatches(season.slug, { status: "scheduled", phase: phaseId }),
        view === "results" ? { matches: [] } : fetchMatches(season.slug, { status: "postponed", phase: phaseId }),
        view === "upcoming" ? { matches: [] } : fetchMatches(season.slug, { status: "completed", phase: phaseId }),
      ]);

      const played = [...completed.matches].reverse();

      if (view === "upcoming") lastMatches = [...postponed.matches, ...scheduled.matches];
      else if (view === "results") lastMatches = played;
      else lastMatches = [...postponed.matches, ...scheduled.matches, ...played];

      body.innerHTML = listFor(lastMatches, view, shownDays);
    } catch (err) {
      body.innerHTML = failed(err);
    }
  }

  root.innerHTML = `${tabBar(view)}<div data-schedule-body></div>`;

  root.querySelector(".lg-subtabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".lg-subtab");
    if (!btn || btn.dataset.sub === view) return;

    view = btn.dataset.sub;
    shownDays = DAYS_PER_STEP;   // on repart du haut en changeant d'onglet
    root.querySelectorAll(".lg-subtab").forEach((b) => {
      const on = b.dataset.sub === view;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    draw();
  });

  // « Voir plus » : on redessine depuis les matchs déjà reçus, sans
  // redemander quoi que ce soit au serveur.
  root.addEventListener("click", (e) => {
    if (!e.target.closest("[data-more]")) return;
    shownDays += DAYS_PER_STEP;
    root.querySelector("[data-schedule-body]").innerHTML = listFor(lastMatches, view, shownDays);
  });

  await draw();
}
