/* ═══════════════════════════════════════════════════════════
   DATA/MOCK-DATA.JS

   TEMPORARY mock data layer.
   Field names mirror the planned PostgreSQL schema so this file
   is the ONLY thing that needs to change once the backend exists.

   Planned tables (for reference, build later):
     players        (id, slug, first_name, last_name, position,
                      height_cm, city, bio, photo_url, created_at)
     highlights     (id, title, video_id, thumbnail_url,
                      competition_type, tagged_player_ids[],
                      duration_seconds, published_at)
     player_stats   (player_id, competition_type, wins, losses,
                      points, assists, rebounds, steals, blocks,
                      mvps, games_played)

   TODO BACKEND: replace the body of each fetch* function below
   with a real call, e.g.:
     export async function fetchPlayers() {
       const res = await fetch('/api/players');
       return res.json();
     }
   The function signatures and return shapes are designed to stay
   identical, so nothing calling these functions needs to change.
   ═══════════════════════════════════════════════════════════ */

   const MOCK_PLAYERS = [
    {
      id: 1,
      slug: "marcus-deng",
      first_name: "Marcus",
      last_name: "Deng",
      position: "Guard",
      height_cm: 188,
      city: "Edmonton",
      bio: "Combo guard known for getting downhill and creating for others.",
      photo_url: "/images/players/placeholder-1.jpg",
    },
    {
      id: 2,
      slug: "amara-okoye",
      first_name: "Amara",
      last_name: "Okoye",
      position: "Forward",
      height_cm: 178,
      city: "Calgary",
      bio: "Two-way forward, relentless on the boards.",
      photo_url: "/images/players/placeholder-2.jpg",
    },
    {
      id: 3,
      slug: "jordan-fontaine",
      first_name: "Jordan",
      last_name: "Fontaine",
      position: "Center",
      height_cm: 201,
      city: "Edmonton",
      bio: "Rim protector with a developing mid-range game.",
      photo_url: "/images/players/placeholder-3.jpg",
    },
    {
      id: 4,
      slug: "tyrell-banks",
      first_name: "Tyrell",
      last_name: "Banks",
      position: "Guard",
      height_cm: 183,
      city: "Calgary",
      bio: "Just joined the ecosystem — profile live, stats coming after first event.",
      photo_url: "/images/players/placeholder-4.jpg",
    },
  ];
  
  // player_stats — segmented by competition type, per product philosophy
  // a profile with zero games still gets a row of zeros, never omitted.
  const MOCK_PLAYER_STATS = [
    { player_id: 1, competition_type: "1v1", wins: 9, losses: 3, games_played: 12 },
    { player_id: 1, competition_type: "3v3", wins: 5, losses: 2, points: 14.2, assists: 4.1, rebounds: 3.0, games_played: 7 },
    { player_id: 1, competition_type: "5v5", wins: 6, losses: 4, points: 11.8, assists: 5.3, rebounds: 2.9, steals: 1.4, blocks: 0.1, mvps: 1, games_played: 10 },
  
    { player_id: 2, competition_type: "1v1", wins: 4, losses: 4, games_played: 8 },
    { player_id: 2, competition_type: "3v3", wins: 8, losses: 1, points: 10.5, assists: 1.8, rebounds: 7.4, games_played: 9 },
    { player_id: 2, competition_type: "5v5", wins: 7, losses: 3, points: 9.9, assists: 2.0, rebounds: 8.1, steals: 1.9, blocks: 0.6, mvps: 2, games_played: 10 },
  
    { player_id: 3, competition_type: "1v1", wins: 2, losses: 6, games_played: 8 },
    { player_id: 3, competition_type: "5v5", wins: 4, losses: 5, points: 8.4, assists: 0.9, rebounds: 9.6, steals: 0.5, blocks: 2.3, mvps: 0, games_played: 9 },
  
    // Tyrell — zero stats, profile still exists. Do not filter this player out.
    { player_id: 4, competition_type: "1v1", wins: 0, losses: 0, games_played: 0 },
    { player_id: 4, competition_type: "3v3", wins: 0, losses: 0, points: 0, assists: 0, rebounds: 0, games_played: 0 },
    { player_id: 4, competition_type: "5v5", wins: 0, losses: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0, mvps: 0, games_played: 0 },
  ];
  
  const MOCK_HIGHLIGHTS = [
    {
      id: 1,
      title: "Marcus Deng — and-1 through traffic",
      video_id: "dQw4w9WgXcQ",
      thumbnail_url: "/images/highlights/placeholder-1.jpg",
      competition_type: "5v5",
      tagged_player_ids: [1],
      duration_seconds: 38,
      published_at: "2026-05-14",
    },
    {
      id: 2,
      title: "Amara Okoye — putback slam",
      video_id: "dQw4w9WgXcQ",
      thumbnail_url: "/images/highlights/placeholder-2.jpg",
      competition_type: "3v3",
      tagged_player_ids: [2],
      duration_seconds: 22,
      published_at: "2026-05-20",
    },
    {
      id: 3,
      title: "Jordan Fontaine — chasedown block",
      video_id: "dQw4w9WgXcQ",
      thumbnail_url: "/images/highlights/placeholder-3.jpg",
      competition_type: "5v5",
      tagged_player_ids: [3, 1],
      duration_seconds: 15,
      published_at: "2026-06-02",
    },
    {
      id: 4,
      title: "1v1 Showcase — Deng vs Banks final bucket",
      video_id: "dQw4w9WgXcQ",
      thumbnail_url: "/images/highlights/placeholder-4.jpg",
      competition_type: "1v1",
      tagged_player_ids: [1, 4],
      duration_seconds: 19,
      published_at: "2026-06-10",
    },
    {
      id: 5,
      title: "Okoye — full-court finish",
      video_id: "dQw4w9WgXcQ",
      thumbnail_url: "/images/highlights/placeholder-5.jpg",
      competition_type: "5v5",
      tagged_player_ids: [2],
      duration_seconds: 27,
      published_at: "2026-06-14",
    },
    {
      id: 6,
      title: "3v3 — Deng step-back at the buzzer",
      video_id: "dQw4w9WgXcQ",
      thumbnail_url: "/images/highlights/placeholder-6.jpg",
      competition_type: "3v3",
      tagged_player_ids: [1],
      duration_seconds: 24,
      published_at: "2026-06-18",
    },
    {
      id: 7,
      title: "Fontaine — double-double highlight pack",
      video_id: "dQw4w9WgXcQ",
      thumbnail_url: "/images/highlights/placeholder-7.jpg",
      competition_type: "5v5",
      tagged_player_ids: [3],
      duration_seconds: 41,
      published_at: "2026-06-21",
    },
    {
      id: 8,
      title: "1v1 — Banks crossover and finish",
      video_id: "dQw4w9WgXcQ",
      thumbnail_url: "/images/highlights/placeholder-8.jpg",
      competition_type: "1v1",
      tagged_player_ids: [4],
      duration_seconds: 17,
      published_at: "2026-06-24",
    },
  ];
  
  /* ── PUBLIC ACCESSORS — call these, never the MOCK_* arrays directly ── */
  
  export async function fetchPlayers() {
    return structuredClone(MOCK_PLAYERS);
  }
  
  export async function fetchPlayerStats(playerId) {
    return structuredClone(MOCK_PLAYER_STATS.filter((s) => s.player_id === playerId));
  }
  
  export async function fetchHighlights({ competitionType = "all" } = {}) {
    const all = structuredClone(MOCK_HIGHLIGHTS);
    if (competitionType === "all") return all;
    return all.filter((h) => h.competition_type === competitionType);
  }
  
  // Leaderboard is normally a backend-computed query (ORDER BY points DESC).
  // Mocked here as a pre-sorted derivation so the UI shape matches what
  // a real /api/rankings?type=5v5 endpoint will return.
  export async function fetchLeaderboard(competitionType = "5v5") {
    const stats = MOCK_PLAYER_STATS.filter((s) => s.competition_type === competitionType);
    const players = MOCK_PLAYERS;
    const merged = stats
      .map((s) => {
        const p = players.find((pl) => pl.id === s.player_id);
        return { ...s, name: `${p.first_name} ${p.last_name}`, slug: p.slug };
      })
      .filter((s) => s.games_played > 0)
      .sort((a, b) => (b.points || b.wins || 0) - (a.points || a.wins || 0));
    return merged;
  }
  
  // TODO BACKEND: signup currently just resolves locally and logs the
  // payload shape the real POST /api/signups endpoint should accept.
  export async function submitSignup(payload) {
    console.log("[mock submitSignup] payload that will hit POST /api/signups:", payload);
    return { ok: true, mock: true };
  }
  
  /* ═══════════════════════════════════════════════════════════
     TOURNAMENTS + AUTH + REGISTRATION
  
     Planned tables (build later):
       tournaments    (id, name, starts_at, location, competition_type,
                        banner_url, spots_total, spots_taken)
       users          (id, full_name, email, phone, age,
                        emergency_contact_name, emergency_contact_phone,
                        medical_notes, created_at)
       registrations  (id, tournament_id, user_id, age, emergency_contact_name,
                        emergency_contact_phone, medical_notes,
                        waiver_accepted, referral_source, created_at)
     ═══════════════════════════════════════════════════════════ */
  
  const MOCK_TOURNAMENTS = [
    {
      id: 1,
      name: "Northern Showcase 3v3",
      starts_at: "2026-07-11",
      location: "Edmonton, AB",
      competition_type: "3v3",
      banner_url: "/images/tournaments/placeholder-1.jpg",
      spots_total: 32,
      spots_taken: 24,
    },
    {
      id: 2,
      name: "Calgary Open 5v5",
      starts_at: "2026-07-25",
      location: "Calgary, AB",
      competition_type: "5v5",
      banner_url: "/images/tournaments/placeholder-2.jpg",
      spots_total: 20,
      spots_taken: 20,
    },
    {
      id: 3,
      name: "1v1 Showcase Finals",
      starts_at: "2026-08-08",
      location: "Edmonton, AB",
      competition_type: "1v1",
      banner_url: "/images/tournaments/placeholder-3.jpg",
      spots_total: 16,
      spots_taken: 9,
    },
    {
      id: 4,
      name: "End of Summer Run It Back",
      starts_at: "2026-08-29",
      location: "Edmonton, AB",
      competition_type: "5v5",
      banner_url: "/images/tournaments/placeholder-4.jpg",
      spots_total: 24,
      spots_taken: 5,
    },
  ];
  
  // TODO BACKEND: this hardcodes a logged-in mock user so the registration
  // form's pre-fill behavior can be built and demoed now. Once auth exists,
  // replace this with a real session check (e.g. fetch('/api/me')) that
  // returns null when no one is logged in.
  const MOCK_CURRENT_USER = {
    id: 1,
    slug: "marcus-deng",
    full_name: "Marcus Deng",
    email: "marcus.deng@example.com",
    phone: "780-555-0142",
    age: 24,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    medical_notes: "",
  };
  
  // Flip this to null locally to preview the signed-out nav state.
  const MOCK_IS_AUTHENTICATED = true;
  
  export async function fetchTournaments() {
    return structuredClone(MOCK_TOURNAMENTS);
  }
  
  // TODO BACKEND: replace with a real session/auth check.
  export async function fetchCurrentUser() {
    return MOCK_IS_AUTHENTICATED ? structuredClone(MOCK_CURRENT_USER) : null;
  }
  
  // TODO BACKEND: replace body with POST /api/registrations
  export async function submitRegistration(payload) {
    console.log("[mock submitRegistration] payload that will hit POST /api/registrations:", payload);
    return { ok: true, mock: true };
  }
  
  const MOCK_PARTNERS = [
    { id: 1, name: "Placeholder Partner 1", logo_url: "/images/partners/placeholder-1.png" },
    { id: 2, name: "Placeholder Partner 2", logo_url: "/images/partners/placeholder-2.png" },
    { id: 3, name: "Placeholder Partner 3", logo_url: "/images/partners/placeholder-3.png" },
    { id: 4, name: "Placeholder Partner 4", logo_url: "/images/partners/placeholder-4.png" },
  ];
  
  export async function fetchPartners() {
    return structuredClone(MOCK_PARTNERS);
  }