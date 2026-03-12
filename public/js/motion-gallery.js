(() => {
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const HOME_GALLERY_MANIFEST_URL = "/assets/manifests/home-gallery.json";

  function initRevealElements() {
    const revealElements = Array.from(document.querySelectorAll(".reveal"));
    if (!revealElements.length) return;

    if (!("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.2 },
    );

    revealElements.forEach((element) => observer.observe(element));
  }

  async function loadSlidesFromManifest(fallbackSlides) {
    try {
      const response = await fetch(HOME_GALLERY_MANIFEST_URL, {
        cache: "no-store",
      });
      if (!response.ok) return fallbackSlides;

      const payload = await response.json();
      if (!payload || !Array.isArray(payload.slides)) return fallbackSlides;

      const normalized = payload.slides
        .map((slide) => ({
          src: typeof slide.src === "string" ? slide.src.trim() : "",
          alt:
            typeof slide.alt === "string"
              ? slide.alt.trim()
              : "EndCosmos image",
          caption:
            typeof slide.caption === "string" && slide.caption.trim()
              ? slide.caption.trim()
              : "EndCosmos",
          subcaption:
            typeof slide.subcaption === "string" && slide.subcaption.trim()
              ? slide.subcaption.trim()
              : "",
        }))
        .filter((slide) => slide.src.length > 0);

      return normalized.length ? normalized : fallbackSlides;
    } catch {
      return fallbackSlides;
    }
  }

  function collectFallbackSlides(track) {
    return Array.from(track.querySelectorAll("[data-gallery-slide]"))
      .map((slide) => {
        const img = slide.querySelector("img");
        const caption = slide.querySelector("figcaption");
        if (!img || !img.getAttribute("src")) return null;
        return {
          src: img.getAttribute("src") || "",
          alt: img.getAttribute("alt") || "EndCosmos image",
          caption: caption ? caption.textContent || "EndCosmos" : "EndCosmos",
          subcaption: "",
        };
      })
      .filter(Boolean);
  }

  function renderSlides(track, slidesData) {
    track.innerHTML = "";
    slidesData.forEach((slide, index) => {
      const figure = document.createElement("figure");
      figure.className = "motion-slide";
      figure.setAttribute("data-gallery-slide", "");
      figure.id = `gallery-slide-${index + 1}`;

      const image = document.createElement("img");
      image.loading = index === 0 ? "eager" : "lazy";
      image.decoding = "async";
      image.src = slide.src;
      image.alt = slide.alt;

      const caption = document.createElement("figcaption");
      const captionTitle = document.createElement("span");
      captionTitle.className = "motion-caption-title";
      captionTitle.textContent = slide.caption;

      const captionMeta = document.createElement("span");
      captionMeta.className = "motion-caption-meta";
      captionMeta.textContent = slide.subcaption || slide.alt;

      caption.appendChild(captionTitle);
      caption.appendChild(captionMeta);

      figure.appendChild(image);
      figure.appendChild(caption);
      track.appendChild(figure);
    });
  }

  async function initMotionGallery() {
    const gallery = document.querySelector("[data-motion-gallery]");
    if (!gallery) return;

    const viewport = gallery.querySelector(".motion-gallery-viewport");
    const track = gallery.querySelector("[data-gallery-track]");
    const prevButton = gallery.querySelector("[data-gallery-prev]");
    const nextButton = gallery.querySelector("[data-gallery-next]");
    const dotsContainer = gallery.querySelector("[data-gallery-dots]");
    if (!viewport || !track || !dotsContainer) return;

    const fallbackSlides = collectFallbackSlides(track);
    const slidesData = await loadSlidesFromManifest(fallbackSlides);
    renderSlides(track, slidesData);

    const slides = Array.from(gallery.querySelectorAll("[data-gallery-slide]"));
    if (slides.length <= 1) return;

    let activeIndex = 0;
    let autoplayId = 0;
    let paused = false;
    let touchStartX = 0;
    let touchStartY = 0;
    const totalSlides = slides.length;

    dotsContainer.innerHTML = "";
    slides.forEach((slide, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "motion-gallery-dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Go to image ${index + 1}`);
      dot.setAttribute("aria-controls", slide.id);
      dot.dataset.index = String(index);
      dotsContainer.appendChild(dot);
    });

    const dots = Array.from(
      dotsContainer.querySelectorAll(".motion-gallery-dot"),
    );

    function updateUI() {
      track.style.transform = `translateX(-${activeIndex * 100}%)`;
      gallery.setAttribute(
        "aria-label",
        `Cosmic scenes in motion (${activeIndex + 1}/${totalSlides})`,
      );

      dots.forEach((dot, index) => {
        const isActive = index === activeIndex;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", isActive ? "true" : "false");
        dot.tabIndex = isActive ? 0 : -1;
      });
    }

    function moveTo(index) {
      activeIndex = (index + totalSlides) % totalSlides;
      updateUI();
    }

    function stopAutoplay() {
      if (!autoplayId) return;
      window.clearInterval(autoplayId);
      autoplayId = 0;
    }

    function startAutoplay() {
      stopAutoplay();
      if (paused || reducedMotionQuery.matches) return;
      autoplayId = window.setInterval(() => moveTo(activeIndex + 1), 4800);
    }

    function restartAutoplay() {
      startAutoplay();
    }

    if (prevButton) {
      prevButton.addEventListener("click", () => {
        moveTo(activeIndex - 1);
        restartAutoplay();
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        moveTo(activeIndex + 1);
        restartAutoplay();
      });
    }

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const target = Number(dot.dataset.index || 0);
        moveTo(target);
        restartAutoplay();
      });
    });

    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveTo(activeIndex - 1);
        restartAutoplay();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveTo(activeIndex + 1);
        restartAutoplay();
      }
    });

    gallery.addEventListener("mouseenter", () => {
      paused = true;
      stopAutoplay();
    });

    gallery.addEventListener("mouseleave", () => {
      paused = false;
      startAutoplay();
    });

    gallery.addEventListener("focusin", () => {
      paused = true;
      stopAutoplay();
    });

    gallery.addEventListener("focusout", () => {
      paused = false;
      startAutoplay();
    });

    viewport.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      },
      { passive: true },
    );

    viewport.addEventListener(
      "touchend",
      (event) => {
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY))
          return;

        if (deltaX < 0) {
          moveTo(activeIndex + 1);
        } else {
          moveTo(activeIndex - 1);
        }
        restartAutoplay();
      },
      { passive: true },
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    reducedMotionQuery.addEventListener("change", startAutoplay);

    updateUI();
    startAutoplay();
  }

  initRevealElements();
  initMotionGallery();
})();
