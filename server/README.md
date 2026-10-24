# Motor SPPS de REVERA

Este servicio ejecuta el SPPS **original**, versión 2.2.1 incluida en I-Simpa v1.3.4, commit `a0d4d4330d8c9894d31ce80e0fd3a9a1d4b872cb`. El frontend sigue en Vercel. El servicio nativo se construye por separado con Docker.

## Uso desde REVERA

1. Publicar `render.yaml` como Blueprint del repositorio en Render, o crear un servicio Docker con `server/Dockerfile` y el contexto en la raíz del repositorio. Seleccionar el plan antes de crear el servicio.
2. Definir `ALLOWED_ORIGINS` con el origen exacto de REVERA (por defecto en el Blueprint: `https://revera-ebon.vercel.app`). Para varios orígenes, separar por comas, sin espacios.
3. Si se requiere acceso con clave, definir `SPPS_API_TOKEN` como clave propia del servicio. No se incluye ni se guarda una clave en el repositorio o en el proyecto acústico.
4. Cuando `/health` muestre `available: true`, abrir **Fuentes / receptores → Servidor de cálculo SPPS** en REVERA. Introducir la URL HTTPS del servicio y la clave. La URL se recuerda localmente; la clave queda solo en memoria de la pestaña.
5. Revisar el recinto y añadir fuentes/receptores. **Calcular con SPPS** envía el recinto y los materiales al servidor configurado. La tabla muestra SPL por banda y permite descargar respuesta temporal y parámetros en JSON.

La configuración no publica automáticamente el servicio. La URL solo existe después de que se construya en la cuenta de alojamiento.

## Alcance de esta entrega

- Un recinto convexo cerrado; hasta 256 caras, 64 vértices por cara y 4096 vértices de contorno en total. Sin huecos, obstáculos, transmisión ni caras cóncavas. Las aristas deben ser conformes; se rechazan mallas abiertas o duplicadas.
- Triangulación por centro de cara y tetraedros desde un centro interior. Se comprueba vecindad y volumen. No depende de TetGen. Se traslada el origen antes de escribir float32 para conservar precisión con coordenadas grandes.
- Fuentes omnidireccionales: hasta 8. Receptores: hasta 32, radio de integración 0,20 m, separados de caras y fuentes por ese radio.
- Seis bandas 125–4000 Hz; 20.000 partículas por fuente y banda, semilla fija, 1 s y paso de 2 ms. Solo un trabajo simultáneo, máximo 90 s de ejecución nativa, temporales aislados por trabajo y eliminados al terminar.
- Reflexión especular, difusión cero, sin absorción atmosférica. Los α de cada cara se conservan. Los provisionales se cuentan y se advierten.
- SPL sin ponderación A, integrado hasta el final de la simulación. El valor puede quedar truncado si la cola dura más de 1 s. Es una estimación por partículas: debe comprobarse convergencia antes de usar resultados definitivos. No se presentan mapas, STI ni tiempos de reverberación por receptor.

## Construcción local

Requiere Linux, Python 3, CMake, C++11 y bibliotecas de desarrollo Boost filesystem, regex, random, thread, test y timer. `build-spps.py` comprueba el commit del checkout de I-Simpa y construye únicamente `lib_interface`, `spps` y sus pruebas, sin GUI ni Python bindings. Se fuerza la inclusión de `cstdint` para compiladores actuales; no se cambia el código del motor.

```sh
python3 server/build-spps.py --source /ruta/a/I-Simpa --build /tmp/spps
export SPPS_BINARY=/tmp/spps/native/spps/spps
python3 -m unittest discover -s server/tests -v
python3 -m server.api
```

API: `GET /health`, `POST /simulate` con el JSON `revera-simulation-job`. Si hay clave, usar `Authorization: Bearer <clave>`. El servicio verifica de nuevo la geometría y materiales; no confía en la marca de validación del navegador. El código de salida original de SPPS no basta para detectar errores: también se comprueban archivos, bandas y valores, y se rechazan avisos de partículas perdidas.

## Verificación y procedencia

Se verificaron los lectores binarios originales mediante ejecución completa de SPPS, no mediante una simulación de su API. En una sala 6×4×3 m, paredes α=1 y Lw=80 dB, el SPL directo quedó a menos de 1 dB del campo libre analítico. Con la misma semilla, +10 dB de Lw produjo +10 dB en todas las bandas. La suite también comprueba el HTTP real, vecindad de tetraedros, volumen, rechazo de errores y traslado del origen.

Los formatos CBIN, MBIN, XML y GABE se implementan a partir del código de I-Simpa: `src/lib_interface/input_output/bin.cpp`, `importExportMaillage/mbin.cpp`, `gabe/gabe.cpp`, `data_manager/base_core_configuration.cpp` y `src/spps`. El motor y este adaptador de servidor se distribuyen bajo GPL-3.0-or-later. Ver la licencia en `vendor/isimpa-tcr/LICENSE.md`. El Docker conserva el checkout completo de la fuente correspondiente en `/opt/isimpa`; la fuente pública exacta está en https://github.com/Universite-Gustave-Eiffel/I-Simpa/tree/a0d4d4330d8c9894d31ce80e0fd3a9a1d4b872cb .

Servicio de prototipo creado en Render: `https://revera-spps.onrender.com`, Docker, plan Free. El frontend lo utiliza como URL predeterminada. El servicio creado desde repositorio público requiere despliegue manual para actualizar el motor; Vercel conserva el despliegue automático del frontend.
