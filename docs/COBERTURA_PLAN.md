# Cobertura del plan maestro

Revisión de la implementación del 29 de septiembre de 2026 frente a `Plan_maestro_interfaz_Mabell_Ramos.md`. La última instrucción del proyecto reemplaza Supabase por un repositorio GitHub privado como almacenamiento; la interfaz usa GitHub Pages en `https://gsaco.github.io/Mabell-Ramos-CRM/`. No se han configurado datos de producción ni probado cuentas reales.

## Cómo leer esta matriz

- **Implementado:** existe un recorrido o regla en el código que responde al requisito. No implica una prueba de campo completada.
- **Prueba de motor:** caso automatizado de reglas y cálculos en `tests/domain.test.ts`.
- **Prueba de conector:** solicitudes GitHub simuladas en `tests/github.test.ts`; no demuestra una conexión real de dos usuarias.
- **Prueba de interfaz incluida:** recorrido de Playwright en `tests/ui.spec.ts`, configurado para escritorio y móvil. Su resultado debe contrastarse con la última ejecución.
- **Parcial o pendiente:** se identifica el límite concreto, sin presentarlo como cumplimiento completo.

## Las 29 vistas de trabajo

Los identificadores del plan describen **funciones**, no una obligación de tener 29 direcciones independientes. Algunas se reúnen en una pantalla, pestaña o modal para mantener cuatro accesos principales. Las rutas reales usan navegación con hash, por ejemplo `/#/pedidos`.

| ID del plan | Vista requerida | Implementación actual | Alcance o comprobación pendiente |
|---|---|---|---|
| A01 | Ingreso personal | Pantalla de entrada; formulario de conexión y cierre de sesión | Identificación por `/user` y repositorio privado con escritura. Pendiente comprobar PAT de ambas cuentas reales. |
| A02 | Configuración inicial | Ajustes → Negocio y atención; conexión; cuentas en Dinero | No es un asistente separado. Personas, horario, medios y saldos se acuerdan manualmente; no existen invitaciones automáticas ni recuperación de cuenta dentro del CRM. |
| H01 | Hoy | `/` · filtro Todo/Mi trabajo y cuatro acciones rápidas | Consultas, tareas, compromisos, compras y dinero separados. Ausencia de registros no prueba que el negocio esté al día. |
| H02 | Agenda | `/agenda` · dos semanas, filtros y tareas | Responsables, etapas, duración, apoyo y recursos; coincidencias sólo con datos horarios conocidos. La revisión humana de capacidad sigue siendo necesaria. |
| H03 | Compras pendientes | Sección de compras en Agenda y acceso desde Hoy | Necesidades con cantidad/unidad, compra vinculada y cantidad atendida. No constituye inventario por lotes ni consumo automático. |
| P01 | Consultas y pedidos | `/pedidos` · pestañas, búsqueda y filtros | Modalidad, responsable, estado y período; ejercicios identificados. |
| P02 | Nueva consulta | `/consultas/nueva` | Registro breve, contacto libre, necesidad por conocer y siguiente acción; borrador de sesión. |
| P03 | Atención de consulta | `/consultas/:id` | Respuesta/cotización realmente enviadas, fecha y canal, cierre y seguimiento; abrir WhatsApp no registra respuesta. |
| P04 | Pedido de productos | `/pedidos/nuevo` o edición · pasos del formulario | Referencias y pedidos específicos, base del precio, presentación y distribución de rellenos. |
| P05 | Pedido de catering | Mismo formulario, modalidad Catering | Alimentos separados de alcance, incluidos, adicionales, recursos pendientes y responsables. |
| P06 | Revisión y acuerdo | Detalle de pedido → Revisar y confirmar | Datos críticos, aceptación y disponibilidad explícitas; resumen copiable y PDF. No se presenta como comprobante tributario. |
| P07 | Ejecución e historial | `/pedidos/:id` | Tareas, versiones, cambios, entrega, cancelación, ajustes y división en subpedidos. |
| P08 | Feria y jornada | `/ferias` y `/ferias/:id` | Venta individual o resumen histórico excluyentes; cliente opcional, cantidades y cierre revisado; catering vinculado con su propio acuerdo. |
| D01 | Resumen de Dinero | `/dinero` | Actividad entregada, cobros/pagos, pendientes, costos revisados y detalles de registros. |
| D02 | Registrar cobro | Modal en Dinero, accesible desde Hoy o pedido | Asignaciones, cuenta por identificar, medio, fecha y saldo a favor; identificador de operación para evitar duplicados. |
| D03 | Compra o gasto | Modal en Dinero; acceso desde compras pendientes | Compra/obligación separada del pago; cantidades, proveedor, reparto y vínculo con necesidades de compra. |
| D04 | Pago y proveedor | Modal de pago y gestión de proveedores en Dinero | Pagos parciales, devoluciones y correcciones con historial. |
| D05 | Cuentas y movimientos | `/dinero/movimientos` y cuentas en Dinero | Saldo inicial desconocido, transferencias enlazadas, asignación posterior de cuenta y conciliación manual. |
| D06 | Costos | `/costos` y `/costos/:id` | Lote/rendimiento, ingredientes, unidades, empaque, trabajo valorado y componentes de paquetes; versiones y cobertura. |
| D07 | Cierre y exportación | `/dinero/cierre` | Revisión por período, CSV, resumen PDF y copias. Es contabilidad de gestión, no libros o declaraciones tributarias. |
| C01 | Clientes | `/clientes` | Personas/instituciones, origen, contactos, preferencias y consentimiento. |
| C02 | Historial de cliente | `/clientes/:id` | Pedidos, compras entregadas, conversaciones y notas; combinación de duplicados con trazabilidad. |
| C03 | Seguimiento y fidelización | Cliente → Programar seguimiento; Agenda y Hoy | Tareas con propósito de atención o promoción; permiso explícito para promociones. Recompra sólo por nueva entrega. |
| C04 | Resultados comerciales | Clientes → Publicaciones y resultados / Conversaciones sobre la oferta | Cohortes, origen/canal, respuesta y compras anteriores; evidencia de conversaciones y publicaciones manuales. Revisar apertura de los casos desde todos los gráficos. |
| L01 | Biblioteca | `/productos` | Producto individual y opción comercial separados, búsquedas y estados de revisión. |
| L02 | Ficha individual | `/productos/:id` | Preparación, atributos, descripción cultural, ingredientes, alérgenos, conservación, precio/base y fuente. No inventa datos a partir de una fotografía. |
| L03 | Ficha comercial | `/opciones/:id` | Composición, necesidad de compra, presentación, precio, condiciones y aprobación. Los seis paquetes del piloto deben validarse con las emprendedoras. |
| L04 | Catálogo y materiales | `/catalogo` y `/materiales` | Visor externo por página, enlaces explícitos a catálogo, PDF original y stand; fuente/página en biblioteca. No se ha implementado importación automática de un PDF nuevo ni comparación documental automática. |
| S01 | Ajustes y ayuda | `/ajustes` | Reglas de atención, perfiles, conexión, copias, actividad y ayuda. Preferencia de lectura habitual o ampliada en el dispositivo. Roles administrativos restringidos y respaldo automático requieren otra arquitectura/configuración. |

## Los 33 casos de aceptación

Esta matriz separa regla implementada de comprobación completa. Los casos con servicios externos necesitan un entorno privado de prueba; los de usabilidad necesitan observar su ejecución, no sólo inspeccionar el código.

| Caso | Resultado actual y evidencia | Estado de verificación |
|---|---|---|
| 1. Consulta breve | Se guarda sin precio/fecha; no crea cliente ni venta. | Prueba de motor; recorrido de consulta en interfaz incluido. |
| 2. Origen Feria, canal WhatsApp | Campos independientes; métricas de origen y canal separadas. | Prueba de motor. |
| 3. Precio Consultar | `null` conserva desconocido; confirmación bloqueada si falta precio. | Prueba de motor; revisar las etiquetas al validar con usuarias. |
| 4. Dos cajas de 12 | Se conserva la base caja y se exige distribución total de 24; cantidades negativas rechazadas. | Prueba de motor. |
| 5. Tarifa por 100 | No se supone una tarifa de venta individual por dividir el ciento sin regla aprobada. | Prueba de motor. |
| 6. Menaje pendiente | Alcance Por confirmar explícito; no se transforma en incluido ni excluido. | Prueba de motor de confirmación. |
| 7. Adelanto 120 de pedido 240 | Una entrada de 120, pendiente 120, sin venta entregada; también se conserva correctamente al consultar un corte anterior a la entrega. | Pruebas de motor. |
| 8. Entrega | Una venta, sin segundo cobro por el adelanto. | Prueba de motor; recorrido entrega/cobro en interfaz incluido. |
| 9. Doble toque/reintento | Identificadores y bloqueo del guardado evitan duplicar una operación conocida. | Prueba de motor; repetir el caso con interrupción real de red sigue pendiente. |
| 10. Cancelación y devolución | El importe exigible se ajusta, el adelanto queda por devolver y la devolución conserva historia. | Prueba de motor. |
| 11. Compra 100, pago 40 | Obligación 60; compra y salida no se duplican. | Prueba de motor. |
| 12. Compra para dos eventos | Un original con repartos limitados al importe del negocio. | Prueba de motor; recorrido visual de reparto pendiente de validación de campo. |
| 13. Transferencia 100 | Entrada/salida enlazadas; efecto operativo neto cero. | Prueba de motor. |
| 14. Saldo inicial desconocido | No se presenta saldo total basado en un cero inventado. | Prueba de motor. |
| 15. Cambio de precio maestro | No reescribe nombre, atributos, precio ni versión aceptados del pedido previo. | Prueba de motor; recorrido de interfaz incluido. |
| 16. Edición simultánea | Revisión del estado y SHA detectan conflicto; no hay sobrescritura ni reintento automático. | Pruebas de motor y conector simulado. Pendiente dos cuentas/dispositivos reales. |
| 17. Venta anónima en feria | Venta y cobro pueden guardarse sin persona inventada; métricas de clientes la excluyen. | Prueba de motor; recorrido de interfaz incluido. |
| 18. Feria y catering juntos | Actividades separadas vinculadas al mismo evento; compras repartibles sin duplicar el original. | Implementado; prueba completa del recorrido combinado pendiente. |
| 19. Dos necesidades de un cliente | Cada pedido conserva su necesidad; el historial reúne ambas. | Prueba de motor. |
| 20. Consulta de cliente previo | No se cuenta recompra sin una nueva entrega. | Prueba de motor. |
| 21. Abrir WhatsApp | Es un enlace manual; no modifica envío, respuesta ni compra. | Prueba de motor; enlace implementado en interfaz. |
| 22. Seis consultas, una con dos pedidos | Concreción cuenta consultas únicas de la cohorte, no cada pedido como nueva consulta. | Prueba de motor. |
| 23. Costos parciales | Resultado estimado informa cobertura y excluye costo desconocido; conversiones y trabajo valorado se revisan sin fingir un pago. | Pruebas de motor. |
| 24. Pérdida de conexión | El guardado incierto exige actualizar; los formularios abiertos conservan campos. Los formularios principales de trabajo recuperan borrador de sesión, incluidos dinero, agenda, biblioteca, clientes, conversaciones, publicaciones y ajustes. | Consulta con recarga aprobada en escritorio/móvil; los cuadros breves de corrección mantienen los campos mientras están abiertos. Corte de red real pendiente de prueba con la conexión privada. |
| 25. Acceso no autenticado | Sin token no se conecta el conector; repo público o sin escritura se rechaza; los datos no forman parte del sitio estático. | Conector simulado y revisión de arquitectura. Pendiente probar permisos efectivos del repo privado real y del sitio publicado. |
| 26. Recuperación de respaldo | Estado JSON validado, relaciones/versiones revisadas; restauración crea nueva versión con motivo. ZIP exporta originales y verifica hashes. | ZIP restaura archivos ausentes tras verificar tamaño y SHA-256, y guarda una nueva versión. Prueba local de pérdida y recuperación de un original, y rechazo de copia alterada. JSON requiere originales existentes; ensayo en entorno GitHub privado pendiente. |
| 27. Catálogo original | Enlace explícito al PDF; no se comprime ni descarga al abrir Hoy. Huella documental registrada en fuentes. | Implementado; nueva comprobación del archivo remoto y equivalencia de sus páginas con el visor pendiente. Adjuntos propios preservados/verificados por el exportador. |
| 28. Móvil, texto y teclado | Navegación inferior, formularios adaptables, modales y foco. Recorridos incluidos para escritorio/móvil con comprobación de desbordamiento. | Texto ampliado y apertura de las secciones principales comprobados sin desbordamiento en escritorio/móvil. Etiquetas accesibles separan nombre y ayuda; uso completo por teclado y prueba de campo requieren revisión adicional. |
| 29. Cambio de horario | Plazo y versión por consulta conservados; horario nuevo no recalcula los históricos. | Prueba de motor. |
| 30. Sin permiso promocional | Tarea de atención posible; promoción bloqueada. Revocar permiso cancela promociones pendientes sin bloquear la revocación. | Pruebas de motor. |
| 31. Cuenta pendiente | Cobro aparece una vez; asignar cuenta después no crea una nueva entrada. | Prueba de motor. |
| 32. Devolución de proveedor | Movimiento y obligación vinculados a la compra; no crea una venta al cliente. | Prueba de motor. |
| 33. Descuento después de entregar | Venta original 240, ajuste −20 y cobro 120 dejan pendiente 100; sin nueva venta/cobro. | Prueba de motor. |

## Pruebas y evidencia local

La suite de reglas y conector se ejecutó el **29/09/2026, hora de Lima**: **72 pruebas aprobadas en dos archivos**. Son 47 pruebas de dominio y 25 del conector simulado. La suite incorpora además límites de céntimos enteros, relaciones inválidas, costes circulares, revocación de permisos, nuevas versiones del acuerdo, reversión financiera y lectura de adjuntos por blob inmutable.

La suite de interfaz contiene seis recorridos, con proyectos escritorio y móvil:

1. Consulta → pedido específico → confirmación → entrega → cobro y recarga.
2. Cambio de precio maestro sin alterar un acuerdo previo.
3. Venta anónima de feria, guardado conjunto y recarga sin duplicación.
4. Consulta sin guardar, recarga del borrador y ausencia de operaciones ficticiamente confirmadas.
5. Copia ZIP completa, rechazo de un original alterado y recuperación de un archivo perdido con nueva versión e historial.
6. Texto ampliado y apertura de Hoy, Pedidos, Dinero, Clientes, Productos, Agenda, Costos, Materiales y Ajustes sin desbordamiento.

El recorrido de pedido también descarga y verifica un PDF generado. **Resultado del 29/09/2026: los 12 recorridos de interfaz aprobaron (seis escenarios en cada tamaño), la compilación de producción aprobó y la revisión de dependencias no encontró vulnerabilidades.**

Esta matriz no certifica que los 33 casos hayan pasado por todas las pantallas o por dos cuentas reales. Los resultados finales de compilación e interfaz deben acompañar la revisión de entrega. No se han medido todavía el tiempo de registro de consulta ni el tiempo de búsqueda de un pedido.

## Límites de la arquitectura GitHub

| Requisito del plan | Tratamiento actual | Consecuencia |
|---|---|---|
| Datos centrales privados | Un JSON completo y adjuntos en repositorio privado; autenticación personal | Configurar acceso antes del uso real. La demo local no cumple sincronización de producción. |
| Reglas del servidor | GitHub controla acceso y reemplazo por SHA; el cliente valida reglas financieras | Un colaborador con escritura puede editar fuera de la interfaz. No equivale a validación financiera independiente del cliente. |
| Guardado conjunto | Un comando produce un estado y un commit del archivo completo | Las relaciones financieras se guardan juntas; no se hacen escrituras parciales de cobro/saldo/venta. |
| Concurrencia | SHA y revisión; revisión manual tras conflicto | No hay edición colaborativa en tiempo real ni mezcla automática. Se actualiza al volver a la ventana o mediante Actualizar. |
| Adjuntos privados | Archivo original, ruta restringida y hash | Archivo y vínculo se guardan por separado; puede quedar un archivo sin vínculo si falla el segundo paso. |
| Crecimiento | Estado 900 KiB y adjunto 8 MiB | Revisar tamaño/historial antes del límite; no archivar o borrar automáticamente para que entre. |
| Respaldos | JSON, ZIP independiente con originales y commits | Importación ZIP con originales verificados. No hay copia diaria, retención garantizada ni alerta automática. |
| Recuperación por rol | Revisión explícita con motivo y nueva versión | GitHub sólo diferencia permisos del repositorio; la aplicación no impone un rol administrador exclusivo para restaurar. |
| Alojamiento | Compilación estática y despliegue manual en GitHub Pages, sujeto a pruebas y compilación aprobadas | La publicación contiene sólo la interfaz y datos ficticios. La conexión privada y la validación de campo siguen pendientes antes del uso operativo. |

## Decisiones y pruebas antes de operar

1. Preparar repositorio privado, rama y acceso de las dos cuentas. El repositorio de código actual es público; no admite datos reales.
2. Verificar tokens personales con permiso mínimo, lectura/escritura desde dos dispositivos, sesión cerrada y rechazo de acceso sin permiso.
3. Acordar fecha de inicio, cuentas y saldos, horario de atención, condiciones comerciales y quién conserva las copias. No migrar ejemplos ni suponer saldo inicial cero.
4. Validar seis productos y seis opciones comerciales con las emprendedoras; las referencias documentales existentes no son esa aprobación.
5. Ensayar un corte de red, un conflicto simultáneo y una recuperación con archivos, utilizando únicamente datos ficticios en un repositorio privado de prueba.
6. Revisar los cuadros breves de corrección, los casos abiertos desde indicadores y la auditoría completa por teclado; comprobar los recorridos con Mabel y Ana.
7. Observar a Mabel y Ana registrando consulta, encontrando acuerdo, corrigiendo dato, cobrando parcialmente, localizando un pendiente y programando seguimiento sin ayuda.
8. Publicar sólo después de revisión; comprobar que el artefacto público no contiene datos privados. Entregar acceso propietario, esta documentación y un procedimiento de recuperación acompañado.

El plan maestro seguirá siendo la referencia de producto. Esta matriz documenta lo que hay y lo que falta comprobar; no reemplaza la aceptación de las emprendedoras ni convierte una demostración local en servicio operativo validado.
