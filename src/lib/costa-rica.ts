/**
 * División territorial administrativa de Costa Rica: 7 provincias y sus 84
 * cantones (incluye Río Cuarto, Monteverde y Puerto Jiménez, los más
 * recientes). Lo usan el formulario de contacto (navegador) y su validación
 * con zod (servidor), así que no puede importar nada de servidor.
 */
export const CANTONES_POR_PROVINCIA = {
  "San José": [
    "San José", "Escazú", "Desamparados", "Puriscal", "Tarrazú", "Aserrí", "Mora",
    "Goicoechea", "Santa Ana", "Alajuelita", "Vázquez de Coronado", "Acosta", "Tibás",
    "Moravia", "Montes de Oca", "Turrubares", "Dota", "Curridabat", "Pérez Zeledón",
    "León Cortés Castro",
  ],
  Alajuela: [
    "Alajuela", "San Ramón", "Grecia", "San Mateo", "Atenas", "Naranjo", "Palmares",
    "Poás", "Orotina", "San Carlos", "Zarcero", "Sarchí", "Upala", "Los Chiles",
    "Guatuso", "Río Cuarto",
  ],
  Cartago: [
    "Cartago", "Paraíso", "La Unión", "Jiménez", "Turrialba", "Alvarado", "Oreamuno",
    "El Guarco",
  ],
  Heredia: [
    "Heredia", "Barva", "Santo Domingo", "Santa Bárbara", "San Rafael", "San Isidro",
    "Belén", "Flores", "San Pablo", "Sarapiquí",
  ],
  Guanacaste: [
    "Liberia", "Nicoya", "Santa Cruz", "Bagaces", "Carrillo", "Cañas", "Abangares",
    "Tilarán", "Nandayure", "La Cruz", "Hojancha",
  ],
  Puntarenas: [
    "Puntarenas", "Esparza", "Buenos Aires", "Montes de Oro", "Osa", "Quepos", "Golfito",
    "Coto Brus", "Parrita", "Corredores", "Garabito", "Monteverde", "Puerto Jiménez",
  ],
  Limón: ["Limón", "Pococí", "Siquirres", "Talamanca", "Matina", "Guácimo"],
} as const satisfies Record<string, readonly string[]>;

export type Provincia = keyof typeof CANTONES_POR_PROVINCIA;

export const PROVINCIAS = Object.keys(CANTONES_POR_PROVINCIA) as [Provincia, ...Provincia[]];

export function esCantonDe(provincia: Provincia, canton: string): boolean {
  return (CANTONES_POR_PROVINCIA[provincia] as readonly string[]).includes(canton);
}
