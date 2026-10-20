"use strict";
// Presentation only: authentication is performed by PHP, never by this script.
const toggle = document.getElementById("toggle-password");
const password = document.getElementById("password");
toggle?.addEventListener("click", () => {
  const show = password.type === "password";
  password.type = show ? "text" : "password";
  toggle.textContent = show ? "Hide" : "Show";
  toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
  toggle.setAttribute("aria-pressed", String(show));
});
