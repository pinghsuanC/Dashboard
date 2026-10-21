"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef } from "react";
import { AppWindow, Bookmark, FileText, SquareTerminal, type LucideIcon } from "lucide-react";

import githubLogo from "@/assets/brand-icons/github.svg";
import notionLogo from "@/assets/brand-icons/notion.svg";
import slackLogo from "@/assets/brand-icons/slack.svg";
import vscodeLogo from "@/assets/brand-icons/vscode.svg";

type ChaosIcon =
  | { name: string; logo: StaticImageData; color?: never }
  | { name: string; Icon: LucideIcon; color: string };

// Start positions (percent of the box) and tilt, used for the first paint, the
// prerendered HTML and reduced motion. Spread so no two tiles start on top of
// each other. Deterministic: Math.random() here would differ between server and
// browser and break hydration.
const ICONS: readonly (ChaosIcon & { x: number; y: number; tilt: number })[] = [
  { name: "Notion", logo: notionLogo, x: 6, y: 8, tilt: -8 },
  { name: "GitHub", logo: githubLogo, x: 34, y: 20, tilt: 6 },
  { name: "Slack", logo: slackLogo, x: 66, y: 6, tilt: 12 },
  { name: "VS Code", logo: vscodeLogo, x: 12, y: 46, tilt: 4 },
  { name: "Browser tabs", Icon: AppWindow, color: "#a5b4fc", x: 48, y: 50, tilt: -10 },
  { name: "Terminal", Icon: SquareTerminal, color: "#67e8f9", x: 78, y: 40, tilt: 9 },
  { name: "Text file", Icon: FileText, color: "#cbd5e1", x: 26, y: 76, tilt: -5 },
  { name: "Bookmark", Icon: Bookmark, color: "#f472b6", x: 64, y: 76, tilt: 14 },
];

const ICON_SIZE = 56;
const EDGE_PAD = 10; // room for a rotated, scaled-up tile's corners
const BASE_SPEED = 40; // px per second while drifting
const MAX_SPEED = 420; // cap after a hard push from the cursor
const REPEL_RADIUS = 110;
const REPEL_FORCE = 2600; // px/s² at the cursor, fading to 0 at the radius
const SPEED_EASE = 1.5; // how fast a pushed icon settles back to drifting
const MAX_STEP = 0.05; // seconds; a long pause doesn't teleport the icons

type Body = { x: number; y: number; vx: number; vy: number; rotation: number; spin: number; phase: number };

/**
 * "Your knowledge today...": tool icons that drift, bounce off the walls,
 * rotate, pulse and move away from the cursor. Positions live in refs and each
 * frame writes `style.transform` directly, so React never re-renders while it
 * runs. The loop pauses while the box is off screen or the tab is hidden, and
 * doesn't run at all with reduced motion.
 */
export const ChaosAnimation = () => {
  const boxRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const box = boxRef.current;
    const els = iconRefs.current;
    if (!box || els.some((el) => !el)) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let bounds = { width: box.clientWidth, height: box.clientHeight };
    let pointer: { x: number; y: number } | null = null;
    let frameId: number | null = null;
    let lastTime = 0;
    let onScreen = true;

    const bodies: Body[] = ICONS.map(({ x, y, tilt }) => {
      const angle = Math.random() * Math.PI * 2;
      return {
        x: (x / 100) * bounds.width,
        y: (y / 100) * bounds.height,
        vx: Math.cos(angle) * BASE_SPEED,
        vy: Math.sin(angle) * BASE_SPEED,
        rotation: tilt,
        spin: Math.random() * 24 - 12, // degrees per second
        phase: Math.random() * Math.PI * 2, // scale pulse offset
      };
    });

    const keepInside = (body: Body) => {
      const maxX = Math.max(EDGE_PAD, bounds.width - ICON_SIZE - EDGE_PAD);
      const maxY = Math.max(EDGE_PAD, bounds.height - ICON_SIZE - EDGE_PAD);
      if (body.x < EDGE_PAD) {
        body.x = EDGE_PAD;
        body.vx = Math.abs(body.vx);
      } else if (body.x > maxX) {
        body.x = maxX;
        body.vx = -Math.abs(body.vx);
      }
      if (body.y < EDGE_PAD) {
        body.y = EDGE_PAD;
        body.vy = Math.abs(body.vy);
      } else if (body.y > maxY) {
        body.y = maxY;
        body.vy = -Math.abs(body.vy);
      }
    };

    // From here on the tiles are placed by transform alone, not the
    // percentage left/top they were prerendered with.
    const render = (time: number) => {
      bodies.forEach((body, i) => {
        const scale = 1 + Math.sin(time / 900 + body.phase) * 0.06;
        const el = els[i]!;
        el.style.left = "0";
        el.style.top = "0";
        el.style.transform =
          `translate(${body.x.toFixed(1)}px, ${body.y.toFixed(1)}px) ` +
          `rotate(${body.rotation.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      });
    };

    const step = (body: Body, dt: number) => {
      // Push away from the cursor, harder the closer it is
      if (pointer) {
        const dx = body.x + ICON_SIZE / 2 - pointer.x;
        const dy = body.y + ICON_SIZE / 2 - pointer.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist < REPEL_RADIUS) {
          const push = (1 - dist / REPEL_RADIUS) * REPEL_FORCE * dt;
          body.vx += (dx / dist) * push;
          body.vy += (dy / dist) * push;
        }
      }

      // Ease the speed back toward a gentle drift, keeping the direction
      const speed = Math.hypot(body.vx, body.vy) || 0.01;
      const target = Math.min(MAX_SPEED, speed + (BASE_SPEED - speed) * Math.min(1, SPEED_EASE * dt));
      body.vx = (body.vx / speed) * target;
      body.vy = (body.vy / speed) * target;

      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.rotation += body.spin * dt;
      keepInside(body);
    };

    const tick = (time: number) => {
      const dt = Math.min(MAX_STEP, (time - lastTime) / 1000);
      lastTime = time;
      bodies.forEach((body) => step(body, dt));
      render(time);
      frameId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frameId !== null || reducedMotion.matches || !onScreen || document.hidden) return;
      lastTime = performance.now();
      frameId = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (frameId === null) return;
      cancelAnimationFrame(frameId);
      frameId = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = box.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerLeave = () => {
      pointer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotionChange = () => (reducedMotion.matches ? stop() : start());

    const resizeObserver = new ResizeObserver(() => {
      bounds = { width: box.clientWidth, height: box.clientHeight };
      bodies.forEach(keepInside);
    });
    const visibleObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    });

    box.addEventListener("pointermove", onPointerMove);
    box.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener("change", onMotionChange);
    resizeObserver.observe(box);
    visibleObserver.observe(box);
    start();

    return () => {
      stop();
      box.removeEventListener("pointermove", onPointerMove);
      box.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotionChange);
      resizeObserver.disconnect();
      visibleObserver.disconnect();
    };
  }, []);

  return (
    <>
      <p className="sr-only">Knowledge scattered across {ICONS.map((icon) => icon.name).join(", ")}.</p>
      <div
        ref={boxRef}
        aria-hidden
        className="bg-card relative h-72 overflow-hidden rounded-xl border border-dashed sm:h-[340px]"
      >
        {ICONS.map((icon, i) => (
          <div
            key={icon.name}
            ref={(el) => {
              iconRefs.current[i] = el;
            }}
            title={icon.name}
            className="bg-background absolute grid size-14 place-items-center rounded-2xl border shadow-lg will-change-transform"
            style={{ left: `${icon.x}%`, top: `${icon.y}%`, transform: `rotate(${icon.tilt}deg)` }}
          >
            {"logo" in icon ? (
              <Image src={icon.logo} alt="" className="size-7" />
            ) : (
              <icon.Icon className="size-7" style={{ color: icon.color }} strokeWidth={1.8} />
            )}
          </div>
        ))}
      </div>
    </>
  );
};
