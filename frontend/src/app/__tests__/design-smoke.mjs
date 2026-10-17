// Prueba visual con Chrome y CDP, sin dependencias ni credenciales reales.
// La API se simula solo dentro de este navegador temporal: el código de la app no cambia.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const profile = await mkdtemp(join(tmpdir(), "brota-ui-"));
const server = await createServer({ server: { host: "127.0.0.1", port: 4173, strictPort: true } });
const output = "dist/design-review";
let chrome;
let socket;
let browserError = "";
const deadline = setTimeout(() => {
  console.error("La prueba excedió 120 segundos.");
  chrome?.kill("SIGTERM");
  process.exit(1);
}, 120_000);

// API simulada que se inyecta en cada página nueva
const MOCK_API = `
  const realFetch = window.fetch.bind(window);
  const CATEGORIAS = [
    {id:1, tenant_id:1, name:'Ramos', is_active:true},
    {id:2, tenant_id:1, name:'Arreglos', is_active:true}
  ];
  const PRODUCTOS = [
    {id:1, tenant_id:1, category_id:1, name:'Ramo de temporada', description:null, price:'85000.00', stock:12, min_stock:3, image_url:null, is_published:true, is_active:true},
    {id:2, tenant_id:1, category_id:2, name:'Arreglo floral con un nombre largo para comprobar la lectura en pantallas pequeñas', description:null, price:'120000.00', stock:2, min_stock:3, image_url:null, is_published:false, is_active:true},
    {id:3, tenant_id:1, category_id:1, name:'Peonías', description:null, price:'18000.00', stock:0, min_stock:5, image_url:null, is_published:false, is_active:true},
    {id:4, tenant_id:1, category_id:1, name:'Rosas rojas', description:null, price:'6500.00', stock:30, min_stock:10, image_url:null, is_published:true, is_active:true}
  ];
  const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json'}});
  window.fetch = async (resource, options = {}) => {
    const url = new URL(String(resource), location.href);
    if (!url.pathname.includes('/api/v1/')) return realFetch(resource, options);
    const path = url.pathname.split('/api/v1')[1];
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : null;
    if (path === '/auth/login') {
      await new Promise(resolve => setTimeout(resolve, 250));
      return json({detail:'Revisa tu correo y contraseña e intenta de nuevo.'}, 401);
    }
    if (path === '/auth/me') return json({id:1, tenant_id:1, role:'owner', email:'cuenta-de-prueba-con-un-nombre-muy-largo@ejemplo.invalid', currency:'COP', timezone:'America/Bogota'});
    if (path === '/florist/categories') return json(CATEGORIAS);
    if (path === '/florist/products/low-stock') return json(PRODUCTOS.filter(p => p.stock <= p.min_stock));
    if (/^\\/florist\\/products\\/\\d+\\/stock$/.test(path) && method === 'POST') {
      const producto = PRODUCTOS.find(p => p.id === Number(path.split('/')[3]));
      if (producto.stock + body.change < 0) return json({detail:'El stock no puede quedar negativo.'}, 400);
      producto.stock += body.change;
      return json({id:99, product_id:producto.id, quantity_change:body.change, reason:body.reason, created_at:new Date().toISOString(), stock_after:producto.stock});
    }
    if (path === '/florist/products' && method === 'POST') {
      window.__ultimoProducto = body;
      return json({...PRODUCTOS[0], id:77, name:body.name, price:body.price, stock:0}, 201);
    }
    if (path === '/florist/products') {
      const texto = (url.searchParams.get('search') || '').toLowerCase();
      const categoria = url.searchParams.get('category_id');
      const items = PRODUCTOS.filter(p => (!texto || p.name.toLowerCase().includes(texto)) && (!categoria || p.category_id === Number(categoria)));
      return json({items, total:items.length, page:1, page_size:12, pages:items.length ? 1 : 0});
    }
    if (path === '/florist/sales' && method === 'POST') {
      const items = body.items.map((item, i) => ({id:i + 1, product_id:item.product_id, quantity:item.quantity, unit_price:PRODUCTOS.find(p => p.id === item.product_id).price}));
      const total = items.reduce((suma, item) => suma + Number(item.unit_price) * item.quantity, 0);
      return json({id:41, tenant_id:1, user_id:1, total:total.toFixed(2), payment_method:body.payment_method, created_at:new Date().toISOString(), items});
    }
    if (path === '/florist/reports/daily') {
      return json({date:url.searchParams.get('date'), total_sold:'452000.00', sales_count:6,
        top_products:[{product_id:4, name:'Rosas rojas', quantity:24, revenue:'156000.00'},{product_id:1, name:'Ramo de temporada', quantity:3, revenue:'255000.00'},{product_id:3, name:'Peonías', quantity:2, revenue:'36000.00'}],
        low_stock:PRODUCTOS.filter(p => p.stock <= p.min_stock)});
    }
    throw new Error('Petición no prevista en la prueba visual: ' + method + ' ' + path);
  };
`;

try {
  await server.listen();
  chrome = spawn(process.env.CHROME_BIN ?? "google-chrome-stable", [
    "--headless=new", "--disable-dev-shm-usage", "--no-first-run",
    ...(process.env.CHROME_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  chrome.on("error", (error) => { browserError = error.message; });
  chrome.stderr.on("data", (chunk) => { browserError += chunk.toString(); });

  let browserUrl;
  for (let attempt = 0; attempt < 80; attempt++) {
    browserUrl = browserError.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
    if (browserUrl) break;
    if (chrome.exitCode !== null) throw new Error(browserError);
    await delay(100);
  }
  assert.ok(browserUrl, `Chrome no inició: ${browserError}`);
  const debugOrigin = new URL(browserUrl).origin.replace("ws:", "http:");
  const pages = await (await fetch(`${debugOrigin}/json`)).json();
  socket = new WebSocket(pages.find((page) => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  const runtimeErrors = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") {
      runtimeErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    }
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timeout);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP sin respuesta: ${method}`));
      }, 8000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function waitFor(expression, what = expression) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return;
      await delay(100);
    }
    throw new Error(`No se cumplió: ${what}`);
  }
  async function viewport(width, height = 844) {
    await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 640 });
    await delay(100);
  }
  async function motion(value) {
    await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value }] });
  }
  async function navigate(path, ready) {
    await cdp("Page.navigate", { url: `http://127.0.0.1:4173${path}` });
    await waitFor(ready, `${path} listo`);
    await evaluate("Promise.all([document.fonts.ready, ...Array.from(document.images, image => image.decode().catch(() => {}))]).then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))");
  }
  async function screenshot(name) {
    const image = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(`${output}/${name}.png`, Buffer.from(image.data, "base64"));
  }
  async function key(key, code, extra = {}) {
    const virtualKey = { Tab: 9, Enter: 13, Escape: 27 }[key];
    await cdp("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, ...extra });
    await cdp("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, ...extra });
    await delay(30);
  }
  const clickByText = (selector, text) =>
    evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.trim().includes(${JSON.stringify(text)})); if (!el) throw new Error('No hay ${text}'); el.click(); return true; })()`);
  const escribir = (selector, value) =>
    evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) throw new Error('No hay ${selector}');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
  const noOverflow = async (label, width) =>
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= ${width}`), `Desbordamiento horizontal: ${label} a ${width}px`);

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: MOCK_API });
  await mkdir(output, { recursive: true });
  // Las capturas y comprobaciones van sin movimiento para que sean deterministas
  await motion("reduce");

  // ------------------------------------------------------------------- acceso
  const sizes = [[1440, 960], [1280, 720], [1024, 768], [768, 1024], [390, 844], [320, 740]];
  for (const [width, height] of sizes) {
    await viewport(width, height);
    await navigate("/login", "Boolean(document.querySelector('.login-photo')?.complete && document.querySelector('.login-photo')?.naturalWidth)");
    await noOverflow("login", width);
    assert.ok(await evaluate("document.fonts.check('500 16px Manrope') && document.fonts.check('400 16px \"Hanken Grotesk\"')"));
    assert.ok(await evaluate("document.querySelector('button[type=submit]').getBoundingClientRect().bottom <= innerHeight"), `Acceso fuera de la primera pantalla en ${width}x${height}`);
    assert.ok(await evaluate("document.querySelector('.login-headline').getBoundingClientRect().height > 0"));
    await screenshot(`login-${width}`);
    console.log(`✓ Login ${width}px: sin desbordamiento, recursos locales y acceso visible`);
  }

  await viewport(1440, 960);
  await navigate("/login", "Boolean(document.querySelector('.login-photo')?.complete)");
  assert.ok(await evaluate("getComputedStyle(document.querySelector('.login-chips')).display === 'block'"), "Las fichas de ejemplo deben verse en 1440px");
  await viewport(1024, 768);
  assert.ok(await evaluate("getComputedStyle(document.querySelector('.login-chips')).display === 'none'"), "Las fichas se ocultan en 1024px para no tapar el titular");

  await viewport(1440, 960);
  await key("Tab", "Tab");
  assert.ok(await evaluate("document.activeElement.matches('.skip-link')"));
  assert.notEqual(await evaluate("getComputedStyle(document.activeElement).outlineStyle"), "none");
  await key("Enter", "Enter");
  assert.equal(await evaluate("document.activeElement.id"), "contenido");
  await evaluate("document.querySelector('button[aria-controls=\"login-password\"]').click()");
  await waitFor("document.querySelector('#login-password').type === 'text'");
  await evaluate("document.querySelector('button[aria-controls=\"login-password\"]').click()");
  await waitFor("document.querySelector('#login-password').type === 'password'");
  console.log("✓ Teclado, enlace de salto y visibilidad de contraseña");

  await evaluate(`document.querySelector('#login-password').dispatchEvent(new KeyboardEvent('keyup', {key:'A', modifierCapsLock:true, bubbles:true}))`);
  await waitFor("document.body.innerText.includes('Bloq Mayús está activado')");
  await evaluate(`document.querySelector('#login-password').dispatchEvent(new KeyboardEvent('keyup', {key:'a', modifierCapsLock:false, bubbles:true}))`);
  await waitFor("!document.body.innerText.includes('Bloq Mayús está activado')");
  console.log("✓ Aviso de Bloq Mayús aparece y desaparece");

  await evaluate(`
    for (const [name, value] of [['email','prueba@ejemplo.invalid'],['password','solo-para-la-prueba']]) {
      const input = document.querySelector('input[name='+name+']');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  `);
  await evaluate("document.querySelector('form').requestSubmit()");
  await waitFor("Boolean(document.querySelector('button[aria-busy=true]'))");
  await waitFor("Boolean(document.querySelector('[role=alert]'))");
  assert.ok(await evaluate("document.activeElement.matches('[role=alert]')"));
  assert.ok(await evaluate("!document.querySelector('button[type=submit]').disabled"));
  console.log("✓ Formulario: carga, error anunciado y foco recuperable (API simulada)");

  // Con movimiento permitido, la foto florece y el titular sube
  await motion("no-preference");
  await cdp("Page.navigate", { url: "http://127.0.0.1:4173/login" });
  await waitFor("document.getAnimations().some(a => a.animationName === 'login-bloom')", "animación de la foto");
  await waitFor("document.getAnimations().some(a => a.animationName === 'login-rise')", "animación del titular");
  assert.ok(await evaluate("document.getAnimations().some(a => a.animationName === 'login-panel')"));
  await motion("reduce");
  await cdp("Page.navigate", { url: "http://127.0.0.1:4173/login" });
  await waitFor("Boolean(document.querySelector('.login-photo'))");
  assert.equal(await evaluate("document.getAnimations().filter(a => a.animationName?.startsWith('login-')).length"), 0, "Con movimiento reducido no debe haber animaciones de acceso");
  console.log("✓ Animación de entrada activa con movimiento permitido y apagada con movimiento reducido");

  // -------------------------------------------------------------------- panel
  const token = `test.${Buffer.from(JSON.stringify({ user_id: 1, tenant_id: 1, role: "owner", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;
  await evaluate(`localStorage.setItem('brotas_token', ${JSON.stringify(token)})`);

  for (const width of [1440, 390, 320]) {
    await viewport(width);
    await navigate("/productos?vista=tarjetas", "document.querySelectorAll('article').length === 4");
    await noOverflow("productos (tarjetas)", width);
    assert.equal(await evaluate("document.querySelectorAll('dialog[open]').length"), 0);
    await screenshot(`productos-tarjetas-${width}`);

    await clickByText("button", "Lista");
    await waitFor("document.querySelectorAll('li[aria-label]').length === 4");
    assert.ok(await evaluate("location.search.includes('vista=lista')"), "La vista debe quedar en la URL");
    await noOverflow("productos (lista)", width);
    await screenshot(`productos-lista-${width}`);
    console.log(`✓ Productos ${width}px: tarjetas, lista, sin desbordamiento y vista en la URL`);
  }

  await viewport(1440);
  await navigate("/productos?filtro=bajo", "document.querySelectorAll('article, li[aria-label]').length === 2");
  assert.ok(await evaluate("[...document.querySelectorAll('button[aria-pressed=true]')].some(b => b.textContent.includes('Stock bajo'))"));
  assert.ok(await evaluate("document.body.innerText.includes('2 productos con stock bajo')"));
  await screenshot("productos-stock-bajo-1440");
  console.log("✓ Filtro «Stock bajo» desde la URL, con contador y estado marcado");

  await navigate("/productos?q=zzzz", "document.body.innerText.includes('No encontramos productos')");
  await clickByText("button", "Limpiar filtros");
  await waitFor("document.querySelectorAll('article, li[aria-label]').length === 4");
  console.log("✓ Estado vacío con «Limpiar filtros»");

  await navigate("/productos?vista=tarjetas&categoria=2", "document.querySelectorAll('article').length === 1");
  console.log("✓ Filtro por categoría");

  await navigate("/productos?vista=tarjetas", "document.querySelectorAll('article').length === 4");
  await evaluate("document.querySelector('button[aria-label=\"Sumar 1 a Rosas rojas\"]').click()");
  await waitFor("document.body.innerText.includes('Sumaste 1 a Rosas rojas. Ahora hay 31.')");
  assert.ok(await evaluate("Boolean(document.querySelector('[role=status] button'))"), "El aviso debe ofrecer Deshacer");
  await screenshot("productos-aviso-1440");
  await clickByText("button", "Deshacer");
  await waitFor("document.body.innerText.includes('Cambio deshecho. Rosas rojas: 30 en stock.')");
  console.log("✓ Ajuste de stock con aviso y «Deshacer»");

  await clickByText("button", "Nuevo producto");
  await waitFor("Boolean(document.querySelector('dialog[open]'))");
  assert.ok(await evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"), "El foco debe quedar dentro del modal");
  assert.equal(await evaluate("getComputedStyle(document.documentElement).overflow"), "hidden", "Con el modal abierto la página de atrás no debe desplazarse");
  await screenshot("modal-producto-1440");
  await key("Escape", "Escape");
  await waitFor("!document.querySelector('dialog[open]')");
  console.log("✓ Modal de producto: foco contenido, página bloqueada y Escape");

  // -------------------------------- modal: errores junto a cada campo y cambios sin guardar
  await clickByText("button", "Nuevo producto");
  await waitFor("Boolean(document.querySelector('dialog[open]'))");

  // Enviar vacío marca cada campo por separado y no llama a la API
  await evaluate("document.querySelector('dialog[open] form').requestSubmit()");
  await waitFor("document.body.innerText.includes('Escribe el nombre del producto.')");
  assert.equal(await evaluate("document.activeElement.name"), "name", "El foco va al primer campo con error");
  assert.ok(
    await evaluate("document.querySelector('dialog[open] input[name=name]').getAttribute('aria-invalid') === 'true'"),
    "El campo con error debe marcarse como inválido",
  );
  assert.ok(await evaluate("Boolean(document.querySelector('dialog[open]'))"), "Con errores el modal sigue abierto");
  await screenshot("modal-errores-1440");

  // Al corregir el nombre, su error desaparece
  await escribir("dialog[open] input[name=name]", "Lirios blancos");
  await waitFor("!document.body.innerText.includes('Escribe el nombre del producto.')");

  // Precio con tres decimales y un mínimo no entero: cada aviso queda junto a su campo
  await escribir("dialog[open] input[name=price]", "1.250,755");
  await escribir("dialog[open] input[name=min_stock]", "3,5");
  await evaluate("document.querySelector('dialog[open] form').requestSubmit()");
  await waitFor("document.body.innerText.includes('El precio admite máximo dos decimales.')");
  assert.ok(await evaluate("document.body.innerText.includes('Usa un número entero mayor o igual a cero.')"));
  assert.equal(await evaluate("document.activeElement.name"), "price");

  // Cerrar con cambios pregunta antes de perderlos
  await escribir("dialog[open] input[name=price]", "25.000");
  await key("Escape", "Escape");
  await waitFor("document.body.innerText.includes('¿Descartar los cambios?')");
  assert.ok(await evaluate("Boolean(document.querySelector('dialog[open]'))"), "Con cambios el modal no se cierra solo");
  await screenshot("modal-descartar-1440");

  // Escape en la pregunta vuelve al formulario con lo escrito
  await key("Escape", "Escape");
  await waitFor("!document.body.innerText.includes('¿Descartar los cambios?')");
  assert.equal(
    await evaluate("document.querySelector('dialog[open] input[name=name]').value"),
    "Lirios blancos",
    "Escape en la pregunta vuelve al formulario",
  );

  // Cancelar también pregunta; «Seguir editando» conserva lo escrito
  await clickByText("button", "Cancelar");
  await waitFor("document.body.innerText.includes('¿Descartar los cambios?')");
  await clickByText("button", "Seguir editando");
  await waitFor("!document.body.innerText.includes('¿Descartar los cambios?')");
  assert.equal(
    await evaluate("document.querySelector('dialog[open] input[name=name]').value"),
    "Lirios blancos",
    "«Seguir editando» conserva lo escrito",
  );

  // Descartar cierra; al volver a abrirlo el formulario está limpio
  await clickByText("button", "Cancelar");
  await waitFor("document.body.innerText.includes('¿Descartar los cambios?')");
  await clickByText("button", "Descartar cambios");
  await waitFor("!document.querySelector('dialog[open]')");
  await clickByText("button", "Nuevo producto");
  await waitFor("Boolean(document.querySelector('dialog[open]'))");
  assert.equal(
    await evaluate("document.querySelector('dialog[open] input[name=name]').value"),
    "",
    "Al descartar, el formulario queda vacío",
  );

  // Sin cambios, Escape cierra de una
  await key("Escape", "Escape");
  await waitFor("!document.querySelector('dialog[open]')");
  console.log("✓ Modal: errores por campo, foco en el primer fallo y aviso de cambios sin guardar");

  // El precio a la colombiana: «25.000» debe guardarse como veinticinco mil, no como 25
  await clickByText("button", "Nuevo producto");
  await waitFor("Boolean(document.querySelector('dialog[open]'))");
  await evaluate(`
    for (const [name, value] of [['name','Lirios blancos'],['price','25.000']]) {
      const input = document.querySelector('dialog[open] input[name='+name+']');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  `);
  await evaluate("document.querySelector('dialog[open] form').requestSubmit()");
  await waitFor("document.body.innerText.includes('Creaste «Lirios blancos»')", "aviso de producto creado");
  assert.equal(await evaluate("window.__ultimoProducto.price"), "25000.00", "25.000 debe enviarse como 25000.00");
  assert.ok(await evaluate("!document.querySelector('dialog[open]')"));
  console.log("✓ Crear producto con precio 25.000 envía 25000.00 y confirma con un aviso");

  for (const width of [1440, 390, 320]) {
    await viewport(width);
    await navigate("/ventas", "document.querySelectorAll('button[aria-label^=\"Agregar \"]').length >= 3");
    assert.ok(await evaluate("document.title.startsWith('Nueva venta')"), "El título de la pestaña debe seguir la sección");
    await noOverflow("ventas", width);
    await evaluate("document.querySelector('button[aria-label^=\"Agregar \"]').click()");
    await waitFor("document.body.innerText.includes('Confirmar venta')");
    const barraMovil = await evaluate("[...document.querySelectorAll('a')].some(a => a.textContent.includes('Ver carrito') && a.getBoundingClientRect().height > 0)");
    assert.equal(barraMovil, width < 1024, `Barra móvil del carrito en ${width}px`);
    await noOverflow("ventas con carrito", width);
    await screenshot(`ventas-${width}`);
    console.log(`✓ Ventas ${width}px: productos sin teclear, carrito y barra móvil ${barraMovil ? "visible" : "oculta"}`);
  }

  await viewport(1440);
  await navigate("/ventas", "document.querySelectorAll('button[aria-label^=\"Agregar \"]').length >= 3");
  await evaluate("document.querySelector('button[aria-label^=\"Agregar \"]').click()");
  await clickByText("button", "Confirmar venta");
  await waitFor("document.querySelector('h1')?.textContent.includes('Venta registrada')");
  assert.ok(await evaluate("document.activeElement === document.querySelector('h1')"), "El título de éxito debe recibir el foco");
  await screenshot("ventas-exito-1440");
  console.log("✓ Venta confirmada: pantalla de éxito anunciada");

  for (const width of [1440, 390, 320]) {
    await viewport(width);
    await navigate("/reporte", "document.body.innerText.includes('Total vendido')");
    await noOverflow("reporte", width);
    await screenshot(`reporte-${width}`);
  }
  const antes = await evaluate("document.querySelector('#fecha').value");
  await clickByText("button", "Ayer");
  await waitFor(`document.querySelector('#fecha').value !== ${JSON.stringify(antes)}`, "cambio de fecha con «Ayer»");
  assert.ok(await evaluate("document.querySelector('button[aria-pressed=true]').textContent.includes('Ayer')"));
  console.log("✓ Reporte 1440/390/320px: sin desbordamiento y atajo «Ayer»");

  await viewport(390);
  await navigate("/productos?vista=tarjetas", "document.querySelectorAll('article').length === 4");
  await evaluate("document.querySelector('[aria-label=\"Abrir menú\"]').click()");
  await waitFor("document.querySelector('dialog').open");
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), "Cerrar menú");
  await key("Tab", "Tab", { modifiers: 8 });
  await key("Tab", "Tab", { modifiers: 8 });
  assert.ok(await evaluate("document.querySelector('dialog').contains(document.activeElement)"));
  await screenshot("panel-menu-390");
  await key("Escape", "Escape");
  await waitFor("!document.querySelector('dialog').open");
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), "Abrir menú");
  assert.notEqual(await evaluate("document.body.style.overflow"), "hidden");
  await evaluate("document.querySelector('[aria-label=\"Abrir menú\"]').click()");
  await waitFor("document.querySelector('dialog').open");
  await viewport(1440);
  await waitFor("!document.querySelector('dialog').open");
  assert.equal(await evaluate("document.activeElement.id"), "contenido");
  assert.notEqual(await evaluate("document.body.style.overflow"), "hidden");
  console.log("✓ Menú móvil: foco contenido, Escape, restauración y cambio a escritorio");

  assert.deepEqual(runtimeErrors, [], "Errores de ejecución del frontend");
  console.log(`✓ Sin errores de ejecución. Capturas: ${output}/`);
} finally {
  clearTimeout(deadline);
  socket?.close();
  if (chrome && chrome.exitCode === null) {
    const stopped = new Promise((resolve) => chrome.once("exit", resolve));
    chrome.kill("SIGTERM");
    await Promise.race([stopped, delay(2000)]);
    if (chrome.exitCode === null) chrome.kill("SIGKILL");
  }
  await server.close();
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
