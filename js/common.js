// Dark mode toggle (remembers choice)
const themeBtn = document.getElementById("themeBtn");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

themeBtn.addEventListener("click", function () {
  document.body.classList.toggle("dark");
  const mode = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("theme", mode);
});

// Highlight the current page in the nav
const page = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".site-header nav a").forEach(function (link) {
  if (link.getAttribute("href") === page) {
    link.classList.add("active");
  }
});