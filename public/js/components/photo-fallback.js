/* ═══════════════════════════════════════════════════════════
   Replaces a community photo that fails to load with a basketball
   placeholder. Replaces the old inline onerror="..." attributes on
   index.html, which a Content-Security-Policy would block.
   Mark an <img> with the data-photo-fallback attribute to use it.
   ═══════════════════════════════════════════════════════════ */

   document.querySelectorAll("img[data-photo-fallback]").forEach((img) => {
     const showPlaceholder = () => {
       img.parentElement.innerHTML = `<div class="photo-placeholder"><i class="fa-solid fa-basketball"></i></div>`;
     };

     img.addEventListener("error", showPlaceholder, { once: true });
     // The error may already have fired before this script ran.
     if (img.complete && img.naturalWidth === 0) showPlaceholder();
   });
