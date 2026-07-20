/* ═══════════════════════════════════════════════════════════
   Depends on: data/mock-data.js (fetchCurrentUser)
   TODO BACKEND: fetchCurrentUser currently returns a hardcoded
   mock user/null — see MOCK_IS_AUTHENTICATED in mock-data.js.
   ═══════════════════════════════════════════════════════════ */

   import { fetchCurrentUser } from "../data/mock-data.js";

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
   
     if (user) {
       desktopSlot.innerHTML = `
         <a class="nav-profile" href="players.html?slug=${user.slug}">
           <span class="avatar">${initials(user.full_name)}</span>
           ${user.full_name.split(" ")[0]}
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