(() => {
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  const body = document.body;
  const canvas = document.getElementById('cosmos-canvas') || document.querySelector('.starfield');
  if (!canvas || !body) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const state = {
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    pointerX: 0,
    pointerY: 0,
    targetPointerX: 0,
    targetPointerY: 0,
    starsNear: [],
    starsMid: [],
    starsFar: [],
    particles: [],
    nebulae: [],
    config: null,
    reducedMotion: reducedMotionQuery.matches,
    firstFrameDone: false,
    rafId: 0
  };

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getAnimationConfig() {
    const mobile = state.width < 768;
    const compact = state.width < 460;
    const scale = compact ? 0.46 : mobile ? 0.64 : 1;
    return {
      nearStars: Math.max(28, Math.floor(85 * scale)),
      midStars: Math.max(44, Math.floor(120 * scale)),
      farStars: Math.max(58, Math.floor(165 * scale)),
      particles: Math.max(14, Math.floor(36 * scale)),
      nebulae: Math.max(2, Math.floor(4 * (mobile ? 0.75 : 1))),
      speedScale: state.reducedMotion ? 0.16 : 1,
      parallaxScale: state.reducedMotion ? 0.08 : 1,
      pointerSmoothing: state.reducedMotion ? 0.02 : 0.045
    };
  }

  function createStar(depthMin, depthMax, speedMin, speedMax, sizeMin, sizeMax) {
    const config = getAnimationConfig();
    return {
      x: randomBetween(0, state.width),
      y: randomBetween(0, state.height),
      size: randomBetween(sizeMin, sizeMax),
      speed: randomBetween(speedMin, speedMax) * config.speedScale,
      alpha: randomBetween(0.35, 0.95),
      twinkle: randomBetween(0, Math.PI * 2),
      depth: randomBetween(depthMin, depthMax)
    };
  }

  function createParticle() {
    const config = state.config || getAnimationConfig();
    return {
      x: randomBetween(0, state.width),
      y: randomBetween(0, state.height),
      radius: randomBetween(1.2, 2.4),
      alpha: randomBetween(0.08, 0.26),
      alphaBase: randomBetween(0.07, 0.2),
      pulseSpeed: randomBetween(0.00045, 0.001),
      vx: randomBetween(-0.04, 0.04) * config.speedScale,
      vy: randomBetween(-0.08, -0.02) * config.speedScale,
      drift: randomBetween(0, Math.PI * 2)
    };
  }

  function createNebula() {
    const config = state.config || getAnimationConfig();
    const hues = [264, 228, 196];
    return {
      x: randomBetween(0.15, 0.85) * state.width,
      y: randomBetween(0.1, 0.9) * state.height,
      radius: randomBetween(220, 420),
      hue: hues[Math.floor(Math.random() * hues.length)],
      alpha: randomBetween(0.07, 0.14),
      driftX: randomBetween(-0.08, 0.08) * config.speedScale,
      driftY: randomBetween(-0.06, 0.06) * config.speedScale
    };
  }

  function resizeCanvas() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.pointerX = state.width * 0.5;
    state.pointerY = state.height * 0.5;
    state.targetPointerX = state.pointerX;
    state.targetPointerY = state.pointerY;

    const config = getAnimationConfig();
    state.config = config;

    state.starsNear = Array.from({ length: config.nearStars }, () =>
      createStar(0.55, 1, 0.08, 0.22, 0.9, 1.8)
    );
    state.starsMid = Array.from({ length: config.midStars }, () =>
      createStar(0.3, 0.75, 0.05, 0.16, 0.6, 1.35)
    );
    state.starsFar = Array.from({ length: config.farStars }, () =>
      createStar(0.12, 0.45, 0.02, 0.1, 0.35, 1)
    );
    state.particles = Array.from({ length: config.particles }, createParticle);
    state.nebulae = Array.from({ length: config.nebulae }, createNebula);
  }

  function drawNebula(nebula, time, cameraX, cameraY) {
    const config = state.config;
    const mouseParallaxX = ((state.pointerX / Math.max(state.width, 1)) - 0.5) * 24 * config.parallaxScale;
    const mouseParallaxY = ((state.pointerY / Math.max(state.height, 1)) - 0.5) * 18 * config.parallaxScale;
    const driftX = Math.sin(time * 0.00008 + nebula.hue) * 28 * config.speedScale + nebula.driftX * time * 0.01;
    const driftY = Math.cos(time * 0.00006 + nebula.hue) * 22 * config.speedScale + nebula.driftY * time * 0.01;

    const x = nebula.x + driftX + mouseParallaxX * 0.32 + cameraX;
    const y = nebula.y + driftY + mouseParallaxY * 0.32 + cameraY;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, nebula.radius);
    gradient.addColorStop(0, `hsla(${nebula.hue}, 92%, 64%, ${nebula.alpha})`);
    gradient.addColorStop(0.6, `hsla(${nebula.hue}, 85%, 50%, ${nebula.alpha * 0.3})`);
    gradient.addColorStop(1, 'hsla(220, 80%, 10%, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, nebula.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles(time, cameraX, cameraY) {
    const config = state.config;
    const offsetX = ((state.pointerX / Math.max(state.width, 1)) - 0.5) * 6 * config.parallaxScale;
    const offsetY = ((state.pointerY / Math.max(state.height, 1)) - 0.5) * 6 * config.parallaxScale;

    for (let i = 0; i < state.particles.length; i += 1) {
      const particle = state.particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.x += Math.sin(time * 0.0008 + particle.drift) * 0.05 * config.speedScale;

      if (particle.y < -10 || particle.x < -10 || particle.x > state.width + 10) {
        particle.x = randomBetween(0, state.width);
        particle.y = state.height + randomBetween(4, 20);
        particle.drift = randomBetween(0, Math.PI * 2);
      }

      const pulse = 0.55 + Math.sin(time * particle.pulseSpeed + particle.drift) * 0.45;
      ctx.globalAlpha = particle.alphaBase + particle.alpha * pulse;
      ctx.fillStyle = '#7ddfff';
      ctx.beginPath();
      ctx.arc(particle.x + offsetX + cameraX * 0.45, particle.y + offsetY + cameraY * 0.45, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateAndDrawStars(stars, time, depthFactor, cameraX, cameraY) {
    const config = state.config;
    const offsetX = ((state.pointerX / Math.max(state.width, 1)) - 0.5) * depthFactor * config.parallaxScale;
    const offsetY = ((state.pointerY / Math.max(state.height, 1)) - 0.5) * depthFactor * config.parallaxScale;

    for (let i = 0; i < stars.length; i += 1) {
      const star = stars[i];
      star.y += star.speed;
      if (star.y > state.height + 3) {
        star.y = -3;
        star.x = randomBetween(0, state.width);
      }

      const twinkle = 0.72 + Math.sin(time * 0.0014 + star.twinkle) * 0.28;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = '#e8f2ff';
      ctx.beginPath();
      ctx.arc(
        star.x + offsetX * star.depth + cameraX * star.depth,
        star.y + offsetY * star.depth + cameraY * star.depth,
        star.size,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  function renderFrame(time) {
    const config = state.config;
    state.pointerX += (state.targetPointerX - state.pointerX) * config.pointerSmoothing;
    state.pointerY += (state.targetPointerY - state.pointerY) * config.pointerSmoothing;

    const cameraX = Math.sin(time * 0.00012) * 8 * config.parallaxScale;
    const cameraY = Math.cos(time * 0.0001) * 7 * config.parallaxScale;

    ctx.clearRect(0, 0, state.width, state.height);

    for (let i = 0; i < state.nebulae.length; i += 1) {
      drawNebula(state.nebulae[i], time, cameraX, cameraY);
    }

    updateAndDrawStars(state.starsFar, time, 8, cameraX, cameraY);
    updateAndDrawStars(state.starsMid, time, 12, cameraX, cameraY);
    updateAndDrawStars(state.starsNear, time, 16, cameraX, cameraY);
    drawParticles(time, cameraX, cameraY);
    ctx.globalAlpha = 1;
  }

  function markReady() {
    if (state.firstFrameDone) return;
    state.firstFrameDone = true;
    body.classList.add('galaxy-ready');
  }

  function animate(time) {
    renderFrame(time);
    markReady();

    state.rafId = requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;

    if (state.reducedMotion) {
      renderFrame(0);
      markReady();
      return;
    }

    state.rafId = requestAnimationFrame(animate);
  }

  let resizeFrame = 0;
  function onResize() {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeCanvas();
      startAnimation();
    });
  }

  function onReducedMotionChange(event) {
    state.reducedMotion = event.matches;
    resizeCanvas();
    startAnimation();
  }

  window.addEventListener('resize', onResize, { passive: true });
  reducedMotionQuery.addEventListener('change', onReducedMotionChange);
  window.addEventListener(
    'pointermove',
    (event) => {
      if (state.reducedMotion) return;
      state.targetPointerX = event.clientX;
      state.targetPointerY = event.clientY;
    },
    { passive: true }
  );

  resizeCanvas();
  startAnimation();
})();
