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

   const grid = document.getElementById("player-grid");
   const searchInput = document.getElementById("talent-search");

   let allPlayers = [];

   // Picks the stat line with the most games played to represent the
   // player's "headline" quick stats on the card. A player with zero
   // stats everywhere still gets a valid (zeroed) headline.
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

     const card = document.createElement("a");
     card.className = "player-card reveal";
     card.href = `players.html?slug=${player.slug}`;

     const subLine = [player.position, player.city].filter(Boolean).join(" · ");

     card.innerHTML = `
       <img class="player-photo" src="${player.avatar_url || "/images/global/Logo_NoWords.png"}" alt="${player.first_name} ${player.last_name}" loading="lazy" />
       <div class="player-card-body">
         <div class="player-name">${player.first_name} ${player.last_name}</div>
         <div class="player-sub">${subLine}</div>
         ${player.bio ? `<p class="player-bio">${player.bio}</p>` : ""}
         <div class="player-quickstats">
           <div class="qs"><strong>${headline.games_played}</strong><span>Games</span></div>
           <div class="qs"><strong>${headline.primary}</strong><span>${headline.primaryLabel}</span></div>
         </div>
       </div>
     `;
     return card;
   }

   async function renderGrid(players) {
     grid.innerHTML = "";

     if (players.length === 0) {
       const empty = document.createElement("div");
       empty.className = "player-empty";
       empty.textContent = "No players match that search.";
       grid.appendChild(empty);
       return;
     }

     for (const player of players) {
       grid.appendChild(await renderCard(player));
     }
     // reveal.js's MutationObserver picks up the new .reveal cards automatically
   }

   searchInput.addEventListener("input", () => {
     const q = searchInput.value.trim().toLowerCase();
     const filtered = allPlayers.filter((p) => {
       const haystack = `${p.first_name} ${p.last_name} ${p.city || ""} ${p.position || ""}`.toLowerCase();
       return haystack.includes(q);
     });
     renderGrid(filtered);
   });

   async function init() {
     allPlayers = await fetchPlayers();
     renderGrid(allPlayers);
   }

   init();
