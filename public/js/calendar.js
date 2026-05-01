// CALENDAR SETTINGS

const TYPE_COLORS = { league:"#E5A623", tourney:"#C75B2A", pickup:"#2F6F5E", allstar:"#555" };
const TYPE_LABELS = { league:"League", tourney:"Tournament", pickup:"Pickup / Open Gym", allstar:"All-Star / Special" };
const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

const today = new Date();
let currentCity="edmonton", currentYear=today.getFullYear(), currentMonth=today.getMonth();

function pad(n){ return String(n).padStart(2,"0"); }

function eventsForDate(ds){
return EVENTS.filter(e=>e.date===ds&&(e.city===currentCity||e.city==="both"));
}

function upcomingEvents(){
const today=new Date(); today.setHours(0,0,0,0);
return EVENTS
    .filter(e=>{ const d=new Date(e.date+"T00:00:00"); return d>=today&&(e.city===currentCity||e.city==="both"); })
    .sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,8);
}

function renderCal(){
document.getElementById("monthName").textContent=MONTHS[currentMonth];
document.getElementById("yearName").textContent=currentYear;
const grid=document.getElementById("calGrid");
const first=new Date(currentYear,currentMonth,1).getDay();
const dim=new Date(currentYear,currentMonth+1,0).getDate();
const dprev=new Date(currentYear,currentMonth,0).getDate();
const today=new Date();
grid.innerHTML="";
const total=Math.ceil((first+dim)/7)*7;
for(let i=0;i<total;i++){
    if(i>0&&i%7===0){ const sep=document.createElement("div"); sep.className="cal-week-sep"; grid.appendChild(sep); }
    let day,dateObj,other=false;
    if(i<first){          day=dprev-first+i+1;  dateObj=new Date(currentYear,currentMonth-1,day); other=true; }
    else if(i>=first+dim){ day=i-first-dim+1;   dateObj=new Date(currentYear,currentMonth+1,day); other=true; }
    else{                  day=i-first+1;        dateObj=new Date(currentYear,currentMonth,day); }
    const ds=`${dateObj.getFullYear()}-${pad(dateObj.getMonth()+1)}-${pad(dateObj.getDate())}`;
    const evs=other?[]:eventsForDate(ds);
    const isToday=!other&&dateObj.getFullYear()===today.getFullYear()&&dateObj.getMonth()===today.getMonth()&&dateObj.getDate()===today.getDate();
    const cell=document.createElement("div"); cell.className="cal-cell";
    const circ=document.createElement("div"); circ.className="cal-date-circle"; circ.textContent=day;
    if(other)          circ.classList.add("c-other");
    else if(evs.length){ circ.classList.add(`c-${evs[0].type}`,"clickable"); circ.addEventListener("click",()=>openModal(evs[0])); }
    else if(isToday)   circ.classList.add("c-today");
    else               circ.classList.add("c-default");
    cell.appendChild(circ);
    if(evs.length){
    const lbl=document.createElement("div"); lbl.className="cal-ev-lbl";
    lbl.textContent=evs.length===1?TYPE_LABELS[evs[0].type]:`${evs.length} Events`;
    lbl.addEventListener("click",()=>openModal(evs[0]));
    cell.appendChild(lbl);
    }
    grid.appendChild(cell);
}
}

function renderUpcoming(){
const list=document.getElementById("upcomingList");
document.getElementById("upcomingCity").textContent=currentCity==="edmonton"?"Edmonton, AB":"Calgary, AB";
const evs=upcomingEvents(); list.innerHTML="";
if(!evs.length){ list.innerHTML=`<div style="padding:2rem 0;font-family:var(--font-body);color:#888;font-size:0.9rem;">No upcoming events — check back soon.</div>`; return; }
evs.forEach(ev=>{
    const d=new Date(ev.date+"T00:00:00");
    const row=document.createElement("div"); row.className="ev-row";
    row.innerHTML=`
    <div><div class="ev-day-num">${d.getDate()}</div><div class="ev-day-mon">${d.toLocaleString("en-CA",{month:"short"}).toUpperCase()}</div></div>
    <div class="ev-row-info"><h4>${ev.title}</h4><p>${ev.time} — ${ev.location}</p></div>
    <span class="ev-badge ${ev.type}">${TYPE_LABELS[ev.type]}</span>`;
    row.addEventListener("click",()=>openModal(ev));
    list.appendChild(row);
});
}

function openModal(ev){
const d=new Date(ev.date+"T00:00:00");
const fmt=d.toLocaleDateString("en-CA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const pill=document.getElementById("modalPill");
pill.textContent=TYPE_LABELS[ev.type]; pill.style.background=TYPE_COLORS[ev.type];
document.getElementById("modalTitle").textContent=ev.title;
document.getElementById("modalMeta").textContent=`${fmt} · ${ev.time} · ${ev.location}`;
document.getElementById("modalDesc").textContent=ev.desc;
document.getElementById("modalContact").textContent=ev.contact;
document.getElementById("evOverlay").classList.add("open");
}

document.getElementById("modalClose").addEventListener("click",()=>document.getElementById("evOverlay").classList.remove("open"));
document.getElementById("evOverlay").addEventListener("click",e=>{ if(e.target===document.getElementById("evOverlay")) document.getElementById("evOverlay").classList.remove("open"); });
document.getElementById("prevMonth").addEventListener("click",()=>{ currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} renderCal(); });
document.getElementById("nextMonth").addEventListener("click",()=>{ currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} renderCal(); });
document.querySelectorAll(".city-btn").forEach(btn=>btn.addEventListener("click",()=>{
currentCity=btn.dataset.city;
document.querySelectorAll(".city-btn").forEach(b=>b.classList.remove("active"));
btn.classList.add("active");
renderCal(); renderUpcoming();
}));

renderCal(); renderUpcoming();