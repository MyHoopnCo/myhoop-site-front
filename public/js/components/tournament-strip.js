/* ═══════════════════════════════════════════════════════════
   Depends on: data/api.js (fetchTournaments)
   Depends on: components/registration.js (openRegistration), loaded
   separately and exposed on window so this stays decoupled.

   NOTE vs the old mock: id is now `tournament_id` (uuid), and the
   `tournaments` table has no `banner_url` column — falls back to
   a generic image until a real banner field/upload exists.
   ═══════════════════════════════════════════════════════════ */

   import { fetchTournaments } from "../data/api.js";

   const scroll = document.getElementById("strip-scroll");
   const prevBtn = document.getElementById("strip-prev");
   const nextBtn = document.getElementById("strip-next");

   const FALLBACK_BANNER = "/images/index/hero_img.jpg";

   function formatDate(iso) {
     const d = new Date(iso);
     return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
   }

   function renderCard(tournament) {
     const card = document.createElement("div");
     card.className = "tournament-card";

     const full = tournament.spots_taken >= tournament.spots_total;
     const spotsLeft = tournament.spots_total - tournament.spots_taken;

     card.innerHTML = `
       <img class="tournament-banner" src="${tournament.banner_url || FALLBACK_BANNER}" alt="" loading="lazy" />
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
