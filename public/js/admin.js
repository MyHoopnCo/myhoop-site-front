/* ═══════════════════════════════════════════════════════════
   Simple v1 admin dashboard.
   Gates on role === 'admin' via GET /api/auth/me, then lists all
   players with a toggle to deactivate/reactivate their account
   (soft-delete only — the backend never runs a real DELETE FROM
   players, see player.repository.js).
 
   Depends on: data/api.js (fetchCurrentUser, fetchPlayers,
   deactivatePlayer, reactivatePlayer)
   ═══════════════════════════════════════════════════════════ */
 
   import {
    fetchCurrentUser,
    fetchPlayers,
    deactivatePlayer,
    reactivatePlayer,
  } from "./data/api.js";
   
  const wrapper = document.getElementById("admin-wrapper");
   
  function gateMarkup() {
    const redirect = encodeURIComponent(window.location.pathname);
    return `
      <div class="admin-gate">
        <p>This page is for admins only.</p>
        <p><a href="signin.html?redirect=${redirect}">Sign in as admin</a> to continue.</p>
      </div>
    `;
  }
   
  function rowMarkup(player) {
    const isActive = player.is_active;
    return `
      <tr class="${isActive ? "" : "inactive"}" data-player-id="${player.player_id}">
        <td>${player.first_name} ${player.last_name}</td>
        <td>${player.email}</td>
        <td>${player.city || "—"}</td>
        <td><span class="admin-status-pill ${isActive ? "active" : "inactive"}">${isActive ? "Active" : "Inactive"}</span></td>
        <td>
          ${isActive
            ? `<button class="admin-action-btn deactivate" data-action="deactivate">Deactivate</button>`
            : `<button class="admin-action-btn reactivate" data-action="reactivate">Reactivate</button>`
          }
        </td>
      </tr>
    `;
  }
   
  async function renderDashboard() {
    wrapper.innerHTML = `
      <h1 class="admin-title">Admin Dashboard</h1>
      <p class="admin-sub">Manage player accounts.</p>
      <p class="admin-toast" id="admin-toast"></p>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>City</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="admin-table-body"></tbody>
        </table>
      </div>
    `;
   
    await refreshTable();
   
    document.getElementById("admin-table-body").addEventListener("click", async (e) => {
      const btn = e.target.closest(".admin-action-btn");
      if (!btn) return;
   
      const row = btn.closest("tr");
      const playerId = row.dataset.playerId;
      const action = btn.dataset.action;
      const toast = document.getElementById("admin-toast");
   
      btn.disabled = true;
      toast.textContent = "Updating...";
      toast.dataset.state = "pending";
   
      try {
        if (action === "deactivate") {
          await deactivatePlayer(playerId);
          toast.textContent = "Account deactivated.";
        } else {
          await reactivatePlayer(playerId);
          toast.textContent = "Account reactivated.";
        }
        toast.dataset.state = "success";
        await refreshTable();
      } catch (err) {
        toast.textContent = err.message || "Something went wrong.";
        toast.dataset.state = "error";
        btn.disabled = false;
      }
    });
  }
   
  async function refreshTable() {
    const players = await fetchPlayers();
    const tbody = document.getElementById("admin-table-body");
   
    if (players.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">No players yet.</td></tr>`;
      return;
    }
   
    tbody.innerHTML = players.map(rowMarkup).join("");
  }
   
  async function init() {
    const user = await fetchCurrentUser();
   
    if (!user || user.role !== "admin") {
      wrapper.innerHTML = gateMarkup();
      return;
    }
   
    renderDashboard();
  }
   
  init();