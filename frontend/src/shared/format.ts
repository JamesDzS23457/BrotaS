// Dinero en la moneda del local (por defecto, pesos colombianos)
export function formatCOP(valor: string | number, currency: string | null = "COP"): string {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  const moneda = currency && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : "COP";
  if (Number.isNaN(numero)) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numero);
}
