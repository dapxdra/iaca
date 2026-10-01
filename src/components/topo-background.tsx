"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo decorativo: un plano de curvas de nivel vivo. El terreno es la suma
 * de varios "cerros" elípticos que derivan y respiran muy despacio; sobre ese
 * campo de alturas se trazan las curvas con marching squares, así que se
 * cierran en anillos concéntricos irregulares como en un levantamiento real.
 * Cada quinta curva es una curva maestra (más gruesa y marcada), igual que en
 * la cartografía. Encima, puntos de control que derivan y se enlazan con
 * líneas rectas (red de levantamiento). De vez en cuando, sobre el terreno
 * se traza un lote de catastro vértice a vértice, como un plotter: perímetro,
 * diagonales internas y un mojón (cruz) en cada esquina; se sostiene, se
 * desvanece y tras una pausa larga aparece otro distinto. Colores de marca
 * (`--accent` / `--border-color`) a alfa bajo para no competir con el texto.
 *
 * Mejora progresiva: sin JS no se dibuja nada (la sección ya es correcta
 * sin esto). Con `prefers-reduced-motion`, un solo frame estático solo con
 * las curvas y los puntos — los lotes existen para ser animados.
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

type Hill = Point & {
  vx: number;
  vy: number;
  sx: number;
  sy: number;
  cos: number;
  sin: number;
  amp: number;
  phase: number;
};

const POINT_SPACING = 170;
const MIN_POINTS = 12;
const MAX_POINTS = 30;
const LINK_DISTANCE = 140;
const DRIFT = 0.1;

const PARCEL_AREA_PER = 700000;
const MIN_PARCELS = 1;
const MAX_PARCELS = 3;
const PARCEL_MIN_RADIUS = 55;
const PARCEL_MAX_RADIUS = 130;
const MARKER_TICK = 4;

const BOUNDARY_SPEED = 70; // px/s — ritmo del "trazo" del perímetro
const DIAGONAL_DURATION = 450; // ms por diagonal interna
const HOLD_MIN = 3500; // ms que el lote queda completo antes de desvanecer
const HOLD_MAX = 6500;
const FADE_DURATION = 800; // ms
// Pausa entre un lote y el siguiente: los lotes son el acento ocasional,
// las curvas de nivel son el fondo permanente.
const IDLE_MIN = 6000;
const IDLE_MAX = 16000;

const HILL_AREA_PER = 160000;
const MIN_HILLS = 5;
const MAX_HILLS = 14;
const HILL_MIN_SIGMA = 70;
const HILL_MAX_SIGMA = 190;
const HILL_SPEED = 0.05; // px por frame de 60 fps

const CELL = 12; // px — resolución de la grilla de marching squares
// Por debajo del primer nivel el terreno queda "plano": zonas despejadas
// entre cerros, como en la referencia, en vez de ondas por todo el fondo.
const LEVEL_START = 0.14;
const LEVEL_STEP = 0.075;
const LEVEL_COUNT = 18;
const INDEX_EVERY = 5;

// Aristas de una celda: 0 arriba, 1 derecha, 2 abajo, 3 izquierda. Índice de
// caso = tl·8 + tr·4 + br·2 + bl·1 (1 = esquina por encima del nivel).
const SEGMENTS: number[][] = [
  [], [3, 2], [2, 1], [3, 1], [0, 1], [3, 0, 2, 1], [0, 2], [3, 0],
  [3, 0], [0, 2], [0, 1, 3, 2], [0, 1], [3, 1], [2, 1], [3, 2], [],
];

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

function makeParcel(bandIndex: number, bandCount: number, w: number, h: number, idleMs: number): Parcel {
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
    phase: "idle",
    drawnLength: 0,
    diagonalIndex: 0,
    diagonalProgress: 0,
    holdRemaining: 0,
    fadeRemaining: 0,
    idleRemaining: idleMs,
    bandIndex,
    bandCount,
  };
}

function makeHill(w: number, h: number): Hill {
  const angle = Math.random() * Math.PI;
  const sigma = randomBetween(HILL_MIN_SIGMA, HILL_MAX_SIGMA);
  const heading = Math.random() * Math.PI * 2;
  return {
    x: randomBetween(-0.05, 1.05) * w,
    y: randomBetween(-0.05, 1.05) * h,
    vx: Math.cos(heading) * HILL_SPEED,
    vy: Math.sin(heading) * HILL_SPEED,
    sx: sigma,
    sy: sigma * randomBetween(0.5, 1),
    cos: Math.cos(angle),
    sin: Math.sin(angle),
    amp: randomBetween(0.7, 1.35),
    phase: Math.random() * Math.PI * 2,
  };
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
    let cols = 0;
    let rows = 0;
    let field = new Float32Array(0);
    let nodes: Node[] = [];
    let hills: Hill[] = [];
    let parcels: Parcel[] = [];
    let accentColor = "#4338ca";
    let lineColor = "rgba(87, 93, 131, 0.32)";
    let frameId = 0;
    let lastTime = 0;
    let elapsed = 0;
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

      const hillCount = Math.max(MIN_HILLS, Math.min(MAX_HILLS, Math.round(area / HILL_AREA_PER)));
      hills = Array.from({ length: hillCount }, () => makeHill(width, height));

      const parcelCount = Math.max(
        MIN_PARCELS,
        Math.min(MAX_PARCELS, Math.round(area / PARCEL_AREA_PER))
      );
      // El primero arranca pronto para que el lote se vea en la primera visita.
      parcels = Array.from({ length: parcelCount }, (_, i) =>
        makeParcel(i, parcelCount, width, height, i === 0 ? 1500 : randomBetween(IDLE_MIN, IDLE_MAX))
      );
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL) + 2;
      rows = Math.ceil(height / CELL) + 2;
      field = new Float32Array(cols * rows);
      seed();
    }

    function sampleField() {
      // Amplitud que "respira" para que los anillos crezcan y se encojan.
      const amps = hills.map((h) => h.amp * (0.85 + 0.15 * Math.sin(elapsed * 0.00025 + h.phase)));
      const t = elapsed * 0.00006;
      for (let j = 0; j < rows; j++) {
        const y = j * CELL;
        for (let i = 0; i < cols; i++) {
          const x = i * CELL;
          // Ondulación suave de baja frecuencia: rompe la simetría de las
          // elipses y da el contorno irregular de un terreno real.
          let v = 0.09 * Math.sin(x * 0.0061 + y * 0.0023 + t) * Math.cos(y * 0.0074 - x * 0.0017 - t);
          for (let k = 0; k < hills.length; k++) {
            const h = hills[k];
            const dx = x - h.x;
            const dy = y - h.y;
            const u = (dx * h.cos + dy * h.sin) / h.sx;
            const w = (dy * h.cos - dx * h.sin) / h.sy;
            const d = u * u + w * w;
            if (d < 12) v += amps[k] * Math.exp(-0.5 * d);
          }
          field[j * cols + i] = v;
        }
      }
    }

    function edgePoint(edge: number, i: number, j: number, level: number, out: Point) {
      const tl = field[j * cols + i];
      const tr = field[j * cols + i + 1];
      const br = field[(j + 1) * cols + i + 1];
      const bl = field[(j + 1) * cols + i];
      const x = i * CELL;
      const y = j * CELL;
      switch (edge) {
        case 0:
          out.x = x + ((level - tl) / (tr - tl)) * CELL;
          out.y = y;
          break;
        case 1:
          out.x = x + CELL;
          out.y = y + ((level - tr) / (br - tr)) * CELL;
          break;
        case 2:
          out.x = x + ((level - bl) / (br - bl)) * CELL;
          out.y = y + CELL;
          break;
        default:
          out.x = x;
          out.y = y + ((level - tl) / (bl - tl)) * CELL;
      }
    }

    function drawContours() {
      const a: Point = { x: 0, y: 0 };
      const b: Point = { x: 0, y: 0 };
      ctx!.strokeStyle = accentColor;
      ctx!.lineJoin = "round";

      for (let l = 0; l < LEVEL_COUNT; l++) {
        const level = LEVEL_START + l * LEVEL_STEP;
        const isIndex = l % INDEX_EVERY === 0;
        ctx!.beginPath();
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const c =
              (field[j * cols + i] >= level ? 8 : 0) |
              (field[j * cols + i + 1] >= level ? 4 : 0) |
              (field[(j + 1) * cols + i + 1] >= level ? 2 : 0) |
              (field[(j + 1) * cols + i] >= level ? 1 : 0);
            const segs = SEGMENTS[c];
            for (let s = 0; s < segs.length; s += 2) {
              edgePoint(segs[s], i, j, level, a);
              edgePoint(segs[s + 1], i, j, level, b);
              ctx!.moveTo(a.x, a.y);
              ctx!.lineTo(b.x, b.y);
            }
          }
        }
        ctx!.globalAlpha = isIndex ? 0.3 : 0.15;
        ctx!.lineWidth = isIndex ? 1.5 : 1;
        ctx!.stroke();
      }
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
            p.phase = "diagonals";
            p.diagonalIndex = 0;
            p.diagonalProgress = 0;
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
            Object.assign(
              p,
              makeParcel(p.bandIndex, p.bandCount, width, height, randomBetween(IDLE_MIN, IDLE_MAX))
            );
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
      // Más marcado que las curvas para que el lote se lea encima del terreno.
      ctx!.globalAlpha = 0.4 * opacity;
      ctx!.lineWidth = 1.3;
      ctx!.stroke();

      const diagonalsDone =
        p.phase === "boundary" ? 0 : p.phase === "diagonals" ? p.diagonalIndex : p.diagonals.length;
      ctx!.globalAlpha = 0.2 * opacity;
      ctx!.lineWidth = 1;
      ctx!.setLineDash([4, 4]);
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
      ctx!.setLineDash([]);

      const revealedCount =
        p.phase === "boundary" ? verts.filter((_, i) => p.drawnLength >= p.cumLength[i]).length : verts.length;

      ctx!.globalAlpha = 0.7 * opacity;
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
      ctx!.globalAlpha = 0.8 * (1 - dist / LINK_DISTANCE);
      ctx!.lineWidth = 1;
      ctx!.stroke();
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      sampleField();
      drawContours();
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
      elapsed += dt;
      const timeScale = dt / 16.7;

      for (const n of nodes) {
        n.x += n.vx * timeScale;
        n.y += n.vy * timeScale;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        n.x = clamp(n.x, 0, width);
        n.y = clamp(n.y, 0, height);
      }
      // Los cerros pueden salir un poco del lienzo (anillos cortados en el
      // borde, como en la referencia) pero rebotan antes de perderse.
      for (const h of hills) {
        h.x += h.vx * timeScale;
        h.y += h.vy * timeScale;
        if (h.x < -h.sx || h.x > width + h.sx) h.vx *= -1;
        if (h.y < -h.sy || h.y > height + h.sy) h.vy *= -1;
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
    const onSchemeChange = () => {
      readColors();
      if (reduceMotion.matches) draw();
    };
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
