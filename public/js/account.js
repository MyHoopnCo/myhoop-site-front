/* ═══════════════════════════════════════════════════════════
   Page « Mon compte » (account.html).

   Trois questions, trois endroits :
     - Profil public  (players.html)  « qui suis-je publiquement ? »
     - Mon compte     (cette page)    « qui suis-je techniquement ? »
     - Confidentialité (section de cette page) « qui peut me voir ? »

   Ici : connexion (courriel, mot de passe, sign out), confidentialité
   (profil public, contact) et désactivation du compte.
   Le serveur reste la source de vérité : cette page n'applique aucune règle.

   Depends on: data/api.js (fetchCurrentUser, changePassword, updateVisibility,
               deactivatePlayer, reactivatePlayer, logout)
   ═══════════════════════════════════════════════════════════ */

import {
  fetchCurrentUser, changePassword, updateVisibility,
  deactivatePlayer, reactivatePlayer, logout,
} from "./data/api.js";
import { initPasswordToggle, showAuthToast } from "./auth-utils.js";
import { esc } from "./utils/escape.js";

const wrapper = document.getElementById("account-wrapper");
const PASSWORD_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // même règle que le serveur (30 jours)

function formatDate(date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Date à partir de laquelle le mot de passe peut être changé de nouveau, ou null si c'est permis.
function nextPasswordChangeDate(user) {
  if (!user.password_changed_at) return null;
  const next = new Date(new Date(user.password_changed_at).getTime() + PASSWORD_COOLDOWN_MS);
  return next > new Date() ? next : null;
}

/* ── Sections ───────────────────────────────────────────────── */

function passwordPanelMarkup(user) {
  const cooldownUntil = nextPasswordChangeDate(user);
  if (cooldownUntil) {
    return `
      <p class="account-notice">
        <i class="fa-solid fa-lock"></i>
        You already changed your password recently. For security, you can
        change it again on <strong>${esc(formatDate(cooldownUntil))}</strong>.
      </p>`;
  }
  return `
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
      <p class="account-hint">At least 8 characters. You can change your password once every 30 days.</p>
      <button class="reg-submit" type="submit">Save new password</button>
      <p class="reg-status" id="password-status"></p>
    </form>`;
}

function signInCardMarkup(user) {
  const changed = user.password_changed_at
    ? `Last changed ${esc(formatDate(new Date(user.password_changed_at)))}`
    : "Never changed";
  return `
    <section class="account-card" id="sign-in">
      <h2>Sign-in details</h2>

      <div class="account-row">
        <div>
          <strong>Email</strong>
          <p>${esc(user.email)}</p>
          <p class="account-hint">To change it, use <a href="players.html?slug=${encodeURIComponent(user.slug)}">Edit profile</a>.</p>
        </div>
      </div>

      <div class="account-row">
        <div>
          <strong>Password</strong>
          <p>${changed}</p>
        </div>
        <button type="button" class="account-btn" id="password-open">Change password</button>
      </div>
      <div class="account-panel" id="password-panel" hidden>${passwordPanelMarkup(user)}</div>

      <div class="account-row">
        <div>
          <strong>Sign out</strong>
          <p>You'll need to sign in again on this device.</p>
        </div>
        <button type="button" class="account-btn" id="signout-btn">Sign out</button>
      </div>
    </section>`;
}

// Message de sécurité pour les moins de 18 ans (l'âge est déclaré à l'inscription :
// il peut être faux, donc le conseil est donné à quiconque se déclare mineur).
function minorNoteMarkup() {
  return `
    <div class="account-safety">
      <i class="fa-solid fa-shield-halved"></i>
      <p>
        <strong>Under 18? Be careful what you make public.</strong>
        Anyone can see a public profile, including people you don't know.
        Never put your phone number, home address, school schedule or where
        you'll be on your profile or in your bio. If you turn on contact,
        anyone can reach you by Instagram or email, so only share what you're
        comfortable with. You can switch back to private at any time.
      </p>
    </div>`;
}

function privacyCardMarkup(user) {
  const isPublic = user.is_public === true;
  const contactOn = user.show_contact === true;
  const isMinor = Number(user.age) > 0 && Number(user.age) < 18;

  return `
    <section class="account-card" id="privacy">
      <h2>Privacy</h2>
      <p class="account-lead">
        ${user.is_active === false
          ? "Your account is deactivated, so your profile is hidden whatever you choose below. Reactivate it to be seen again."
          : `Your profile is <strong>${isPublic ? "public" : "private"}</strong> right now.
             You decide who can see it. Nothing here is on by default.`}
      </p>
      ${isMinor ? minorNoteMarkup() : ""}

      <form class="reg-form" id="privacy-form">
        <label class="reg-check">
          <input type="checkbox" name="is_public" ${isPublic ? "checked" : ""} />
          <span>
            <strong>Show my profile publicly.</strong>
            Your name, photo, city, position, height, bio and game stats become
            visible to anyone, and you appear in the Hub, the leaderboard and
            the league leaders.
          </span>
        </label>

        <p class="account-hint">
          Your email, phone number, age and anything you gave at registration
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
        <p class="reg-status" id="privacy-status"></p>
      </form>
    </section>`;
}

function dangerCardMarkup(user) {
  if (user.is_active === false) {
    return `
      <section class="account-card account-danger" id="danger">
        <h2>Your account is deactivated</h2>
        <p>
          Your profile is hidden from the Hub, the leaderboard and team rosters.
          Nothing was deleted. Reactivate to bring everything back.
        </p>
        <button type="button" class="account-btn account-btn-primary" id="reactivate-btn">Reactivate my account</button>
        <p class="reg-status" id="danger-status"></p>
      </section>`;
  }
  return `
    <section class="account-card account-danger" id="danger">
      <h2>Deactivate account</h2>
      <p>
        Deactivating hides your profile from the Hub, the leaderboard and team
        rosters. Your games, stats and registrations are kept: nothing is deleted.
        You can come back any time by signing in and tapping <strong>Reactivate</strong>.
      </p>
      <div id="deactivate-step1">
        <button type="button" class="account-danger-btn" id="deactivate-open">Deactivate my account</button>
      </div>
      <div id="deactivate-step2" hidden>
        <p><strong>Deactivate your account?</strong> Your profile will be hidden right away.</p>
        <div class="account-actions">
          <button type="button" class="account-danger-btn" id="deactivate-confirm">Yes, deactivate</button>
          <button type="button" class="account-btn" id="deactivate-cancel">Cancel</button>
        </div>
      </div>
      <p class="reg-status" id="danger-status"></p>
    </section>`;
}

/* ── Actions ────────────────────────────────────────────────── */

function setStatus(el, text, state) {
  el.textContent = text;
  el.dataset.state = state;
}

function wirePassword(user) {
  const open = document.getElementById("password-open");
  const panel = document.getElementById("password-panel");
  open.addEventListener("click", () => { panel.hidden = !panel.hidden; });

  const form = document.getElementById("password-form");
  if (!form) return; // cooldown : il n'y a qu'un message

  initPasswordToggle("pw-current", "pw-current-toggle");
  initPasswordToggle("pw-new", "pw-new-toggle");
  initPasswordToggle("pw-confirm", "pw-confirm-toggle");

  const status = document.getElementById("password-status");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector(".reg-submit");
    const { current_password, new_password, confirm_password } = form.elements;

    if (new_password.value !== confirm_password.value) {
      setStatus(status, "New password and confirmation don't match.", "error");
      return;
    }

    setStatus(status, "Saving...", "pending");
    submitBtn.disabled = true;
    try {
      const updated = await changePassword(current_password.value, new_password.value);
      showAuthToast("Your password has been changed.", () => {}, 2000);
      render({ ...user, ...updated });
    } catch (err) {
      if (err.status === 429 && err.retryAfter) {
        setStatus(status, `You can change your password again on ${formatDate(new Date(err.retryAfter))}.`, "error");
      } else {
        setStatus(status, err.message || "Something went wrong. Try again.", "error");
      }
      submitBtn.disabled = false;
    }
  });
}

function wireSignOut() {
  const button = document.getElementById("signout-btn");
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await logout();
      window.location.href = "index.html";
    } catch (_) {
      button.disabled = false;
      button.textContent = "Couldn't sign out — try again";
    }
  });
}

function wirePrivacy(user) {
  const form = document.getElementById("privacy-form");
  const status = document.getElementById("privacy-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector(".reg-submit");
    const payload = {
      is_public: form.elements.is_public.checked,
      show_contact: form.elements.show_contact.checked,
      instagram_handle: form.elements.instagram_handle.value.trim(),
      public_contact_email: form.elements.public_contact_email.value.trim(),
    };

    setStatus(status, "Saving...", "pending");
    submitBtn.disabled = true;
    try {
      const updated = await updateVisibility(user.player_id, payload);
      showAuthToast(
        updated.is_public ? "Your profile is public now." : "Your profile is private again.",
        () => {}, 2500
      );
      render({ ...user, ...updated });
    } catch (err) {
      setStatus(status, err.message || "Something went wrong. Try again.", "error");
      submitBtn.disabled = false;
    }
  });
}

function wireDanger(user) {
  const status = document.getElementById("danger-status");

  // Désactivation : deux temps (bouton, puis confirmation) pour éviter le clic malheureux.
  const openBtn = document.getElementById("deactivate-open");
  if (openBtn) {
    const step1 = document.getElementById("deactivate-step1");
    const step2 = document.getElementById("deactivate-step2");
    const confirmBtn = document.getElementById("deactivate-confirm");

    openBtn.addEventListener("click", () => { step1.hidden = true; step2.hidden = false; });
    document.getElementById("deactivate-cancel").addEventListener("click", () => {
      step2.hidden = true; step1.hidden = false; setStatus(status, "", "");
    });
    confirmBtn.addEventListener("click", async () => {
      confirmBtn.disabled = true;
      setStatus(status, "Deactivating...", "pending");
      try {
        await deactivatePlayer(user.player_id);
        window.location.reload(); // la barre du haut affiche alors « Reactivate »
      } catch (err) {
        setStatus(status, err.message || "Something went wrong. Try again.", "error");
        confirmBtn.disabled = false;
      }
    });
  }

  // Réactivation (compte déjà désactivé).
  const reactivateBtn = document.getElementById("reactivate-btn");
  if (reactivateBtn) {
    reactivateBtn.addEventListener("click", async () => {
      reactivateBtn.disabled = true;
      setStatus(status, "Reactivating...", "pending");
      try {
        await reactivatePlayer(user.player_id);
        window.location.reload();
      } catch (err) {
        setStatus(status, err.message || "Something went wrong. Try again.", "error");
        reactivateBtn.disabled = false;
      }
    });
  }
}

/* ── Rendu ──────────────────────────────────────────────────── */

function render(user) {
  wrapper.innerHTML = `
    <h1 class="account-title">My account</h1>
    <p class="account-sub">
      Private: only you can see this page.
      <a href="players.html?slug=${encodeURIComponent(user.slug)}">View my profile</a>
    </p>
    ${signInCardMarkup(user)}
    ${privacyCardMarkup(user)}
    ${dangerCardMarkup(user)}
  `;

  wirePassword(user);
  wireSignOut();
  wirePrivacy(user);
  wireDanger(user);
}

async function init() {
  const user = await fetchCurrentUser();

  if (!user) {
    // Pas connecté : on passe par la connexion et on revient ici.
    window.location.href = `signin.html?redirect=${encodeURIComponent("account.html")}`;
    return;
  }

  if (user.role === "admin") {
    wrapper.innerHTML = `
      <h1 class="account-title">Admin account</h1>
      <p class="account-sub">
        The admin login is managed in the server configuration, not here.
        <a href="admin.html">Go to the admin dashboard</a>.
      </p>`;
    return;
  }

  render(user);

  // Les liens #privacy arrivent avant que le contenu existe : on défile une fois la page construite.
  if (window.location.hash) {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
}

init();
