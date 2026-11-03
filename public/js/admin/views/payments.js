import * as api from "../api.js";
import { esc, loading, errorBox, emptyRow, run, toast } from "../ui.js";

/*
  Les e-Transfers à vérifier.

  La liste vient de la vue `admin_pending_payments` : elle contient aussi les
  personnes inscrites SANS COMPTE. L'ancienne requête les faisait disparaître,
  parce qu'elle cherchait le nom dans la table des joueurs.

  Confirmer un paiement confirme aussi l'inscription (la base s'en charge),
  d'où l'avertissement avant : c'est un geste qu'on ne défait pas ici.
*/

export async function render(root) {
  root.innerHTML = loading("Loading payments…");

  async function draw() {
    const tbody = root.querySelector("#adm-pay-body");
    const payments = await api.fetchPendingPayments();

    if (payments.length === 0) {
      tbody.innerHTML = emptyRow(6, "Nothing to confirm right now.");
      return;
    }

    tbody.innerHTML = payments.map((p) => `
      <tr data-payment="${esc(p.payment_id)}">
        <td>
          ${esc(p.first_name)} ${esc(p.last_name)}
          ${p.player_id ? "" : `<span class="adm-pill">No account</span>`}
          <br /><small class="adm-muted">${esc(p.email || "—")}</small>
        </td>
        <td>${esc(p.tournament_name)}</td>
        <td class="adm-amount">$${esc(p.amount)}</td>
        <td>${esc(p.transfer_sender_name) || `<span class="adm-muted">not given</span>`}</td>
        <td>${esc(p.method)}</td>
        <td><button class="adm-btn adm-btn-good" data-confirm>Confirm</button></td>
      </tr>`).join("");
  }

  try {
    root.innerHTML = `
      <section class="adm-section">
        <h2 class="adm-section-title">Payments to confirm</h2>
        <p class="adm-section-text">
          Check the transfer actually arrived in the bank account — match the sender name and the
          amount — then confirm. Confirming also moves the registration to confirmed.
        </p>
        <p class="adm-toast" id="adm-pay-toast"></p>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr><th>Who</th><th>Tournament</th><th>Amount</th><th>Sender name (declared)</th><th>Method</th><th></th></tr>
            </thead>
            <tbody id="adm-pay-body"></tbody>
          </table>
        </div>
      </section>`;

    await draw();

    root.querySelector("#adm-pay-body").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-confirm]");
      if (!btn) return;

      const row = btn.closest("tr");
      const name = row.querySelector("td").textContent.trim().split("\n")[0];
      if (!window.confirm(`Confirm the payment from ${name}? This also confirms their registration.`)) return;

      await run(btn, "adm-pay-toast", {
        pending: "Confirming…",
        done: "Payment confirmed — registration updated.",
        action: () => api.confirmPayment(row.dataset.payment),
        after: draw,
      }).catch(() => {});
    });
  } catch (err) {
    root.innerHTML = errorBox(err);
  }
}
