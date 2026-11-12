/**
 * ¿Corre como app instalada (agregada a la pantalla de inicio)? `navigator.standalone`
 * es el equivalente de iOS Safari, que no siempre respeta el media query.
 */
export function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
