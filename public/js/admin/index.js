/* ═══════════════════════════════════════════════════════════
   Admin v2.

   Une page, plusieurs écrans, choisis par l'ancre de l'adresse
   (#payments, #schedule…) : un écran peut donc être mis en favori,
   et le bouton « retour » du navigateur fonctionne.

   L'accès est vérifié deux fois : ici pour ne pas afficher une page
   inutile, et côté serveur sur CHAQUE route — c'est celle-là qui
   protège vraiment. Cacher un bouton ne protège rien.
   ═══════════════════════════════════════════════════════════ */

import { fetchCurrentUser } from "./api.js";
import { esc } from "./ui.js";

import * as dashboard from "./views/dashboard.js";
import * as payments from "./views/payments.js";
import * as registrations from "./views/registrations.js";
import * as competitions from "./views/competitions.js";
import * as teams from "./views/teams.js";
import * as schedule from "./views/schedule.js";
import * as players from "./views/players.js";

const SCREENS = {
  dashboard:     { label: "To do",             module: dashboard },
  payments:      { label: "Payments",          module: payments },
  registrations: { label: "Registrations",     module: registrations },
  schedule:      { label: "Schedule & results", module: schedule },
  competitions:  { label: "Seasons",           module: competitions },
  teams:         { label: "Teams & rosters",   module: teams },
  players:       { label: "Players",           module: players },
};

const wrapper = document.getElementById("admin-wrapper");

function gate() {
  const redirect = encodeURIComponent(window.location.pathname + window.location.hash);
  wrapper.innerHTML = `
    <div class="adm-gate">
      <h1>Admin</h1>
      <p>This page is for admins only.</p>
      <p><a class="adm-btn adm-btn-primary" href="signin.html?redirect=${redirect}">Sign in</a></p>
    </div>`;
}

function shell(active) {
  const tabs = Object.entries(SCREENS).map(([key, s]) => `
    <a class="adm-tab ${key === active ? "is-active" : ""}" href="#${esc(key)}">${esc(s.label)}</a>`
  ).join("");

  wrapper.innerHTML = `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Admin</h1>
        <p class="adm-sub">MyHoop &amp; partner leagues</p>
      </div>
      <a class="adm-btn adm-btn-ghost" href="league.html" target="_blank" rel="noopener">View the public site ↗</a>
    </header>
    <nav class="adm-tabs">${tabs}</nav>
    <main id="adm-view"></main>
    <div id="adm-modal" class="adm-modal"></div>`;
}

let currentKey = null;

async function route() {
  const key = SCREENS[window.location.hash.slice(1)] ? window.location.hash.slice(1) : "dashboard";

  // On ne redessine la coquille que si l'onglet change : sinon on garderait
  // la fenêtre modale ouverte par-dessus un écran déjà remplacé.
  if (key !== currentKey) {
    shell(key);
    currentKey = key;
  }

  await SCREENS[key].module.render(document.getElementById("adm-view"));
}

async function init() {
  if (!wrapper) return;

  const user = await fetchCurrentUser();
  if (!user || user.role !== "admin") {
    gate();
    return;
  }

  window.addEventListener("hashchange", route);
  await route();
}

init();
