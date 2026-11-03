import * as api from "../api.js";
import { esc, loading, errorBox, emptyRow, field, openModal, run } from "../ui.js";

/*
  Les comptes joueurs.

  « Désactiver » ne supprime rien : la base garde la fiche et bascule un
  interrupteur. Les statistiques d'un joueur désactivé restent, mais il
  disparaît des pages publiques.

  « Public » est le choix du joueur, pas celui de l'admin : la colonne le
  montre, elle ne le change pas. Tant qu'il ne l'a pas fait, il n'a pas de
  fiche publique, même si son nom figure dans une équipe.
*/

async function newPlayer(after) {
  openModal("Add a player", `
    <p class="adm-help">
      For a league player who doesn't have a MyHoop account: this creates the profile their
      stats hang on. It is not public until they ask for it.
    </p>
    <div class="adm-grid-2">
      ${field("first_name", "First name", { required: true })}
      ${field("last_name", "Last name", { required: true })}
      ${field("email", "Email", { type: "email", required: true })}
      ${field("phone", "Phone")}
      ${field("city", "City", { value: "Edmonton" })}
      ${field("age", "Age", { type: "number", min: 5 })}
      ${field("position", "Position", {
        options: ["", "Guard", "Forward", "Center"].map((p) => ({ value: p, label: p || "—" })),
      })}
      ${field("height_cm", "Height (cm)", { type: "number", min: 100 })}
    </div>`,
    {
      submitLabel: "Add player",
      wide: true,
      confirmOn: "adm-player-toast",
      confirmText: "Player added.",
      onSubmit: async (data) => {
        await api.createPlayer(data);
        await after();
      },
    });
}

export async function render(root) {
  root.innerHTML = loading("Loading players…");

  try {
    root.innerHTML = `
      <section class="adm-section">
        <div class="adm-section-head">
          <div>
            <h2 class="adm-section-title">Players</h2>
            <p class="adm-section-text">
              Deactivating hides a profile everywhere and blocks the account. Nothing is deleted.
            </p>
          </div>
          <div class="adm-section-actions">
            <input id="adm-player-search" class="adm-select" type="search" placeholder="Search a name or email" />
            <button class="adm-btn adm-btn-primary" id="adm-new-player">Add a player</button>
          </div>
        </div>
        <p class="adm-toast" id="adm-player-toast"></p>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>City</th><th>Public profile</th><th>Account</th><th></th></tr>
            </thead>
            <tbody id="adm-player-body"></tbody>
          </table>
        </div>
      </section>`;

    const tbody = document.getElementById("adm-player-body");
    const search = document.getElementById("adm-player-search");
    let all = [];

    function paint() {
      const q = search.value.trim().toLowerCase();
      const rows = q
        ? all.filter((p) => `${p.first_name} ${p.last_name} ${p.email || ""}`.toLowerCase().includes(q))
        : all;

      if (rows.length === 0) {
        tbody.innerHTML = emptyRow(6, q ? "Nobody matches that search." : "No players yet.");
        return;
      }

      tbody.innerHTML = rows.map((p) => `
        <tr class="${p.is_active ? "" : "is-inactive"}" data-player="${esc(p.player_id)}">
          <td>${esc(p.first_name)} ${esc(p.last_name)}</td>
          <td>${esc(p.email || "—")}</td>
          <td>${esc(p.city || "—")}</td>
          <td>${p.is_public
            ? `<span class="adm-pill adm-pill-good">Public</span>`
            : `<span class="adm-pill">Private</span>`}</td>
          <td>${p.is_active
            ? `<span class="adm-pill adm-pill-good">Active</span>`
            : `<span class="adm-pill adm-pill-bad">Deactivated</span>`}</td>
          <td>
            <button class="adm-btn ${p.is_active ? "adm-btn-bad" : "adm-btn-good"} adm-btn-sm"
                    data-toggle="${p.is_active ? "off" : "on"}">
              ${p.is_active ? "Deactivate" : "Reactivate"}
            </button>
          </td>
        </tr>`).join("");
    }

    async function draw() {
      tbody.innerHTML = `<tr><td colspan="6" class="adm-empty">Loading…</td></tr>`;
      all = await api.fetchPlayersAdmin();
      paint();
    }

    search.addEventListener("input", paint);
    document.getElementById("adm-new-player").addEventListener("click", () => newPlayer(draw));

    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-toggle]");
      if (!btn) return;

      const row = btn.closest("tr");
      const off = btn.dataset.toggle === "off";
      const name = row.querySelector("td").textContent.trim();

      if (off && !window.confirm(`Deactivate ${name}? They disappear from the public site and can't sign in.`)) return;

      await run(btn, "adm-player-toast", {
        pending: off ? "Deactivating…" : "Reactivating…",
        done: off ? "Account deactivated." : "Account reactivated.",
        action: () => (off ? api.deactivatePlayer(row.dataset.player) : api.reactivatePlayer(row.dataset.player)),
        after: draw,
      }).catch(() => {});
    });

    await draw();
  } catch (err) {
    root.innerHTML = errorBox(err);
  }
}
