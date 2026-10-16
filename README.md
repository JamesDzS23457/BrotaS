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
python create_superadmin.py

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

- Paleta y tipografías en `src/index.css` (Tailwind v4 `@theme`): verdes de tallo, acento
  buganvilla y fondos fríos de invernadero.
- Tipografías **Fraunces** (títulos) y **Hanken Grotesk** (interfaz), servidas por Google Fonts
  desde `index.html`. Si no hay red, el navegador usa la fuente del sistema.
- `src/shared/components/LogoMark.tsx` (la marca) y `StemField.tsx` (campo de tallos decorativo
  del login).
- Toda la interfaz respeta foco visible, `prefers-reduced-motion`, etiquetas de formulario y
  enlaces altos de contraste.

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
