# Presentación NEXO · 15 diapositivas

- **PDF para presentar:** `NEXO_Casa_Inteligente_15_Diapositivas.pdf`
- **PowerPoint editable:** `NEXO_Casa_Inteligente_15_Diapositivas.pptx`

Explica la misión de 9 puntos, los controles, las seis salas, los sensores ultrasónico/LDR/sonido, servomotores, finales de carrera, LED/buzzer/relé, L298N y motores DC, el panel, la lógica de programación y la diferencia entre simulación y hardware real. Diseño 16:9 inspirado en la referencia del usuario, con ilustraciones y diagramas originales.

## Regenerar

Desde la raíz del repositorio:

```bash
python3 -m venv .venv
.venv/bin/pip install python-pptx reportlab
.venv/bin/python presentacion/generar_presentacion.py
```

El script usa fuentes DejaVu Sans instaladas en el sistema (`/usr/share/fonts/truetype/dejavu`). El PDF conserva las fuentes incrustadas; el PPTX contiene formas y textos editables.
