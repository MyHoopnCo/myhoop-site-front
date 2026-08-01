/* ═══════════════════════════════════════════════════════════
   Renders a single player's profile on players.html, based on
   the ?slug=... query param (set by the links in players.js and
   leaderboard.js on "The Hub").

   Simple v1: photo, name, position/city, bio, and a stat card per
   competition_type from the /statistics/player/:id/summary route.
   Depends on: data/api.js (fetchPlayerBySlug, fetchPlayerStats)
   ═══════════════════════════════════════════════════════════ */

   import { fetchPlayerBySlug, fetchPlayerStats } from "./data/api.js";

   const wrapper = document.getElementById("profile-wrapper");
   const AVATAR_FALLBACK = "images/global/avatar-placeholder.svg";
   
   function formatSchoolLevel(level) {
    const labels = {
      university: "University",
      college: "College",
      high_school: "High School",
      none: "Not in school",
    };
    return labels[level] || null;
  }
   
  function formatHeight(cm) {
    if (!cm) return null;
    const totalInches = Math.round(cm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${cm} cm (${feet}'${inches}")`;
  }
   
   function notFoundMarkup() {
     return `
       <div class="profile-not-found">
         <p>We couldn't find that player.</p>
         <p><a href="entertainment.html">Back to The Hub</a></p>
       </div>
     `;
   }
   
   function statsCardMarkup(line) {
     const record = line.competition_type === "1v1" ? `${line.wins}-${line.losses}` : null;
   
     return `
       <div class="profile-stat-card">
         <span class="type-label">${line.competition_type}</span>
         <div class="profile-stat-row"><span>Games played</span><strong>${line.games_played}</strong></div>
         ${record
           ? `<div class="profile-stat-row"><span>Record</span><strong>${record}</strong></div>`
           : `
             <div class="profile-stat-row"><span>Points per game</span><strong>${line.ppg}</strong></div>
             <div class="profile-stat-row"><span>Assists per game</span><strong>${line.apg}</strong></div>
             <div class="profile-stat-row"><span>Rebounds per game</span><strong>${line.rpg}</strong></div>
           `
         }
         <div class="profile-stat-row"><span>Wins / Losses</span><strong>${line.wins}-${line.losses}</strong></div>
       </div>
     `;
   }
   
   async function render() {
     const params = new URLSearchParams(window.location.search);
     const slug = params.get("slug");
   
     if (!slug) {
       wrapper.innerHTML = notFoundMarkup();
       return;
     }
   
     let player;
     try {
       player = await fetchPlayerBySlug(slug);
     } catch (err) {
       wrapper.innerHTML = notFoundMarkup();
       return;
     }
   
     const subLine = [player.position, player.city].filter(Boolean).join(" · ");
 
  const detailBits = [
    player.age ? `${player.age} yo` : null,
    formatHeight(player.height_cm),
    formatSchoolLevel(player.school_level),
  ].filter(Boolean);
 
  // Render the header immediately — don't let a stats failure leave the
  // whole page blank while we wait on a second network call.
  wrapper.innerHTML = `
    <div class="profile-header">
      <img class="profile-photo" src="${player.avatar_url || AVATAR_FALLBACK}" alt="${player.first_name} ${player.last_name}" />
      <div class="profile-info">
        <h1 class="profile-name">${player.first_name} ${player.last_name}</h1>
        <p class="profile-sub">${subLine || "&nbsp;"}</p>
        ${detailBits.length ? `<p class="profile-details">${detailBits.join(" · ")}</p>` : ""}
        ${player.bio ? `<p class="profile-bio">${player.bio}</p>` : ""}
      </div>
    </div>
   
       <h2 class="profile-section-title">Stats</h2>
       <div class="profile-stats-grid" id="profile-stats-grid">
         <p class="profile-empty-stats">Loading stats...</p>
       </div>
     `;
   
     const grid = document.getElementById("profile-stats-grid");
   
     let stats = [];
     try {
       stats = await fetchPlayerStats(player.player_id);
     } catch (err) {
       grid.innerHTML = `<p class="profile-empty-stats">Couldn't load stats right now (${err.message || "network error"}).</p>`;
       return;
     }
   
     if (stats.length === 0) {
       grid.innerHTML = `<p class="profile-empty-stats">No recorded games yet.</p>`;
     } else {
       grid.innerHTML = stats.map(statsCardMarkup).join("");
     }
   }
   
   render();