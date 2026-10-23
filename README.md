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
En Editor 3D, activa **Seleccionar caras** para elegir una superficie sin seleccionar ni mover el objeto completo. Desactiva el modo para continuar dibujando. En Arquitectónico y Acústico basta hacer clic en la cara; arrastrar orbita. La tabla de superficies también permite seleccionar con clic o Enter.

El panel muestra área y normal y guarda nombre, material y absorción por octavas de 125 a 4000 Hz. Los coeficientes deben ser datos verificados del material: no hay valores predeterminados ni cálculo de reverberación todavía. Guarda en formato REVERA para incluir estos datos; HEW conserva solamente el dibujo. La asociación usa el contorno geométrico de la cara, independiente del orden o normal; si cambia el contorno se debe reasignar. Caras exactamente coincidentes comparten asociación. El modo del editor selecciona superficies visibles en el modelo exportado; no contempla recortes de sección. Tras editar la geometría, reactiva la selección.

## Borrar una cara del dibujo
Selecciona una cara original en Editor 3D o Arquitectónico y usa **Borrar esta cara** o Supr. El editor reconstruye el objeto abierto como malla conservando sus contornos, huecos y materiales de color; las curvas pierden su definición paramétrica. La operación queda en un único paso del historial (Editar → Deshacer). El botón Deshacer borrado está disponible mientras no cambie de nuevo el dibujo. Esta versión admite objetos independientes sin etiquetas ni texturas; desagrupa/descompón componentes antes de editarlos. Las caras recortadas de la envolvente acústica no sustituyen a una cara original. Si una cara coincide con varios objetos, se rechaza la operación. Toda reconstrucción se valida y revierte si cambia un contorno o el área. No se elimina el objeto completo salvo que se borre su última cara.
