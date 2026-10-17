# BrotaS

Plataforma multi-inquilino con una aplicación por rubro. La primera aplicación es para
**florerías**: inventario, catálogo, ventas y reportes internos. Cada local (sede) es un
tenant independiente y solo usa las aplicaciones que contrató.

> Control interno de inventario y ventas. La plataforma **no factura**.

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL.
- **Frontend:** React, Vite, TypeScript, Tailwind CSS.
- **Fotos:** Azure Blob Storage.
- **Despliegue:** Azure App Service (API), Azure Static Web Apps (web) y Azure Database for
  PostgreSQL.

## Estructura

```
backend/
  alembic/            Migraciones
  app/
    core/             Configuración, base de datos, seguridad y dependencias
    modules/          auth, tenants, products, stock, sales, reports, catalog, admin
    shared/           Errores y utilidades comunes
    tests/            Pruebas
    main.py           App FastAPI (rutas bajo /api/v1)
  create_superadmin.py  Crea el superadmin desde la terminal
frontend/
  src/
    app/              Rutas y providers
    features/         auth, products, sales, reports, catalog, admin (api, components, pages)
    shared/           Componentes comunes y cliente de API
```

Regla del backend: el **router** solo maneja HTTP, el **service** tiene las reglas de negocio y
los **models** solo describen datos. Los módulos no importan routers de otros módulos.

## Puesta en marcha (backend)

```bash
cd backend

# 1. Entorno virtual con Python 3.12
uv venv --python 3.12
source .venv/bin/activate
uv pip install -r requirements.txt

# 2. PostgreSQL de desarrollo (Docker)
docker run -d --name brotas-pg \
  -e POSTGRES_USER=brotas -e POSTGRES_PASSWORD=brotas -e POSTGRES_DB=brotas \
  -p 5432:5432 postgres:16

# 3. Variables de entorno
cp .env.example .env

# 4. Base de datos y superadmin
alembic upgrade head
python create_superadmin.py   # para cambiar una clave después: python reset_password.py

# 5. Servidor
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Documentación: http://127.0.0.1:8000/docs  (`POST /api/v1/auth/login`)
- Health: `GET /health`

## Puesta en marcha (frontend)

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL apunta al backend en http://localhost:8000/api/v1
npm run dev
```

- App: http://localhost:5173 (por defecto)
- El cliente de API (`src/shared/api/client.ts`) agrega el token JWT en cada petición.
- El login (`src/features/auth`) llama a `POST /api/v1/auth/login` y guarda el token.

### Identidad visual

- Paleta en `src/index.css` (Tailwind v4 `@theme`): blanco niebla, tinta azulada, petróleo,
  lavanda y rosa floral. Estética de estudio floral contemporáneo, sin neón ni movimiento continuo.
- Tipografías **Manrope** (títulos) y **Hanken Grotesk** (interfaz), alojadas localmente como
  WOFF2 variables en `src/assets/`. Se precargan desde `index.html`; incluyen sus licencias SIL
  Open Font License en `manrope-OFL.txt` y `hanken-grotesk-OFL.txt`. No se consulta Google Fonts.
- `src/shared/components/LogoMark.tsx`: la marca (un pimpollo de rosa), con tonos coordinados.
- El login usa una fotografía macro floral local (`src/assets/hero-floristeria-1200.webp`
  y `-700.webp`, ~26 y ~13 KB), con `srcset`, dimensiones explícitas y velo para el contraste.
- Procedencia: *Delicate pink flowers in close-up*, de **Aleksandar Radovanovic** (2015),
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Delicate_pink_flowers_in_close-up_(Unsplash).jpg).
  La ficha confirma **CC0 1.0 / dominio público**, publicada antes del cambio de licencia de Unsplash
  de junio de 2017. Permite uso comercial y adaptación sin atribución obligatoria. Se redimensionó
  y convirtió a WebP; no lleva marca de agua. La imagen anterior CC BY 2.0 ya no se utiliza.
- El diseño es *mobile first* con Tailwind (no Bootstrap): `sm:`/`lg:` en orden ascendente, grid y
  flex, `min-w-0`/`truncate` y anchos máximos para que nada se desborde en celular.
- Toda la interfaz respeta foco visible, `prefers-reduced-motion`, etiquetas de formulario y
  enlaces altos de contraste.

### Pantallas y animaciones

- **Login:** foto a pantalla completa con panel de cristal (celular: hoja que sube sobre la foto). Un solo
  momento animado al abrir (la foto "florece", el titular sube por líneas); después solo paralaje
  suave con el ratón. Todo se apaga con `prefers-reduced-motion`. Aviso de Bloq Mayús.
- **Productos:** vista Tarjetas/Lista, filtro Stock bajo (usa `/florist/products/low-stock`), categoría,
  búsqueda y página en la URL, aviso con Deshacer al ajustar stock y modal con `<dialog>` nativo.
  Los precios se leen a la colombiana (`25.000` = 25000) con `parsePrecio` en `shared/format.ts`.
- **Modal de producto:** valida cada campo antes de llamar a la API y muestra el error junto al campo
  que falla (nombre, precio con máximo dos decimales y stock mínimo entero), con el foco en el primero;
  si hay cambios sin guardar, al cerrar (Cancelar, Escape o clic afuera) pregunta antes de descartarlos.
- **Ventas:** productos visibles sin teclear, carrito fijo en escritorio y barra de total en celular.
- **Reporte:** atajos Hoy/Ayer, ticket promedio y barras por unidades vendidas.
- Piezas compartidas en `shared/components`: PageHeader, EmptyState, Skeleton, Toast, Select, Textarea, Icon.

### Prueba de interfaz

```bash
npm run build
npm run lint
npm run test:unit
npm run test:ui
```

`test:ui` requiere Node.js 22+ y Chrome (`google-chrome-stable`, o la ruta en `CHROME_BIN`).
No instala dependencias. Inicia Vite en `127.0.0.1:4173`, ejecuta Chrome headless con un perfil
temporal y cierra ambos al terminar. La API se simula solo en ese navegador: no usa credenciales
ni modifica datos reales. Comprueba login a 320/390/768/1024/1280/1440 px, Productos (tarjetas y lista, filtros,
stock con Deshacer, modal), Ventas, Reporte, recursos locales, teclado,
contraseña, carga/error y menú móvil (foco, Escape y cambio a escritorio). Del modal de producto revisa
los errores por campo, el foco en el primer fallo y el aviso de cambios sin guardar. Guarda capturas en
`dist/design-review/`, fuera del control de versiones; `npm run build` limpia esa carpeta.
No sustituye las pruebas del backend, el aislamiento entre tenants ni una prueba de login real.
Chrome mantiene su sandbox por defecto; solo en un entorno de pruebas aislado que lo requiera
puede desactivarse explícitamente con `CHROME_NO_SANDBOX=1 npm run test:ui`.

> El backend debe estar corriendo y con CORS para `http://localhost:5173` (ya viene configurado).

## Comandos útiles

```bash
# Backend (desde backend/)
uvicorn app.main:app --reload   # servidor de desarrollo
pytest                          # pruebas
alembic upgrade head            # aplicar migraciones

# Frontend (desde frontend/)
npm run dev                     # servidor de desarrollo
npm run build                   # build de producción
npm run lint                    # lint
```

## Pruebas

```bash
cd backend
pytest
```

Las pruebas usan una base de datos aparte (`brotas_test`, se crea automáticamente) y cada
prueba corre en una **transacción que se revierte** al terminar, así que nunca tocan tus datos
de desarrollo. La URL se puede cambiar con la variable de entorno `TEST_DATABASE_URL`.

> **Nota sobre la shell.** Los ejemplos están en bash/zsh. Si usas **fish**, activa el entorno
> con `source .venv/bin/activate.fish` (no `activate`) o llama directo a los ejecutables:
> `.venv/bin/pytest`, `.venv/bin/uvicorn app.main:app --reload`. Recuerda que fish **no acepta
> `&&`**: usa `;` o `and`.

## Estado del proyecto

Fase 0 (fundaciones) en curso:

- [x] **0.1** Estructura del backend (FastAPI, core, módulos, shared).
- [x] **0.2** Modelos y migración inicial (tenants, users, products, stock, sales).
- [x] **0.3** Autenticación: `POST /auth/login` con JWT, bcrypt (passlib) y `create_superadmin.py`.
- [x] **0.4** Guardia de tenant: `get_tenant_id` (403 si el local está suspendido) y endpoint de ejemplo `GET /products`; pruebas de aislamiento entre locales.
- [x] **0.5** Estructura del frontend (Vite + React + TS + Tailwind), React Router, cliente de API con JWT, contexto de autenticación y pantalla de login. Identidad visual propia (paleta, tipografías y campo de tallos) y revisión de accesibilidad.

Fase 1 (inventario) en curso:

- [x] **1.1** Categorías y productos: CRUD completo con búsqueda, filtro por categoría y paginación; borrado lógico (`is_active`, migración `ff2050927a32`); solo `owner` escribe, `staff` solo lee; dinero en `Decimal`, stock solo vía movimientos. Pruebas: `20 passed`.
- [x] **1.2** Fotos de productos: `POST /products/{id}/image` (jpg/png/webp reales de 3 MB máximo, validados con Pillow; se guardan en webp de 1200 px en Azure Blob Storage, carpeta por local, nombre UUID; al reemplazar se borra la anterior). Sin Azure configurado responde 503. Pruebas: `31 passed` (Azure simulado + verificación real con Azurite).
- [x] **1.3** Control de stock: `POST /products/{id}/stock` (cantidad con signo + motivo compra/ajuste/pérdida, registra en `stock_movements` en la misma transacción, nunca deja negativo) y `GET /products/low-stock` (stock <= mínimo). Solo `owner` mueve, `staff` lee. Pruebas: `40 passed`.
- [x] **1.4** Ventas: `POST /sales` (items + método de pago cerrado; valida stock, congela precios, descuenta y registra movimientos en una sola transacción) y `GET /sales` (filtro por fechas en Bogotá, con items). Venden dueño y empleado. Pruebas: `48 passed`.
- [x] **1.5** Reporte del día: `GET /reports/daily?date=` (total, conteo, top 5 con cantidades y plata, stock bajo reutilizando el servicio de stock; días en Bogotá). Pruebas: `53 passed`.
- [x] **1.6** Diseño del panel (frontend): layout en `src/app/layout/PanelLayout.tsx` — barra lateral fija en escritorio, cajón con overlay en celular; opciones por rol (el empleado no ve Reporte) e iconos propios sin dependencias. Rutas `/productos`, `/ventas`, `/reporte` con páginas provisionales; `/` lleva al panel o a la bienvenida (superadmin).
- [x] **1.7** Pantalla de productos (frontend): tarjetas con foto/nombre/precio/stock, buscador con espera, paginación, modal de crear/editar con foto y vista previa, +1/−1 de stock (motivo ajuste) y resalte rojo si `stock <= min_stock`. Solo el dueño ve botones.
- [x] **1.8** Pantalla de ventas (frontend): buscar y agregar al carrito (tope en stock, agotado deshabilitado), cantidades, total en vivo, pago en tarjetas (efectivo/transferencia/tarjeta) y confirmación con folio; el error de stock del backend se muestra tal cual. Venden dueño y empleado.
- [x] **1.9** Pantalla de reporte (frontend): selector de fecha (tope hoy, zona Bogotá), tarjetas de total y conteo, top con puesto/unidades/plata y alertas rojas de stock bajo ("Agotado" si es cero).
- [x] **Plataforma por aplicaciones (7.2):** endpoints de la florería bajo `/api/v1/florist` (versión + rubro); `tenants` con `timezone`/`currency` (migración con seed); tablas `apps`/`tenant_apps` con plan y `require_app`/`require_feature`; plan Inventario no publica (`is_published` → 400); ventas y reportes usan la zona del local; frontend con moneda/zona del perfil. Pruebas backend: `57 passed`.

> **Fotos en desarrollo.** Sin `AZURE_STORAGE_CONNECTION_STRING` el endpoint responde 503 (las pruebas no necesitan Azure). Para probar con un Azure de verdad local usa el emulador [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite): `docker run -d --name brotas-azurite -p 10000:10000 mcr.microsoft.com/azure-storage/azurite azurite-blob --blobHost 0.0.0.0 --skipApiVersionCheck` y arranca el backend con la cadena del emulador en `AZURE_STORAGE_CONNECTION_STRING` y `AZURE_STORAGE_CONTAINER=productos`.
