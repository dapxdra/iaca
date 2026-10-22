/**
 * Tarifas mínimas de honorarios del Colegio de Ingenieros Topógrafos (CIT):
 * - Decreto 17481-MOPT (agrimensura, topografía, consultas y gastos, art. 4–21).
 * - Decreto 35298-MOPT reformado por 36150-MOPT (peritajes y avalúos del CFIA).
 *
 * Funciones puras, sin acceso a datos: el cotizador corre en el navegador.
 * Los montos del reglamento están en colones de 1987 y se multiplican por el
 * índice de ajuste `i` (art. 3); los de avalúos usan su propio factor `i` y la
 * hora profesional del CFIA. Son tarifas MÍNIMAS: el art. 22 permite pactar
 * por escrito un monto mayor.
 */

export type Parametros = {
  /** Índice de ajuste inflacionario, art. 3 del 17481-MOPT. */
  i: number;
  /** Factor de actualización de peritajes y avalúos, art. 13 del 35298-MOPT. */
  iAvaluos: number;
  /** Hora profesional oficial del CFIA. */
  horaProfesional: number;
};

/** Valores vigentes según la tabla del CIT (pág. 21 del folleto de tarifas). */
export const PARAMETROS_VIGENTES: Parametros & { fuente: Record<keyof Parametros, string> } = {
  i: 27.8,
  iAvaluos: 22.5,
  horaProfesional: 23411.05,
  fuente: {
    i: "La Gaceta 89, mayo 2014",
    iAvaluos: "La Gaceta 134, julio 2012",
    horaProfesional: "La Gaceta 134, julio 2012",
  },
};

export type Valores = Record<string, string | boolean>;

export type Campo =
  | {
      tipo: "numero";
      id: string;
      label: string;
      unidad?: string;
      defecto: number;
      min?: number;
      max?: number;
      step?: number;
      ayuda?: string;
    }
  | {
      tipo: "opcion";
      id: string;
      label: string;
      opciones: { valor: string; label: string }[];
      defecto: string;
    }
  | { tipo: "check"; id: string; label: string; defecto: boolean };

export type Linea = { concepto: string; detalle: string; monto: number };

/** Define qué regla de gastos de traslado aplica (art. 4 vs. art. 2 de avalúos). */
export type TipoTraslado = "agrimensura" | "topografia" | "avaluo";

export type Servicio = {
  id: string;
  grupo: string;
  nombre: string;
  articulo?: string;
  nota?: string;
  traslado: TipoTraslado;
  campos: Campo[];
  calcular: (v: Valores, p: Parametros) => Linea[];
};

// --- helpers ---------------------------------------------------------------

function num(v: Valores, id: string): number {
  const n = Number(v[id]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
const sel = (v: Valores, id: string) => String(v[id] ?? "");
const chk = (v: Valores, id: string) => v[id] === true;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const fmt = (n: number) => n.toLocaleString("es-CR", { maximumFractionDigits: 2 });

const TERRENO_3 = [
  { valor: "plano", label: "Plano" },
  { valor: "ondulado", label: "Ondulado" },
  { valor: "montanoso", label: "Montañoso" },
];
type Terreno3 = "plano" | "ondulado" | "montanoso";
const terrenoCampo: Campo = { tipo: "opcion", id: "terreno", label: "Terreno", opciones: TERRENO_3, defecto: "plano" };

/** Rubro cobrado por km con un mínimo de km facturables. */
function porKm(
  concepto: string,
  tarifa: number,
  km: number,
  minKm: number,
  p: Parametros
): Linea {
  const kmCobrado = Math.max(km, minKm);
  const nota = km < minKm ? ` (mínimo ${fmt(minKm)} km)` : "";
  return {
    concepto,
    detalle: `₡${fmt(tarifa)} × i × ${fmt(kmCobrado)} km${nota}`,
    monto: tarifa * p.i * kmCobrado,
  };
}

function porMetro(concepto: string, tarifa: number, metros: number, p: Parametros): Linea {
  return {
    concepto,
    detalle: `₡${fmt(tarifa)} × i × ${fmt(metros)} m lineales`,
    monto: tarifa * p.i * metros,
  };
}

/** Avalúo: Honorarios = k · i · (Valor / i)^exp, con mínimo en horas profesionales (art. 3). */
function avaluo(
  concepto: string,
  k: number,
  exp: number,
  valor: number,
  horasMinimas: number,
  actualizacion: boolean,
  p: Parametros
): Linea[] {
  const formula = k * p.iAvaluos * Math.pow(valor / p.iAvaluos, exp);
  const minimo = horasMinimas * p.horaProfesional;
  const lineas: Linea[] = [
    {
      concepto,
      detalle: `${fmt(k)} × i × (₡${fmt(valor)} / i)^${fmt(exp)}`,
      monto: formula,
    },
  ];
  if (actualizacion) {
    lineas.push({
      concepto: "Actualización de avalúo propio",
      detalle: "50 % de la tarifa",
      monto: -formula * 0.5,
    });
  }
  const subtotal = actualizacion ? formula * 0.5 : formula;
  if (horasMinimas > 0 && subtotal < minimo) {
    lineas.push({
      concepto: `Ajuste al mínimo de ${horasMinimas} horas profesionales`,
      detalle: `${horasMinimas} × ₡${fmt(p.horaProfesional)}`,
      monto: minimo - subtotal,
    });
  }
  return lineas;
}

function avaluoServicio(
  id: string,
  nombre: string,
  articulo: string,
  k: number,
  exp: number,
  horasMinimas: number,
  labelValor = "Valor del bien"
): Servicio {
  return {
    id,
    grupo: "Peritajes y avalúos",
    nombre,
    articulo,
    traslado: "avaluo",
    campos: [
      { tipo: "numero", id: "valor", label: labelValor, unidad: "₡", defecto: 0, step: 1000 },
      { tipo: "check", id: "actualizacion", label: "Es actualización de un avalúo propio", defecto: false },
    ],
    calcular: (v, p) =>
      avaluo(nombre, k, exp, num(v, "valor"), horasMinimas, chk(v, "actualizacion"), p),
  };
}

// --- catálogo --------------------------------------------------------------

const ZONAS_URBANAS: Record<string, { tarifa: number; label: string }> = {
  A: { tarifa: 12.5, label: "A — Comercial de mucho valor en ciudades principales" },
  B: { tarifa: 9, label: "B — Colindante a A o comercial de menor valor" },
  C: { tarifa: 5.6, label: "C — Colindante a B" },
  D: { tarifa: 2.8, label: "D — Cuadrantes, urbanizaciones y fraccionamientos" },
  E: { tarifa: 2, label: "E — Urbana consolidada de menor valor" },
  F: { tarifa: 0.7, label: "F — Destino urbano" },
};

/**
 * La tabla de tarifas mínimas del CIT cobra igual cualquier parcela urbana de
 * 0,01 a 300 m² (₡94 000 en zona E y ₡83 000 en F con i = 27,80): equivale a
 * evaluar la fórmula del art. 5 con un área mínima de 300 m².
 */
const AREA_MINIMA_URBANA = 300;

const IDA_TARIFAS: Record<string, number> = {
  "plano-facil": 5050,
  "plano-dificil": 6350,
  "quebrado-facil": 6050,
  "quebrado-dificil": 7100,
};

const TERRAZA_TRAMOS: { hasta: number; tarifa: number }[] = [
  { hasta: 500, tarifa: 6.6 },
  { hasta: 1000, tarifa: 5.6 },
  { hasta: 2000, tarifa: 3.9 },
  { hasta: 3000, tarifa: 3 },
  { hasta: 4000, tarifa: 2.7 },
  { hasta: 5000, tarifa: 2.1 },
  { hasta: Infinity, tarifa: 1.8 },
];

const PERFILES_TIPOS: Record<string, { tarifa: number; label: string }> = {
  limpio: { tarifa: 14980, label: "Plano a ondulado y limpio" },
  "plano-tacotal": { tarifa: 19180, label: "Plano a ondulado, carriles en tacotal" },
  "plano-bosque": { tarifa: 25750, label: "Plano a ondulado, carriles en bosque" },
  "quebrado-tacotal": { tarifa: 25750, label: "Quebrado, carriles en tacotal" },
  "quebrado-bosque": { tarifa: 34700, label: "Quebrado, carriles en bosque" },
};

const MINERO_REPLANTEO: Record<string, number> = {
  "plano-limpio": 30650,
  "plano-tacotal": 33600,
  "plano-bosque": 39600,
  "quebrado-limpio": 33600,
  "quebrado-tacotal": 39600,
  "quebrado-bosque": 51500,
};

/** Tarifa base rural del art. 6 (con mínimo), usada también por el replanteo parcial. */
function baseRural(h: number, dificultad: number, p: Parametros) {
  const formula = 6000 * p.i * Math.sqrt(h);
  const base = Math.max(formula, 8370 * p.i);
  return { base, aplicaMinimo: formula < 8370 * p.i, dif: base * (dificultad / 100) };
}

const AGRIMENSURA = "Agrimensura";
const TOPOGRAFIA = "Topografía";

export const SERVICIOS: Servicio[] = [
  {
    id: "urbano",
    grupo: AGRIMENSURA,
    nombre: "Levantamiento o replanteo urbano",
    articulo: "",
    nota: "Parcelas menores de 1000 m², o de 1000 a 50 000 m² en zona urbana, o mayores con fines de urbanización o industria.",
    traslado: "agrimensura",
    campos: [
      { tipo: "numero", id: "area", label: "Área de la parcela", unidad: "m²", defecto: 300, step: 1 },
      {
        tipo: "opcion",
        id: "zona",
        label: "Ubicación del terreno",
        opciones: Object.entries(ZONAS_URBANAS).map(([valor, z]) => ({ valor, label: z.label })),
        defecto: "E",
      },
      { tipo: "numero", id: "dificultad", label: "Recargo por dificultad", unidad: "%", defecto: 0, max: 50, ayuda: "Hasta 50 % sobre la tarifa base (construcciones sin acceso lateral, etc.)" },
      { tipo: "numero", id: "parcelas", label: "Parcelas contiguas", unidad: "parcelas", defecto: 1, min: 1, step: 1, ayuda: "Desde la 10.ª se descuenta 20 % (base + dificultad)" },
    ],
    calcular: (v, p) => {
      const a = Math.max(num(v, "area"), AREA_MINIMA_URBANA);
      const zona = ZONAS_URBANAS[sel(v, "zona")] ?? ZONAS_URBANAS.E;
      const n = Math.max(Math.floor(num(v, "parcelas")), 1);
      const formula = 160 * p.i * Math.sqrt(a);
      const base = Math.max(formula, 2800 * p.i);
      const dif = base * (clamp(num(v, "dificultad"), 0, 50) / 100);
      const nota = num(v, "area") < AREA_MINIMA_URBANA ? ` (área mínima ${AREA_MINIMA_URBANA} m²)` : "";
      const lineas: Linea[] = [
        {
          concepto: "Tarifa base",
          detalle: `160 × i × √${fmt(a)} m²${nota}${n > 1 ? ` × ${n} parcelas` : ""}`,
          monto: base * n,
        },
        {
          concepto: `Incremento por ubicación, zona ${sel(v, "zona") || "E"} `,
          detalle: `₡${fmt(zona.tarifa)} × i × ${fmt(a)} m²${n > 1 ? ` × ${n}` : ""}`,
          monto: zona.tarifa * p.i * a * n,
        },
      ];
      if (dif > 0) {
        lineas.push({ concepto: "Recargo por dificultad", detalle: `${fmt(num(v, "dificultad"))} % de la base`, monto: dif * n });
      }
      if (n >= 10) {
        lineas.push({
          concepto: "Descuento parcelas contiguas",
          detalle: `20 % de base + dificultad en ${n - 9} parcelas`,
          monto: -0.2 * (base + dif) * (n - 9),
        });
      }
      return lineas;
    },
  },
  {
    id: "rural",
    grupo: AGRIMENSURA,
    nombre: "Levantamiento o replanteo rural",
    articulo: "",
    nota: "Parcelas mayores de 1000 m² fuera de zona urbana. Mínimo ₡8370 × i.",
    traslado: "agrimensura",
    campos: [
      { tipo: "numero", id: "ha", label: "Área de la parcela", unidad: "ha", defecto: 1, step: 0.01 },
      { tipo: "numero", id: "dificultad", label: "Recargo por dificultad", unidad: "%", defecto: 0, max: 50, ayuda: "Hasta 50 %: terreno quebrado, charral, ciénagas, cultivos delicados" },
      { tipo: "numero", id: "parcelas", label: "Parcelas contiguas", unidad: "parcelas", defecto: 1, min: 1, step: 1, ayuda: "10.ª a 25.ª: −20 %; desde la 26.ª: −30 %" },
    ],
    calcular: (v, p) => {
      const h = num(v, "ha");
      const { base, aplicaMinimo, dif } = baseRural(h, clamp(num(v, "dificultad"), 0, 50), p);
      const n = Math.max(Math.floor(num(v, "parcelas")), 1);
      const lineas: Linea[] = [
        {
          concepto: "Tarifa base",
          detalle: `${aplicaMinimo ? "Mínimo ₡8370 × i" : `6000 × i × √${fmt(h)} ha`}${n > 1 ? ` × ${n} parcelas` : ""}`,
          monto: base * n,
        },
      ];
      if (dif > 0) {
        lineas.push({ concepto: "Recargo por dificultad", detalle: `${fmt(num(v, "dificultad"))} % de la base`, monto: dif * n });
      }
      const tramo20 = n >= 10 ? Math.min(n, 25) - 9 : 0;
      const tramo30 = n >= 26 ? n - 25 : 0;
      if (tramo20 > 0) {
        lineas.push({ concepto: "Descuento parcelas 10 a 25", detalle: `20 % en ${tramo20} parcelas`, monto: -0.2 * (base + dif) * tramo20 });
      }
      if (tramo30 > 0) {
        lineas.push({ concepto: "Descuento parcelas 26 en adelante", detalle: `30 % en ${tramo30} parcelas`, monto: -0.3 * (base + dif) * tramo30 });
      }
      return lineas;
    },
  },
  {
    id: "rural-replanteo-parcial",
    grupo: AGRIMENSURA,
    nombre: "Replanteo rural parcial",
    articulo: "",
    nota: "Se cobra en proporción al perímetro replanteado, con mínimo ₡8370 × i.",
    traslado: "agrimensura",
    campos: [
      { tipo: "numero", id: "ha", label: "Área de la parcela", unidad: "ha", defecto: 1, step: 0.01 },
      { tipo: "numero", id: "dificultad", label: "Recargo por dificultad", unidad: "%", defecto: 0, max: 50 },
      { tipo: "numero", id: "perimetro", label: "Perímetro total", unidad: "m", defecto: 400 },
      { tipo: "numero", id: "replanteado", label: "Perímetro replanteado", unidad: "m", defecto: 100 },
    ],
    calcular: (v, p) => {
      const { base, dif } = baseRural(num(v, "ha"), clamp(num(v, "dificultad"), 0, 50), p);
      const perimetro = num(v, "perimetro");
      const proporcion = perimetro > 0 ? Math.min(num(v, "replanteado") / perimetro, 1) : 0;
      const proporcional = (base + dif) * proporcion;
      const minimo = 8370 * p.i;
      return [
        {
          concepto: "Replanteo proporcional al perímetro",
          detalle: `Tarifa del levantamiento × ${fmt(proporcion * 100)} % del perímetro${proporcional < minimo ? " (aplica mínimo ₡8370 × i)" : ""}`,
          monto: Math.max(proporcional, minimo),
        },
      ];
    },
  },
  {
    id: "informativo",
    grupo: AGRIMENSURA,
    nombre: "Levantamiento informativo (cultivos, apartos)",
    articulo: "",
    nota: "No requiere inscripción en el Catastro Nacional. Mínimo ₡4200 × i.",
    traslado: "agrimensura",
    campos: [{ tipo: "numero", id: "ha", label: "Área", unidad: "ha", defecto: 1, step: 0.01 }],
    calcular: (v, p) => {
      const h = num(v, "ha");
      const formula = 3000 * p.i * Math.sqrt(h);
      const minimo = 4200 * p.i;
      return [
        {
          concepto: "Tarifa base",
          detalle: formula < minimo ? "Mínimo ₡4200 × i" : `3000 × i × √${fmt(h)} ha`,
          monto: Math.max(formula, minimo),
        },
      ];
    },
  },
  {
    id: "ida",
    grupo: AGRIMENSURA,
    nombre: "Titulación y asentamientos (IDA / INDER)",
    articulo: "",
    nota: "Solo para bloques de 30 parcelas o más en un área mayor a 300 ha; si no, aplica la tarifa general.",
    traslado: "agrimensura",
    campos: [
      { tipo: "numero", id: "km", label: "Longitud de linderos", unidad: "km", defecto: 1, step: 0.1 },
      {
        tipo: "opcion",
        id: "terreno",
        label: "Terreno y acceso",
        opciones: [
          { valor: "plano-facil", label: "Plano, fácil acceso" },
          { valor: "plano-dificil", label: "Plano, difícil acceso" },
          { valor: "quebrado-facil", label: "Quebrado, fácil acceso" },
          { valor: "quebrado-dificil", label: "Quebrado, difícil acceso" },
        ],
        defecto: "plano-facil",
      },
      { tipo: "numero", id: "minifundios", label: "Planos de parcelas menores de 1 ha", unidad: "planos", defecto: 0, step: 1 },
      { tipo: "numero", id: "replanteo", label: "Recargo por replanteo de linderos", unidad: "%", defecto: 0, max: 20 },
    ],
    calcular: (v, p) => {
      const tarifa = IDA_TARIFAS[sel(v, "terreno")] ?? IDA_TARIFAS["plano-facil"];
      const km = num(v, "km");
      const lineas: Linea[] = [porKm("Levantamiento por kilómetro", tarifa, km, 0, p)];
      const minifundios = Math.floor(num(v, "minifundios"));
      if (minifundios > 0) {
        lineas.push({ concepto: "Planos de minifundio", detalle: `₡1300 × i × ${minifundios} planos`, monto: 1300 * p.i * minifundios });
      }
      const recargo = clamp(num(v, "replanteo"), 0, 20);
      if (recargo > 0) {
        lineas.push({ concepto: "Replanteo de linderos", detalle: `${fmt(recargo)} % del precio por km`, monto: lineas[0].monto * (recargo / 100) });
      }
      return lineas;
    },
  },
  {
    id: "vias-preliminar",
    grupo: TOPOGRAFIA,
    nombre: "Estudio preliminar de vías y conducciones",
    articulo: "",
    nota: "Mínimo 1 km en localización, levantamiento y nivelación.",
    traslado: "topografia",
    campos: [
      terrenoCampo,
      { tipo: "numero", id: "km", label: "Longitud", unidad: "km", defecto: 1, step: 0.1 },
      { tipo: "check", id: "a", label: "a) Localización preliminar de rutas", defecto: true },
      { tipo: "check", id: "b", label: "b) Levantamiento, estacionamiento y referencias", defecto: true },
      { tipo: "check", id: "c", label: "c) Nivelación", defecto: true },
      { tipo: "check", id: "e", label: "e) Cálculo y dibujo", defecto: true },
      { tipo: "numero", id: "secciones", label: "d) Secciones transversales", unidad: "m lineales", defecto: 0 },
    ],
    calcular: (v, p) => {
      const t = (sel(v, "terreno") || "plano") as Terreno3;
      const km = num(v, "km");
      const tabla = {
        a: { plano: 6580, ondulado: 9100, montanoso: 17500 },
        b: { plano: 16800, ondulado: 18900, montanoso: 30100 },
        c: { plano: 6300, ondulado: 9100, montanoso: 17500 },
        d: { plano: 6.6, ondulado: 9, montanoso: 15 },
        e: { plano: 17900, ondulado: 19200, montanoso: 21500 },
      };
      const lineas: Linea[] = [];
      if (chk(v, "a")) lineas.push(porKm("Localización preliminar de rutas", tabla.a[t], km, 1, p));
      if (chk(v, "b")) lineas.push(porKm("Levantamiento, estacionamiento y referencias", tabla.b[t], km, 1, p));
      if (chk(v, "c")) lineas.push(porKm("Nivelación", tabla.c[t], km, 1, p));
      if (num(v, "secciones") > 0) lineas.push(porMetro("Secciones transversales", tabla.d[t], num(v, "secciones"), p));
      if (chk(v, "e")) lineas.push(porKm("Cálculo y dibujo", tabla.e[t], km, 0, p));
      return lineas;
    },
  },
  {
    id: "vias-diseno",
    grupo: TOPOGRAFIA,
    nombre: "Diseño topográfico de vías y conducciones",
    articulo: "",
    nota: "Mínimo cobrable: 1 km.",
    traslado: "topografia",
    campos: [
      { tipo: "numero", id: "km", label: "Longitud", unidad: "km", defecto: 1, step: 0.1 },
      { tipo: "check", id: "a", label: "a) Diseño geométrico horizontal", defecto: true },
      { tipo: "check", id: "b", label: "b) Diseño geométrico vertical", defecto: true },
      { tipo: "check", id: "c", label: "c) Cálculo de movimiento de tierra", defecto: true },
    ],
    calcular: (v, p) => {
      const km = num(v, "km");
      const lineas: Linea[] = [];
      if (chk(v, "a")) lineas.push(porKm("Diseño geométrico horizontal", 23800, km, 1, p));
      if (chk(v, "b")) lineas.push(porKm("Diseño geométrico vertical", 19150, km, 1, p));
      if (chk(v, "c")) lineas.push(porKm("Cálculo de movimiento de tierra", 11900, km, 1, p));
      return lineas;
    },
  },
  {
    id: "vias-construccion",
    grupo: TOPOGRAFIA,
    nombre: "Topografía para construcción de vías",
    articulo: "",
    nota: "Mínimo 1 km por rubro, excepto secciones transversales.",
    traslado: "topografia",
    campos: [
      terrenoCampo,
      { tipo: "numero", id: "km", label: "Longitud", unidad: "km", defecto: 1, step: 0.1 },
      { tipo: "check", id: "a", label: "a) Localización de líneas de centro", defecto: true },
      { tipo: "check", id: "b", label: "b) Nivelación de línea de centro", defecto: true },
      { tipo: "check", id: "d", label: "d) Colocación de estacas de talud", defecto: false },
      { tipo: "check", id: "e", label: "e) Relocalización de línea de centro", defecto: false },
      { tipo: "check", id: "f", label: "f) Nivelación para conformación y acabado", defecto: false },
      { tipo: "numero", id: "secciones", label: "c) Secciones transversales", unidad: "m lineales", defecto: 0 },
    ],
    calcular: (v, p) => {
      const t = (sel(v, "terreno") || "plano") as Terreno3;
      const km = num(v, "km");
      const tabla = {
        a: { plano: 17900, ondulado: 29950, montanoso: 47880 },
        b: { plano: 6300, ondulado: 9100, montanoso: 17500 },
        c: { plano: 6.6, ondulado: 9, montanoso: 15 },
        d: { plano: 17900, ondulado: 25760, montanoso: 34720 },
        e: { plano: 11900, ondulado: 17360, montanoso: 21560 },
        f: { plano: 8100, ondulado: 11900, montanoso: 25900 },
      };
      const lineas: Linea[] = [];
      if (chk(v, "a")) lineas.push(porKm("Localización de líneas de centro", tabla.a[t], km, 1, p));
      if (chk(v, "b")) lineas.push(porKm("Nivelación de línea de centro", tabla.b[t], km, 1, p));
      if (num(v, "secciones") > 0) lineas.push(porMetro("Secciones transversales", tabla.c[t], num(v, "secciones"), p));
      if (chk(v, "d")) lineas.push(porKm("Colocación de estacas de talud", tabla.d[t], km, 1, p));
      if (chk(v, "e")) lineas.push(porKm("Relocalización de línea de centro", tabla.e[t], km, 1, p));
      if (chk(v, "f")) lineas.push(porKm("Nivelación para conformación y acabado", tabla.f[t], km, 1, p));
      return lineas;
    },
  },
  {
    id: "urb-diseno",
    grupo: TOPOGRAFIA,
    nombre: "Topografía para diseño de urbanizaciones",
    articulo: "",
    nota: "El plano topográfico se cotiza aparte. Mínimo 0,5 km en ejes y nivelación.",
    traslado: "topografia",
    campos: [
      { tipo: "numero", id: "ha", label: "b) Plano general de urbanización", unidad: "ha", defecto: 0, step: 0.01 },
      { tipo: "numero", id: "km", label: "Longitud de ejes", unidad: "km", defecto: 0.5, step: 0.1 },
      { tipo: "check", id: "c", label: "c) Localización de ejes, referencias y detalles", defecto: true },
      { tipo: "check", id: "d", label: "d) Nivelación de ejes", defecto: true },
      { tipo: "numero", id: "secciones", label: "e) Secciones transversales", unidad: "m lineales", defecto: 0 },
    ],
    calcular: (v, p) => {
      const lineas: Linea[] = [];
      const ha = num(v, "ha");
      if (ha > 0) lineas.push({ concepto: "Plano general de urbanización", detalle: `₡10 800 × i × ${fmt(ha)} ha`, monto: 10800 * p.i * ha });
      if (chk(v, "c")) lineas.push(porKm("Localización de ejes, referencias y detalles", 23800, num(v, "km"), 0.5, p));
      if (chk(v, "d")) lineas.push(porKm("Nivelación de ejes", 7420, num(v, "km"), 0.5, p));
      if (num(v, "secciones") > 0) lineas.push(porMetro("Secciones transversales", 7.7, num(v, "secciones"), p));
      return lineas;
    },
  },
  {
    id: "urb-planos",
    grupo: TOPOGRAFIA,
    nombre: "Planos de diseño topográfico de urbanizaciones",
    articulo: "",
    nota: "Mínimo cobrable: 0,5 km.",
    traslado: "topografia",
    campos: [
      { tipo: "numero", id: "km", label: "Longitud", unidad: "km", defecto: 0.5, step: 0.1 },
      { tipo: "check", id: "a", label: "a) Dibujo en planta de ejes y detalles", defecto: true },
      { tipo: "check", id: "b", label: "b) Cálculo de ploteo de perfiles", defecto: true },
      { tipo: "check", id: "c", label: "c) Diseño vertical", defecto: true },
      { tipo: "check", id: "d", label: "d) Cálculo de movimiento de tierra", defecto: true },
    ],
    calcular: (v, p) => {
      const km = num(v, "km");
      const lineas: Linea[] = [];
      if (chk(v, "a")) lineas.push(porKm("Dibujo en planta de ejes y detalles", 5600, km, 0.5, p));
      if (chk(v, "b")) lineas.push(porKm("Cálculo de ploteo de perfiles", 5300, km, 0.5, p));
      if (chk(v, "c")) lineas.push(porKm("Diseño vertical", 17360, km, 0.5, p));
      if (chk(v, "d")) lineas.push(porKm("Cálculo de movimiento de tierra", 10780, km, 0.5, p));
      return lineas;
    },
  },
  {
    id: "urb-construccion",
    grupo: TOPOGRAFIA,
    nombre: "Topografía para construcción de urbanizaciones",
    articulo: "",
    nota: "Mínimo cobrable: 0,5 km.",
    traslado: "topografia",
    campos: [
      { tipo: "numero", id: "km", label: "Longitud", unidad: "km", defecto: 0.5, step: 0.1 },
      { tipo: "check", id: "a", label: "a) Replanteo de ejes según planos", defecto: true },
      { tipo: "check", id: "b", label: "b) Estacas para cortes", defecto: false },
      { tipo: "check", id: "c", label: "c) Gaveteo", defecto: false },
      { tipo: "check", id: "d", label: "d) Cordones o cunetas (ambos lados)", defecto: false },
      { tipo: "check", id: "e", label: "e) Tubería", defecto: false },
    ],
    calcular: (v, p) => {
      const km = num(v, "km");
      const lineas: Linea[] = [];
      if (chk(v, "a")) lineas.push(porKm("Replanteo de ejes según planos", 21560, km, 0.5, p));
      if (chk(v, "b")) lineas.push(porKm("Estacas para cortes", 17900, km, 0.5, p));
      if (chk(v, "c")) lineas.push(porKm("Gaveteo", 17350, km, 0.5, p));
      if (chk(v, "d")) lineas.push(porKm("Cordones o cunetas", 34700, km, 0.5, p));
      if (chk(v, "e")) lineas.push(porKm("Tubería", 17350, km, 0.5, p));
      return lineas;
    },
  },
  {
    id: "terrazas",
    grupo: TOPOGRAFIA,
    nombre: "Replanteo horizontal y vertical de terrazas",
    articulo: "",
    nota: "La tarifa por m² se elige según el tramo del área de cada terraza. Mínimo ₡2100 × i por terraza.",
    traslado: "topografia",
    campos: [
      { tipo: "numero", id: "area", label: "Área por terraza", unidad: "m²", defecto: 500 },
      { tipo: "numero", id: "cantidad", label: "Cantidad de terrazas", unidad: "terrazas", defecto: 1, min: 1, step: 1 },
    ],
    calcular: (v, p) => {
      const a = num(v, "area");
      const n = Math.max(Math.floor(num(v, "cantidad")), 1);
      const tramo = TERRAZA_TRAMOS.find((t) => a <= t.hasta)!;
      const formula = tramo.tarifa * p.i * a;
      const minimo = 2100 * p.i;
      return [
        {
          concepto: "Replanteo de terrazas",
          detalle: `${formula < minimo ? "Mínimo ₡2100 × i" : `₡${fmt(tramo.tarifa)} × i × ${fmt(a)} m²`} × ${n} terrazas`,
          monto: Math.max(formula, minimo) * n,
        },
      ];
    },
  },
  {
    id: "curvas",
    grupo: TOPOGRAFIA,
    nombre: "Curvas de nivel (intervalo de 1 m)",
    articulo: "",
    nota: "Incluye planos terminados.",
    traslado: "topografia",
    campos: [
      terrenoCampo,
      { tipo: "numero", id: "ha", label: "Superficie levantada", unidad: "ha", defecto: 1, step: 0.01 },
      {
        tipo: "check",
        id: "agricola",
        label: "Tarifa agrícola: más de 25 ha, despejado, pendiente < 5 %, cuadrícula ≥ 50 m",
        defecto: false,
      },
    ],
    calcular: (v, p) => {
      const h = num(v, "ha");
      if (chk(v, "agricola") && h > 25) {
        // El reglamento escribe "¢3000.00 por hectárea" sin "× i"; se ajusta
        // igual que el resto de montos de 1987, si no la cifra queda irrisoria.
        return [
          { concepto: "Primeras 25 ha", detalle: "₡110 000 × i", monto: 110000 * p.i },
          { concepto: "Hectáreas adicionales", detalle: `₡3000 × i × ${fmt(h - 25)} ha`, monto: 3000 * p.i * (h - 25) },
        ];
      }
      const t = (sel(v, "terreno") || "plano") as Terreno3;
      const tarifa = { plano: 6550, ondulado: 8950, montanoso: 10750 }[t];
      return [
        {
          concepto: "Curvas de nivel",
          detalle: `(₡${fmt(tarifa)} × ${fmt(h)} ha + ₡6550) × i${chk(v, "agricola") ? " — la tarifa agrícola solo aplica a más de 25 ha" : ""}`,
          monto: (tarifa * h + 6550) * p.i,
        },
      ];
    },
  },
  {
    id: "perfiles",
    grupo: TOPOGRAFIA,
    nombre: "Perfiles de ejes por método estadimétrico",
    articulo: "",
    nota: "Incluye detalles. Mínimo cobrable: 0,5 km.",
    traslado: "topografia",
    campos: [
      {
        tipo: "opcion",
        id: "tipo",
        label: "Condición del terreno",
        opciones: Object.entries(PERFILES_TIPOS).map(([valor, t]) => ({ valor, label: t.label })),
        defecto: "limpio",
      },
      { tipo: "numero", id: "km", label: "Longitud", unidad: "km", defecto: 0.5, step: 0.1 },
    ],
    calcular: (v, p) => {
      const t = PERFILES_TIPOS[sel(v, "tipo")] ?? PERFILES_TIPOS.limpio;
      return [porKm(`Perfiles — ${t.label.toLowerCase()}`, t.tarifa, num(v, "km"), 0.5, p)];
    },
  },
  {
    id: "minero",
    grupo: TOPOGRAFIA,
    nombre: "Denuncios mineros",
    articulo: "",
    nota: "Los amarres a hitos del IGN se cobran con las mismas tarifas de replanteo.",
    traslado: "topografia",
    campos: [
      { tipo: "numero", id: "ha", label: "a) Área del denuncio (planos de presentación)", unidad: "ha", defecto: 0, step: 0.01 },
      {
        tipo: "opcion",
        id: "replanteo",
        label: "b) Terreno del replanteo",
        opciones: [
          { valor: "plano-limpio", label: "Plano/ondulado, limpio" },
          { valor: "plano-tacotal", label: "Plano/ondulado, tacotal" },
          { valor: "plano-bosque", label: "Plano/ondulado, bosque" },
          { valor: "quebrado-limpio", label: "Quebrado, limpio" },
          { valor: "quebrado-tacotal", label: "Quebrado, tacotal" },
          { valor: "quebrado-bosque", label: "Quebrado, bosque" },
        ],
        defecto: "plano-limpio",
      },
      { tipo: "numero", id: "km", label: "Longitud de replanteo", unidad: "km", defecto: 0, step: 0.1 },
    ],
    calcular: (v, p) => {
      const lineas: Linea[] = [];
      const h = num(v, "ha");
      if (h > 0) {
        lineas.push({ concepto: "Planos de presentación", detalle: `(₡11 900 + ₡6,85 × ${fmt(h)} ha) × i`, monto: (11900 + 6.85 * h) * p.i });
      }
      const km = num(v, "km");
      if (km > 0) {
        const tarifa = MINERO_REPLANTEO[sel(v, "replanteo")] ?? MINERO_REPLANTEO["plano-limpio"];
        lineas.push(porKm("Replanteo", tarifa, km, 0, p));
      }
      return lineas;
    },
  },
  {
    id: "cementerio",
    grupo: TOPOGRAFIA,
    nombre: "Inscripción de cementerios",
    articulo: "",
    nota: "Los jardines o secciones se cotizan aparte con la tarifa urbana . Materiales (concreto, varilla, bronce) por cuenta del contratante.",
    traslado: "topografia",
    campos: [
      { tipo: "numero", id: "ha", label: "a) Plano general", unidad: "ha", defecto: 0, step: 0.01 },
      { tipo: "numero", id: "sencillas", label: "Tumbas sencillas", unidad: "tumbas", defecto: 0, step: 1 },
      { tipo: "numero", id: "dobles", label: "Tumbas dobles (+25 %)", unidad: "tumbas", defecto: 0, step: 1 },
      { tipo: "numero", id: "triples", label: "Tumbas triples (+50 %)", unidad: "tumbas", defecto: 0, step: 1 },
    ],
    calcular: (v, p) => {
      const lineas: Linea[] = [];
      const ha = num(v, "ha");
      if (ha > 0) lineas.push({ concepto: "Plano general", detalle: `₡10 800 × i × ${fmt(ha)} ha`, monto: 10800 * p.i * ha });
      // Igual que en curvas de nivel: el ₡560 por tumba se ajusta con i.
      const tumbas = [
        { id: "sencillas", label: "Tumbas sencillas", factor: 1 },
        { id: "dobles", label: "Tumbas dobles", factor: 1.25 },
        { id: "triples", label: "Tumbas triples", factor: 1.5 },
      ];
      for (const t of tumbas) {
        const n = Math.floor(num(v, t.id));
        if (n > 0) {
          lineas.push({ concepto: `${t.label} (replanteo y ubicación)`, detalle: `₡560 × ${fmt(t.factor)} × i × ${n}`, monto: 560 * t.factor * p.i * n });
        }
      }
      return lineas;
    },
  },
  {
    id: "consulta",
    grupo: "Consultas",
    nombre: "Consulta profesional",
    articulo: "",
    nota: "Mínimo ₡350 × i por consulta; más de una hora se cobra a ₡700 × i por hora. Fuera de la sede, sume los gastos de traslado.",
    traslado: "topografia",
    campos: [{ tipo: "numero", id: "horas", label: "Duración", unidad: "horas", defecto: 1, step: 0.5 }],
    calcular: (v, p) => {
      const horas = num(v, "horas");
      return horas > 1
        ? [{ concepto: "Consulta profesional", detalle: `₡700 × i × ${fmt(horas)} h`, monto: 700 * p.i * horas }]
        : [{ concepto: "Consulta profesional", detalle: "Mínimo ₡350 × i", monto: 350 * p.i }];
    },
  },
  avaluoServicio("avaluo-terreno", "Avalúo de terreno", "", 1.5, 0.6, 6, "Valor del terreno"),
  avaluoServicio("avaluo-edificacion", "Avalúo de edificaciones y obras civiles", "", 0.4, 0.7, 6, "Valor de la edificación"),
  avaluoServicio("avaluo-maquinaria", "Avalúo de maquinaria y vehículos", "", 0.4, 0.7, 6),
  avaluoServicio("avaluo-equipos", "Avalúo de equipos y líneas de producción", "", 0.5, 0.7, 3),
  avaluoServicio("avaluo-mobiliario", "Avalúo de mobiliario y equipo de oficina", "", 2.6, 0.75, 3),
  avaluoServicio("avaluo-alquiler", "Determinación de alquileres", "", 0.45, 0.7, 3),
  {
    id: "peritaje",
    grupo: "Peritajes y avalúos",
    nombre: "Peritaje",
    articulo: "",
    nota: "Mínimo 6 horas profesionales.",
    traslado: "avaluo",
    campos: [{ tipo: "numero", id: "horas", label: "Horas invertidas", unidad: "horas", defecto: 6, step: 0.5 }],
    calcular: (v, p) => {
      const horas = Math.max(num(v, "horas"), 6);
      return [
        {
          concepto: "Peritaje",
          detalle: `2,43 × ₡${fmt(p.horaProfesional)} × ${fmt(horas)} h${num(v, "horas") < 6 ? " (mínimo 6 h)" : ""}`,
          monto: 2.43 * p.horaProfesional * horas,
        },
      ];
    },
  },
  {
    id: "avaluo-credito",
    grupo: "Peritajes y avalúos)",
    nombre: "Avalúo para crédito hipotecario o prendario",
    articulo: "",
    traslado: "avaluo",
    campos: [{ tipo: "numero", id: "monto", label: "Monto del crédito", unidad: "₡", defecto: 0, step: 1000 }],
    calcular: (v, p) => avaluo("Avalúo para crédito", 1, 0.65, num(v, "monto"), 0, false, p),
  },
];

// --- gastos reembolsables --------------------------------------------------

export type Gastos = {
  /** Distancia del sitio a la sede u oficina del profesional, solo ida. */
  distanciaKm: number;
  /** Tiempo total de traslado (ida y vuelta). */
  horasTraslado: number;
  /** Kilometraje de la tabla de la Contraloría (solo avalúos). */
  tarifaKmCGR: number;
  /** Alimentación, hospedaje, derechos de inscripción, timbres, copias, etc. */
  otros: number;
};

export function calcularGastos(tipo: TipoTraslado, g: Gastos, p: Parametros): Linea[] {
  const lineas: Linea[] = [];
  const kmRecorridos = g.distanciaKm * 2;

  if (tipo === "avaluo") {
    // Art. 2 del 35298: solo se reconoce el exceso sobre 1 h y 10 km.
    const horasExceso = Math.max(g.horasTraslado - 1, 0);
    if (horasExceso > 0) {
      lineas.push({
        concepto: "Tiempo de desplazamiento",
        detalle: `${fmt(horasExceso)} h sobre la primera × ₡${fmt(p.horaProfesional)}`,
        monto: horasExceso * p.horaProfesional,
      });
    }
    const kmExceso = Math.max(kmRecorridos - 10, 0);
    if (kmExceso > 0 && g.tarifaKmCGR > 0) {
      lineas.push({
        concepto: "Kilometraje (tabla CGR)",
        detalle: `${fmt(kmExceso)} km sobre los primeros 10 × ₡${fmt(g.tarifaKmCGR)}`,
        monto: kmExceso * g.tarifaKmCGR,
      });
    }
  } else {
    // Art. 4 del 17481: transporte solo a más de 25 km de la sede; tiempo de
    // traslado solo si supera una hora (y entonces se cobra completo).
    if (g.distanciaKm > 25) {
      lineas.push({
        concepto: "Transporte",
        detalle: `₡14,70 × i × ${fmt(kmRecorridos)} km (ida y vuelta)`,
        monto: 14.7 * p.i * kmRecorridos,
      });
    }
    if (g.horasTraslado > 1) {
      const tarifa = tipo === "agrimensura" ? 600 : 1190;
      lineas.push({
        concepto: `Tiempo de traslado de cuadrilla, ${tipo}`,
        detalle: `₡${fmt(tarifa)} × i × ${fmt(g.horasTraslado)} h`,
        monto: tarifa * p.i * g.horasTraslado,
      });
    }
  }

  if (g.otros > 0) {
    lineas.push({ concepto: "Otros gastos reembolsables", detalle: "Monto ingresado", monto: g.otros });
  }
  return lineas;
}

export const sumar = (lineas: Linea[]) => lineas.reduce((s, l) => s + l.monto, 0);

export function valoresPorDefecto(servicio: Servicio): Valores {
  return Object.fromEntries(
    servicio.campos.map((c) => [c.id, c.tipo === "numero" ? String(c.defecto) : c.defecto])
  );
}
