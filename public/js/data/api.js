/* ═══════════════════════════════════════════════════════════
   DATA/API.JS
 
   Real backend layer, replaces mock-data.js.
   Same public function names as before so components changed
   as little as possible — but the RETURN SHAPES now follow the
   real Postgres schema (uuid ids, first_name/last_name instead
   of a single name, ppg/apg/rpg on the leaderboard, etc.).

   ═══════════════════════════════════════════════════════════ */
 
   const API_BASE = "https://myhoop-site-backend.onrender.com/api";
 
   async function request(path, options = {}) {
     const res = await fetch(`${API_BASE}${path}`, {
       credentials: "include", // required so the httpOnly jwt cookie is sent/received
       headers: {
         "Content-Type": "application/json",
         ...(options.headers || {}),
       },
       ...options,
     });
    
     let body = null;
     try {
       body = await res.json();
     } catch (_) {
       /* no JSON body (e.g. 204) */
     }
    
     if (!res.ok) {
       const message = body?.message || `Request failed (${res.status})`;
       const err = new Error(message);
       err.status = res.status;
       throw err;
     }
    
     return body;
   }
    
   /* ── Players ────────────────────────────────────────────── */
    
   export async function fetchPlayers() {
     const body = await request("/players");
     return body.data.players;
   }
    
   export async function fetchPlayerBySlug(slug) {
     const body = await request(`/players/slug/${encodeURIComponent(slug)}`);
     return body.data.player;
   }
    
   // GET /api/statistics/player/:id/summary — aggregation (AVG/COUNT) done in
   // SQL on the backend, one row per competition_type: { competition_type,
   // games_played, wins, losses, ppg, apg, rpg }.
   export async function fetchPlayerStats(playerId) {
     const body = await request(`/statistics/player/${playerId}/summary`);
     return body.data.summary;
   }
    
   /* ── Highlights / videos ───────────────────────────────────── */
    
   export async function fetchHighlights({ competitionType = "all" } = {}) {
     const body = await request(
       `/videos/highlights?competitionType=${encodeURIComponent(competitionType)}`
     );
     return body.data.highlights;
   }
    
   /* ── Leaderboard ────────────────────────────────────────────
      GET /api/statistics/leaderboard?type=5v5
      Rows: { player_id, first_name, last_name, slug, city, avatar_url,
              competition_type, games_played, total_points, ppg, apg, rpg,
              wins, losses }
      ═══════════════════════════════════════════════════════════ */
    
   export async function fetchLeaderboard(competitionType = "5v5") {
     const body = await request(
       `/statistics/leaderboard?type=${encodeURIComponent(competitionType)}`
     );
     return body.data.leaderboard;
   }
    
   /* ── Tournaments ────────────────────────────────────────────── */
    
   export async function fetchTournaments() {
     const body = await request("/tournaments");
     return body.data.tournaments;
   }
    
   /* ── Auth ───────────────────────────────────────────────────── */
    
   // Returns the logged-in user (player or admin) or null if not authenticated.
   // Never throws — a 401 from /auth/me just means "signed out".
   export async function fetchCurrentUser() {
     try {
       const body = await request("/auth/me");
       return body.data.user;
     } catch (err) {
       return null;
     }
   }
    
   export async function login(email, password) {
     const body = await request("/auth/login", {
       method: "POST",
       body: JSON.stringify({ email, password }),
     });
     return body.data.user;
   }
    
   // payload: { first_name, last_name, email, password, phone?, city?, age? }
   export async function signup(payload) {
     const body = await request("/auth/signup", {
       method: "POST",
       body: JSON.stringify(payload),
     });
     return body.data.user;
   }
    
   export async function logout() {
     await request("/auth/logout", { method: "POST" });
   }
    
   /* ── Registrations ──────────────────────────────────────────
      POST /api/registrations requires an authenticated, active player.
      The backend only stores: player_id, tournament_id, team_id,
      emergency_contact_name, emergency_contact_phone, medical_notes,
      waiver_signed. (No referral_source / full_name / age / email /
      phone columns on this table — those live on the player profile.)
      ═══════════════════════════════════════════════════════════ */
    
   export async function submitRegistration(payload) {
     const body = await request("/registrations", {
       method: "POST",
       body: JSON.stringify(payload),
     });
     return { ok: true, data: body.data.registration };
   }

   /* ── Registrations ──────────────────────────────────────────
      POST /api/registrations requires an authenticated, active player.
      The backend only stores: player_id, tournament_id, team_id,
      emergency_contact_name, emergency_contact_phone, medical_notes,
      waiver_signed. (No referral_source / full_name / age / email /
      phone columns on this table — those live on the player profile.)
      ═══════════════════════════════════════════════════════════ */
    
    export async function submitRegistration(payload) {
      const body = await request("/registrations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return { ok: true, data: body.data.registration };
    }
  
    /* ── Payments (Interac e-Transfer, confirmed manually by an admin) ─ */
  
    export async function submitPayment(payload) {
      const body = await request("/payments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return { ok: true, data: body.data.payment };
    }
  
    export async function fetchPendingPayments() {
      const body = await request("/payments/pending");
      return body.data.payments;
    }
  
    export async function confirmPayment(paymentId) {
      const body = await request(`/payments/${paymentId}/confirm`, { method: "PATCH" });
      return body.data.payment;
    }
    
   /* ── Admin actions on players ────────────────────────────────
      Soft-delete only — the backend never runs a real DELETE FROM
      players, it just flips is_active to false/true.
      ═══════════════════════════════════════════════════════════ */
    
   export async function deactivatePlayer(playerId) {
     const body = await request(`/players/${playerId}`, { method: "DELETE" });
     return body.data.player;
   }
    
   export async function reactivatePlayer(playerId) {
     const body = await request(`/players/${playerId}/reactivate`, { method: "PATCH" });
     return body.data.player;
   }
    
   /* ── Not yet backed by the database ──────────────────────────
      This feature was designed against a table that doesn't exist
      in the current schema yet (a partners/sponsors table). Kept
      as a harmless stub so the rest of the site doesn't break;
      wire it up once that table (or a decision to drop the
      feature) exists.
      ═══════════════════════════════════════════════════════════ */
    
   export async function fetchPartners() {
     return [
       { id: 1, name: "ERO Studio, Inc " /*logo_url: "/images/partners/placeholder-1.png" */ },
       { id: 2, name: "Union Basketball League" /*logo_url: "/images/partners/placeholder-2.png" */ },
     ];
   }