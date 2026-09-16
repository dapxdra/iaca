"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo decorativo: puntos de control que derivan lentamente y se enlazan
 * entre sí con líneas rectas (red de levantamiento/triangulación), más
 * varios "planos" — polígonos irregulares tipo lote de catastro que se
 * van trazando vértice a vértice, como si un plotter los estuviera
 * dibujando: primero el perímetro, luego las diagonales internas
 * (triangulación), marcando cada esquina igual que un mojón de agrimensura
 * (cruz de referencia) según la va alcanzando. Al completarse, el plano se
 * sostiene un momento, se desvanece y arranca de nuevo con un diseño
 * distinto (otra cantidad de lados, otra forma). Todo trazo recto, sin
 * curvas ni rotación: referencia directa al oficio (planos, levantamientos,
 * amojonamiento) sin caer en gradientes/glow "SaaS genérico". Colores de
 * marca (`--accent`/`--border-color`) a alfa bajo.
 *
 * Mejora progresiva: sin JS no se dibuja nada (la sección ya es correcta
 * sin esto). Con `prefers-reduced-motion`, un solo frame estático — los
 * planos aparecen ya completos, sin animación de trazo ni ciclos.
 */

type Point = { x: number; y: number };

type Node = Point & {
  vx: number;
  vy: number;
};

type ParcelPhase = "idle" | "boundary" | "diagonals" | "hold" | "fadeout";

type Parcel = {
  cx: number;
  cy: number;
  offsets: Point[];
  diagonals: [number, number][];
  segLengths: number[];
  cumLength: number[];
  totalLength: number;
  phase: ParcelPhase;
  drawnLength: number;
  diagonalIndex: number;
  diagonalProgress: number;
  holdRemaining: number;
  fadeRemaining: number;
  idleRemaining: number;
  bandIndex: number;
  bandCount: number;
};

const POINT_SPACING = 150;
const MIN_POINTS = 16;
const MAX_POINTS = 38;
const LINK_DISTANCE = 140;
const DRIFT = 0.1;

const PARCEL_AREA_PER = 500000;
const MIN_PARCELS = 2;
const MAX_PARCELS = 5;
const PARCEL_MIN_RADIUS = 55;
const PARCEL_MAX_RADIUS = 130;
const MARKER_TICK = 4;

const BOUNDARY_SPEED = 70; // px/s — ritmo del "trazo" del perímetro
const DIAGONAL_DURATION = 450; // ms por diagonal interna
const HOLD_MIN = 3500; // ms que el plano queda completo antes de desvanecer
const HOLD_MAX = 6500;
const FADE_DURATION = 500; // ms

function readVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function makeParcel(bandIndex: number, bandCount: number, w: number, h: number, idle: boolean): Parcel {
  const sides = 4 + Math.floor(Math.random() * 3); // lote de 4 a 6 vértices
  const baseRadius = randomBetween(PARCEL_MIN_RADIUS, PARCEL_MAX_RADIUS);
  const offsets = Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * Math.PI * 2 + randomBetween(-0.28, 0.28);
    const r = baseRadius * randomBetween(0.65, 1);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  const diagonals: [number, number][] = [[0, Math.floor(sides / 2)]];
  if (sides >= 5) diagonals.push([1, (Math.floor(sides / 2) + 2) % sides]);

  const segLengths = offsets.map((o, i) => {
    const next = offsets[(i + 1) % offsets.length];
    return Math.hypot(next.x - o.x, next.y - o.y);
  });
  const cumLength: number[] = [];
  let acc = 0;
  for (const len of segLengths) {
    cumLength.push(acc);
    acc += len;
  }

  return {
    cx: ((bandIndex + 0.5) / bandCount) * w + randomBetween(-40, 40),
    cy: randomBetween(h * 0.2, h * 0.85),
    offsets,
    diagonals,
    segLengths,
    cumLength,
    totalLength: acc,
    phase: idle ? "idle" : "boundary",
    drawnLength: 0,
    diagonalIndex: 0,
    diagonalProgress: 0,
    holdRemaining: 0,
    fadeRemaining: 0,
    idleRemaining: idle ? randomBetween(0, 2500) : 0,
    bandIndex,
    bandCount,
  };
}

function completeParcel(p: Parcel) {
  p.phase = "hold";
  p.drawnLength = p.totalLength;
  p.diagonalIndex = p.diagonals.length;
  p.diagonalProgress = 0;
  p.idleRemaining = 0;
  p.holdRemaining = randomBetween(HOLD_MIN, HOLD_MAX);
}

export function TopoBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes: Node[] = [];
    let parcels: Parcel[] = [];
    let accentColor = "#4338ca";
    let lineColor = "rgba(87, 93, 131, 0.32)";
    let frameId = 0;
    let lastTime = 0;
    let visible = !document.hidden;

    function readColors() {
      accentColor = readVar("--accent", accentColor);
      lineColor = readVar("--border-color", lineColor);
    }

    function seed() {
      const area = width * height;
      const pointCount = Math.max(
        MIN_POINTS,
        Math.min(MAX_POINTS, Math.round(area / (POINT_SPACING * POINT_SPACING)))
      );
      nodes = Array.from({ length: pointCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * DRIFT,
        vy: (Math.random() - 0.5) * DRIFT,
      }));

      const parcelCount = Math.max(
        MIN_PARCELS,
        Math.min(MAX_PARCELS, Math.round(area / PARCEL_AREA_PER))
      );
      parcels = Array.from({ length: parcelCount }, (_, i) =>
        makeParcel(i, parcelCount, width, height, !reduceMotion.matches)
      );
      if (reduceMotion.matches) {
        for (const p of parcels) completeParcel(p);
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function updateParcel(p: Parcel, dt: number) {
      switch (p.phase) {
        case "idle":
          p.idleRemaining -= dt;
          if (p.idleRemaining <= 0) p.phase = "boundary";
          break;
        case "boundary":
          p.drawnLength = Math.min(p.totalLength, p.drawnLength + (BOUNDARY_SPEED * dt) / 1000);
          if (p.drawnLength >= p.totalLength) {
            if (p.diagonals.length > 0) {
              p.phase = "diagonals";
              p.diagonalIndex = 0;
              p.diagonalProgress = 0;
            } else {
              p.phase = "hold";
              p.holdRemaining = randomBetween(HOLD_MIN, HOLD_MAX);
            }
          }
          break;
        case "diagonals":
          p.diagonalProgress += dt;
          if (p.diagonalProgress >= DIAGONAL_DURATION) {
            p.diagonalIndex += 1;
            p.diagonalProgress = 0;
            if (p.diagonalIndex >= p.diagonals.length) {
              p.phase = "hold";
              p.holdRemaining = randomBetween(HOLD_MIN, HOLD_MAX);
            }
          }
          break;
        case "hold":
          p.holdRemaining -= dt;
          if (p.holdRemaining <= 0) {
            p.phase = "fadeout";
            p.fadeRemaining = FADE_DURATION;
          }
          break;
        case "fadeout":
          p.fadeRemaining -= dt;
          if (p.fadeRemaining <= 0) {
            Object.assign(p, makeParcel(p.bandIndex, p.bandCount, width, height, false));
          }
          break;
      }
    }

    function drawParcel(p: Parcel): Point[] {
      if (p.phase === "idle") return [];

      const verts = p.offsets.map((o) => ({ x: p.cx + o.x, y: p.cy + o.y }));
      const opacity = p.phase === "fadeout" ? Math.max(0, p.fadeRemaining / FADE_DURATION) : 1;
      const boundaryLen = p.phase === "boundary" ? p.drawnLength : p.totalLength;

      let tip = verts[0];
      let remaining = boundaryLen;
      ctx!.beginPath();
      ctx!.moveTo(verts[0].x, verts[0].y);
      for (let i = 0; i < p.segLengths.length && remaining > 0; i++) {
        const from = verts[i];
        const to = verts[(i + 1) % verts.length];
        const segLen = p.segLengths[i];
        if (remaining >= segLen) {
          ctx!.lineTo(to.x, to.y);
          tip = to;
          remaining -= segLen;
        } else {
          const t = remaining / segLen;
          tip = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
          ctx!.lineTo(tip.x, tip.y);
          remaining = 0;
        }
      }
      ctx!.strokeStyle = accentColor;
      ctx!.globalAlpha = 0.24 * opacity;
      ctx!.lineWidth = 1.1;
      ctx!.stroke();

      const diagonalsDone =
        p.phase === "boundary" ? 0 : p.phase === "diagonals" ? p.diagonalIndex : p.diagonals.length;
      ctx!.globalAlpha = 0.12 * opacity;
      for (let d = 0; d < diagonalsDone; d++) {
        const [a, b] = p.diagonals[d];
        ctx!.beginPath();
        ctx!.moveTo(verts[a].x, verts[a].y);
        ctx!.lineTo(verts[b].x, verts[b].y);
        ctx!.stroke();
      }
      if (p.phase === "diagonals" && p.diagonalIndex < p.diagonals.length) {
        const [a, b] = p.diagonals[p.diagonalIndex];
        const t = p.diagonalProgress / DIAGONAL_DURATION;
        const from = verts[a];
        const to = verts[b];
        tip = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
        ctx!.beginPath();
        ctx!.moveTo(from.x, from.y);
        ctx!.lineTo(tip.x, tip.y);
        ctx!.stroke();
      }

      const revealedCount =
        p.phase === "boundary" ? verts.filter((_, i) => p.drawnLength >= p.cumLength[i]).length : verts.length;

      ctx!.globalAlpha = 0.6 * opacity;
      ctx!.lineWidth = 1.2;
      for (let i = 0; i < revealedCount; i++) {
        const v = verts[i];
        ctx!.beginPath();
        ctx!.moveTo(v.x - MARKER_TICK, v.y);
        ctx!.lineTo(v.x + MARKER_TICK, v.y);
        ctx!.moveTo(v.x, v.y - MARKER_TICK);
        ctx!.lineTo(v.x, v.y + MARKER_TICK);
        ctx!.stroke();
      }

      if (p.phase === "boundary" || p.phase === "diagonals") {
        ctx!.globalAlpha = 0.85 * opacity;
        ctx!.fillStyle = accentColor;
        ctx!.beginPath();
        ctx!.arc(tip.x, tip.y, 2.4, 0, Math.PI * 2);
        ctx!.fill();
      }

      return verts.slice(0, revealedCount);
    }

    function linkIfClose(a: Point, b: Point) {
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > LINK_DISTANCE) return;
      ctx!.beginPath();
      ctx!.moveTo(a.x, a.y);
      ctx!.lineTo(b.x, b.y);
      ctx!.strokeStyle = lineColor;
      ctx!.globalAlpha = 1 - dist / LINK_DISTANCE;
      ctx!.lineWidth = 1;
      ctx!.stroke();
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      const revealedVerts = parcels.map(drawParcel).flat();

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) linkIfClose(nodes[i], nodes[j]);
        for (const v of revealedVerts) linkIfClose(nodes[i], v);
      }

      ctx!.globalAlpha = 0.55;
      ctx!.fillStyle = accentColor;
      for (const n of nodes) {
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function tick(now: number) {
      if (!visible) return;
      const dt = lastTime ? Math.min(now - lastTime, 100) : 16.7;
      lastTime = now;
      const timeScale = dt / 16.7;

      for (const n of nodes) {
        n.x += n.vx * timeScale;
        n.y += n.vy * timeScale;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        n.x = clamp(n.x, 0, width);
        n.y = clamp(n.y, 0, height);
      }
      for (const p of parcels) updateParcel(p, dt);

      draw();
      frameId = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(frameId);
      readColors();
      lastTime = 0;
      if (reduceMotion.matches) {
        for (const p of parcels) completeParcel(p);
        draw();
        return;
      }
      frameId = requestAnimationFrame(tick);
    }

    const onResize = () => {
      resize();
      draw();
    };
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible && !reduceMotion.matches) start();
    };
    const onSchemeChange = () => readColors();
    const onMotionChange = () => start();

    resize();
    start();

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    darkScheme.addEventListener("change", onSchemeChange);
    reduceMotion.addEventListener("change", onMotionChange);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      darkScheme.removeEventListener("change", onSchemeChange);
      reduceMotion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
