/* ═══════════════════════════════════════════════════════════
   Generic IntersectionObserver for the .reveal / .reveal.visible
   pattern defined in global.css. Re-observes whenever called so
   it also catches elements injected later by highlights.js /
   players.js (which dynamically add .reveal cards).
   ═══════════════════════════════════════════════════════════ */

   const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  
  export function observeReveals(root = document) {
    root.querySelectorAll(".reveal:not(.visible)").forEach((el) => observer.observe(el));
  }
  
  // initial pass for static content already in the page
  observeReveals();
  
  // re-scan periodically for dynamically injected cards (cheap, grids are small)
  const mutationTarget = document.body;
  const mo = new MutationObserver(() => observeReveals());
  mo.observe(mutationTarget, { childList: true, subtree: true });