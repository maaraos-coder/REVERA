# REVERA Web · AKUZOFT

Frontend para dibujar recintos con el editor 3D de Hew y generar una envolvente
acústica sin espesor. Se ejecuta en el navegador: no requiere Python instalado,
Render ni un servidor de importación. Versión inicial 0.2.

## Publicar en tu GitHub y Vercel

1. Crea un repositorio `revera` en tu cuenta de GitHub.
2. Sube **el contenido** de esta carpeta a la raíz del repositorio (incluye
   `src`, `vendor`, `tests`, `package.json`, `build.mjs` y `vercel.json`).
3. En Vercel, selecciona **Add New → Project → Import Git Repository**.
4. Selecciona el repositorio. Framework: **Other**. Root Directory: raíz.
5. Build Command: `npm run build`. Output Directory: `dist`.
6. Publica. Esta versión no necesita variables de entorno ni claves.

Los pushes posteriores a la rama de producción actualizarán el despliegue
si está activa la integración de Git. No se han configurado usuarios, pagos
ni guardado en nube: los proyectos se descargan o quedan en ese navegador.

## Desarrollo

Node.js 20 o posterior. Sin dependencias npm de ejecución ni de compilación.

```sh
npm test
npm run build
npx serve dist
```

Abre la URL del servidor. No abras `index.html` mediante `file://`: el motor
WASM, módulos y workers necesitan HTTP o HTTPS.

## Funciones

- Editor web de Hew integrado: dibujo, cotas, empujar/tirar y herramientas 3D.
- Importación de SKP 2017/2026, HEW, GLB y STL; unidades explícitas para STL.
- DXF ASCII 2D: LINE y LWPOLYLINE sin arcos. Se informa qué entidades se omiten.
  El plano es una referencia editable; debe levantarse el recinto antes del cálculo.
- Transferencia directa del dibujo al modelo acústico, sin descargar un archivo
  intermedio. Se expanden componentes mediante GLB y se conservan hojas abiertas.
- Extracción de envolvente interior de salas convexas sin obstáculos, comprobación
  de cierre, superficies y volumen de aire. No se modifica la arquitectura.
- Dibujo HEW descargable y proyecto REVERA con dibujo y geometría.
- Recuperación local de la última extracción e invalidación de resultados al editar.

## Qué falta

DWG, DXF completo/3D, extracción robusta de recintos cóncavos o comunicados,
asignación acústica por bandas, fuentes, receptores, trazado de rayos,
reverberación, informes acústicos, cuentas y suscripciones. No se presenta esta
versión como un sustituto validado de EASE.

El editor de Hew requiere WebGL2. En equipos sin aceleración gráfica, el motor
de geometría puede funcionar pero su vista de dibujo 3D no se muestra. La vista
acústica de REVERA utiliza Canvas 2D y no depende de WebGL.

## Procedencia y licencia

Hew v1.2.3, commit `fd57945fa11b259441583ac975d679ee977e6fac`:
https://github.com/hew3d/hew

Esta adaptación y su interfaz se entregan bajo AGPL-3.0-only. Se conservan
los avisos de Hew y su Plugin API Exception. `vendor` incluye la distribución
web oficial y su fuente correspondiente. `build.mjs` aplica un cambio acotado
al host web para enlazar el editor con REVERA y adaptar las rutas de recursos.
El sitio ofrece la fuente de Hew, la licencia y el código de la adaptación.

La integración web usa `src/editor-bridge.js` dentro del editor modificado;
no se la presenta como un plugin cerrado amparado por la excepción de Hew.
El motor se comunica solo con la ventana padre del mismo origen.

## Selección de caras y datos acústicos
En Editor 3D, activa **Propiedades de cara** para elegir una superficie sin seleccionar ni mover el objeto completo. Desactiva el modo para continuar dibujando. En Arquitectónico y Acústico basta hacer clic en la cara; arrastrar orbita. La tabla de superficies también permite seleccionar con clic o Enter.

El panel muestra área y normal y guarda nombre, material y absorción por octavas de 125 a 4000 Hz. Los coeficientes deben ser datos verificados del material: las caras nuevas usan α = 0,05 provisional, identificado en pantalla, hasta asignar el material real. El recinto validado permite calcular reverberación global Sabine y Eyring. Guarda en formato REVERA para incluir estos datos; HEW conserva solamente el dibujo. La asociación usa el contorno geométrico de la cara, independiente del orden o normal; si cambia el contorno se debe reasignar. Caras exactamente coincidentes comparten asociación. El modo del editor selecciona superficies visibles en el modelo exportado; no contempla recortes de sección. Tras editar la geometría, reactiva la selección.

## Borrar una cara del dibujo
En Editor 3D, activa **Borrar caras** en la barra de dibujo inferior (o en los controles superiores) y haz clic sobre la superficie original que quieres borrar. El borrador sigue activo para borrar otra cara; elegir Línea, Rectángulo u otra herramienta, o pulsar Escape, permite continuar dibujando. **Propiedades de cara** es exclusivamente informativo y permite asignar datos acústicos, sin acciones de borrado. El editor reconstruye el objeto abierto como malla conservando sus contornos, huecos y materiales de color; las curvas pierden su definición paramétrica. La operación queda en un único paso del historial (Editar → Deshacer). El botón Deshacer borrado está disponible mientras no cambie de nuevo el dibujo. Esta versión admite objetos independientes sin etiquetas ni texturas; desagrupa/descompón componentes antes de editarlos. Las caras recortadas de la envolvente acústica no sustituyen a una cara original. Si una cara coincide con varios objetos, se rechaza la operación. Toda reconstrucción se valida y revierte si cambia un contorno o el área. No se elimina el objeto completo salvo que se borre su última cara.

Selección de dibujo: un clic con Seleccionar sobre geometría suelta marca una cara; Supr/Retroceso elimina únicamente esa superficie. Ctrl/Mayús + clic conserva la selección nativa de objetos para agruparlos o crear componentes explícitamente. Los grupos e instancias conservan su selección nativa. Propiedades de cara es una inspección acústica separada.

## Reverberación TCR · primera integración I-Simpa

Después de **Revisar orientación y cierre** y **Calcular recinto validado**, abre **Ver superficies**. Allí aparecen absorción equivalente y TR Sabine/Eyring por octavas de 125 a 4000 Hz, con descarga JSON. El cálculo requiere volumen validado y coeficientes completos; los valores provisionales se advierten explícitamente.

`src/tcr.js` adapta al navegador las funciones globales de TCR de I-Simpa v1.3.4, commit `a0d4d4330d8c9894d31ce80e0fd3a9a1d4b872cb`. Usa la constante original 0,163 y las áreas, volumen y α de REVERA. No incluye absorción atmosférica, propagación espacial, receptores ni SPPS. No ejecuta el programa nativo completo. La fuente de referencia, licencia GPL-3.0-or-later y notas están en `vendor/isimpa-tcr` y se incluyen en la distribución y el archivo de fuentes.

Las pruebas verifican una sala de 6 × 4 × 3 m (72 m³, 108 m²): con α = 0,20, TR Sabine = 0,543333 s. Si hay un compilador C++ disponible, también se contrasta el resultado con la función original `Get_TR_` compilada, sin modificar su cuerpo.

## Fuentes y receptores

El panel **Fuentes / receptores** permite añadir, editar y eliminar puntos en metros, con nombres automáticos. Cada fuente omnidireccional necesita potencia sonora Lw en las seis bandas (125–4000 Hz); los receptores solo requieren posición. Se rechazan puntos sobre las caras o fuera del recinto convexo validado. La vista Acústico muestra fuentes naranjas y receptores celestes. Los puntos se incluyen en el proyecto `.revera` y en la recuperación local; proyectos antiguos sin puntos siguen abriendo.

**Preparar datos para SPPS** descarga `revera-spps-datos.json`: un formato de intercambio REVERA con geometría, absorción y puntos. Valida que el dibujo coincida con la revisión, que existan fuentes/receptores y que ninguna pareja coincida. El archivo NO es una entrada nativa ni un resultado SPPS. La ejecución usa ahora el adaptador XML/CBIN/MBIN y el mallado de `server/`; la difusión continúa fijada en cero. El motor original y su adaptador de servidor ya se construyen con `server/build-spps.py`; la publicación del servicio se configura por separado. Ver `server/README.md`.

## SPPS nativo

**Fuentes / receptores → Servidor de cálculo SPPS** permite configurar la URL del servicio Docker y su clave. **Calcular con SPPS** envía el proyecto, verifica que el dibujo siga actualizado y muestra SPL por receptor y banda, con descarga JSON. El servicio requiere publicación independiente; `render.yaml` prepara su configuración en Render. No se incluye una URL de servidor ficticia. Instrucciones, límites físicos y pruebas en `server/README.md`.
