# Verificación · REVERA Web 0.2

- 12 pruebas automatizadas de geometría y DXF: aprobadas.
- Compilación estática Node.js sin dependencias: aprobada.
- Navegador real: motor WASM de Hew cargado dentro del frontend.
- Creación de una sala con seis sólidos desde la interfaz: aprobada.
- Importación real de un SKP 2026 desde la interfaz: aprobada.
- Dibujo importado → extracción: seis caras, 108 m², 72 m³: aprobado.
- Archivos originales y dibujo arquitectónico se conservan durante la extracción.
- Limitación de la revisión: el navegador remoto no tiene WebGL2 habilitado;
  el dibujo interactivo de Hew debe probarse en un navegador con aceleración
  gráfica. Se verificaron su motor, importación, estado del documento y la vista
  acústica Canvas. No se modificaron protecciones del navegador para forzarlo.
- DXF: parser y generación de comandos comprobados; compatibilidad limitada a
  LINE y LWPOLYLINE rectas, horizontales, en DXF ASCII.
- Guardado en nube, cuentas, pagos y parámetros acústicos: no implementados.
