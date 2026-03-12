(() => {
  const SENIOR_USER = "VIVI";
  const SENIOR_VARIABLES = [
    {
      key: "UNKTIME",
      title: "Unknown Time",
      description:
        "Investigar sin reloj absoluto: observar el proceso antes de forzar conclusiones.",
    },
    {
      key: "PSI-ABSTRACT",
      title: "Abstract Psychology",
      description:
        "Modelar intención y conducta como señales emergentes en capas.",
    },
    {
      key: "ETHOS-RIGOR",
      title: "Ethos Rigor",
      description: "Diseñar con disciplina verificable y decisiones trazables.",
    },
    {
      key: "NARRATIVE-GRAVITY",
      title: "Narrative Gravity",
      description: "Cada sistema comunica propósito, no solo funcionalidad.",
    },
    {
      key: "LIFE-SIGNAL",
      title: "Life Signal",
      description: "Priorizar impacto humano real sobre ruido y volumen.",
    },
  ];

  const body = document.body;
  if (!body) {
    return;
  }

  body.classList.add("mode-senior");

  if (document.getElementById("senior-philosophy-panel")) {
    return;
  }

  const panel = document.createElement("aside");
  panel.id = "senior-philosophy-panel";
  panel.className = "senior-panel";

  panel.innerHTML = `
    <p class="senior-panel-label">Senior Profile · ${SENIOR_USER}</p>
    <h2>Filosofía Operativa</h2>
    <p class="senior-panel-lead">Marco de investigación de vida, psicología abstracta y ejecución rigurosa.</p>
    <ol>
      ${SENIOR_VARIABLES.map((v) => `<li><strong>${v.key}</strong> — ${v.title}</li>`).join("")}
    </ol>
  `;

  body.appendChild(panel);
})();
