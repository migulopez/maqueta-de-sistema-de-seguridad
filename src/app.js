import { createScene } from './scene.js';
import { createSimulation, stepSimulation, resetAlarm, zoneFor, clamp } from './simulation.js';
import { ArduinoConnection } from './hardware.js';

const $ = selector => document.querySelector(selector);
const scene = createScene($('#scene-container'));
let sim = createSimulation();
let camera = 'follow';
let mode = 'simulation';
let telemetry = null;
let hardwareWarning = '';
let soundEnabled = false;
let audioContext = null;
let lastAlarmTone = 0;
let lastFrame = performance.now();
let lastUI = 0;
const keys = new Set();
const touch = new Set();
let touchRun = false;
const transport = new ArduinoConnection(data => { telemetry = data; hardwareWarning = ''; }, message => { telemetry = null; hardwareWarning = message; });

function beep(frequency = 780, duration = .12, volume = .055) {
  if (!soundEnabled) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  } catch { /* audio is optional; visuals remain functional */ }
}

const input = () => ({
  up: keys.has('w') || keys.has('arrowup') || touch.has('up'),
  down: keys.has('s') || keys.has('arrowdown') || touch.has('down'),
  left: keys.has('a') || keys.has('arrowleft') || touch.has('left'),
  right: keys.has('d') || keys.has('arrowright') || touch.has('right'),
  run: keys.has('shift') || touchRun
});
window.addEventListener('keydown', event => {
  if (document.activeElement?.tagName?.toLowerCase() === 'input' && event.key.toLowerCase() !== 'escape') return;
  const key = event.key.toLowerCase();
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','e'].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === 'e' && !event.repeat) inspectSafe();
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); touch.clear(); touchRun = false; });
for (const button of document.querySelectorAll('[data-dir]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touch.add(button.dataset.dir); });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, () => touch.delete(button.dataset.dir));
}
$('#touch-run').addEventListener('pointerdown', event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); touchRun = true; });
for (const type of ['pointerup','pointercancel','lostpointercapture']) $('#touch-run').addEventListener(type, () => touchRun = false);

function inspectSafe() {
  if (Math.hypot(sim.player.x-600, sim.player.y-195) < 86) {
    sim.notice = sim.alarm ? 'Caja fuerte bloqueada. Restablece la alarma.' : 'SF-01: acceso protegido. Evita hacer ruido en esta zona.';
    $('#scene-hint').textContent = sim.notice;
    beep(510, .09);
  }
}
$('#safe').addEventListener('click', inspectSafe);
$('#safe').addEventListener('keydown', event => { if (event.key === 'Enter') inspectSafe(); });

const cameraNames = { follow: 'SEGUIMIENTO', exterior: 'EXTERIOR', entrada: 'ENTRADA', pasillo: 'PASILLO', caja: 'CAJA FUERTE' };
$('#camera-buttons').addEventListener('click', event => {
  const button = event.target.closest('[data-camera]'); if (!button) return;
  camera = button.dataset.camera;
  document.querySelectorAll('[data-camera]').forEach(el => el.classList.toggle('selected', el === button));
  $('#camera-name').textContent = cameraNames[camera];
});

function setSlider(id, readout, formatter, key, hardwareKey) {
  const slider = $(`#${id}`);
  slider.addEventListener('input', () => {
    const value = Number(slider.value);
    sim.settings[key] = value;
    $(`#${readout}`).textContent = formatter(value);
    slider.style.setProperty('--fill', `${(value - Number(slider.min)) / (Number(slider.max) - Number(slider.min)) * 100}%`);
    if (mode === 'hardware' && hardwareKey) transport.send({ cmd: 'config', [hardwareKey]: value });
  });
  slider.dispatchEvent(new Event('input'));
}
setSlider('light-slider', 'light-readout', n => `${n}%`, 'ambient', null);
setSlider('distance-slider', 'distance-readout', n => `${n} cm`, 'detectionRange', 'detectionRange');
setSlider('threshold-slider', 'threshold-readout', n => `${n} / 100`, 'soundThreshold', 'soundThreshold');

$('#sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  $('#sound-label').textContent = soundEnabled ? 'ON' : 'OFF';
  $('#sound-toggle').classList.toggle('active', soundEnabled);
  $('#sound-toggle').title = soundEnabled ? 'Silenciar' : 'Activar sonido';
  if (soundEnabled) beep(690, .08);
});
function reset() {
  if (mode === 'hardware') { transport.send({ cmd: 'reset' }); hardwareWarning = 'Comando de restablecimiento enviado; espera la confirmación del Arduino.'; return; }
  sim = createSimulation(sim.settings);
  camera = 'follow';
  document.querySelectorAll('[data-camera]').forEach(el => el.classList.toggle('selected', el.dataset.camera === 'follow'));
  $('#camera-name').textContent = cameraNames.follow;
  keys.clear(); touch.clear();
}
$('#reset-button').addEventListener('click', reset);
$('#dismiss-alarm').addEventListener('click', () => {
  if (mode === 'hardware') transport.send({ cmd: 'reset' });
  else resetAlarm(sim);
});

function setModeUI() {
  $('#simulation-mode').classList.toggle('active', mode === 'simulation');
  $('#hardware-mode').classList.toggle('active', mode === 'hardware');
  $('#light-slider').disabled = mode === 'hardware';
  $('#connection-badge').innerHTML = mode === 'simulation' ? '<i></i> SIMULACIÓN' : `<i></i> ${transport.connected && telemetry ? 'ARDUINO EN LÍNEA' : 'SIN TELEMETRÍA'}`;
  $('#connection-badge').classList.toggle('hardware-online', mode === 'hardware' && !!telemetry);
  $('#connection-badge').classList.toggle('offline', mode === 'hardware' && !telemetry);
  $('#footer-mode').textContent = mode === 'simulation' ? 'MODO SIMULACIÓN' : telemetry ? 'ARDUINO CONECTADO' : 'ARDUINO SIN DATOS';
  $('#hardware-message').hidden = mode !== 'hardware';
  if (mode === 'hardware') $('#hardware-message').textContent = hardwareWarning || (telemetry ? 'Telemetría física desde Arduino UNO · la posición del avatar es solo virtual. Luz ambiental simulada deshabilitada.' : 'Esperando lecturas físicas del Arduino. El escenario y el avatar siguen siendo virtuales; no se mostrarán lecturas simuladas como reales.');
  $('#scene-container').classList.toggle('hardware-view', mode === 'hardware');
}
$('#simulation-mode').addEventListener('click', async () => {
  mode = 'simulation'; telemetry = null; hardwareWarning = '';
  await transport.disconnect(); setModeUI();
});
$('#hardware-mode').addEventListener('click', async () => {
  if (mode === 'hardware' && transport.connected) return;
  mode = 'hardware'; telemetry = null; hardwareWarning = 'Selecciona el puerto del Arduino. Esperando conexión…'; setModeUI();
  try {
    await transport.connect();
    transport.send({ cmd: 'config', detectionRange: sim.settings.detectionRange, soundThreshold: sim.settings.soundThreshold });
    hardwareWarning = 'Puerto abierto. Esperando la primera lectura del Arduino…';
  } catch (error) { hardwareWarning = error.name === 'NotFoundError' ? 'No se seleccionó ningún puerto. Pulsa Arduino UNO para volver a intentar.' : error.message; }
  setModeUI();
});
navigator.serial?.addEventListener?.('disconnect', () => { telemetry = null; hardwareWarning = 'Arduino desconectado. Las lecturas reales se han ocultado.'; });

function tag(status, text) { return `<span class="state-tag ${status}"><i></i>${text}</span>`; }
function component(icon, name, subtitle, value, status, state) {
  return `<div class="component ${status}"><span class="component-icon">${icon}</span><div class="component-info"><strong>${name}</strong><small>${subtitle}</small></div><div class="component-data"><strong>${value}</strong>${tag(status, state)}</div></div>`;
}
function renderComponents(data, live) {
  const unavailable = mode === 'hardware' && !live;
  const u = (value) => unavailable ? '—' : value;
  const status = (active, critical = false, process = false) => unavailable ? 'off' : critical ? 'critical' : process ? 'process' : active ? 'on' : 'off';
  const valid = (number, max) => typeof number === 'number' && Number.isFinite(number) && number >= 0 && number <= max;
  const dist = valid(data?.distanceCm, 400) ? Math.round(data.distanceCm) : null;
  const ldr = valid(data?.ldr, 1023) ? Math.round(data.ldr) : null;
  const noise = valid(data?.sound, 100) ? Math.round(data.sound) : null;
  const detected = live && data?.detected === true;
  const lights = live && data?.lights === true;
  const alarm = live && data?.alarm === true;
  const open = live && data?.openLimit === true;
  const closed = live && data?.closedLimit === true;
  const angle = valid(data?.servoAngle, 90) ? Math.round(data.servoAngle) : null;
  const gateState = live && ['Levantada','Descendiendo','Desplegada','Ascendiendo'].includes(data?.gateState) ? data.gateState : null;
  const movingGate = gateState === 'Descendiendo' || gateState === 'Ascendiendo';
  const motor = live && (data?.motor1 === true || data?.motor2 === true);
  const sensorRows = [
    component('⌁','Ultrasónico','HC-SR04 · Entrada',u(dist === null ? '—' : `${dist} cm`),status(detected),u(detected ? 'Detectado' : 'En espera')),
    component('☼','Sensor LDR','Luz ambiental · Exterior',u(ldr === null ? '—' : `${ldr} / 1023`),status(lights),u(lights ? 'Oscuridad' : 'Luz diurna')),
    component('◉','Sensor de sonido','Micrófono · Caja fuerte',u(noise === null ? '—' : `${noise} / 100`),status(noise > 0, alarm, noise !== null && noise >= sim.settings.soundThreshold * .65 && !alarm),u(alarm ? '¡Umbral!' : noise > 0 ? 'Escuchando' : 'Silencio')),
    component('⊣','Fin de carrera abierto','Puerta principal · FC2',u(open ? 'ACTIVADO' : 'LIBRE'),status(open),u(open ? 'Contacto' : 'En espera')),
    component('⊢','Fin de carrera cerrado','Puerta principal · FC1',u(closed ? 'ACTIVADO' : 'LIBRE'),status(closed),u(closed ? 'Contacto' : 'En espera'))
  ];
  const actuatorRows = [
    component('◌','Servomotor','Puerta · 0°–90°',u(angle === null ? '—' : `${angle}°`),status(angle > 0, false, angle > 0 && angle < 90),u(angle === null ? 'Sin datos' : angle >= 89 ? 'Abierta' : angle <= 1 ? 'Cerrada' : 'Girando')),
    component('✳','Luces exteriores','Control LDR automático',u(lights ? 'ENCENDIDAS' : 'APAGADAS'),status(lights),u(lights ? 'Encendidas' : 'Apagadas')),
    component('♫','Buzzer','Aviso / Alarma',u(data?.buzzer === true ? 'ACTIVO' : 'INACTIVO'),status(data?.buzzer, alarm),u(data?.buzzer === true ? alarm ? 'Alarma' : 'Aviso' : 'En espera')),
    component('⇄','Relé','Módulo de conmutación',u(data?.relay === true ? 'CERRADO' : 'ABIERTO'),status(data?.relay, alarm),u(data?.relay === true ? 'Activado' : 'Reposo')),
    component('✺','LED de seguridad','Señal visual de alerta',u(alarm ? 'ENCENDIDOS' : 'APAGADOS'),status(alarm, alarm),u(alarm ? 'Alerta' : 'En espera')),
    component('↻','Motor DC 1','Reja · lado izquierdo',u(data?.motor1 === true ? 'EN MARCHA' : 'DETENIDO'),status(data?.motor1, false, movingGate),u(data?.motor1 === true ? gateState === 'Ascendiendo' ? 'Subiendo' : 'Bajando' : 'Reposo')),
    component('↻','Motor DC 2','Reja · lado derecho',u(data?.motor2 === true ? 'EN MARCHA' : 'DETENIDO'),status(data?.motor2, false, movingGate),u(data?.motor2 === true ? gateState === 'Ascendiendo' ? 'Subiendo' : 'Bajando' : 'Reposo')),
    component('▣','Driver L298N','Puente H · Reja',u(gateState || '—'),status(motor || gateState === 'Desplegada', alarm && gateState === 'Desplegada', movingGate),u(movingGate ? 'En proceso' : gateState === 'Desplegada' ? 'Bloqueada' : 'En reposo'))
  ];
  $('#sensor-list').innerHTML = sensorRows.join('');
  $('#actuator-list').innerHTML = actuatorRows.join('');
}
function simData() { return { ...sim, motor1: sim.gateState === 'Descendiendo' || sim.gateState === 'Ascendiendo', motor2: sim.gateState === 'Descendiendo' || sim.gateState === 'Ascendiendo' }; }
function updateUI() {
  const live = mode === 'simulation' || (transport.connected && telemetry && Date.now() - transport.lastPacket < 2500);
  if (mode === 'hardware' && !live && telemetry) { telemetry = null; hardwareWarning = 'Sin lecturas recientes (> 2,5 s). Comprueba el cable y el firmware.'; }
  const data = mode === 'simulation' ? simData() : live ? telemetry : null;
  const alarm = Boolean(data?.alarm);
  const sound = typeof data?.sound === 'number' ? clamp(Math.round(data.sound),0,100) : null;
  const location = zoneFor(sim.player.x, sim.player.y);
  $('#location-value').textContent = location;
  $('#zone-name').textContent = `${location.toUpperCase()} ${mode === 'hardware' ? '· VISTA VIRTUAL' : ''}`;
  $('#movement-value').textContent = sim.movement;
  $('#scene-coordinates').textContent = `X ${Math.round(sim.player.x)} · Y ${Math.round(sim.player.y)}`;
  $('#sound-value').textContent = sound === null ? '— / 100' : `${sound} / 100`;
  $('#sound-meter').style.width = `${sound ?? 0}%`;
  $('#sound-meter').className = alarm || sound >= sim.settings.soundThreshold ? 'danger' : sound >= sim.settings.soundThreshold * .65 ? 'warning' : '';
  $('#threshold-marker').style.left = `${sim.settings.soundThreshold}%`;
  $('#security-value').textContent = !live ? 'Sin telemetría' : alarm ? 'Alarma activa' : 'Protegida';
  $('#security-value').classList.toggle('danger-text', alarm);
  $('#overview-status').textContent = !live ? 'Esperando Arduino' : alarm ? 'Intrusión detectada' : 'Sistema operativo';
  $('#overview-icon').textContent = !live ? '!' : alarm ? '!' : '✓';
  $('.system-overview').classList.toggle('alerting', alarm);
  $('.system-overview').classList.toggle('no-data', !live);
  $('#overview-pill').textContent = !live ? 'SIN DATOS' : alarm ? 'ALERTA' : 'NORMAL';
  $('#mode-description').textContent = mode === 'simulation' ? 'Datos generados por simulación' : live ? 'Lecturas físicas · Arduino UNO' : 'No hay lecturas físicas disponibles';
  $('#alert-banner').hidden = !alarm;
  $('#scene-hint').textContent = mode === 'hardware' ? 'Avatar virtual · sensores físicos independientes' : sim.notice || (location === 'Exterior' ? 'Acércate a la entrada para activar el sensor' : location === 'Caja fuerte' ? 'Camina en silencio junto a la caja fuerte' : 'Corre cerca de la caja fuerte para probar la alarma');
  setModeUI();
  renderComponents(data, live);
}
function frame(now) {
  const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  const events = stepSimulation(sim, input(), dt);
  if (mode === 'simulation') {
    if (events.presenceStarted) beep(880, .16);
    if (events.alarmStarted) beep(420, .3, .09);
    if (sim.alarm && now - lastAlarmTone > 720) { beep(540, .25, .07); lastAlarmTone = now; }
  }
  // In hardware mode only reported actuator states drive the visual equipment.
  let visual = sim;
  if (mode === 'hardware') {
    visual = { ...sim, servoAngle: telemetry?.servoAngle ?? 0, gateProgress: telemetry?.gateProgress ?? 0,
      lights: telemetry?.lights === true, alarm: telemetry?.alarm === true, detected: telemetry?.detected === true };
  }
  scene.update(visual, camera);
  if (now - lastUI > 120) { updateUI(); lastUI = now; }
  requestAnimationFrame(frame);
}
setInterval(() => { $('#clock').textContent = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', hour12:false }); }, 1000);
$('#clock').textContent = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', hour12:false });
updateUI(); requestAnimationFrame(frame);
