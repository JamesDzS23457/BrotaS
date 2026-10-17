// Pruebas unitarias con el ejecutor de Node (sin dependencias): `npm run test:unit`
import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePrecio, textoQuedan } from "../format.ts";

test("los miles a la colombiana no se leen como decimales", () => {
  assert.equal(parsePrecio("25.000"), 25000);
  assert.equal(parsePrecio("1.250.000"), 1250000);
  assert.equal(parsePrecio("25,000"), 25000);
  assert.equal(parsePrecio("$ 25.000"), 25000);
});

test("los decimales se leen con coma o con punto", () => {
  assert.equal(parsePrecio("25,50"), 25.5);
  assert.equal(parsePrecio("25.5"), 25.5);
  assert.equal(parsePrecio("25.50"), 25.5);
  assert.equal(parsePrecio("1.250,75"), 1250.75);
  assert.equal(parsePrecio("1,250.75"), 1250.75);
});

test("los números simples y el cero son válidos", () => {
  assert.equal(parsePrecio("25000"), 25000);
  assert.equal(parsePrecio("0"), 0);
  assert.equal(parsePrecio("  6500 "), 6500);
});

test("el texto que no es un precio se rechaza", () => {
  assert.equal(parsePrecio(""), null);
  assert.equal(parsePrecio("abc"), null);
  assert.equal(parsePrecio("-5"), null);
  assert.equal(parsePrecio("12a"), null);
  assert.equal(parsePrecio("."), null);
});

test("«Queda» y «Quedan» concuerdan con la cantidad", () => {
  assert.equal(textoQuedan(1), "Queda 1");
  assert.equal(textoQuedan(3), "Quedan 3");
});
