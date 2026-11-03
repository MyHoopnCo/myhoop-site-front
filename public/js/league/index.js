/* ═══════════════════════════════════════════════════════════
   Section ligue partenaire (Union League et les suivantes).

   Une seule page, plusieurs vues, choisies par l'adresse :
     league.html                        → la saison en cours, classement
     league.html?tab=schedule           → calendrier et résultats
     league.html?tab=teams              → les équipes
     league.html?tab=leaders            → les leaders
     league.html?season=2026-27         → une autre saison
     league.html?team=<id>              → la fiche d'une équipe

   Chaque vue a donc son adresse : un lien partagé rouvre le bon écran.

   Séparation MyHoop / partenaire : cette section porte le nom de la ligue en
   en-tête, et dit en une ligne que MyHoop héberge sans organiser.
   ═══════════════════════════════════════════════════════════ */

import { fetchLeagues, fetchSeasons, fetchSeason } from "./api.js";
import { esc, loading, empty, failed } from "./ui.js";

import * as standings from "./views/standings.js";
import * as schedule from "./views/schedule.js";
import * as teams from "./views/teams.js";
import * as team from "./views/team.js";
import * as leaders from "./views/leaders.js";

const VIEWS = {
  standings: { label: "Standings", module: standings },
  schedule:  { label: "Schedule",  module: schedule },
  teams:     { label: "Teams",     module: teams },
  leaders:   { label: "Leaders",   module: leaders },
};

const page = document.getElementById("league-page");
const params = new URLSearchParams(window.location.search);

function tabsBar(active, season, phases) {
  const tabs = Object.entries(VIEWS).map(([key, v]) => `
    <a class="lg-tab ${key === active ? "is-active" : ""}"
       href="league.html?${new URLSearchParams({ season: season.slug, tab: key })}">
      ${esc(v.label)}
    </a>`).join("");

  // Le filtre de phase ne sert qu'au classement et au calendrier, et seulement
  // quand la saison a plusieurs phases (tour de relégation, saison, séries).
  const usePhases = ["standings", "schedule"].includes(active) && phases.length > 1;
  const phaseId = params.get("phase") || "";

  const phaseSelect = !usePhases ? "" : `
    <label class="lg-phase">
      <span class="lg-phase-label">Phase</span>
      <select id="lg-phase-select">
        <option value="">All phases</option>
        ${phases.map((p) => `
          <option value="${esc(p.phase_id)}" ${p.phase_id === phaseId ? "selected" : ""}>
            ${esc(p.name)}
          </option>`).join("")}
      </select>
    </label>`;

  return `<nav class="lg-tabs">${tabs}${phaseSelect}</nav>`;
}

function seasonBar(league, seasons, current) {
  const options = seasons.map((s) => `
    <option value="${esc(s.slug)}" ${s.slug === current.slug ? "selected" : ""}>
      ${esc(s.season_label || s.name)}
    </option>`).join("");

  return `
    <header class="lg-header">
      <div class="lg-header-inner">
        <div class="lg-identity">
          ${league?.logo_url
            ? `<img class="lg-league-logo" src="${esc(league.logo_url)}" alt="" />`
            : ""}
          <div>
            <h1 class="lg-league-name">${esc(current.organization_name)}</h1>
            <p class="lg-league-sub">
              ${esc(current.name)}
              ${current.status === "active" ? `<span class="lg-live">In season</span>` : ""}
            </p>
          </div>
        </div>

        ${seasons.length > 1 ? `
          <label class="lg-season">
            <span class="lg-phase-label">Season</span>
            <select id="lg-season-select">${options}</select>
          </label>` : ""}
      </div>
      <p class="lg-hosted">
        A partner league hosted on MyHoop. Schedule, scores and stats are provided by
        ${esc(current.organization_name)}.
      </p>
    </header>`;
}

async function renderSeasonView() {
  const requested = params.get("season");
  const tab = VIEWS[params.get("tab")] ? params.get("tab") : "standings";

  const leagues = await fetchLeagues();
  if (leagues.length === 0) {
    page.innerHTML = empty("No partner league is published yet.");
    return;
  }

  // Sans saison demandée : celle du premier partenaire, la plus récente.
  const league = leagues[0];
  const seasons = await fetchSeasons(league.slug);
  if (seasons.length === 0) {
    page.innerHTML = empty("This league has no published season yet.");
    return;
  }

  const slug = requested && seasons.some((s) => s.slug === requested) ? requested : seasons[0].slug;
  const season = await fetchSeason(slug);

  page.innerHTML = `
    ${seasonBar(league, seasons, season)}
    ${tabsBar(tab, season, season.phases || [])}
    <main class="lg-main" id="lg-view"></main>`;

  const seasonSelect = document.getElementById("lg-season-select");
  if (seasonSelect) {
    seasonSelect.addEventListener("change", () => {
      window.location.search = new URLSearchParams({ season: seasonSelect.value, tab }).toString();
    });
  }

  const phaseSelect = document.getElementById("lg-phase-select");
  if (phaseSelect) {
    phaseSelect.addEventListener("change", () => {
      const next = { season: season.slug, tab };
      if (phaseSelect.value) next.phase = phaseSelect.value;
      window.location.search = new URLSearchParams(next).toString();
    });
  }

  await VIEWS[tab].module.render(document.getElementById("lg-view"), {
    season,
    phaseId: params.get("phase") || undefined,
  });
}

async function init() {
  if (!page) return;
  page.innerHTML = loading();

  try {
    const teamId = params.get("team");
    if (teamId) {
      await team.render(page, { teamId });
      return;
    }
    await renderSeasonView();
  } catch (err) {
    page.innerHTML = failed(err);
  }
}

init();
