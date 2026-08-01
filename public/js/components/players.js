/* ═══════════════════════════════════════════════════════════
   Renders the talent discovery grid with live search.
   Depends on: data/api.js (fetchPlayers, fetchPlayerStats)

   NOTE vs the old mock: `id` is now `player_id` (a uuid), and the
   photo field is `avatar_url` (not `photo_url`). `position` and
   `bio` now exist on `players` (added via migration
   003_add_position_bio_to_players.sql) — `height_cm` still doesn't
   exist in the schema, so it stays out of the card.
   ═══════════════════════════════════════════════════════════ */

   import { fetchPlayers, fetchPlayerStats } from "../data/api.js";
 
   const strip = document.getElementById("player-strip");
   const results = document.getElementById("player-results");
   const resultsHint = document.getElementById("player-results-hint");
   const searchInput = document.getElementById("talent-search");
 
   const STRIP_SIZE = 10;
   const SEARCH_RESULTS_CAP = 30;
   const AVATAR_FALLBACK = "images/global/avatar-placeholder.svg";
 
   let allPlayers = [];
 
   // Picks the stat line with the most games played to represent the
   // player's "headline" quick stat. A player with zero stats anywhere
   // still gets a valid (zeroed) headline.
   function pickHeadlineStats(statLines) {
     if (statLines.length === 0) {
       return { games_played: 0, primary: 0, primaryLabel: "GP" };
     }
     const headline = [...statLines].sort((a, b) => b.games_played - a.games_played)[0];
     if (headline.competition_type === "1v1") {
       return {
         games_played: headline.games_played,
         primary: `${headline.wins}-${headline.losses}`,
         primaryLabel: "Record",
       };
     }
     return {
       games_played: headline.games_played,
       primary: headline.ppg,
       primaryLabel: "PPG",
     };
   }
 
   async function renderCard(player) {
     const stats = await fetchPlayerStats(player.player_id);
     const headline = pickHeadlineStats(stats);
     const subLine = [player.position, player.city].filter(Boolean).join(" · ");
 
     const card = document.createElement("a");
     card.className = "player-card reveal";
     card.href = `players.html?slug=${player.slug}`;
 
     card.innerHTML = `
       <img class="player-photo" src="${player.avatar_url || AVATAR_FALLBACK}" alt="${player.first_name} ${player.last_name}" loading="lazy" />
       <div class="player-card-body">
         <div class="player-name">${player.first_name} ${player.last_name}</div>
         <div class="player-sub">${subLine}</div>
         <div class="player-quickstats">
           <div class="qs"><strong>${headline.games_played}</strong><span>Games</span></div>
           <div class="qs"><strong>${headline.primary}</strong><span>${headline.primaryLabel}</span></div>
         </div>
       </div>
     `;
     return card;
   }
 
   async function renderRow(player) {
     const stats = await fetchPlayerStats(player.player_id);
     const headline = pickHeadlineStats(stats);
     const subLine = [player.position, player.city].filter(Boolean).join(" · ");
 
     const row = document.createElement("a");
     row.className = "player-row";
     row.href = `players.html?slug=${player.slug}`;
 
     row.innerHTML = `
       <img class="player-row-photo" src="${player.avatar_url || AVATAR_FALLBACK}" alt="" loading="lazy" />
       <span>
         <span class="player-row-name">${player.first_name} ${player.last_name}</span><br/>
         <span class="player-row-sub">${subLine || "&nbsp;"}</span>
       </span>
       <span class="player-row-stat">${headline.primary} ${headline.primaryLabel}</span>
     `;
     return row;
   }
 
   async function renderDefaultStrip() {
     strip.style.display = "flex";
     results.style.display = "none";
     resultsHint.style.display = "none";
 
     strip.innerHTML = "";
     const featured = allPlayers.slice(0, STRIP_SIZE);
 
     if (featured.length === 0) {
       const empty = document.createElement("div");
       empty.className = "player-empty";
       empty.textContent = "No players yet — check back soon.";
       strip.appendChild(empty);
       return;
     }
 
     for (const player of featured) {
       strip.appendChild(await renderCard(player));
     }
   }
 
   async function renderSearchResults(query) {
     strip.style.display = "none";
     results.style.display = "flex";
 
     const matches = allPlayers.filter((p) => {
       const haystack = `${p.first_name} ${p.last_name} ${p.city || ""} ${p.position || ""}`.toLowerCase();
       return haystack.includes(query);
     });
 
     results.innerHTML = "";
 
     if (matches.length === 0) {
       const empty = document.createElement("div");
       empty.className = "player-empty";
       empty.textContent = "No players match that search.";
       results.appendChild(empty);
       resultsHint.style.display = "none";
       return;
     }
 
     const shown = matches.slice(0, SEARCH_RESULTS_CAP);
     for (const player of shown) {
       results.appendChild(await renderRow(player));
     }
 
     if (matches.length > SEARCH_RESULTS_CAP) {
       resultsHint.textContent = `Showing ${SEARCH_RESULTS_CAP} of ${matches.length} matches — refine your search to narrow it down.`;
       resultsHint.style.display = "block";
     } else {
       resultsHint.style.display = "none";
     }
   }
 
   searchInput.addEventListener("input", () => {
     const q = searchInput.value.trim().toLowerCase();
     if (q === "") {
       renderDefaultStrip();
     } else {
       renderSearchResults(q);
     }
   });
 
   async function init() {
     allPlayers = await fetchPlayers();
     renderDefaultStrip();
   }
 
   init();
