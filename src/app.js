import { createScene } from './scene.js';
import { createSimulation, stepSimulation, resetAlarm, zoneFor, clamp, collectNearby, ROOMS, MAX_SCORE, ROOM_SOUND_LIMIT } from './simulation.js';
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
let lastRoomTone = 0;
let lastFrame = performance.now();
let lastUI = 0;
const keys = new Set();
const touch = new Set();
let touchRun = false;
let touchCrouch = false;
const transport = new ArduinoConnection(data => { telemetry = data; hardwareWarning = ''; }, message => { telemetry = null; hardwareWarning = message; });

// The guide is visible on every visit; reopening it pauses the virtual world.
const helpModal = $('#help-modal');
let helpOpen = true;
let returnFocus = null;
$('#help-start').focus({ preventScroll: true });
function openHelp() {
  if (helpOpen) return;
  returnFocus = document.activeElement;
  helpOpen = true;
  keys.clear(); touch.clear(); touchRun = false; touchCrouch = false;
  $('.app-shell').inert = true;
  document.body.classList.add('help-active');
  helpModal.hidden = false;
  $('#help-start').focus({ preventScroll: true });
}
function closeHelp() {
  if (!helpOpen) return;
  helpOpen = false;
  helpModal.hidden = true;
  $('.app-shell').inert = false;
  document.body.classList.remove('help-active');
  lastFrame = performance.now();
  (returnFocus?.isConnected ? returnFocus : $('#scene-container')).focus({ preventScroll: true });
  returnFocus = null;
}
$('#help-start').addEventListener('click', closeHelp);
$('#help-toggle').addEventListener('click', openHelp);
helpModal.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeHelp(); }
  // Only the start button is focusable in this modal; keep Tab inside it.
  if (event.key === 'Tab') { event.preventDefault(); $('#help-start').focus(); }
});

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
  run: keys.has('shift') || touchRun,
  crouch: keys.has('control') || keys.has('c') || touchCrouch
});
window.addEventListener('keydown', event => {
  if (helpOpen) return;
  if (document.activeElement?.tagName?.toLowerCase() === 'input' && event.key.toLowerCase() !== 'escape') return;
  if (event.key === '?') { event.preventDefault(); openHelp(); return; }
  const key = event.key.toLowerCase();
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','control','c','e'].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === 'e' && !event.repeat) interact();
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); touch.clear(); touchRun = false; touchCrouch = false; });
for (const button of document.querySelectorAll('[data-dir]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touch.add(button.dataset.dir); });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, () => touch.delete(button.dataset.dir));
}
$('#touch-run').addEventListener('pointerdown', event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); touchRun = true; });
for (const type of ['pointerup','pointercancel','lostpointercapture']) $('#touch-run').addEventListener(type, () => touchRun = false);
$('#touch-crouch').addEventListener('pointerdown', event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); touchCrouch = true; });
for (const type of ['pointerup','pointercancel','lostpointercapture']) $('#touch-crouch').addEventListener(type, () => touchCrouch = false);
$('#touch-interact').addEventListener('click', interact);

function interact() {
  if (helpOpen) return;
  // Read the held posture at the moment of the action, not only at the last animation frame.
  sim.crouched = input().crouch;
  const result = collectNearby(sim);
  if (result) {
    beep(result.points === 3 ? 1080 : 920, .18, .07);
    if (sim.score === MAX_SCORE) setTimeout(() => beep(1320, .28, .07), 170);
  }
  else if (sim.notice) beep(380, .08);
  $('#scene-hint').textContent = sim.noticeUntil > sim.time ? sim.notice : 'Acércate a un tesoro para recogerlo';
}
$('#safe').addEventListener('click', interact);
$('#safe').addEventListener('keydown', event => { if (event.key === 'Enter') interact(); });
$('#scene-container').addEventListener('click', event => { if (event.target.closest('[data-treasure]')) interact(); });
$('#scene-container').addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.closest('[data-treasure]')) interact(); });

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
  keys.clear(); touch.clear(); touchRun = false; touchCrouch = false;
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
function renderRoomAccess() {
  const virtual = mode === 'simulation';
  $('#room-list').innerHTML = ROOMS.map(room => {
    const door = sim.rooms[room.id];
    const denied = virtual && door.warningUntil > sim.time;
    const open = virtual && door.servoAngle >= 67;
    const className = denied ? 'warn' : door.collected ? 'found' : open ? 'open' : '';
    const state = virtual ? denied ? tag('critical', 'Ruido · bloqueada') : tag(open ? 'on' : 'off', open ? 'Abierta' : 'Cerrada') : tag('off', 'Solo virtual');
    return `<div class="room-access ${className}"><div class="room-access-head"><strong>${room.number} / ${room.name}</strong><small>${door.collected ? '◆ +1' : '◇ +1'}</small>${state}</div>
      <div class="room-access-data"><span><small>HC-SR04 · 1 M</small>${virtual ? `${door.distanceCm} cm` : '—'}</span><span><small>SONIDO</small>${virtual ? `${door.sound} / 100` : '—'}</span><span><small>SERVO</small>${virtual ? `${Math.round(door.servoAngle)}°` : '—'}</span></div>
      <div class="room-access-note">${virtual ? denied ? `Umbral ${ROOM_SOUND_LIMIT}: entra caminando, no corriendo` : door.collected ? 'Tesoro recuperado · 1 punto' : 'Proximidad ≤ 100 cm · acceso silencioso' : 'Sin sensor físico conectado · acceso del escenario virtual'}</div></div>`;
  }).join('');
}
function simData() { return { ...sim, motor1: sim.gateState === 'Descendiendo' || sim.gateState === 'Ascendiendo', motor2: sim.gateState === 'Descendiendo' || sim.gateState === 'Ascendiendo' }; }
function updateUI() {
  const live = mode === 'simulation' || (transport.connected && telemetry && Date.now() - transport.lastPacket < 2500);
  if (mode === 'hardware' && !live && telemetry) { telemetry = null; hardwareWarning = 'Sin lecturas recientes (> 2,5 s). Comprueba el cable y el firmware.'; }
  const data = mode === 'simulation' ? simData() : live ? telemetry : null;
  const alarm = Boolean(data?.alarm);
  const sound = typeof data?.sound === 'number' ? clamp(Math.round(data.sound),0,100) : null;
  const location = zoneFor(sim.player.x, sim.player.y);
  const roomWarning = ROOMS.find(r => sim.rooms[r.id].warningUntil > sim.time);
  $('#location-value').textContent = location;
  $('#zone-name').textContent = `${location.toUpperCase()} ${mode === 'hardware' ? '· VISTA VIRTUAL' : ''}`;
  $('#movement-value').textContent = sim.movement;
  $('#score-value').textContent = sim.score;
  $('.mission-card').classList.toggle('complete', sim.score === MAX_SCORE);
  $('#mission-label').innerHTML = sim.score === MAX_SCORE ? '¡Misión completada! <span>Todos los tesoros</span>' : 'Explora las seis salas <span>sin correr</span>';
  $('#heading-score').textContent = `${sim.score} / ${MAX_SCORE} PTS`;
  $('#treasure-progress').innerHTML = [...ROOMS.map(r => `<div class="treasure-chip ${sim.rooms[r.id].collected ? 'done' : ''}" title="${r.name}: 1 punto"><span class="gem">${sim.rooms[r.id].collected ? '◆' : '◇'}</span>${r.name}</div>`), `<div class="treasure-chip safe-chip ${sim.safeCollected ? 'done' : ''}" title="Caja fuerte: 3 puntos"><span class="gem">${sim.safeCollected ? '◆' : '◇'}</span>Caja +3</div>`].join('');
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
  $('#scene-hint').textContent = mode === 'hardware' ? 'Salas virtuales · sensores físicos independientes' : roomWarning ? `${roomWarning.name}: sensor de sonido bloquea el acceso. Camina.` : (sim.noticeUntil > sim.time ? sim.notice : '') || (location === 'Exterior' ? 'Acércate a la entrada para activar el sensor' : location === 'Caja fuerte' ? 'Agáchate (CTRL) y pulsa E junto a la caja fuerte' : 'Explora caminando y recoge los tesoros con E');
  setModeUI();
  renderComponents(data, live);
  renderRoomAccess();
}
function frame(now) {
  const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  const events = helpOpen ? { presenceStarted: false, alarmStarted: false, roomDenied: null } : stepSimulation(sim, input(), dt);
  if (mode === 'simulation' && !helpOpen) {
    if (events.presenceStarted) beep(880, .16);
    if (events.alarmStarted) beep(420, .3, .09);
    if (events.roomDenied && now - lastRoomTone > 900) { beep(360, .12); lastRoomTone = now; }
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
