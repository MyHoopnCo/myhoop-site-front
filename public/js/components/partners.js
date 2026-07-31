/* ═══════════════════════════════════════════════════════════
   Depends on: data/api.js (fetchPartners — still mocked, no
   partners table in the backend yet)
   ═══════════════════════════════════════════════════════════ */

   import { fetchPartners } from "../data/api.js";

   const grid = document.getElementById("partner-grid");
   
   async function init() {
     const partners = await fetchPartners();
     grid.innerHTML = partners
       .map((p) => `<img class="partner-logo" src="${p.logo_url}" alt="${p.name}" loading="lazy" />`)
       .join("");
   }
   
   init();