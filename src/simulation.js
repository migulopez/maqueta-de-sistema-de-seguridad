/** Pure game rules and virtual sensor model. No physical reading is generated here. */
export const INITIAL = { x: 600, y: 710 };
export const DEFAULTS = { ambient: 72, detectionRange: 100, soundThreshold: 58 };
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function isWalkable(x, y) {
  const exterior = x >= 80 && x <= 1120 && y >= 578 && y <= 790;
  const entrance = x >= 552 && x <= 648 && y >= 555 && y <= 600;
  const hall = x >= 513 && x <= 687 && y >= 125 && y <= 567;
  const leftRoom = x >= 251 && x <= 488 && y >= 320 && y <= 550;
  const rightRoom = x >= 712 && x <= 949 && y >= 320 && y <= 550;
  const leftDoorway = x >= 487 && x <= 515 && y >= 406 && y <= 444;
  const rightDoorway = x >= 685 && x <= 713 && y >= 406 && y <= 444;
  return exterior || entrance || hall || leftRoom || rightRoom || leftDoorway || rightDoorway;
}

export function zoneFor(x, y) {
  if (y >= 575) return 'Exterior';
  if (x < 500) return 'Sala';
  if (x > 700) return 'Estudio';
  if (y < 315) return 'Caja fuerte';
  if (y < 490) return 'Pasillo';
  return 'Entrada';
}

export function createSimulation(settings = DEFAULTS) {
  return {
    player: { ...INITIAL, direction: 0 },
    servoAngle: 0, gateProgress: 0, gateState: 'Levantada',
    lights: false, alarm: false, detected: false, buzzer: false, relay: false,
    sound: 0, distanceCm: 300, ldr: 737, movement: 'Quieto',
    openLimit: false, closedLimit: true, doorRequested: false,
    buzzerUntil: 0, doorHoldUntil: 0, time: 0, pushback: 0,
    settings: { ...DEFAULTS, ...settings },
    notice: ''
  };
}

export function stepSimulation(s, input, elapsed) {
  const dt = clamp(elapsed, 0, .05);
  s.time += dt;
  const dx = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const dy = Number(Boolean(input.down)) - Number(Boolean(input.up));
  const moving = (dx !== 0 || dy !== 0) && s.pushback <= 0;
  const running = moving && Boolean(input.run);
  const speed = running ? 235 : 98;
  s.movement = s.pushback > 0 ? 'Retrocediendo' : moving ? (running ? 'Corriendo' : 'Caminando') : 'Quieto';
  if (moving) {
    const norm = Math.hypot(dx, dy);
    const mx = dx / norm * speed * dt;
    const my = dy / norm * speed * dt;
    s.player.direction = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    const canMove = (x, y) => isWalkable(x, y) &&
      !(s.servoAngle < 66 && y >= 555 && y <= 580 && x >= 545 && x <= 655) &&
      !(s.gateProgress > .2 && y >= 260 && y <= 305 && x >= 500 && x <= 700);
    if (canMove(s.player.x + mx, s.player.y)) s.player.x += mx;
    if (canMove(s.player.x, s.player.y + my)) s.player.y += my;
  }
  if (s.pushback > 0) {
    s.pushback = Math.max(0, s.pushback - dt);
    s.player.y = Math.min(470, s.player.y + 185 * dt);
  }

  // HC-SR04 virtual distance: 0.9 cm for each pixel, capped at its useful range.
  s.distanceCm = Math.round(clamp(Math.hypot(s.player.x - 600, s.player.y - 590) * .9, 2, 300));
  const wasDetected = s.detected;
  s.detected = s.distanceCm <= s.settings.detectionRange;
  if (s.detected && !wasDetected) s.buzzerUntil = s.time + .55;
  if (s.detected) s.doorHoldUntil = s.time + 1.2;
  // Keep the entrance open until the player has cleared the swing area.
  s.doorRequested = s.detected || s.time < s.doorHoldUntil || (s.player.x > 535 && s.player.x < 665 && s.player.y > 495 && s.player.y < 580);
  s.servoAngle = clamp(s.servoAngle + (s.doorRequested ? 1 : -1) * 135 * dt, 0, 90);
  s.openLimit = s.servoAngle >= 89.9;
  s.closedLimit = s.servoAngle <= .1;

  s.ldr = Math.round(s.settings.ambient / 100 * 1023);
  s.lights = s.settings.ambient < 38;
  const targetSound = moving ? (running ? 86 : 22) : 0;
  s.sound += (targetSound - s.sound) * Math.min(1, dt * (running ? 7 : 5));
  if (s.sound < .15) s.sound = 0;
  // Noise is relevant only inside the protected corridor by the safe.
  if (!s.alarm && s.player.x >= 510 && s.player.x <= 690 && s.player.y <= 405 && s.sound >= s.settings.soundThreshold) {
    s.alarm = true;
    s.pushback = .85;
    s.player.y = Math.max(s.player.y, 326);
    s.notice = 'Intrusión detectada: retrocede de la zona protegida';
  }
  const lastGate = s.gateProgress;
  s.gateProgress = clamp(s.gateProgress + (s.alarm ? 1 : -1) * dt * 1.15, 0, 1);
  s.gateState = s.alarm ? (s.gateProgress >= 1 ? 'Desplegada' : 'Descendiendo') : (s.gateProgress <= 0 ? 'Levantada' : 'Ascendiendo');
  s.relay = s.detected || s.alarm;
  s.buzzer = s.alarm || s.time < s.buzzerUntil;
  return { presenceStarted: s.detected && !wasDetected, alarmStarted: s.alarm && lastGate === 0 };
}

export function resetAlarm(s) {
  s.alarm = false;
  s.pushback = 0;
  s.notice = 'Alarma restablecida; reja ascendiendo';
}
