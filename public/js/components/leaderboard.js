/* ═══════════════════════════════════════════════════════════
   Depends on: data/api.js (fetchLeaderboard)

   NOTE vs the old mock: rows now come straight from the
   `leaderboard` SQL view — `name` is split into first_name/
   last_name, and scoring formats expose `ppg` instead of `points`.
   ═══════════════════════════════════════════════════════════ */

   import { fetchLeaderboard } from "../data/api.js";

   const tabs = document.getElementById("leaderboard-tabs");
   const list = document.getElementById("leaderboard-list");

   function valueFor(row, type) {
     if (type === "1v1") return `${row.wins}-${row.losses}`;
     return `${row.ppg} PPG`;
   }

   async function render(type) {
     list.innerHTML = "";
     const rows = await fetchLeaderboard(type);

     if (rows.length === 0) {
       const empty = document.createElement("div");
       empty.className = "leaderboard-empty";
       empty.textContent = "No qualifying performances yet for this category.";
       list.appendChild(empty);
       return;
     }

     rows.slice(0, 5).forEach((row, i) => {
       const item = document.createElement("a");
       item.href = `players.html?slug=${row.slug}`;
       item.className = "leaderboard-row";
       item.innerHTML = `
         <span class="rank">${i + 1}</span>
         <span class="lb-name">${row.first_name} ${row.last_name}</span>
         <span class="lb-value">${valueFor(row, type)}</span>
       `;
       list.appendChild(item);
     });
   }

   tabs.addEventListener("click", (e) => {
     const btn = e.target.closest(".filter-btn");
     if (!btn) return;
     tabs.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
     btn.classList.add("active");
     render(btn.dataset.type);
   });

   render("5v5");
