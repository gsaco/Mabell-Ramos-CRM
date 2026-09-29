# Mabell Ramos · Mi negocio

Aplicación para que Mabel y Ana conecten consultas, pedidos de productos y catering, preparación, cobros, compras y relaciones con clientes. La interfaz usa cuatro accesos principales: **Hoy, Pedidos, Dinero y Clientes**, con agenda, biblioteca y ajustes como apoyos.

Interfaz para GitHub Pages: [Abrir Mabell Ramos · Mi negocio](https://gsaco.github.io/Mabell-Ramos-CRM/). La demostración permite practicar con registros ficticios. **El trabajo real requiere conectar un repositorio privado de datos desde Ajustes.** No se han cargado datos reales de clientes ni enviado invitaciones a las emprendedoras.

## Qué permite hacer

- Registrar una consulta breve y precisarla después, sin convertir una pregunta en venta ni un precio desconocido en cero.
- Preparar pedidos de productos o catering, separar alimentos y servicios, revisar unidades, cantidades, condiciones, disponibilidad y aceptación antes de confirmar.
- Conservar versiones de los acuerdos; programar tareas y compras; dividir entregas en subpedidos vinculados cuando corresponda.
- Registrar ventas de feria con o sin cliente identificado y vincular catering al mismo evento mediante registros separados.
- Distinguir venta entregada, dinero recibido, compra, pago, devolución y transferencia. Registrar cobros parciales, saldos a favor y correcciones con historial.
- Mantener fichas de productos, opciones comerciales y costos versionados; mostrar la cobertura de costos antes de interpretar un resultado estimado.
- Consultar el historial de un cliente, programar seguimiento y registrar conversaciones sobre la oferta y publicaciones. Las promociones requieren autorización; abrir WhatsApp no envía ni registra una respuesta.
- Exportar registros, revisar versiones y descargar copias con los adjuntos originales, sin reducir su calidad.

La [matriz de cobertura](docs/COBERTURA_PLAN.md) distingue lo implementado, las pruebas incluidas y las comprobaciones pendientes frente a las 29 vistas de trabajo y los 33 casos del plan maestro. Tener una función implementada no significa que ya haya sido validada por las emprendedoras.

## Dos modos separados

| Modo | Dónde están los datos | Para qué sirve |
|---|---|---|
| **Demostración** | IndexedDB de este navegador | Practicar con clientes, pedidos y dinero ficticios. No escribe en GitHub. |
| **Trabajo compartido** | Un repositorio GitHub **privado**, mediante su API autenticada | Compartir los registros reales entre personas autorizadas. Requiere configurar el repositorio, los accesos y la conexión. |

La biblioteca inicial incorpora referencias documentales del catálogo **por revisar**; eso no aprueba automáticamente precios, combinaciones ni los seis productos y seis opciones del piloto. Una conexión real empieza sin las operaciones ficticias de la demostración.

La instrucción más reciente del proyecto eligió guardar los datos en GitHub. **No usa Supabase.** El código puede permanecer en el repositorio público `gsaco/Mabell-Ramos-CRM`, mientras los datos se guardan en otro repositorio privado. El conector rechaza un repositorio público o una cuenta sin permiso de escritura.

## Ejecutar y verificar localmente

Con Node.js y npm disponibles:

```sh
npm ci
npm run dev
```

Abrir la dirección local que muestre Vite y elegir **Practicar con datos ficticios**. Los cambios de la demo persisten en ese navegador; se puede reiniciar desde Ajustes.

```sh
npm test
npm run build
npm run preview
```

- `npm test`: pruebas del motor de negocio y del conector GitHub con solicitudes simuladas.
- `npm run build`: comprobación de TypeScript y compilación de la interfaz en `dist`.
- `npm run preview`: sirve la compilación local para revisarla.
- `npm run test:e2e`: recorridos de interfaz con Playwright, en escritorio y móvil. Requiere un navegador de prueba disponible; puede indicarse su ruta con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Las pruebas de GitHub no necesitan ni incluyen tokens reales. Los resultados y límites de verificación se detallan en [Cobertura del plan](docs/COBERTURA_PLAN.md).

## Preparar el trabajo real

La persona propietaria debe:

1. Crear o seleccionar un repositorio privado de datos con una rama existente.
2. Dar acceso a las cuentas personales de Mabel y Ana desde GitHub.
3. Hacer que cada persona genere su propio token de acceso, restringido a ese repositorio y con `Contents: Read and write`.
4. Conectar desde Ajustes e identificar qué cuenta GitHub corresponde a cada emprendedora.
5. Acordar fecha de inicio, horario, plazo de respuesta, cuentas de dinero y saldos conocidos; revisar los productos y condiciones que se usarán.
6. Probar lectura y cambios desde ambas cuentas y dos dispositivos, un conflicto simultáneo y una recuperación independiente antes de registrar actividad real.

La selección **Mabel/Ana** configura una vista de trabajo. La autoría real de los cambios corresponde a la cuenta autenticada por GitHub; cambiar la vista no cambia esa identidad.

El token se conserva **sólo en memoria** y debe introducirse de nuevo al recargar. No se guarda en el código, exportaciones, IndexedDB ni almacenamiento del navegador. El estado real cargado se mantiene en memoria; los formularios de consultas, pedidos, feria, dinero, agenda, productos, costos, clientes, conversaciones, publicaciones y ajustes conservan borradores en `sessionStorage` durante esa sesión. Cerrar sesión elimina esos borradores. No sustituyen el guardado compartido ni se presentan como operaciones confirmadas; algunos cuadros breves de corrección conservan sus campos únicamente mientras están abiertos.

Los pasos completos, permisos, rutas y límites se explican en [Guardado compartido en GitHub](docs/GITHUB_DATOS.md).

## Guardado, archivos y recuperación

- Un comando valida y guarda el estado completo en un solo archivo `data/state.json`, junto con sus relaciones e historial. GitHub comprueba el SHA de la versión anterior; un conflicto no se sobrescribe ni reintenta automáticamente.
- Si se pierde la respuesta de un guardado, se debe actualizar y revisar si la operación existe antes de repetirla. No se presenta un guardado incierto como éxito.
- El estado está limitado a **900 KiB**; los adjuntos admitidos a **8 MiB por archivo**. El sistema bloquea el exceso, sin borrar historia ni reducir calidad.
- Un adjunto y su vínculo son dos guardados distintos. Un fallo al vincular puede dejar un archivo sin vínculo; revisar antes de volver a subirlo.
- **Copia de datos** descarga un JSON. **Copia completa con adjuntos** descarga un ZIP con registros, originales y manifiesto de huellas SHA-256, verificadas antes de generar el archivo.
- Restaurar un JSON o una versión histórica crea una nueva versión del estado; sus adjuntos deben seguir disponibles y coincidir con sus huellas. **Importar una copia ZIP completa verifica los originales y permite recuperar los archivos ausentes antes de guardar el estado restaurado.** Admite copias de hasta 100 MiB; no modifica precios ni crea operaciones financieras nuevas. El ensayo local incluye un archivo perdido y el rechazo de una copia alterada. Falta repetir ese ensayo en el repositorio privado real.

El historial Git no sustituye una copia independiente: conservar el ZIP fuera del repositorio y ensayar su recuperación. No están configuradas copias diarias automáticas, retención de 30 días ni alertas de respaldo.

El PDF original del catálogo se consulta mediante un enlace explícito. No se comprime, se modifica ni se descarga al abrir Hoy; las páginas del visor externo no sustituyen el archivo original.

## Publicación en GitHub Pages

El flujo [pages.yml](.github/workflows/pages.yml) comprueba las pruebas y la compilación y prepara **únicamente `dist`**. Los cambios de datos privados no disparan ese flujo. GitHub Pages usa la fuente **GitHub Actions**. Para publicar una actualización, abrir Actions → Comprobar interfaz y preparar Pages → Run workflow, seleccionar `main` y activar `publish`. El despliegue se ejecuta sólo después de aprobar las pruebas y la compilación.

Una página pública no debe contener clientes, operaciones, comprobantes ni tokens. No copiar esos archivos a `public`, al código ni al resultado de compilación. Antes del uso operativo, revisar la disponibilidad de Pages y sus condiciones: el hosting estático de la interfaz y la privacidad del repositorio de datos son asuntos distintos.

## Alcance y próximos pasos

GitHub protege el acceso al repositorio y detecta reemplazos de versiones; las reglas financieras se ejecutan en la aplicación. Una persona con permiso de escritura puede editar el repositorio fuera de ella. No hay un servidor independiente que imponga cada transición ni permisos financieros por rol. Esta arquitectura está pensada para un piloto pequeño de operadoras de confianza; no sustituye una base de datos transaccional con autorizaciones detalladas.

No emite comprobantes tributarios, concilia bancos automáticamente ni envía mensajes o campañas. La agenda ayuda a revisar compromisos; no determina por sí sola la capacidad real de producción. Los indicadores describen los registros y su cobertura, sin probar causalidad de una publicación ni certificar fidelización.

Antes de comenzar: configurar acceso privado, ensayar sincronización y recuperación, acordar qué datos se migrarán y observar a Mabel y Ana realizando sus tareas. Las metas de una consulta en alrededor de un minuto y encontrar un pedido en menos de 30 segundos siguen siendo **metas de prueba**, no resultados obtenidos.
