/* ═══════════════════════════════════════════════════════════
   Barre de navigation : l'état « connecté / déconnecté ».

   Depends on: data/api.js (fetchCurrentUser, logout, reactivatePlayer)
   fetchCurrentUser() appelle GET /api/auth/me — null si personne n'est
   connecté, un joueur (first_name/last_name/slug/is_active...) ou l'admin
   (email/role seulement, pas de profil public).

   Connecté : un menu sous l'avatar (Mon profil / Mon compte / Sign out).
   Compte désactivé : un bandeau avec le bouton « Reactivate ».
   ═══════════════════════════════════════════════════════════ */

import { fetchCurrentUser, logout, reactivatePlayer } from "../data/api.js";
import { esc } from "../utils/escape.js";

const desktopSlot = document.getElementById("navAuth");
const mobileSlot = document.getElementById("navAuthMobile");

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ── Déconnexion ────────────────────────────────────────────
   Le serveur efface le cookie; on retourne ensuite à l'accueil.
   Si la requête échoue, le cookie est toujours là : on le dit au lieu
   de faire semblant. */
async function signOut(button) {
  const label = button.textContent;
  button.disabled = true;
  try {
    await logout();
    window.location.href = "index.html";
  } catch (_) {
    button.disabled = false;
    button.textContent = "Couldn't sign out — try again";
    setTimeout(() => { button.textContent = label; }, 3000);
  }
}

/* ── Menu du bureau ───────────────────────────────────────── */
function desktopMenuMarkup({ avatar, name, links }) {
  return `
    <div class="nav-user">
      <button type="button" class="nav-profile nav-user-btn" id="navUserBtn"
              aria-haspopup="true" aria-expanded="false">
        <span class="avatar">${esc(avatar)}</span>
        ${esc(name)}
        <span class="nav-user-caret" aria-hidden="true">▾</span>
      </button>
      <div class="nav-menu" id="navMenu" hidden>
        ${links.map((l) => `<a href="${esc(l.href)}">${esc(l.text)}</a>`).join("")}
        <button type="button" class="nav-menu-signout" data-signout>Sign out</button>
      </div>
    </div>
  `;
}

function wireDesktopMenu() {
  const button = document.getElementById("navUserBtn");
  const menu = document.getElementById("navMenu");
  if (!button || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  };

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

/* ── Menu du téléphone (le tiroir existant) ───────────────── */
function mobileMenuMarkup(links) {
  return `
    ${links.map((l) => `<a href="${esc(l.href)}">${esc(l.text)}</a>`).join("")}
    <button type="button" class="mobile-signout" data-signout>Sign out</button>
  `;
}

/* ── Compte désactivé ─────────────────────────────────────────
   Le joueur peut encore se connecter (c'est voulu : c'est la seule façon
   de se réactiver), mais son profil est caché et plusieurs actions sont
   refusées. Sans ce bandeau, il ne comprendrait pas pourquoi. */
function showDeactivatedBar(user) {
  const bar = document.createElement("div");
  bar.className = "deactivated-bar";
  bar.innerHTML = `
    <span>Your account is deactivated. Your profile is hidden until you reactivate.</span>
    <button type="button">Reactivate</button>
  `;
  document.body.appendChild(bar);

  const button = bar.querySelector("button");
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Reactivating…";
    try {
      await reactivatePlayer(user.player_id);
      window.location.reload();
    } catch (_) {
      button.disabled = false;
      button.textContent = "Try again";
    }
  });
}

async function render() {
  const user = await fetchCurrentUser();

  if (user && user.role === "admin") {
    const links = [{ href: "admin.html", text: "Admin dashboard" }];
    desktopSlot.innerHTML = desktopMenuMarkup({ avatar: "AD", name: "Admin", links });
    mobileSlot.innerHTML = mobileMenuMarkup(links);
  } else if (user) {
    const fullName = `${user.first_name} ${user.last_name}`;
    const links = [
      { href: `players.html?slug=${encodeURIComponent(user.slug)}`, text: "My profile" },
      { href: "account.html", text: "My account" },
    ];
    desktopSlot.innerHTML = desktopMenuMarkup({
      avatar: initials(fullName),
      name: user.first_name,
      links,
    });
    mobileSlot.innerHTML = mobileMenuMarkup(links);

    if (user.is_active === false) showDeactivatedBar(user);
  } else {
    desktopSlot.innerHTML = `
      <a class="nav-signin" href="signin.html">Sign in</a>
      <a class="nav-signup" href="signup.html">Sign up</a>
    `;
    mobileSlot.innerHTML = `
      <a href="signin.html">Sign in</a>
      <a href="signup.html">Sign up</a>
    `;
    return;
  }

  wireDesktopMenu();
  document.querySelectorAll("[data-signout]").forEach((b) => {
    b.addEventListener("click", () => signOut(b));
  });
}

render();
