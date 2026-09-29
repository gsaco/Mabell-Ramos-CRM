# Guardado compartido en GitHub

La instrucción más reciente del proyecto elige GitHub como almacenamiento y GitHub Pages como alojamiento de la interfaz. Esta versión implementa esa decisión sin Supabase. Sustituye la opción técnica PostgreSQL/Supabase del plan maestro; conserva sus reglas de negocio, identidad personal, separación de demostración y operación, trazabilidad y recuperación, con los límites indicados abajo.

## Dos espacios distintos

| Espacio | Contenido | Acceso |
|---|---|---|
| Código e interfaz | Aplicación, materiales públicos y catálogo | Puede estar en `gsaco/Mabell-Ramos-CRM`, actualmente público |
| Datos del negocio | Clientes, pedidos, cobros, compras, historial y adjuntos | Repositorio **privado**, accesible a las personas autorizadas |

La aplicación rechaza conectar, leer o guardar datos reales si GitHub informa que el repositorio seleccionado es público o que la cuenta no tiene permiso de escritura. Revisa esos permisos antes de cada operación, no sólo al entrar. El modo de demostración funciona con información ficticia local y no escribe en el repositorio. Una demostración no debe importarse automáticamente como empresa real.

La interfaz pública se sirve en `https://gsaco.github.io/Mabell-Ramos-CRM/`. No se ha cambiado la visibilidad de ningún repositorio, creado cuentas, enviado invitaciones ni subido datos reales de clientes mediante esta implementación. El repositorio público actual sirve para código; se requiere configurar un repositorio privado de datos antes del uso real.

## Preparación por la persona propietaria

1. Crear o seleccionar un repositorio privado de datos en GitHub. Inicializarlo con un README para que exista la rama elegida. Un ejemplo de nombre es `Mabell-Ramos-Datos`; es sólo una sugerencia.
2. Compartir acceso de escritura con las cuentas GitHub personales de Mabel y Ana mediante la configuración de colaboradores. Cada persona acepta su invitación en GitHub. La aplicación no realiza ese paso ni comparte tokens entre personas.
3. Cada persona crea su propio **fine-grained personal access token**, con vencimiento, acceso únicamente al repositorio privado elegido y permiso **Contents: Read and write**. Metadata se incluye para verificar el repositorio. No se necesitan permisos de administración, acciones ni workflows para atender pedidos.
4. Si el propietario seleccionado o el tipo de colaboración no permite usar ese token fine-grained, resolver la titularidad o el acceso con GitHub antes de operar. No ampliar automáticamente a un token clásico con acceso a todos los repositorios. Una organización puede requerir aprobar el token.
5. Introducir en la aplicación propietario, repositorio, rama —por ejemplo `main`— y ruta del estado —por ejemplo `data/state.json`—. Introducir el token en el campo de sesión, nunca en una URL, un archivo, un commit ni una variable `VITE_*`.
6. Conectar. La aplicación identifica al usuario real con `/user`, confirma repositorio privado, permiso de escritura y existencia de la rama. Los perfiles visibles Mabel/Ana deben asociarse a sus cuentas reales; el perfil no es una contraseña compartida.
7. Revisar los datos iniciales y registrar las primeras operaciones verificadas. En otro dispositivo, conectar la segunda cuenta y comprobar que carga el mismo estado.

El token se conserva únicamente en memoria durante la sesión. No se coloca en IndexedDB, localStorage, sessionStorage, consola, telemetría, exportaciones ni mensajes de error. Al desconectar o recargar debe introducirse de nuevo. La API utiliza el token por HTTPS para autenticar solicitudes directas a `api.github.com`; quien inspeccione su propia sesión en el navegador puede ver sus solicitudes. El código del cliente debe permanecer confiable y actualizado.

Un repositorio privado no convierte automáticamente su sitio Pages en privado. Por eso el alojamiento de la interfaz y el acceso autenticado al repositorio de datos son decisiones distintas. La configuración de datos puede apuntar a un repositorio diferente del código.

## Cómo se guarda y cómo se evita sobrescribir

- El negocio completo se serializa en **un solo `data/state.json`**. Un comando validado actualiza conjuntamente pedido, venta, cobro, relaciones e historial; no hay un guardado separado de cada saldo que pueda quedar a mitad.
- Al cargar, GitHub entrega la versión del archivo —su SHA—. El siguiente guardado incluye ese SHA. GitHub sólo admite la actualización si esa versión sigue siendo la actual.
- Si otra persona guardó antes, la aplicación muestra un conflicto y **no reintenta con el nuevo SHA ni sobrescribe automáticamente**. Hay que recargar, revisar qué cambió y volver a aplicar la operación sobre la versión actual.
- Si no llegó la respuesta por un corte de conexión, el guardado es incierto: puede existir un commit aunque el navegador no haya recibido confirmación. Recargar y revisar el historial antes de repetir. Los identificadores únicos de comandos/movimientos evitan registrar dos veces una misma operación cuando el motor los encuentra.
- El primer guardado de un archivo inexistente no envía SHA; si aparece entretanto, GitHub rechaza la creación. Tampoco se reemplaza ese archivo automáticamente.
- La identidad GitHub autentica el commit. La autoría de las operaciones se conserva además en el historial del estado. Una restauración debe conservar evidencia de quién la solicitó y por qué.

El motor valida el estado antes de enviar cada actualización y después de leer JSON. Los importes son céntimos enteros. La aplicación no convierte esta validación en una autorización del servidor: un colaborador con Contents de escritura puede editar archivos fuera de ella. Se trata de un sistema para dos operadoras de confianza, no de una base de datos con permisos financieros por operación. GitHub protege el acceso al repositorio y el reemplazo por versión; el cliente aplica las reglas de negocio. Si se necesitan roles restringidos, bloqueos de reglas imposibles de eludir, muchos usuarios o alto volumen, hará falta un servidor que valide comandos y una base de datos apropiada.

## Adjuntos y límites

Los adjuntos se guardan dentro de `data/attachments/<tipo>/<id>/<uuid>.<extensión>`, sin reutilizar nombres, con SHA del archivo Git y hash SHA-256 del contenido. La aplicación conserva nombre original, tipo, tamaño y vinculación en el estado. Las rutas rechazan `..`, barras inversas, codificación de rutas y salidas de la carpeta configurada.

Se aceptan PDF, PNG, JPG, WebP, texto y CSV, hasta **8 MiB por archivo**, sin reducir su calidad. Archivos de más de 1 MiB se recuperan como contenido binario del blob Git exacto, no mediante un enlace público o una rama que pueda cambiar entre lecturas. Subir el archivo y vincularlo en el estado son dos commits: si falla el segundo puede quedar un adjunto sin vínculo; no afecta los importes, y debe revisarse antes de subirlo de nuevo. La aplicación no borra automáticamente archivos ni historia.

El estado completo está limitado a **900 KiB UTF-8** para mantenerse bajo el umbral de lectura completa de Contents API y conservar una sincronización manejable. Alcanzar el límite bloquea el siguiente guardado con una explicación; no elimina historia ni adjuntos. Exportar, revisar crecimiento y planificar una migración antes de alcanzarlo. Es una solución proporcional al piloto y volumen pequeño, no almacenamiento ilimitado. GitHub tiene límites de solicitudes y de escritura; no se realiza sondeo continuo ni reintentos de guardado ocultos.

## Historia, recuperación y respaldo

Cada guardado confirmado crea un commit. La vista de revisiones consulta los commits que afectan al estado y permite cargar una versión antigua **para revisarla**. Recuperarla no mueve la rama hacia atrás ni sobrescribe el negocio a escondidas: debe pasar por el comando de restauración del motor, una razón, revisión de consecuencias y un nuevo guardado que utilice el SHA actual. Los adjuntos referenciados deben verificarse. Una copia ZIP completa se puede seleccionar en Ajustes: comprueba tamaño y huella SHA-256 de cada original y recupera los archivos ausentes antes de guardar la versión restaurada. El JSON por sí solo requiere que sus originales ya estén disponibles. La recuperación local se prueba con datos ficticios; el ensayo con dos cuentas GitHub reales sigue pendiente.

El historial Git aporta recuperación, pero no garantiza que alguien con permisos nunca borre la rama o el repositorio. Mantener exportaciones independientes del estado y de todos los adjuntos, con una fecha y verificación de integridad; conservar una copia fuera de GitHub y probar una recuperación de ejemplo antes del piloto. Una copia JSON sin los adjuntos no es un respaldo completo. Esta versión no promete copia diaria automática, retención de 30 días ni cifrado propio de los datos del repositorio: esos servicios no se han configurado. GitHub mantiene privados los datos según sus controles de acceso; la aplicación no añade cifrado de extremo a extremo.

## Publicación de la interfaz

`.github/workflows/pages.yml` prepara pruebas, compilación y un artefacto Pages que contiene **únicamente `dist`**. Los cambios en `data/**`, adjuntos, snapshots o receipts no activan un nuevo despliegue. El trabajo verifica que las carpetas de datos no aparezcan en el resultado. Nunca copiar datos privados a `public`, al código fuente o a un artefacto público.

Publicar exige una ejecución manual con la opción `publish` activada; la ejecución habitual sólo prueba y prepara. No poner tokens personales en secrets de ese workflow: no los necesita. El código puede seguir en GitHub aunque en el futuro se elija otro alojamiento de interfaz.

GitHub Pages es alojamiento estático y sus condiciones restringen usos principalmente dirigidos a transacciones comerciales o SaaS y desaconsejan transacciones sensibles. Una demo educativa de datos ficticios y el CRM operativo deben evaluarse por separado. Esta implementación no afirma que Pages permita cualquier aplicación por el hecho de llamarla CRM ni sustituye la comprobación de condiciones antes de publicarla. El guardado real se hace directamente a la API de un repositorio privado, nunca a un archivo público del sitio.

## Documentación oficial

- [Crear o actualizar contenido: SHA, commits y permisos Contents](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).
- [Leer blobs binarios por SHA](https://docs.github.com/en/rest/git/blobs#get-a-blob).
- [Administrar tokens personales](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
- [Qué es GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
- [Visibilidad de los sitios Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
- [Límites y condiciones de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
