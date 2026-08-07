/* ═══════════════════════════════════════════════════════════
   Builds and controls the tournament registration modal.
   Depends on: data/api.js (fetchCurrentUser, submitRegistration)
   Exposes: window.openRegistration(tournament) — called by calendar.js

   NOTE vs the old mock: POST /api/registrations requires a signed-in,
   active player (protect + requireActive), and only stores columns
   that exist on `registrations`: player_id, tournament_id, team_id,
   emergency_contact_name, emergency_contact_phone, medical_notes,
   waiver_signed. There's no full_name/age/email/phone/referral_source
   column on this table — those already live on the player's profile,
   so the form only asks for what registrations actually needs.
   ═══════════════════════════════════════════════════════════ */

   import { fetchCurrentUser, fetchMyRegistrations, submitRegistration, submitPayment } from "../data/api.js";
   import { INTERAC_EMAIL } from "../config.js";

   const overlay = document.getElementById("reg-overlay");
   const box = document.getElementById("reg-box");

   let activeTournament = null;

   const STATUS_LABELS = {
     waitlisted: "Waitlisted",
     confirmed: "Confirmed ✓",
   };

   // Shown instead of the form when the card's disabled state was somehow
   // bypassed (stale render, direct call, race with a second tab, etc.) —
   // the real source of truth is still the UNIQUE(player_id, tournament_id)
   // constraint on the backend, this is just so the user isn't confused.
   function alreadyRegisteredMarkup(tournament, registration) {
     return `
       <div class="reg-head">
         <div><h3>Already registered</h3></div>
         <button class="reg-close" id="reg-close" aria-label="Close">✕</button>
       </div>
       <p>You're already registered for ${tournament.name}.</p>
       <span class="registration-badge ${registration.status}">${STATUS_LABELS[registration.status] || registration.status}</span>
     `;
   }

   function signedOutMarkup() {
     const redirect = encodeURIComponent(window.location.pathname + window.location.search);
     return `
       <div class="reg-head">
         <div><h3>Sign in required</h3></div>
         <button class="reg-close" id="reg-close" aria-label="Close">✕</button>
       </div>
       <p>You need an account to register for a tournament.</p>
       <p><a href="signin.html?redirect=${redirect}">Sign in</a> or <a href="signup.html?redirect=${redirect}">create an account</a>, then come back to register.</p>
     `;
   }

   function fieldsMarkup(user) {
     return `
       <div class="reg-row">
         <div class="reg-field">
           <label>Registering as</label>
           <input type="text" value="${user.first_name} ${user.last_name}" disabled />
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
         <input type="checkbox" name="waiver_signed" required />
         <span>I agree to the tournament terms, liability waiver, and allow media coverage (photo/video) to be used for promotional purposes.</span>
       </label>

       <button class="reg-submit" type="submit">Submit registration</button>
       <p class="reg-status" id="reg-status"></p>
     `;
   }

   function paymentStepMarkup(entryFee, fullName) {
     return `
       <div class="reg-payment">
         <h4>One last step — payment</h4>
         <p>Entry fee: <strong>$${entryFee}</strong></p>
         <p>Send an Interac e-Transfer to <strong>${INTERAC_EMAIL}</strong> and include
            <strong>"${fullName}"</strong> as the reference/note, so we can match it to your registration.</p>
         <p class="reg-waitlist-note">You're on the waitlist until we can verify your payment was sent. Thank you!</p>
         <button class="reg-submit" id="reg-payment-sent" type="button">I've sent the payment</button>
         <p class="reg-status" id="reg-payment-status"></p>
       </div>
     `;
   }

   async function render(tournament) {
     const user = await fetchCurrentUser();

     if (!user || user.role === "admin") {
       box.innerHTML = signedOutMarkup();
       box.querySelector("#reg-close").addEventListener("click", closeRegistration);
       return;
     }

     const myRegistrations = await fetchMyRegistrations();
     const existing = myRegistrations.find((r) => r.tournament_id === tournament.tournament_id);
     if (existing) {
       box.innerHTML = alreadyRegisteredMarkup(tournament, existing);
       box.querySelector("#reg-close").addEventListener("click", closeRegistration);
       return;
     }

     const entryFee = Number(tournament.entry_fee) || 0;

     box.innerHTML = `
       <div class="reg-head">
         <div>
           <h3>Register</h3>
           <p>${tournament.name} · ${new Date(tournament.starts_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · ${tournament.location}</p>
           <p class="reg-fee">${entryFee > 0 ? `Entry fee: $${entryFee}` : "Free entry"}</p>
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

       const payload = {
         player_id: user.player_id,
         tournament_id: activeTournament.tournament_id,
         emergency_contact_name: form.elements.emergency_contact_name.value.trim(),
         emergency_contact_phone: form.elements.emergency_contact_phone.value.trim(),
         medical_notes: form.elements.medical_notes.value.trim(),
         waiver_signed: form.elements.waiver_signed.checked,
       };

       status.textContent = "Submitting...";
       status.dataset.state = "pending";

       try {
         const result = await submitRegistration(payload);
         const registration = result.data;
         const fullName = `${user.first_name} ${user.last_name}`;
         const entryFee = Number(activeTournament.entry_fee) || 0;

         form.querySelector(".reg-submit").disabled = true;

         if (entryFee > 0) {
           // Payant : on affiche les infos de paiement dans la même fiche,
           // pas de redirection vers une nouvelle page.
           status.textContent = "";
           status.dataset.state = "success";
           status.insertAdjacentHTML("afterend", paymentStepMarkup(entryFee, fullName));

           const payBtn = box.querySelector("#reg-payment-sent");
           const payStatus = box.querySelector("#reg-payment-status");

           payBtn.addEventListener("click", async () => {
             payBtn.disabled = true;
             payStatus.textContent = "Recording...";
             payStatus.dataset.state = "pending";

             try {
               await submitPayment({
                 player_id: user.player_id,
                 registration_id: registration.registration_id,
                 amount: entryFee,
                 transfer_sender_name: fullName,
                 method: "e_transfer",
               });
               payStatus.textContent = "Thanks — we'll verify your payment and confirm your spot soon.";
               payStatus.dataset.state = "success";
             } catch (err) {
               payStatus.textContent = err.message || "Something went wrong. Try again.";
               payStatus.dataset.state = "error";
               payBtn.disabled = false;
             }
           });
         } else {
           // Gratuit : rien à payer, comportement inchangé.
           status.textContent = "You're registered. Confirmation sent to your email.";
         }

         document.dispatchEvent(
            new CustomEvent("myhoop:registration-success", {
              detail: { tournamentId: activeTournament.tournament_id },
            })
          );
        
        } catch (err) {
         status.textContent = err.message || "Something went wrong. Try again.";
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