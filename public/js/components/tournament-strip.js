/* ═══════════════════════════════════════════════════════════
   Depends on: data/mock-data.js (fetchTournaments)
   Depends on: components/registration.js (openRegistration), loaded
   separately and exposed on window so this stays decoupled.
   ═══════════════════════════════════════════════════════════ */

   import { fetchTournaments } from "../data/mock-data.js";

   const scroll = document.getElementById("strip-scroll");
   const prevBtn = document.getElementById("strip-prev");
   const nextBtn = document.getElementById("strip-next");
   
   function formatDate(iso) {
     const d = new Date(`${iso}T00:00:00`);
     return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
   }
   
   function renderCard(tournament) {
     const card = document.createElement("div");
     card.className = "tournament-card";
   
     const full = tournament.spots_taken >= tournament.spots_total;
     const spotsLeft = tournament.spots_total - tournament.spots_taken;
   
     card.innerHTML = `
       <img class="tournament-banner" src="${tournament.banner_url}" alt="" loading="lazy" />
       <div class="tournament-body">
         <span class="tournament-date">${formatDate(tournament.starts_at)}</span>
         <span class="tournament-name">${tournament.name}</span>
         <span class="tournament-meta">${tournament.location} · ${tournament.competition_type}</span>
         <span class="tournament-spots">${full ? "Full" : `${spotsLeft} spots left`}</span>
         <button class="participate-btn" ${full ? "disabled" : ""}>${full ? "Full" : "Participate"}</button>
       </div>
     `;
   
     const btn = card.querySelector(".participate-btn");
     if (!full) {
       btn.addEventListener("click", () => {
         // registration.js exposes this globally to keep components decoupled
         window.openRegistration?.(tournament);
       });
     }
   
     return card;
   }
   
   async function init() {
     const tournaments = await fetchTournaments();
     scroll.innerHTML = "";
     tournaments.forEach((t) => scroll.appendChild(renderCard(t)));
   }
   
   prevBtn.addEventListener("click", () => {
     scroll.scrollBy({ left: -280, behavior: "smooth" });
   });
   
   nextBtn.addEventListener("click", () => {
     scroll.scrollBy({ left: 280, behavior: "smooth" });
   });
   
   init();