/* ═══════════════════════════════════════════════════════════
   Appels de l'admin.

   Toutes ces routes sont protégées côté serveur (connexion + rôle
   admin). Le cookie de session part automatiquement grâce à
   credentials: "include" ; aucun jeton n'est stocké dans la page.
   ═══════════════════════════════════════════════════════════ */

const API_BASE = "https://api.myhoop.ca/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (res.status === 204) return null;

  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    /* pas de corps JSON */
  }

  if (!res.ok) {
    const err = new Error(body?.message || body?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return body;
}

const send = (method) => (path, payload) =>
  request(path, { method, body: payload === undefined ? undefined : JSON.stringify(payload) });

const post = send("POST");
const put = send("PUT");
const patch = send("PATCH");
const del = send("DELETE");

/* ── Qui suis-je ──────────────────────────────────────────── */

export async function fetchCurrentUser() {
  try {
    const body = await request("/auth/me");
    return body.data.user;
  } catch (_) {
    return null;
  }
}

/* ── Joueurs ──────────────────────────────────────────────── */

export const fetchPlayersAdmin = async () => (await request("/players/admin")).data.players;
export const createPlayer = async (payload) => (await post("/players", payload)).data.player;
export const deactivatePlayer = async (id) => (await del(`/players/${id}`)).data.player;
export const reactivatePlayer = async (id) => (await patch(`/players/${id}/reactivate`)).data.player;

/* ── Tournois ─────────────────────────────────────────────── */

export const fetchTournaments = async () => (await request("/tournaments")).data.tournaments;
export const createTournament = async (payload) => (await post("/tournaments", payload)).data.tournament;

/* ── Inscriptions, formulaires, paiements ─────────────────── */

export const fetchRegistrations = async (tournamentId) =>
  (await request(`/registrations${tournamentId ? `?tournament=${encodeURIComponent(tournamentId)}` : ""}`)).data.registrations;

export const fetchRegistration = async (id) => (await request(`/registrations/${id}`)).data.registration;

export const setRegistrationStatus = async (id, status) =>
  (await patch(`/registrations/${id}/status`, { status })).data.registration;

export const fetchFormTemplates = async () => (await request("/registrations/forms/templates")).data.templates;

export const fetchTournamentForm = async (tournamentId) =>
  (await request(`/registrations/forms/tournament/${tournamentId}`)).data.form;

export const createTournamentForm = async (tournamentId, payload) =>
  (await post(`/registrations/forms/tournament/${tournamentId}`, payload)).data.form;

export const addFormField = async (formId, payload) =>
  (await post(`/registrations/forms/${formId}/fields`, payload)).data.field;

export const removeFormField = async (fieldId) => await del(`/registrations/forms/fields/${fieldId}`);

export const fetchPendingPayments = async () => (await request("/payments/pending")).data.payments;
export const confirmPayment = async (id) => (await patch(`/payments/${id}/confirm`)).data.payment;

/* ── Compétitions, phases, lieux ──────────────────────────── */

export const fetchOrganizations = async () => (await request("/competitions/organizations")).data.organizations;
export const createOrganization = async (payload) => (await post("/competitions/organizations", payload)).data.organization;

export const fetchCompetitions = async () => (await request("/competitions")).data.competitions;
export const fetchCompetition = async (id) => (await request(`/competitions/${id}`)).data.competition;
export const createCompetition = async (payload) => (await post("/competitions", payload)).data.competition;
export const updateCompetition = async (id, payload) => (await put(`/competitions/${id}`, payload)).data.competition;

export const publishCompetition = async (id, isPublic) =>
  (await patch(`/competitions/${id}/publish`, { is_public: isPublic })).data.competition;

export const createPhase = async (competitionId, payload) =>
  (await post(`/competitions/${competitionId}/phases`, payload)).data.phase;

export const createGroup = async (phaseId, payload) =>
  (await post(`/competitions/phases/${phaseId}/groups`, payload)).data.group;

export const addTeamToPhase = async (phaseId, payload) =>
  (await post(`/competitions/phases/${phaseId}/teams`, payload)).data.entry;

export const fetchVenues = async () => (await request("/competitions/venues")).data.venues;
export const createVenue = async (payload) => (await post("/competitions/venues", payload)).data.venue;

/* ── Équipes et effectifs ─────────────────────────────────── */

export const fetchTeam = async (id) => (await request(`/teams/${id}`)).data.team;
export const createTeam = async (payload) => (await post("/teams", payload)).data.team;
export const updateTeam = async (id, payload) => (await put(`/teams/${id}`, payload)).data.team;

// payload : { player_id } pour un joueur avec profil,
//           { registration_id } pour une personne inscrite sans compte.
export const addTeamMember = async (teamId, payload) =>
  (await post(`/teams/${teamId}/members`, payload)).data.member;

export const updateTeamMember = async (memberId, payload) =>
  (await patch(`/teams/members/${memberId}`, payload)).data.member;

export const removeTeamMember = async (memberId) => await del(`/teams/members/${memberId}`);

/* ── Matchs ───────────────────────────────────────────────── */

export const fetchCompetitionMatches = async (competitionId, filters = {}) => {
  const usable = Object.entries(filters).filter(([, v]) => v);
  const query = usable.length ? `?${new URLSearchParams(usable)}` : "";
  return (await request(`/competitions/${competitionId}/matches${query}`)).data.matches;
};

export const createMatch = async (payload) => (await post("/matches", payload)).data.match;

export const recordResult = async (matchId, payload) =>
  (await patch(`/matches/${matchId}/result`, payload)).data.match;

export const updateMatchSchedule = async (matchId, payload) =>
  (await patch(`/matches/${matchId}/schedule`, payload)).data.match;

export const fetchBoxScore = async (matchId) => (await request(`/matches/${matchId}/box-score`)).data;

export const saveBoxScore = async (matchId, lines) =>
  (await put(`/matches/${matchId}/box-score`, { lines })).data.lines;
