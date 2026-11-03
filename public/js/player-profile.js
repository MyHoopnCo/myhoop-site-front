/* ═══════════════════════════════════════════════════════════
   Renders a single player's profile on players.html, based on
   the ?slug=... query param (set by the links in players.js and
   leaderboard.js on "The Hub").
 
   Simple v1: photo, name, position/city, bio, and a stat card per
   competition_type from the /statistics/player/:id/summary route.
   Depends on: data/api.js (fetchPlayerBySlug, fetchPlayerStats)
   ═══════════════════════════════════════════════════════════ */
 
   import {
     fetchPlayerBySlug, fetchPlayerStats, fetchCurrentUser, updateAccount, changePassword,
     fetchOwnProfile, updateVisibility,
   } from "./data/api.js";
   import { initPasswordToggle, showAuthToast } from "./auth-utils.js";
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
             <input id="account-age" name="age" type="number" min="5" max="100" value="${esc(user.age)}" />
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
 
   /* ── Change password (separate flow, own cooldown) ──────────
      A first password change is always allowed. After that, the
      backend enforces a 30-day cooldown between changes — this
      form just reflects that state, it never enforces it itself.
      Expects fetchCurrentUser() to include password_changed_at
      (ISO string, or null/absent if never changed). ─────────── */
 
   function nextPasswordChangeDate(user) {
     if (!user.password_changed_at) return null; // never changed yet — no cooldown
     const changedAt = new Date(user.password_changed_at);
     const next = new Date(changedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
     return next > new Date() ? next : null;
   }
 
   function formatDate(date) {
     return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
   }
 
   function passwordCooldownMarkup(availableOn) {
     return `
       <div class="reg-head">
         <div><h3>Change password</h3></div>
         <button class="reg-close" id="account-close" aria-label="Close">✕</button>
       </div>
       <p class="reg-cooldown-notice">
         <i class="fa-solid fa-lock"></i>
         You already changed your password recently. For security, you can
         change it again on <strong>${formatDate(availableOn)}</strong>.
       </p>
     `;
   }
 
   function passwordFieldsMarkup() {
     return `
       <div class="reg-head">
         <div><h3>Change password</h3><p>Enter your current password, then choose a new one.</p></div>
         <button class="reg-close" id="account-close" aria-label="Close">✕</button>
       </div>
       <form class="reg-form" id="password-form">
         <div class="reg-field">
           <label for="pw-current">Current password</label>
           <div class="auth-password-wrap">
             <input id="pw-current" name="current_password" type="password" required />
             <button type="button" class="auth-password-toggle" id="pw-current-toggle" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
           </div>
         </div>
 
         <div class="reg-field">
           <label for="pw-new">New password</label>
           <div class="auth-password-wrap">
             <input id="pw-new" name="new_password" type="password" minlength="8" required />
             <button type="button" class="auth-password-toggle" id="pw-new-toggle" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
           </div>
         </div>
 
         <div class="reg-field">
           <label for="pw-confirm">Confirm new password <span class="hint">must match</span></label>
           <div class="auth-password-wrap">
             <input id="pw-confirm" name="confirm_password" type="password" minlength="8" required />
             <button type="button" class="auth-password-toggle" id="pw-confirm-toggle" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
           </div>
         </div>
 
         <p class="reg-field-note">Password must be at least 8 characters long and contain one number.</p>
 
         <button class="reg-submit" type="submit">Change password</button>
         <p class="reg-status" id="password-status"></p>
       </form>
     `;
   }
 
   function openPasswordModal(user, onChanged) {
     const cooldownUntil = nextPasswordChangeDate(user);
 
     if (cooldownUntil) {
       box.innerHTML = passwordCooldownMarkup(cooldownUntil);
       overlay.classList.add("open");
       document.body.style.overflow = "hidden";
       box.querySelector("#account-close").addEventListener("click", closeEditor);
       return;
     }
 
     box.innerHTML = passwordFieldsMarkup();
     overlay.classList.add("open");
     document.body.style.overflow = "hidden";
 
     box.querySelector("#account-close").addEventListener("click", closeEditor);
     initPasswordToggle("pw-current", "pw-current-toggle");
     initPasswordToggle("pw-new", "pw-new-toggle");
     initPasswordToggle("pw-confirm", "pw-confirm-toggle");
 
     const form = box.querySelector("#password-form");
     const status = box.querySelector("#password-status");
 
     form.addEventListener("submit", async (e) => {
       e.preventDefault();
       const submitBtn = form.querySelector(".reg-submit");
 
       const current = form.elements.current_password.value;
       const next = form.elements.new_password.value;
       const confirm = form.elements.confirm_password.value;
 
       if (next !== confirm) {
         status.textContent = "New password and confirmation don't match.";
         status.dataset.state = "error";
         return;
       }
 
       status.textContent = "Saving...";
       status.dataset.state = "pending";
       submitBtn.disabled = true;
 
       try {
         const updated = await changePassword(current, next);
         closeEditor();
         showAuthToast("Your password has been changed.", () => {}, 2000);
         if (typeof onChanged === "function") onChanged(updated);
       } catch (err) {
         if (err.status === 429 && err.retryAfter) {
           status.textContent = `You can change your password again on ${formatDate(new Date(err.retryAfter))}.`;
         } else {
           status.textContent = err.message || "Something went wrong. Try again.";
         }
         status.dataset.state = "error";
         submitBtn.disabled = false;
       }
     });
   }
 

   /* ── Profil public : le choix du joueur ─────────────────────
      Personne n'est public par défaut. Tant que le joueur ne l'a pas
      demandé, sa fiche n'apparaît ni au Hub, ni au classement, ni dans
      les leaders — son nom peut quand même figurer dans la composition
      d'une équipe, parce qu'une équipe doit montrer qui en fait partie.

      Montrer un moyen de le joindre est un SECOND choix, séparé : on
      peut vouloir être vu par un coach sans publier son Instagram.
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
         <button class="profile-edit-btn" id="profile-go-public">Make my profile public</button>
       </div>`;
   }

   function visibilityMarkup(user) {
     const on = user.is_public === true;
     const contactOn = user.show_contact === true;

     return `
       <div class="reg-head">
         <div>
           <h3>Who can see your profile</h3>
           <p>You decide. Nothing here is on by default.</p>
         </div>
         <button class="reg-close" id="account-close" aria-label="Close">✕</button>
       </div>
       <form class="reg-form" id="visibility-form">
         <label class="reg-check">
           <input type="checkbox" name="is_public" ${on ? "checked" : ""} />
           <span>
             <strong>Show my profile publicly.</strong>
             Your name, photo, position, height, city, age, school and your game
             stats become visible to anyone, and you appear in the Hub, the
             leaderboard and the league leaders.
           </span>
         </label>

         <p class="reg-field-note">
           Your email, your phone number and anything you gave at registration
           (emergency contact, medical notes) are never shown, whatever you choose here.
         </p>

         <label class="reg-check">
           <input type="checkbox" name="show_contact" ${contactOn ? "checked" : ""} />
           <span>
             <strong>Let people contact me.</strong>
             Shows the two fields below on your public profile, so a coach can reach you.
           </span>
         </label>

         <div class="reg-row">
           <div class="reg-field">
             <label for="vis-instagram">Instagram handle</label>
             <input id="vis-instagram" name="instagram_handle" type="text"
                    value="${esc(user.instagram_handle)}" placeholder="@yourhandle" />
           </div>
           <div class="reg-field">
             <label for="vis-email">Public email <span class="hint">can differ from your account email</span></label>
             <input id="vis-email" name="public_contact_email" type="email"
                    value="${esc(user.public_contact_email)}" placeholder="you@example.com" />
           </div>
         </div>

         <button class="reg-submit" type="submit">Save</button>
         <p class="reg-status" id="visibility-status"></p>
       </form>`;
   }

   function openVisibilityModal(user, onSaved) {
     box.innerHTML = visibilityMarkup(user);
     overlay.classList.add("open");
     document.body.style.overflow = "hidden";

     box.querySelector("#account-close").addEventListener("click", closeEditor);

     const form = box.querySelector("#visibility-form");
     const status = box.querySelector("#visibility-status");

     form.addEventListener("submit", async (e) => {
       e.preventDefault();
       const submitBtn = form.querySelector(".reg-submit");

       const payload = {
         is_public: form.elements.is_public.checked,
         show_contact: form.elements.show_contact.checked,
         instagram_handle: form.elements.instagram_handle.value.trim(),
         public_contact_email: form.elements.public_contact_email.value.trim(),
       };

       status.textContent = "Saving...";
       status.dataset.state = "pending";
       submitBtn.disabled = true;

       try {
         const updated = await updateVisibility(user.player_id, payload);
         closeEditor();
         showAuthToast(
           updated.is_public
             ? "Your profile is public now."
             : "Your profile is private again.",
           () => {}, 2500
         );
         if (typeof onSaved === "function") onSaved(updated);
       } catch (err) {
         status.textContent = err.message || "Something went wrong. Try again.";
         status.dataset.state = "error";
         submitBtn.disabled = false;
       }
     });
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
    ${privateView ? privateBannerMarkup() : ""}
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
            <button class="profile-password-btn" id="profile-password-btn"><i class="fa-solid fa-lock"></i> Change password</button>
            <button class="profile-edit-btn" id="profile-visibility-btn">
              <i class="fa-solid ${privateView ? "fa-eye-slash" : "fa-eye"}"></i>
              ${privateView ? "Private profile" : "Public profile"}
            </button>
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
       document.getElementById("profile-password-btn").addEventListener("click", () => {
         openPasswordModal(currentUser, () => render());
       });
       document.getElementById("profile-visibility-btn").addEventListener("click", () => {
         // `player` vient de la route protégée quand le profil est privé, donc
         // il porte is_public, show_contact et les coordonnées.
         openVisibilityModal({ ...currentUser, ...player }, () => render());
       });
     }

     // Le bandeau du haut mène à la même fenêtre : c'est le chemin le plus
     // court pour quelqu'un qui découvre que son profil est invisible.
     const goPublic = document.getElementById("profile-go-public");
     if (goPublic) {
       goPublic.addEventListener("click", () => {
         openVisibilityModal({ ...currentUser, ...player }, () => render());
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