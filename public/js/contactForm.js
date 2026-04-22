document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("ctaContact");
  const button = form.querySelector("button");

  // Create confirmation message container
  const confirmation = document.createElement("div");
  confirmation.classList.add("contact-confirmation");
  form.appendChild(confirmation);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    confirmation.textContent = "";
    confirmation.classList.remove("success", "error");

    try {
      button.disabled = true;
      button.textContent = "Sending...";

      await emailjs.sendForm(
        "service_wgjhcpq",  
        "template_f5hkp87", 
        form,
        "BvRPgNERoAaK1nVrK"    
      );

      confirmation.textContent = "Message sent successfully! We'll be in touch.";
      confirmation.classList.add("success");

      form.reset();
    } catch (error) {
      console.error("EmailJS Error:", error);
      confirmation.textContent = "Something went wrong. Please try again.";
      confirmation.classList.add("error");
    } finally {
      button.disabled = false;
      button.textContent = "Send Message";
    }
  });
});