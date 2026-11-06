# NEXO · Smart Home Lab

Simulador interactivo 2D de una casa inteligente con acceso automático, iluminación LDR, detección ultrasónica y protección de caja fuerte por sonido. El repositorio original solo contenía este README; la aplicación está implementada en HTML, CSS y módulos JavaScript nativos, **sin dependencias de ejecución**.

## Iniciar

Necesitas un navegador moderno. Desde la raíz del proyecto:

```bash
npm run dev
# o: python3 -m http.server 4173 --bind 0.0.0.0
```

Abre `http://localhost:4173`. Ejecuta `npm test` (Node.js 18+) para comprobar las reglas de la simulación. No uses `file://`: los módulos ES requieren un servidor HTTP. El diseño se adapta a escritorio, tablet y móvil.

## Versión publicada en GitHub Pages

**URL de GitHub Pages (una vez activado):** https://migulopez.github.io/maqueta-de-sistema-de-seguridad/

**Activación inicial por el propietario:** en el repositorio de GitHub, entra en **Settings → Pages → Build and deployment → Source**, elige **GitHub Actions** y guarda. Luego abre **Actions → Publicar simulador en GitHub Pages → Run workflow → main → Run workflow**. La integración usada para publicar el código no tiene permisos para activar Pages en la configuración del repositorio; sin este paso la URL puede dar 404.

Después de activarlo, cada actualización de `main` publica automáticamente los archivos estáticos mediante `.github/workflows/pages.yml`. No necesita instalación ni servidor backend para el modo simulación. La URL usa HTTPS, requisito del modo Web Serial en navegadores compatibles.

## Recorrido interactivo

- **WASD** o **flechas** para moverte; **Shift** para correr. En móviles, usa la cruceta y mantén pulsado **CORRER**.
- Avanza desde el jardín a la puerta. El HC-SR04 virtual mide distancia, pulsa el buzzer/relé y el servo abre la puerta. Los finales de carrera cambian al llegar a 0° o 90°. Al alejarte, se cierra.
- Entra al pasillo o atraviesa las puertas laterales para visitar sala y estudio. **E** o clic en la caja fuerte la inspecciona al estar cerca.
- Baja **Luz ambiental**: el LDR virtual desciende y enciende las luminarias. Cambia el **alcance ultrasónico** y el **umbral de sonido** para experimentar.
- Caminar genera poco sonido; correr cerca de la caja fuerte supera el umbral, activa LEDs y alarma, hace descender la reja con ambos motores y **obliga al personaje a retroceder**. El obstáculo impide cruzar mientras está abajo. Pulsa **Restablecer** para subirla o **Reiniciar simulación** para comenzar de nuevo.
- Selecciona **Seguir**, **Exterior**, **Entrada**, **Pasillo** o **Caja fuerte** para cambiar entre cámaras virtuales. El botón de audio es optativo (los navegadores requieren interacción para reproducir sonidos).

El panel derecho muestra permanentemente los 5 sensores y 8 actuadores, con estados y valores dinámicos. En pantallas estrechas se sitúa debajo de la escena, sin desaparecer; la barra compacta de estado permanece junto a la escena.

## Arquitectura

| Ruta | Responsabilidad |
| --- | --- |
| `index.html`, `styles.css` | Centro de control adaptable, escena y controles |
| `src/scene.js` | Planta SVG vectorial, animaciones de puerta/reja/lámparas/alarmas y cámaras virtuales |
| `src/simulation.js` | Estado virtual y reglas deterministas: movimiento, colisiones, sensores y actuadores |
| `src/app.js` | Entradas teclado/táctiles, audio opcional, telemetría, panel y ciclo de animación |
| `src/hardware.js` | Transporte Web Serial, mensajes JSON por línea y detección de desconexión |
| `arduino/NexoSmartHome/NexoSmartHome.ino` | Firmware de referencia para Arduino UNO |
| `tests/simulation.test.js` | Pruebas automatizadas del modelo virtual |

**Separación de datos:** los valores del modo Simulación son virtuales. En modo Arduino el avatar sigue siendo virtual, pero el panel **solo** muestra telemetría recibida del puerto físico; sin paquete reciente (2,5 segundos) aparecen guiones y una advertencia. El escenario muestra actuadores reportados por el Arduino, no los calculados por el avatar. La simulación nunca envía órdenes de actuadores al hardware. Las cámaras son 100 % virtuales: no se solicita acceso a la cámara del dispositivo.

## Conectar un Arduino UNO (opcional)

1. Instala la librería **Servo** incluida con Arduino IDE y carga `arduino/NexoSmartHome/NexoSmartHome.ino` en el UNO.
2. Usa Chrome o Edge con Web Serial en un **contexto seguro** (`localhost` o HTTPS), conecta el UNO por USB y pulsa **Arduino UNO** en el panel. Selecciona el puerto. El botón de simulación desconecta el puerto.
3. El firmware envía JSON terminado en `\n` a **115200 baudios** cada ~150 ms. El navegador puede enviar `{"cmd":"config","detectionRange":100,"soundThreshold":58}` y `{"cmd":"reset"}`. Los controles del panel transmiten el alcance/umbral en modo hardware; el deslizador de luz se deshabilita (la luz real debe venir del LDR).
4. Ajusta la calibración del micrófono (`SOUND_PEAK_AT_100`), el umbral LDR (`LDR_DARK_THRESHOLD`), el tiempo real de recorrido (`GATE_TRAVEL_MS`) y la polaridad del relé **antes** de conectar los actuadores. Los módulos de sonido tienen sensibilidades muy distintas.

### Conexiones de referencia

| Componente | Pin UNO |
| --- | --- |
| HC-SR04 TRIG / ECHO | D2 / D3 |
| Fin de carrera cerrado / abierto (a GND, `INPUT_PULLUP`) | D4 / D5 |
| Relé del buzzer / LED de alarma / luces exteriores (mediante etapa de potencia) | D6 / D7 / D8 |
| Servo de puerta | D9 |
| L298N IN1, IN2 / IN3, IN4 | D10, D11 / D12, D13 |
| LDR divisor resistivo / micrófono salida analógica | A0 / A1 |

**Seguridad eléctrica:** no alimentes motores, luces de potencia ni servos desde los pines del UNO; utiliza fuentes externas adecuadas y masa común, protección contra retorno inductivo, fusibles y cableado apropiado. El firmware detiene los motores tras `GATE_TRAVEL_MS`, pero la posición de la reja es **estimada por tiempo**, no medida; instala finales de carrera adicionales y un paro de emergencia antes de controlar una reja física capaz de atrapar a alguien. Los dos finales de carrera incluidos son **solo de la puerta**. El ángulo del servo es un ángulo **ordenado**, no una lectura de encoder. Prueba la lógica primero con LEDs y sin cargas mecánicas.

Si se pierde el enlace, la interfaz deja de presentar lecturas reales; el firmware autónomo sigue funcionando en el UNO. Para despliegues sin Web Serial se puede sustituir `src/hardware.js` por un puente serial local que emita el mismo JSON por WebSocket, sin alterar el modelo ni el panel.
