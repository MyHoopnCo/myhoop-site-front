/* ═══════════════════════════════════════════════════════════
   Depends on: data/mock-data.js (fetchPartners)
   ═══════════════════════════════════════════════════════════ */

   import { fetchPartners } from "../data/mock-data.js";

   const grid = document.getElementById("partner-grid");
   
   async function init() {
     const partners = await fetchPartners();
     grid.innerHTML = partners
       .map((p) => `<img class="partner-logo" src="${p.logo_url}" alt="${p.name}" loading="lazy" />`)
       .join("");
   }
   
   init();