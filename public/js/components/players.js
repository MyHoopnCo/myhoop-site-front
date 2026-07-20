/* ═══════════════════════════════════════════════════════════
   Renders the talent discovery grid with live search.
   Depends on: data/mock-data.js (fetchPlayers, fetchPlayerStats)
   ═══════════════════════════════════════════════════════════ */

   import { fetchPlayers, fetchPlayerStats } from "../data/mock-data.js";

   const grid = document.getElementById("player-grid");
   const searchInput = document.getElementById("talent-search");
   
   let allPlayers = [];
   
   // Picks the stat line with the most games played to represent the
   // player's "headline" quick stats on the card. A player with zero
   // stats everywhere still gets a valid (zeroed) headline.
   function pickHeadlineStats(statLines) {
     if (statLines.length === 0) {
       return { games_played: 0, label: "Games", primary: 0, primaryLabel: "GP" };
     }
     const headline = [...statLines].sort((a, b) => b.games_played - a.games_played)[0];
     if (typeof headline.points === "number") {
       return {
         games_played: headline.games_played,
         primary: headline.points,
         primaryLabel: "PPG",
       };
     }
     return {
       games_played: headline.games_played,
       primary: `${headline.wins}-${headline.losses}`,
       primaryLabel: "Record",
     };
   }
   
   async function renderCard(player) {
     const stats = await fetchPlayerStats(player.id);
     const headline = pickHeadlineStats(stats);
   
     const card = document.createElement("a");
     card.className = "player-card reveal";
     card.href = `players.html?slug=${player.slug}`;
   
     card.innerHTML = `
       <img class="player-photo" src="${player.photo_url}" alt="${player.first_name} ${player.last_name}" loading="lazy" />
       <div class="player-card-body">
         <div class="player-name">${player.first_name} ${player.last_name}</div>
         <div class="player-sub">${player.position} · ${player.city}</div>
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
       const haystack = `${p.first_name} ${p.last_name} ${p.city} ${p.position}`.toLowerCase();
       return haystack.includes(q);
     });
     renderGrid(filtered);
   });
   
   async function init() {
     allPlayers = await fetchPlayers();
     renderGrid(allPlayers);
   }
   
   init();