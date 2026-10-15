# AGENTS.md - [Brota] (aplicaciones por rubro; primera: florerías)
Plataforma multi-inquilino con una aplicación por rubro (primero florerías, luego bares y restaurantes y después peluquerías). Cada local usa solo las aplicaciones que contrató. Objetivo: un MVP funcionando para inicios de noviembre de 2026.

## Stack y estructura
- Backend: Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL.
- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router.
- Fotos: Azure Blob Storage. Despliegue: Azure App Service (API), Azure Static Web Apps (web) y Azure Database for PostgreSQL.
- backend/app: main.py, core/ (config, database, security, deps), modules/ (auth, tenants, products, stock, sales, reports, catalog y admin; cada uno con router.py, schemas.py, service.py y models.py), shared/ (errores y utilidades) y tests/.
- frontend/src: app/ (rutas y providers), features/ (auth, products, sales, reports, catalog y admin; cada una con api/, components/ y pages/) y shared/ (componentes comunes y cliente de API).

## Comandos
- Backend (desde backend/): `uvicorn app.main:app --reload`, `pytest`, `alembic upgrade head`.
- Frontend (desde frontend/): `npm run dev`, `npm run build`, `npm run lint`.

## Convenciones
- Nombres de código en inglés; comentarios, textos de la interfaz y mensajes de error en español.
- Python con tipos y Pydantic para entradas y salidas; React con componentes funcionales y TypeScript estricto.
- Patrón a seguir para módulos: backend/app/modules/products (una vez creado). El router solo maneja HTTP, el servicio tiene las reglas de negocio y los modelos solo describen datos.
- Un módulo no importa routers de otro módulo: si necesita algo, llama a su servicio. Sin capa de repositorios ni interfaces por ahora.

## Reglas de dominio / trampas conocidas
- Cada tabla de negocio tiene tenant_id. Ningún endpoint lee o escribe sin filtrar por el tenant del usuario autenticado.
- Cada local es un tenant independiente.
- Un tenant suspendido recibe 403 en todo; su catálogo público responde 404.
- El stock nunca puede quedar negativo; una venta es una sola transacción (venta, items, stock y movimientos).
- No hay recetas de insumos ni API de WhatsApp: solo enlaces wa.me.
- Dinero en Numeric(12,2), moneda COP. Zona horaria de los reportes: America/Bogota.
- La plataforma no factura: es control interno de inventario y ventas.

## Forma de trabajar
- Planifica antes de tocar código cuando el cambio afecte varios archivos o la base de datos.
- Trabaja un prompt del documento por vez, con cambios pequeños. Al terminar, explica qué hiciste y cómo probarlo.

## Límites
- Siempre: filtrar por tenant_id, validar entradas con Pydantic, escribir pruebas para lo importante y usar variables de entorno para los secretos.
- Pregunta antes: dependencias nuevas, archivos nuevos fuera de la estructura, cambios en el modelo de datos o en las migraciones, cambios en la autenticación.
- Nunca: subir secretos o archivos .env, ejecutar migraciones contra producción sin confirmar, borrar datos ni saltarse el filtro por tenant_id.

## Verificación
- Backend: pytest en verde y la ruta probada en /docs.
- Frontend: npm run build sin errores y la pantalla probada en tamaño de celular.

## Commits
- Un commit por prompt completado, con mensaje corto en español y prefijo feat:, fix:, docs: o test:.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales)

## Reglas de dominio / trampas conocidas (agregar)
- Las ventas anuladas no se borran: status=cancelled y devuelven el stock con movimientos de tipo return.
- Todo cambio sensible (anulaciones, usuarios, precios) se registra en audit_logs.
- El tenant demo (is_demo) no cuenta en métricas ni en cobros.
- Los textos legales son borradores hasta que los revise un abogado.

## Seguridad (agregar)
- JWT con expiración, bloqueo por intentos fallidos y límite de peticiones en login y endpoints públicos.
- Nunca registrar en logs contraseñas, tokens ni datos personales.
- Validar el tipo real y el tamaño de los archivos subidos.

## Verificación (agregar)
- Antes de dar algo por terminado: CI en verde y las pruebas de aislamiento entre tenants incluidas.

## Plataforma y aplicaciones (agregar)
- Es una plataforma con varias aplicaciones por rubro: florist (ahora), bar y salon (después).
- Cada app son módulos propios y ninguna importa los routers de otra; lo común va en el núcleo (core, auth, tenants, users, audit, billing).
- Los endpoints de cada app usan require_app('<code>') además del filtro por tenant_id.
- El nombre de la plataforma sale de PLATFORM_NAME en la configuración, nunca escrito a mano en el código.
- No empieces módulos de bar ni de salon hasta que se indique.

