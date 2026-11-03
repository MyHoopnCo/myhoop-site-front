/* ═══════════════════════════════════════════════════════════
   Petites briques partagées par les écrans de la ligue :
   dates, bilans, états vides, et les gabarits d'un match.

   Règle : toute valeur venue de l'API passe par esc() avant
   d'entrer dans du HTML, et par encodeURIComponent() dans un lien.
   ═══════════════════════════════════════════════════════════ */

import { esc } from "../utils/escape.js";

export { esc };

/* ── Dates ────────────────────────────────────────────────── */

const DAY = { weekday: "short", month: "short", day: "numeric" };
const TIME = { hour: "numeric", minute: "2-digit" };

export function dayLabel(iso) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-CA", DAY);
}

export function timeLabel(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-CA", TIME);
}

export function longDayLabel(iso) {
  if (!iso) return "Date to be confirmed";
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// Clé de regroupement par journée, calculée dans le fuseau du lecteur :
// deux matchs du même soir se retrouvent sous le même titre.
export function dayKey(iso) {
  if (!iso) return "tbd";
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/* ── Chiffres ─────────────────────────────────────────────── */

// .833 plutôt que 0.833 : c'est la convention des classements de basket.
export function pct(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(3).replace(/^0/, "");
}

export function signed(value) {
  const n = Number(value) || 0;
  return n > 0 ? `+${n}` : String(n);
}

export function gamesBehind(value) {
  const n = Number(value) || 0;
  return n === 0 ? "—" : n.toFixed(1).replace(/\.0$/, "");
}

/* ── États ────────────────────────────────────────────────── */

export function loading(message = "Loading…") {
  return `<div class="lg-state" role="status">${esc(message)}</div>`;
}

export function empty(message) {
  return `<div class="lg-state lg-state-empty">${esc(message)}</div>`;
}

export function failed(err) {
  const message = err?.status === 404
    ? "This season isn't published yet."
    : err?.message || "Something went wrong.";
  return `<div class="lg-state lg-state-error">${esc(message)}</div>`;
}

/* ── Morceaux d'affichage réutilisés ──────────────────────── */

// Pastille de l'équipe : son logo, ou ses initiales sur sa couleur.
export function teamBadge(team, size = "sm") {
  const name = team.team_name || team.name || "";
  const logo = team.logo_url || team.team_a_logo || team.team_b_logo;

  if (logo) {
    return `<img class="lg-badge lg-badge-${esc(size)}" src="${esc(logo)}" alt="" loading="lazy" />`;
  }

  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
  const color = team.primary_color || "#111111";
  return `<span class="lg-badge lg-badge-${esc(size)} lg-badge-text" style="background:${esc(color)}">${esc(initials)}</span>`;
}

export function teamLink(teamId, label, extraClass = "") {
  if (!teamId) return `<span class="lg-team-name ${esc(extraClass)}">${esc(label)}</span>`;
  return `<a class="lg-team-name ${esc(extraClass)}" href="league.html?team=${encodeURIComponent(teamId)}">${esc(label)}</a>`;
}

// Les 5 derniers résultats, le plus récent à gauche (comme sur wnba.com).
export function formPills(last5) {
  if (!last5) return `<span class="lg-muted">—</span>`;
  return [...String(last5)]
    .map((r) => `<span class="lg-pill lg-pill-${r === "W" ? "w" : "l"}">${esc(r)}</span>`)
    .join("");
}

/*
  Une ligne de match.

  Un match à venir montre l'heure et le lieu; un match joué montre le score,
  avec le gagnant en gras. Tant que l'adversaire n'est pas connu, l'API renvoie
  un libellé (« Seed 1 », « Winner R1 ») et il n'y a pas de lien à ouvrir.
*/
export function matchRow(m) {
  const done = m.status === "completed";
  const aWon = done && m.winner_side === "a";
  const bWon = done && m.winner_side === "b";

  const tags = [
    m.result_type === "forfeit" ? `<span class="lg-tag lg-tag-forfeit">Forfeit</span>` : "",
    m.status === "postponed" ? `<span class="lg-tag lg-tag-postponed">Postponed</span>` : "",
    m.result_type === "overtime" ? `<span class="lg-tag">OT</span>` : "",
  ].join("");

  // Les deux équipes l'une sous l'autre, le score à droite : un nom long passe
  // à la ligne au lieu d'être coupé, et le gagnant se repère d'un coup d'œil.
  const side = (id, name, logo, score, won) => `
    <div class="lg-match-row ${won ? "is-winner" : ""}">
      ${teamBadge({ name, logo_url: logo })}
      ${teamLink(id, name || "TBD")}
      <span class="lg-match-score">${score}</span>
    </div>`;

  const place = [m.venue_name, m.court].filter(Boolean).join(" · ");
  const time = timeLabel(m.starts_at);

  return `
    <article class="lg-match ${done ? "is-done" : ""}">
      ${side(m.team_a_id, m.team_a_name, m.team_a_logo, done ? esc(m.score_a) : "", aWon)}
      ${side(m.team_b_id, m.team_b_name, m.team_b_logo, done ? esc(m.score_b) : "", bWon)}
      <div class="lg-match-meta">
        ${!done && time ? `<span class="lg-match-time">${esc(time)}</span>` : ""}
        <span>${esc(place)}</span>
        ${tags}
        ${m.video_url ? `<a class="lg-watch" href="${esc(m.video_url)}" target="_blank" rel="noopener">Watch</a>` : ""}
      </div>
    </article>
  `;
}

// Regroupe des matchs par journée, en gardant l'ordre reçu de l'API.
export function groupByDay(matches) {
  const groups = new Map();
  for (const m of matches) {
    const key = dayKey(m.starts_at);
    if (!groups.has(key)) groups.set(key, { label: longDayLabel(m.starts_at), matches: [] });
    groups.get(key).matches.push(m);
  }
  return [...groups.values()];
}
