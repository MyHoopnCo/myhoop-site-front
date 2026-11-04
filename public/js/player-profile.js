/* ═══════════════════════════════════════════════════════════
   Renders a single player's profile on players.html, based on
   the ?slug=... query param (set by the links in players.js and
   leaderboard.js on "The Hub").
 
   Simple v1: photo, name, position/city, bio, and a stat card per
   competition_type from the /statistics/player/:id/summary route.
   Depends on: data/api.js (fetchPlayerBySlug, fetchPlayerStats)
   ═══════════════════════════════════════════════════════════ */
 
   import {
     fetchPlayerBySlug, fetchPlayerStats, fetchCurrentUser, updateAccount,
     fetchOwnProfile,
   } from "./data/api.js";
   import { showAuthToast } from "./auth-utils.js";
   import { esc } from "./utils/escape.js";
 
   const wrapper = document.getElementById("profile-wrapper");
   const overlay = document.getElementById("account-overlay");
   const box = document.getElementById("account-box");
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
         <span class="type-label">${esc(line.competition_type)}</span>
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
   
   function editFieldsMarkup(user) {
     return `
       <div class="reg-head">
         <div><h3>Edit profile</h3><p>Update your info — only you can see this form.</p></div>
         <button class="reg-close" id="account-close" aria-label="Close">✕</button>
       </div>
       <form class="reg-form" id="account-form">
         <div class="reg-row">
           <div class="reg-field">
             <label for="account-first-name">First name</label>
             <input id="account-first-name" name="first_name" type="text" value="${esc(user.first_name)}" required />
           </div>
           <div class="reg-field">
             <label for="account-last-name">Last name</label>
             <input id="account-last-name" name="last_name" type="text" value="${esc(user.last_name)}" required />
           </div>
         </div>
 
         <div class="reg-field">
           <label for="account-email">Email</label>
           <input id="account-email" name="email" type="email" value="${esc(user.email)}" required />
         </div>
 
         <div class="reg-row">
           <div class="reg-field">
             <label for="account-age">Age</label>
             <input id="account-age" name="age" type="number" min="13" max="100" value="${esc(user.age)}" />
           </div>
           <div class="reg-field">
             <label for="account-phone">Phone</label>
             <input id="account-phone" name="phone" type="tel" value="${esc(user.phone)}" />
           </div>
         </div>
 
         <div class="reg-field">
           <label for="account-city">City</label>
           <input id="account-city" name="city" type="text" value="${esc(user.city)}" />
         </div>
 
         <div class="reg-field">
           <label for="account-bio">Bio <span class="hint">shown on your public profile</span></label>
           <textarea id="account-bio" name="bio" maxlength="500">${esc(user.bio)}</textarea>
         </div>
 
         <div class="reg-row">
           <div class="reg-field">
             <label for="account-height">Height (cm)</label>
             <input id="account-height" name="height_cm" type="number" min="100" max="260" value="${esc(user.height_cm)}" />
           </div>
           <div class="reg-field">
             <label for="account-school">School</label>
             <select id="account-school" name="school_level">
               <option value="" ${!user.school_level ? "selected" : ""}>Prefer not to say</option>
               <option value="university" ${user.school_level === "university" ? "selected" : ""}>University</option>
               <option value="college" ${user.school_level === "college" ? "selected" : ""}>College</option>
               <option value="high_school" ${user.school_level === "high_school" ? "selected" : ""}>High School</option>
               <option value="none" ${user.school_level === "none" ? "selected" : ""}>Not in school</option>
             </select>
           </div>
         </div>
 
         <button class="reg-submit" type="submit">Save changes</button>
         <p class="reg-status" id="account-status"></p>
       </form>
     `;
   }
 
   function openEditor(user, onSaved) {
     box.innerHTML = editFieldsMarkup(user);
     overlay.classList.add("open");
     document.body.style.overflow = "hidden";
 
     box.querySelector("#account-close").addEventListener("click", closeEditor);
 
     const form = box.querySelector("#account-form");
     const status = box.querySelector("#account-status");
 
     form.addEventListener("submit", async (e) => {
       e.preventDefault();
       const submitBtn = form.querySelector(".reg-submit");
 
       const payload = {
         first_name: form.elements.first_name.value.trim(),
         last_name: form.elements.last_name.value.trim(),
         email: form.elements.email.value.trim(),
         age: form.elements.age.value ? Number(form.elements.age.value) : null,
         phone: form.elements.phone.value.trim() || null,
         city: form.elements.city.value.trim() || null,
         bio: form.elements.bio.value.trim() || null,
         height_cm: form.elements.height_cm.value ? Number(form.elements.height_cm.value) : null,
         school_level: form.elements.school_level.value || null,
       };
 
       status.textContent = "Saving...";
       status.dataset.state = "pending";
       submitBtn.disabled = true;
 
       try {
         const updated = await updateAccount(user.player_id, payload);
         closeEditor();
         showAuthToast("Your profile has been updated.", () => {}, 2000);
         if (typeof onSaved === "function") onSaved(updated);
       } catch (err) {
         status.textContent = err.message || "Something went wrong. Try again.";
         status.dataset.state = "error";
         submitBtn.disabled = false;
       }
     });
   }
 
   /* ── Profil privé : le bandeau ───────────────────────────────
      Personne n'est public par défaut. Le CHOIX de se publier (et de montrer
      un moyen de contact) vit sur la page « Mon compte » (account.html,
      section confidentialité) : ici on ne fait que le dire et y mener.
      ═══════════════════════════════════════════════════════════ */

   function privateBannerMarkup() {
     return `
       <div class="profile-private-banner">
         <p>
           <i class="fa-solid fa-eye-slash"></i>
           <strong>Your profile is private.</strong>
           Only you can see this page. Coaches and scouts can't find you,
           and you don't appear in the Hub, the leaderboard or the league leaders.
         </p>
         <a class="profile-edit-btn" href="account.html#privacy">Make my profile public</a>
       </div>`;
   }

   function closeEditor() {
     overlay.classList.remove("open");
     document.body.style.overflow = "";
   }
 
   overlay.addEventListener("click", (e) => {
     if (e.target === overlay) closeEditor();
   });
   document.addEventListener("keydown", (e) => {
     if (e.key === "Escape" && overlay.classList.contains("open")) closeEditor();
   });
 
   async function render() {
     const params = new URLSearchParams(window.location.search);
     const slug = params.get("slug");
   
     if (!slug) {
       wrapper.innerHTML = notFoundMarkup();
       return;
     }
   
     // Qui regarde ? On le demande d'abord : un joueur qui n'a pas publié son
     // profil est introuvable par la route publique, y compris par lui-même.
     const currentUser = await fetchCurrentUser();
     const isOwnProfile = Boolean(currentUser && currentUser.role !== "admin" && currentUser.slug === slug);

     let player;
     let privateView = false;

     try {
       player = await fetchPlayerBySlug(slug);
     } catch (err) {
       // Pas de fiche publique. Si c'est la sienne, on la lui montre quand
       // même, par la route protégée : sans ça il ne pourrait jamais atteindre
       // le bouton qui rend son profil public.
       if (!isOwnProfile) {
         wrapper.innerHTML = notFoundMarkup();
         return;
       }
       try {
         player = await fetchOwnProfile(currentUser.player_id);
         privateView = true;
       } catch (_) {
         wrapper.innerHTML = notFoundMarkup();
         return;
       }
     }

     // Le joueur a pu arriver par la route publique tout en étant privé si un
     // admin regarde; on se fie au drapeau de la fiche quand il est là.
     if (isOwnProfile && player.is_public === false) privateView = true;

     const subLine = [player.position, player.city].filter(Boolean).join(" · ");
 
  // Les coordonnées ne sortent que si le joueur a coché « on peut me joindre ».
  // La vue publique renvoie déjà null sinon : on ne décide rien ici.
  const contactBits = [
    player.instagram_handle
      ? `<a href="https://instagram.com/${encodeURIComponent(String(player.instagram_handle).replace(/^@/, ""))}"
            target="_blank" rel="noopener">${esc(player.instagram_handle)}</a>`
      : null,
    player.contact_email
      ? `<a href="mailto:${encodeURIComponent(player.contact_email)}">${esc(player.contact_email)}</a>`
      : null,
  ].filter(Boolean);

  const detailBits = [
    player.age ? `${player.age} yo` : null,
    formatHeight(player.height_cm),
    formatSchoolLevel(player.school_level),
  ].filter(Boolean);
 
  // Render the header immediately — don't let a stats failure leave the
  // whole page blank while we wait on a second network call.
  wrapper.innerHTML = `
    ${privateView && currentUser.is_active !== false ? privateBannerMarkup() : ""}
    <div class="profile-header">
      <img class="profile-photo" src="${esc(player.avatar_url || AVATAR_FALLBACK)}" alt="${esc(player.first_name)} ${esc(player.last_name)}" />
      <div class="profile-info">
        <h1 class="profile-name">${esc(player.first_name)} ${esc(player.last_name)}</h1>
        <p class="profile-sub">${subLine ? esc(subLine) : "&nbsp;"}</p>
        ${detailBits.length ? `<p class="profile-details">${esc(detailBits.join(" · "))}</p>` : ""}
        ${player.bio ? `<p class="profile-bio">${esc(player.bio)}</p>` : ""}
        ${contactBits.length ? `<p class="profile-contact">${contactBits.join(" · ")}</p>` : ""}
        ${isOwnProfile ? `
          <div class="profile-actions">
            <button class="profile-edit-btn" id="profile-edit-btn"><i class="fa-solid fa-pen"></i> Edit profile</button>
            <a class="profile-account-link" href="account.html">Account &amp; privacy</a>
          </div>
        ` : ""}
      </div>
    </div>
   
       <h2 class="profile-section-title">Stats</h2>
       <div class="profile-stats-grid" id="profile-stats-grid">
         <p class="profile-empty-stats">Loading stats...</p>
       </div>
     `;
 
     if (isOwnProfile) {
       document.getElementById("profile-edit-btn").addEventListener("click", () => {
         // currentUser comes from /auth/me (has email/phone but may not carry
         // bio, since that's normally only returned on the public profile) —
         // merge it in so the field starts pre-filled with the real value.
         openEditor({ ...currentUser, bio: player.bio }, () => render());
       });
     }
   
     const grid = document.getElementById("profile-stats-grid");
   
     let stats = [];
     try {
       stats = await fetchPlayerStats(player.player_id);
     } catch (err) {
       grid.innerHTML = `<p class="profile-empty-stats">Couldn't load stats right now (${esc(err.message || "network error")}).</p>`;
       return;
     }
   
     if (stats.length === 0) {
       grid.innerHTML = `<p class="profile-empty-stats">No recorded games yet.</p>`;
     } else {
       grid.innerHTML = stats.map(statsCardMarkup).join("");
     }
   }
   
   render();