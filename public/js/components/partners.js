/* ═══════════════════════════════════════════════════════════
   Depends on: data/api.js (fetchPartners — still mocked, no
   partners table in the backend yet)
   ═══════════════════════════════════════════════════════════ */

   import { fetchPartners } from "../data/api.js";
   import { esc } from "../utils/escape.js";

   const grid = document.getElementById("partner-grid");
   
   async function init() {
     const partners = await fetchPartners();
     grid.innerHTML = partners
       .map((p) => `<img class="partner-logo" src="${esc(p.logo_url)}" alt="${esc(p.name)}" loading="lazy" />`)
       .join("");
   }
   
   init();