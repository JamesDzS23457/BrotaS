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

// Lee un precio escrito a la colombiana o a la internacional.
// «25.000» y «25,000» son veinticinco mil; «25,50» y «25.50» son veinticinco con cincuenta.
// Devuelve null si el texto no es un número válido.
export function parsePrecio(texto: string): number | null {
  const limpio = texto.replace(/[\s$]/g, "");
  if (!/^\d[\d.,]*$/.test(limpio)) return null;

  const ultimoPunto = limpio.lastIndexOf(".");
  const ultimaComa = limpio.lastIndexOf(",");
  let normalizado: string;

  if (ultimoPunto !== -1 && ultimaComa !== -1) {
    // Los dos signos: el que va al final es el decimal y el otro separa miles
    const decimal = ultimoPunto > ultimaComa ? "." : ",";
    const miles = decimal === "." ? "," : ".";
    normalizado = limpio.split(miles).join("").replace(decimal, ".");
  } else if (ultimoPunto !== -1 || ultimaComa !== -1) {
    const separador = ultimoPunto !== -1 ? "." : ",";
    const grupos = limpio.split(separador);
    // Varios separadores, o un solo grupo de tres cifras al final, son miles
    const esMiles =
      grupos.length > 2 || (grupos.length === 2 && grupos[1].length === 3 && grupos[0].length <= 3);
    normalizado = esMiles ? grupos.join("") : `${grupos[0]}.${grupos[1]}`;
  } else {
    normalizado = limpio;
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

// «Queda 1» / «Quedan 3»: concuerda con el número
export function textoQuedan(cantidad: number): string {
  return cantidad === 1 ? "Queda 1" : `Quedan ${cantidad}`;
}
