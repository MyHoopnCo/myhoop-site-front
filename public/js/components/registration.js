/* ═══════════════════════════════════════════════════════════
   Builds and controls the tournament registration modal.
   Depends on: data/mock-data.js (fetchCurrentUser, submitRegistration)
   Exposes: window.openRegistration(tournament) — called by calendar.js
   ═══════════════════════════════════════════════════════════ */

   import { fetchCurrentUser, submitRegistration } from "../data/mock-data.js";

   const overlay = document.getElementById("reg-overlay");
   const box = document.getElementById("reg-box");
   
   let activeTournament = null;
   
   function fieldsMarkup(user) {
     // Pre-fill from the logged-in user where we already have the data.
     // Fields the account doesn't store (emergency contact, medical notes)
     // stay blank even when signed in — those are collected per-registration.
     const v = (val) => (val ?? "").toString();
   
     return `
       <div class="reg-row">
         <div class="reg-field">
           <label for="reg-name">Full name</label>
           <input id="reg-name" name="full_name" type="text" value="${v(user?.full_name)}" required />
         </div>
         <div class="reg-field">
           <label for="reg-age">Age</label>
           <input id="reg-age" name="age" type="number" min="10" max="99" value="${v(user?.age)}" required />
         </div>
       </div>
   
       <div class="reg-row">
         <div class="reg-field">
           <label for="reg-email">Email address</label>
           <input id="reg-email" name="email" type="email" value="${v(user?.email)}" required />
         </div>
         <div class="reg-field">
           <label for="reg-phone">Phone number <span class="hint">for schedule / weather updates</span></label>
           <input id="reg-phone" name="phone" type="tel" value="${v(user?.phone)}" required />
         </div>
       </div>
   
       <div class="reg-row">
         <div class="reg-field">
           <label for="reg-ec-name">Emergency contact name</label>
           <input id="reg-ec-name" name="emergency_contact_name" type="text" required />
         </div>
         <div class="reg-field">
           <label for="reg-ec-phone">Emergency contact phone</label>
           <input id="reg-ec-phone" name="emergency_contact_phone" type="tel" required />
         </div>
       </div>
   
       <div class="reg-field">
         <label for="reg-medical">Medical conditions, allergies, or past injuries <span class="hint">our medical staff should be aware of</span></label>
         <textarea id="reg-medical" name="medical_notes" placeholder="None, or describe briefly"></textarea>
       </div>
   
       <label class="reg-check">
         <input type="checkbox" name="waiver_accepted" required />
         <span>I agree to the tournament terms, liability waiver, and allow media coverage (photo/video) to be used for promotional purposes.</span>
       </label>
   
       <fieldset class="reg-fieldset">
         <legend>How did you hear about this tournament?</legend>
         <div class="reg-radio-group">
           <label class="reg-radio"><input type="radio" name="referral_source" value="social_media" required /> Social media (Instagram, TikTok)</label>
           <label class="reg-radio"><input type="radio" name="referral_source" value="word_of_mouth" /> Word of mouth / friend</label>
           <label class="reg-radio"><input type="radio" name="referral_source" value="flyer" /> Flyer / poster</label>
           <label class="reg-radio"><input type="radio" name="referral_source" value="website" /> Website</label>
         </div>
       </fieldset>
   
       <button class="reg-submit" type="submit">Submit registration</button>
       <p class="reg-status" id="reg-status"></p>
     `;
   }
   
   async function render(tournament) {
     const user = await fetchCurrentUser();
   
     box.innerHTML = `
       <div class="reg-head">
         <div>
           <h3>Register</h3>
           <p>${tournament.name} · ${new Date(`${tournament.starts_at}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · ${tournament.location}</p>
         </div>
         <button class="reg-close" id="reg-close" aria-label="Close">✕</button>
       </div>
       <form class="reg-form" id="reg-form">
         ${fieldsMarkup(user)}
       </form>
     `;
   
     box.querySelector("#reg-close").addEventListener("click", closeRegistration);
   
     const form = box.querySelector("#reg-form");
     const status = box.querySelector("#reg-status");
   
     form.addEventListener("submit", async (e) => {
       e.preventDefault();
       const data = Object.fromEntries(new FormData(form).entries());
       data.tournament_id = activeTournament.id;
       data.waiver_accepted = form.elements.waiver_accepted.checked;
   
       status.textContent = "Submitting...";
       status.dataset.state = "pending";
   
       const result = await submitRegistration(data);
   
       if (result.ok) {
         status.textContent = "You're registered. Confirmation sent to your email.";
         status.dataset.state = "success";
         form.querySelector(".reg-submit").disabled = true;
       } else {
         status.textContent = "Something went wrong. Try again.";
         status.dataset.state = "error";
       }
     });
   }
   
   export async function openRegistration(tournament) {
     activeTournament = tournament;
     await render(tournament);
     overlay.classList.add("open");
     document.body.style.overflow = "hidden";
   }
   
   function closeRegistration() {
     overlay.classList.remove("open");
     document.body.style.overflow = "";
   }
   
   overlay.addEventListener("click", (e) => {
     if (e.target === overlay) closeRegistration();
   });
   document.addEventListener("keydown", (e) => {
     if (e.key === "Escape" && overlay.classList.contains("open")) closeRegistration();
   });
   
   // calendar.js calls this via window so the two components stay decoupled
   window.openRegistration = openRegistration;