/* ═══════════════════════════════════════════════════════════
   Lectures de la section ligue.

   Tout passe par /api/public : des routes en lecture seule, sans
   connexion, qui ne lisent que les vues publiques de la base. Aucune
   de ces réponses ne contient de courriel, de téléphone ni de contact
   d'urgence — il n'y a donc rien à protéger ici.
   ═══════════════════════════════════════════════════════════ */

const API_BASE = "https://api.myhoop.ca/api/public";

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);

  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    /* pas de corps JSON */
  }

  if (!res.ok) {
    const err = new Error(body?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return body.data;
}

const q = (params) => {
  const usable = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return usable.length ? `?${new URLSearchParams(usable)}` : "";
};

/* ── Organisations et saisons ─────────────────────────────── */

export async function fetchLeagues() {
  const { organizations } = await get("/organizations");
  // Le Hub est l'hôte : la section « ligues » ne liste que les partenaires
  // qui ont au moins une saison publiée.
  return organizations.filter((o) => o.kind === "partner" && o.public_competitions > 0);
}

export async function fetchSeasons(organizationSlug) {
  const { competitions } = await get(`/competitions${q({ organization: organizationSlug })}`);
  return competitions;
}

export async function fetchSeason(slug) {
  const { competition } = await get(`/competitions/${encodeURIComponent(slug)}`);
  return competition;
}

/* ── Contenu d'une saison ─────────────────────────────────── */

export async function fetchStandings(slug, phaseId) {
  return await get(`/competitions/${encodeURIComponent(slug)}/standings${q({ phase: phaseId })}`);
}

export async function fetchTeams(slug) {
  return await get(`/competitions/${encodeURIComponent(slug)}/teams`);
}

export async function fetchMatches(slug, filters) {
  return await get(`/competitions/${encodeURIComponent(slug)}/matches${q(filters)}`);
}

export async function fetchSeries(slug) {
  return await get(`/competitions/${encodeURIComponent(slug)}/series`);
}

// Sans `stat`, l'API renvoie toutes les catégories d'un coup : une seule
// requête pour la page des leaders au lieu de six.
export async function fetchLeaders(slug, { stat, limit } = {}) {
  return await get(`/competitions/${encodeURIComponent(slug)}/leaders${q({ stat, limit })}`);
}

/* ── Fiches ───────────────────────────────────────────────── */

export async function fetchTeam(teamId) {
  return await get(`/teams/${encodeURIComponent(teamId)}`);
}

export async function fetchLeaguePlayer(slug) {
  return await get(`/players/${encodeURIComponent(slug)}`);
}
