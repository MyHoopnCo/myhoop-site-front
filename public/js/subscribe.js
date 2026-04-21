const googleSheetsURL =
  "https://script.google.com/macros/s/AKfycbwXBm62VWog2tXTAidiv_hWTtTHTHbfeoBsnKEcB-NFCyBbbQJWbWWbbeGuCVAyxHYN/exec";

const ctaForm = document.getElementById("ctaSubscribe");
const message = document.getElementById("subConfirmation");

ctaForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();

  fetch(googleSheetsURL, {
    method: "POST",
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.result === "success") {
        message.innerText = "You're on the list!";
        message.style.color = "green";
      } else if (data.result === "duplicate") {
        message.innerText = "You're already on the list.";
        message.style.color = "orange";
      } else {
        message.innerText = "Something went wrong.";
        message.style.color = "red";
      }
      ctaForm.reset();
    })
    .catch(() => {
      message.innerText = "Server error. Try again.";
      message.style.color = "red";
    });
});
