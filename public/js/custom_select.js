/* ═══════════════════════════════════════════════════════════
   Small vanilla-JS "custom select": a scrollable list of clickable
   options instead of free-text typing (no typos possible)
   ═══════════════════════════════════════════════════════════ */
 
   const select = document.getElementById("school-select");
   const trigger = document.getElementById("school-select-trigger");
   const label = document.getElementById("school-select-label");
   const list = document.getElementById("school-select-list");
   const hiddenInput = document.getElementById("signup-school");
    
   trigger.addEventListener("click", () => {
     select.classList.toggle("open");
   });
    
   list.addEventListener("click", (e) => {
     const option = e.target.closest("li");
     if (!option) return;
    
     list.querySelectorAll("li").forEach((li) => li.classList.remove("selected"));
     option.classList.add("selected");
    
     label.textContent = option.textContent;
     hiddenInput.value = option.dataset.value;
     select.classList.remove("open");
   });
    
   document.addEventListener("click", (e) => {
     if (!select.contains(e.target)) {
       select.classList.remove("open");
     }
   });