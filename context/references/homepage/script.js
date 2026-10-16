// Stashboard homepage prototype

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------- Navbar: more opaque once the page scrolls ----------

  const nav = document.getElementById("nav");
  const updateNav = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
  updateNav();
  window.addEventListener("scroll", updateNav, { passive: true });

  // ---------- Scroll reveal ----------

  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // ---------- Pricing toggle ----------

  const PRICES = {
    monthly: { amount: "$8", period: "/month", note: "Billed monthly. Cancel any time." },
    yearly: { amount: "$72", period: "/year", note: "$6 a month, billed yearly." },
  };

  const billingSwitch = document.getElementById("billing-switch");
  const proAmount = document.getElementById("pro-amount");
  const proPeriod = document.getElementById("pro-period");
  const proNote = document.getElementById("pro-note");
  const billingLabels = document.querySelectorAll("[data-billing-label]");

  const setBilling = (cycle) => {
    const price = PRICES[cycle];
    billingSwitch.setAttribute("aria-checked", String(cycle === "yearly"));
    proAmount.textContent = price.amount;
    proPeriod.textContent = price.period;
    proNote.textContent = price.note;
    billingLabels.forEach((label) =>
      label.classList.toggle("is-active", label.dataset.billingLabel === cycle),
    );
  };

  billingSwitch.addEventListener("click", () => {
    const isYearly = billingSwitch.getAttribute("aria-checked") === "true";
    setBilling(isYearly ? "monthly" : "yearly");
  });
  billingLabels.forEach((label) =>
    label.addEventListener("click", () => setBilling(label.dataset.billingLabel)),
  );

  // ---------- Footer year ----------

  document.getElementById("year").textContent = String(new Date().getFullYear());

  // ---------- Chaos icons ----------

  const box = document.getElementById("chaos-box");
  const iconEls = Array.from(box.querySelectorAll(".chaos-icon"));

  const ICON_SIZE = 56;
  const EDGE_PAD = 10; // room for a rotated, scaled-up tile's corners
  const BASE_SPEED = 40; // px per second while drifting
  const MAX_SPEED = 420; // cap after a hard push from the cursor
  const REPEL_RADIUS = 110;
  const REPEL_FORCE = 2600; // px/s² at the cursor, fading to 0 at the radius
  const SPEED_EASE = 1.5; // how fast a pushed icon settles back to drifting

  let bounds = { width: box.clientWidth, height: box.clientHeight };
  let pointer = null; // { x, y } inside the box, or null when outside
  let frameId = null;
  let lastTime = 0;
  let boxOnScreen = true;

  const rand = (min, max) => min + Math.random() * (max - min);

  // Spread the icons over a 4×2 grid with jitter so they start apart
  const icons = iconEls.map((el, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cellW = bounds.width / 4;
    const cellH = bounds.height / 2;
    const angle = rand(0, Math.PI * 2);
    return {
      el,
      x: Math.max(0, col * cellW + rand(0, Math.max(0, cellW - ICON_SIZE))),
      y: Math.max(0, row * cellH + rand(0, Math.max(0, cellH - ICON_SIZE))),
      vx: Math.cos(angle) * BASE_SPEED,
      vy: Math.sin(angle) * BASE_SPEED,
      rotation: rand(-15, 15),
      spin: rand(-12, 12), // degrees per second
      phase: rand(0, Math.PI * 2), // scale pulse offset
    };
  });

  const render = (icon, time) => {
    const scale = 1 + Math.sin(time / 900 + icon.phase) * 0.06;
    icon.el.style.transform =
      `translate(${icon.x.toFixed(1)}px, ${icon.y.toFixed(1)}px) ` +
      `rotate(${icon.rotation.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
  };

  const keepInside = (icon) => {
    const maxX = Math.max(EDGE_PAD, bounds.width - ICON_SIZE - EDGE_PAD);
    const maxY = Math.max(EDGE_PAD, bounds.height - ICON_SIZE - EDGE_PAD);
    if (icon.x < EDGE_PAD) {
      icon.x = EDGE_PAD;
      icon.vx = Math.abs(icon.vx);
    } else if (icon.x > maxX) {
      icon.x = maxX;
      icon.vx = -Math.abs(icon.vx);
    }
    if (icon.y < EDGE_PAD) {
      icon.y = EDGE_PAD;
      icon.vy = Math.abs(icon.vy);
    } else if (icon.y > maxY) {
      icon.y = maxY;
      icon.vy = -Math.abs(icon.vy);
    }
  };

  const step = (icon, dt) => {
    // Push away from the cursor, harder the closer it is
    if (pointer) {
      const dx = icon.x + ICON_SIZE / 2 - pointer.x;
      const dy = icon.y + ICON_SIZE / 2 - pointer.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      if (dist < REPEL_RADIUS) {
        const push = (1 - dist / REPEL_RADIUS) * REPEL_FORCE * dt;
        icon.vx += (dx / dist) * push;
        icon.vy += (dy / dist) * push;
      }
    }

    // Ease the speed back toward a gentle drift, keeping the direction
    const speed = Math.hypot(icon.vx, icon.vy) || 0.01;
    const target = Math.min(MAX_SPEED, speed + (BASE_SPEED - speed) * Math.min(1, SPEED_EASE * dt));
    icon.vx = (icon.vx / speed) * target;
    icon.vy = (icon.vy / speed) * target;

    icon.x += icon.vx * dt;
    icon.y += icon.vy * dt;
    icon.rotation += icon.spin * dt;
    keepInside(icon);
  };

  const tick = (time) => {
    // Cap the step so a long pause (tab switch, debugger) doesn't teleport icons
    const dt = Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    for (const icon of icons) {
      step(icon, dt);
      render(icon, time);
    }
    frameId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (frameId !== null || reducedMotion.matches || !boxOnScreen || document.hidden) return;
    lastTime = performance.now();
    frameId = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (frameId === null) return;
    cancelAnimationFrame(frameId);
    frameId = null;
  };

  // Still frame: icons at their start positions, used with reduced motion
  const renderStill = () => {
    for (const icon of icons) {
      keepInside(icon);
      render(icon, 0);
    }
  };

  box.addEventListener("pointermove", (event) => {
    const rect = box.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  box.addEventListener("pointerleave", () => {
    pointer = null;
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      bounds = { width: box.clientWidth, height: box.clientHeight };
      if (frameId === null) renderStill();
    }).observe(box);
  }

  // Only animate while the hero is on screen and the tab is visible
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      boxOnScreen = entry.isIntersecting;
      if (boxOnScreen) start();
      else stop();
    }).observe(box);
  }

  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      stop();
      renderStill();
    } else {
      start();
    }
  });

  renderStill();
  start();
})();
