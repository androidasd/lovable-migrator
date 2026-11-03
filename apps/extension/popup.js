document.getElementById("open")?.addEventListener("click", () => {
  const hint = document.querySelector(".hint");
  if (hint) hint.textContent = "Scanner local disponível no pacote do projeto.";
});
