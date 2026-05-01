// NAV : HAMBURGER

const hamburger     = document.getElementById("hamburger");
const mobileMenu    = document.getElementById("mobileMenu");
const mobileOverlay = document.getElementById("mobileOverlay");
const mobileClose   = document.getElementById("mobileClose");

function openMenu(){
  mobileMenu.classList.add("open");
  mobileOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeMenu(){
  mobileMenu.classList.remove("open");
  mobileOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

hamburger.addEventListener("click", openMenu);
mobileClose.addEventListener("click", closeMenu);
mobileOverlay.addEventListener("click", closeMenu);