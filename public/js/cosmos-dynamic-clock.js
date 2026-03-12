(() => {
  const CLOCK_ID = "ec-cosmos-clock";
  const STYLE_ID = "ec-cosmos-clock-style";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${CLOCK_ID} {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 9999;
        min-width: 190px;
        border-radius: 12px;
        border: 1px solid rgba(117, 205, 255, 0.35);
        background: linear-gradient(135deg, rgba(10,18,42,.86), rgba(20,24,55,.82));
        box-shadow: 0 0 0 1px rgba(117,205,255,.16), 0 0 18px rgba(56,189,248,.22);
        color: #eaf6ff;
        font-family: Inter, Segoe UI, system-ui, sans-serif;
        backdrop-filter: blur(6px);
        padding: 10px 12px;
        line-height: 1.25;
        pointer-events: none;
      }

      #${CLOCK_ID} .ec-time {
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      #${CLOCK_ID} .ec-date {
        margin-top: 2px;
        font-size: .76rem;
        opacity: .88;
      }

      #${CLOCK_ID} .ec-phase {
        margin-top: 4px;
        font-size: .72rem;
        color: #9fe8ff;
      }

      img.ec-cosmos-flow {
        transition: transform 220ms ease-out, filter 220ms ease-out;
        will-change: transform, filter;
      }

      img.ec-cosmos-flow.ec-active {
        filter: saturate(1.15) contrast(1.06) brightness(1.02);
      }

      @keyframes ecPulseFlow {
        0%, 100% { transform: scale(1.01); }
        50% { transform: scale(1.03); }
      }

      img.ec-cosmos-flow.ec-breathing {
        animation: ecPulseFlow 6s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  function getCosmicPhase(date) {
    const hour = date.getHours();
    if (hour < 6) return "Fase Noctis ∞";
    if (hour < 12) return "Fase Aurora Stellar";
    if (hour < 18) return "Fase Nexus Activa";
    return "Fase Eclipse Arcana";
  }

  function mountClock() {
    let clock = document.getElementById(CLOCK_ID);
    if (clock) return clock;

    clock = document.createElement("aside");
    clock.id = CLOCK_ID;
    clock.setAttribute("aria-live", "polite");
    clock.innerHTML = `
      <div class="ec-time">--:--:--</div>
      <div class="ec-date">--</div>
      <div class="ec-phase">Fase --</div>
    `;
    document.body.appendChild(clock);
    return clock;
  }

  function updateClock(clock) {
    const now = new Date();
    const time = now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const date = now.toLocaleDateString("es-ES", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

    clock.querySelector(".ec-time").textContent = time;
    clock.querySelector(".ec-date").textContent = date;
    clock.querySelector(".ec-phase").textContent = getCosmicPhase(now);
  }

  function activateImageFlow() {
    const images = Array.from(document.querySelectorAll("img"));
    if (!images.length) return;

    images.forEach((img, index) => {
      img.classList.add("ec-cosmos-flow");
      if (index % 2 === 0) img.classList.add("ec-breathing");
    });

    document.addEventListener(
      "mousemove",
      (event) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (event.clientX - cx) / cx;
        const dy = (event.clientY - cy) / cy;

        images.forEach((img, index) => {
          const speed = 1 + (index % 5) * 0.25;
          const x = -(dx * 3.2 * speed);
          const y = -(dy * 2.4 * speed);
          img.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          img.classList.add("ec-active");
        });
      },
      { passive: true },
    );

    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        window.requestAnimationFrame(() => {
          const progress = Math.min(1, Math.max(0, window.scrollY / 1200));
          images.forEach((img, index) => {
            const depth = 1 + (index % 4) * 0.08;
            img.style.filter = `saturate(${1.02 + progress * 0.2}) contrast(${1.01 + progress * 0.1}) brightness(${1 + progress * 0.05})`;
            img.style.transform += ` scale(${depth})`;
          });
          ticking = false;
        });
        ticking = true;
      },
      { passive: true },
    );
  }

  function boot() {
    injectStyles();
    const clock = mountClock();
    updateClock(clock);
    setInterval(() => updateClock(clock), 1000);
    activateImageFlow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
