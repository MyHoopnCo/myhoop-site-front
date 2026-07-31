/* ═══════════════════════════════════════════════════════════
   Depends on: data/api.js (fetchCurrentUser)
   fetchCurrentUser() now calls the real GET /api/auth/me — it
   returns null on a 401 (not signed in), a player object with
   first_name/last_name/slug, or the admin object (email/role only,
   no slug — admin has no public profile page).
   ═══════════════════════════════════════════════════════════ */

   import { fetchCurrentUser } from "../data/api.js";

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

   async function render() {
     const user = await fetchCurrentUser();

     if (user && user.role === "admin") {
       desktopSlot.innerHTML = `<span class="nav-profile"><span class="avatar">AD</span> Admin</span>`;
       mobileSlot.innerHTML = `<span>Signed in as admin</span>`;
       return;
     }

     if (user) {
       const fullName = `${user.first_name} ${user.last_name}`;
       desktopSlot.innerHTML = `
         <a class="nav-profile" href="players.html?slug=${user.slug}">
           <span class="avatar">${initials(fullName)}</span>
           ${user.first_name}
         </a>
       `;
       mobileSlot.innerHTML = `<a href="players.html?slug=${user.slug}">My profile</a>`;
     } else {
       desktopSlot.innerHTML = `
         <a class="nav-signin" href="signin.html">Sign in</a>
         <a class="nav-signup" href="signup.html">Sign up</a>
       `;
       mobileSlot.innerHTML = `
         <a href="signin.html">Sign in</a>
         <a href="signup.html">Sign up</a>
       `;
     }
   }

   render();
