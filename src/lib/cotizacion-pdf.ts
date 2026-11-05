import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { businessInfo, contactContent, cotizadorContent } from "@/config/site";
import { formatColones } from "@/lib/format";
import type { Linea } from "@/lib/tarifas-cit";

export type DatosCliente = {
  nombre: string;
  telefono: string;
  servicio: string;
  descripcion: string;
};

export type DatosCotizacion = {
  cliente: DatosCliente;
  honorarios: Linea[];
  reembolsables: Linea[];
  totalHonorarios: number;
  totalGastos: number;
};

/**
 * Las fuentes estándar de jsPDF solo cubren WinAnsi: el símbolo ₡ y el espacio
 * fino que usa es-CR como separador de miles saldrían como basura.
 */
const pdfText = (s: string) =>
  s.replace(/₡/g, "¢").replace(/[  ]/g, " ").replace(/√/g, "raíz ").replace(/≥/g, ">=");

const monto = (n: number) => pdfText(formatColones(n));

/** Genera la cotización y la descarga. jsPDF se carga recién al exportar. */
export async function exportarCotizacionPdf(datos: DatosCotizacion) {
  const { jsPDF } = await import("jspdf");
  const t = cotizadorContent.pdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });

  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const margen = 20;
  const derecha = ancho - margen;
  const util = ancho - margen * 2;
  let y = margen;

  const saltoSiHaceFalta = (espacio: number) => {
    if (y + espacio > alto - margen) {
      doc.addPage();
      y = margen;
    }
  };

  const hoy = new Date();
  const vence = addMonths(hoy, 1);
  const fechaLarga = (d: Date) => format(d, "d 'de' MMMM 'de' yyyy", { locale: es });

  // Encabezado
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(20, 33, 61);
  doc.text(pdfText(businessInfo.legalName), margen, y + 4);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90);
  doc.text(pdfText(`${contactContent.whatsapp.displayNumber}  ·  ${contactContent.email}`), margen, y + 10);

  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(20, 33, 61);
  doc.text(t.titulo, derecha, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90);
  doc.text(`${t.fecha}: ${fechaLarga(hoy)}`, derecha, y + 10, { align: "right" });
  doc.text(`${t.validaHasta}: ${fechaLarga(vence)}`, derecha, y + 14.5, { align: "right" });

  y += 20;
  doc.setDrawColor(20, 33, 61).setLineWidth(0.5).line(margen, y, derecha, y);
  y += 8;

  // Datos del cliente
  const c = cotizadorContent.cliente;
  const filas: [string, string][] = [
    [c.nombre, datos.cliente.nombre],
    [c.telefono, datos.cliente.telefono],
    [c.servicio, datos.cliente.servicio],
    [c.descripcion, datos.cliente.descripcion],
  ];
  doc.setFontSize(10).setTextColor(30);
  for (const [label, valor] of filas) {
    if (!valor.trim()) continue;
    const lineas = doc.splitTextToSize(pdfText(valor.trim()), util - 32) as string[];
    saltoSiHaceFalta(lineas.length * 5 + 2);
    doc.setFont("helvetica", "bold").text(`${label}:`, margen, y);
    doc.setFont("helvetica", "normal").text(lineas, margen + 32, y);
    y += lineas.length * 5 + 1.5;
  }
  y += 4;

  // Detalle
  const tabla = (titulo: string, lineas: Linea[]) => {
    if (lineas.length === 0) return;
    saltoSiHaceFalta(16);
    doc.setFillColor(238, 240, 244).rect(margen, y - 4.5, util, 7, "F");
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20, 33, 61);
    doc.text(titulo, margen + 2, y);
    y += 7;
    doc.setFont("helvetica", "normal").setTextColor(30);
    for (const l of lineas) {
      const concepto = doc.splitTextToSize(pdfText(l.concepto), util - 45) as string[];
      saltoSiHaceFalta(concepto.length * 5 + 2);
      doc.text(concepto, margen + 2, y);
      doc.text(monto(l.monto), derecha - 2, y, { align: "right" });
      y += concepto.length * 5 + 1.5;
    }
    y += 3;
  };
  tabla(t.honorarios, datos.honorarios);
  tabla(t.gastos, datos.reembolsables);

  // Totales
  saltoSiHaceFalta(24);
  doc.setDrawColor(180).setLineWidth(0.3).line(margen, y, derecha, y);
  y += 6;
  doc.setFontSize(10).setTextColor(60);
  const total = (label: string, valor: number) => {
    doc.text(label, derecha - 80, y);
    doc.text(monto(valor), derecha - 2, y, { align: "right" });
    y += 5.5;
  };
  total(t.honorarios, datos.totalHonorarios);
  if (datos.reembolsables.length > 0) total(t.gastos, datos.totalGastos);
  y += 1;
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(20, 33, 61);
  doc.text(t.total, derecha - 80, y);
  doc.text(monto(datos.totalHonorarios + datos.totalGastos), derecha - 2, y, { align: "right" });
  y += 12;

  // Condiciones
  const condiciones = t.condiciones.map((s) => pdfText(s.replace("{fecha}", fechaLarga(vence))));
  saltoSiHaceFalta(10 + condiciones.length * 5);
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20, 33, 61);
  doc.text(t.condicionesTitulo, margen, y);
  y += 5.5;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(60);
  for (const cond of condiciones) {
    const lineas = doc.splitTextToSize(`•  ${cond}`, util) as string[];
    saltoSiHaceFalta(lineas.length * 4.5);
    doc.text(lineas, margen, y);
    y += lineas.length * 4.5 + 0.5;
  }

  const slug = datos.cliente.nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  doc.save(`cotizacion-${slug || "cliente"}-${format(hoy, "yyyy-MM-dd")}.pdf`);
}
