import { z } from "zod";

export type DateRange = { desde?: string; hasta?: string };

const isoDate = z.string().date();

/** Lee `desde`/`hasta` de la URL; descarta lo que no sea una fecha `YYYY-MM-DD` válida. */
export function parseDateRange(params: { desde?: string; hasta?: string }): DateRange {
  return {
    desde: isoDate.safeParse(params.desde).success ? params.desde : undefined,
    hasta: isoDate.safeParse(params.hasta).success ? params.hasta : undefined,
  };
}
