# MEMORY.md - [NOMBRE DE LA PLATAFORMA]
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Fase 0 en curso. Prompts completados: 0.1.
- Entorno: backend/.venv con Python 3.12 (uv) y dependencias instaladas.
- Cronograma: Fase 0 (13 al 16 oct), Fase 1 inventario (17 al 23 oct), Fase 2 catálogo (24 al 29 oct), Fase 3 admin (30 oct al 2 nov), entrega (3 al 5 nov).

## Progreso por prompts
- Prompt 0.1 — Estructura del backend: hecho. FastAPI con core/ (config con pydantic-settings, database con engine y sesión de SQLAlchemy 2.0, security.py y deps.py vacíos), 8 módulos (auth, tenants, products, stock y sales con models.py; reports, catalog y admin sin models.py), shared/ y tests/. Routers registrados en main.py bajo /api/v1, GET /health y CORS para http://localhost:5173. Verificado: GET /health -> 200.

## Decisiones (y por qué)
- Multi-inquilino por columna tenant_id: cada local es independiente y comparte la misma API.
- Arquitectura: monolito modular por funciones (backend/app/modules y frontend/src/features), sin Clean Architecture completa ni capa de repositorios: sería demasiado para 3 semanas.
- Sin recetas ni API de WhatsApp: se simplifica el MVP; los pedidos entran por enlaces wa.me.
- Fotos en Azure Blob Storage y no en la base de datos: la base solo guarda la URL.
- Despliegue en Azure con crédito de estudiante: crear la base de datos hacia el 30 de octubre para no gastar crédito antes de tiempo.
- La plataforma no factura: es control interno de inventario y ventas.
- Plataforma por aplicaciones: primero florerías, luego bares y restaurantes y después peluquerías. Panel de aplicaciones después del login para que el cliente conozca las demás apps y recomiende.
- La app 2 solo empieza con 5 clientes pagando en la app 1, soporte estable y 2 negocios dispuestos a probarla.
- Los routers de los módulos se registran en main.py bajo /api/v1 (no hay api.py), como piden AGENTS.md y el Prompt 0.1.

## Aprendizajes y errores a evitar
- (vacío por ahora)

## Próximos pasos
- Prompt 0.2 (siguiente del documento); aún sin definir.
