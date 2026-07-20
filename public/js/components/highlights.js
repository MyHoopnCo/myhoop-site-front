/* ═══════════════════════════════════════════════════════════
   Renders the highlight grid, handles filtering and theater mode.
   Depends on: data/mock-data.js (fetchHighlights)
   ═══════════════════════════════════════════════════════════ */

   import { fetchHighlights } from "../data/mock-data.js";

   const grid = document.getElementById("highlight-grid");
   const filterBar = document.getElementById("highlight-filters");
   const loadMoreBtn = document.getElementById("highlight-load-more");
   const overlay = document.getElementById("theater-overlay");
   const frameWrap = document.getElementById("theater-frame-wrap");
   const theaterTitle = document.getElementById("theater-title");
   const theaterClose = document.getElementById("theater-close");
   
   let activeFilter = "all";
   let allForFilter = [];
   let visibleCount = 0;
   const PAGE_SIZE = 6;
   
   function formatDuration(seconds) {
     const m = Math.floor(seconds / 60);
     const s = seconds % 60;
     return `${m}:${String(s).padStart(2, "0")}`;
   }
   
   function renderCard(highlight) {
     const card = document.createElement("button");
     card.className = "highlight-card reveal";
     card.type = "button";
     card.setAttribute("aria-label", `Play: ${highlight.title}`);
     card.dataset.videoId = highlight.video_id;
     card.dataset.title = highlight.title;
   
     card.innerHTML = `
       <img src="${highlight.thumbnail_url}" alt="" loading="lazy" />
       <span class="play-icon"></span>
       <span class="highlight-meta">
         <span class="h-title">${highlight.title}</span>
         <span class="h-tag">${highlight.competition_type} · ${formatDuration(highlight.duration_seconds)}</span>
       </span>
     `;
   
     card.addEventListener("click", () => openTheater(highlight));
     return card;
   }
   
   async function renderGrid(competitionType) {
     grid.innerHTML = "";
     allForFilter = await fetchHighlights({ competitionType });
     visibleCount = 0;
   
     if (allForFilter.length === 0) {
       const empty = document.createElement("div");
       empty.className = "highlight-empty";
       empty.textContent = "No highlights in this category yet — check back after the next event.";
       grid.appendChild(empty);
       loadMoreBtn.style.display = "none";
       return;
     }
   
     appendNextPage();
   }
   
   function appendNextPage() {
     const next = allForFilter.slice(visibleCount, visibleCount + PAGE_SIZE);
     next.forEach((h) => grid.appendChild(renderCard(h)));
     visibleCount += next.length;
     // reveal.js's MutationObserver picks up the new .reveal cards automatically
   
     loadMoreBtn.style.display = visibleCount < allForFilter.length ? "flex" : "none";
   }
   
   loadMoreBtn.addEventListener("click", appendNextPage);
   
   function openTheater(highlight) {
     theaterTitle.textContent = highlight.title;
     frameWrap.innerHTML = `<iframe
         src="https://www.youtube.com/embed/${highlight.video_id}?autoplay=1"
         title="${highlight.title}"
         allow="autoplay; encrypted-media; picture-in-picture"
         allowfullscreen
       ></iframe>`;
     overlay.classList.add("open");
     document.body.style.overflow = "hidden";
   }
   
   function closeTheater() {
     overlay.classList.remove("open");
     frameWrap.innerHTML = ""; // stop playback
     document.body.style.overflow = "";
   }
   
   theaterClose.addEventListener("click", closeTheater);
   overlay.addEventListener("click", (e) => {
     if (e.target === overlay) closeTheater();
   });
   document.addEventListener("keydown", (e) => {
     if (e.key === "Escape") closeTheater();
   });
   
   filterBar.addEventListener("click", (e) => {
     const btn = e.target.closest(".filter-btn");
     if (!btn) return;
     filterBar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
     btn.classList.add("active");
     activeFilter = btn.dataset.type;
     renderGrid(activeFilter);
   });
   
   renderGrid(activeFilter);