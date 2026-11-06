/** Pure virtual game rules. These values are NEVER represented as physical Arduino readings. */
import { ROOMS, ROOM_RANGE_CM, ROOM_SOUND_LIMIT, MAX_SCORE, roomAt } from './rooms.js';
export { ROOMS, ROOM_RANGE_CM, ROOM_SOUND_LIMIT, MAX_SCORE } from './rooms.js';
export const INITIAL = { x: 600, y: 710 };
export const DEFAULTS = { ambient: 72, detectionRange: 100, soundThreshold: 58 };
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function isWalkable(x, y) {
  const exterior = x >= 80 && x <= 1120 && y >= 578 && y <= 790;
  const entrance = x >= 552 && x <= 648 && y >= 555 && y <= 600;
  const hall = x >= 513 && x <= 687 && y >= 125 && y <= 567;
  const room = ROOMS.some(r => y >= r.top + 11 && y <= r.bottom - 11 &&
    (r.side === 'left' ? x >= 251 && x <= 488 : x >= 712 && x <= 949));
  const doorway = ROOMS.some(r => Math.abs(y - r.doorY) <= 18 &&
    (r.side === 'left' ? x >= 487 && x <= 515 : x >= 685 && x <= 713));
  return exterior || entrance || hall || room || doorway;
}

export function zoneFor(x, y) {
  if (y >= 575) return 'Exterior';
  const room = roomAt(x, y);
  if (room) return room.name;
  if (y < 270) return 'Caja fuerte';
  if (y < 490) return 'Pasillo';
  return 'Entrada';
}

export function createSimulation(settings = DEFAULTS) {
  return {
    player: { ...INITIAL, direction: 0 }, crouched: false,
    servoAngle: 0, gateProgress: 0, gateState: 'Levantada',
    lights: false, alarm: false, detected: false, buzzer: false, relay: false,
    sound: 0, distanceCm: 300, ldr: 737, movement: 'Quieto',
    openLimit: false, closedLimit: true, doorRequested: false,
    buzzerUntil: 0, doorHoldUntil: 0, time: 0, pushback: 0,
    rooms: Object.fromEntries(ROOMS.map(r => [r.id, {
      distanceCm: 300, detected: false, sound: 0, servoAngle: 0,
      holdUntil: 0, warningUntil: 0, collected: false
    }])),
    safeCollected: false, score: 0,
    settings: { ...DEFAULTS, ...settings }, notice: '', noticeUntil: 0
  };
}

/** A room door blocks the threshold until its own servo has opened. Running never grants entry. */
function canCrossRoomDoor(s, x, y, previousX, running) {
  return !ROOMS.some(r => {
    const inOpening = Math.abs(y - r.doorY) <= 18;
    const inThreshold = Math.abs(x - r.doorX) <= 14;
    if (!inOpening || !inThreshold) return false;
    const goingIn = r.side === 'left' ? previousX >= 500 && x < previousX : previousX <= 700 && x > previousX;
    return s.rooms[r.id].servoAngle < 67 || (goingIn && running);
  });
}

export function stepSimulation(s, input, elapsed) {
  const dt = clamp(elapsed, 0, .05);
  s.time += dt;
  const dx = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const dy = Number(Boolean(input.down)) - Number(Boolean(input.up));
  const moving = (dx !== 0 || dy !== 0) && s.pushback <= 0;
  s.crouched = Boolean(input.crouch) && s.pushback <= 0;
  const running = moving && Boolean(input.run) && !s.crouched;
  const speed = s.crouched ? 54 : running ? 235 : 98;
  s.movement = s.pushback > 0 ? 'Retrocediendo' : s.crouched ? 'Agachado' : moving ? (running ? 'Corriendo' : 'Caminando') : 'Quieto';
  const previousX = s.player.x;
  if (moving) {
    const norm = Math.hypot(dx, dy);
    const mx = dx / norm * speed * dt;
    const my = dy / norm * speed * dt;
    s.player.direction = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    const canMove = (x, y) => isWalkable(x, y) &&
      !(s.servoAngle < 66 && y >= 555 && y <= 580 && x >= 545 && x <= 655) &&
      !(s.gateProgress > .2 && y >= 260 && y <= 305 && x >= 500 && x <= 700) &&
      canCrossRoomDoor(s, x, y, previousX, running);
    if (canMove(s.player.x + mx, s.player.y)) s.player.x += mx;
    if (canMove(s.player.x, s.player.y + my)) s.player.y += my;
  }
  if (s.pushback > 0) {
    s.pushback = Math.max(0, s.pushback - dt);
    s.player.y = Math.min(470, s.player.y + 185 * dt);
  }
  // Motion noise has inertia; crouching is quieter than walking, sprinting is loud.
  const targetSound = moving ? (s.crouched ? 6 : running ? 86 : 22) : 0;
  s.sound += (targetSound - s.sound) * Math.min(1, dt * (running ? 7 : 5));
  if (s.sound < .15) s.sound = 0;

  s.distanceCm = Math.round(clamp(Math.hypot(s.player.x - 600, s.player.y - 590) * .9, 2, 300));
  const wasDetected = s.detected;
  s.detected = s.distanceCm <= s.settings.detectionRange;
  if (s.detected && !wasDetected) s.buzzerUntil = s.time + .55;
  if (s.detected) s.doorHoldUntil = s.time + 1.2;
  s.doorRequested = s.detected || s.time < s.doorHoldUntil || (s.player.x > 535 && s.player.x < 665 && s.player.y > 495 && s.player.y < 580);
  s.servoAngle = clamp(s.servoAngle + (s.doorRequested ? 1 : -1) * 135 * dt, 0, 90);
  s.openLimit = s.servoAngle >= 89.9;
  s.closedLimit = s.servoAngle <= .1;

  let roomDenied = null;
  for (const room of ROOMS) {
    const door = s.rooms[room.id];
    door.distanceCm = Math.round(clamp(Math.hypot(s.player.x - room.doorX, s.player.y - room.doorY) * .9, 2, 300));
    door.detected = door.distanceCm <= ROOM_RANGE_CM;
    const inside = roomAt(s.player.x, s.player.y)?.id === room.id;
    door.sound = door.detected || inside ? Math.round(s.sound) : 0;
    const tooLoud = running || door.sound >= ROOM_SOUND_LIMIT;
    if (door.detected && tooLoud) {
      door.warningUntil = s.time + .6;
      roomDenied = room;
    }
    if ((door.detected && !tooLoud) || (inside && door.distanceCm < 100)) door.holdUntil = s.time + 1.1;
    const requested = (!tooLoud && door.detected) || (inside && door.distanceCm < 100) || s.time < door.holdUntil;
    door.servoAngle = clamp(door.servoAngle + (requested ? 1 : -1) * 145 * dt, 0, 90);
  }

  s.ldr = Math.round(s.settings.ambient / 100 * 1023);
  s.lights = s.settings.ambient < 38;
  if (!s.alarm && s.player.x >= 510 && s.player.x <= 690 && s.player.y <= 310 && s.sound >= s.settings.soundThreshold) {
    s.alarm = true;
    s.pushback = .85;
    s.player.y = Math.max(s.player.y, 326);
    s.notice = 'Intrusión detectada: retrocede de la zona protegida';
    s.noticeUntil = s.time + 4;
  }
  const lastGate = s.gateProgress;
  s.gateProgress = clamp(s.gateProgress + (s.alarm ? 1 : -1) * dt * 1.15, 0, 1);
  s.gateState = s.alarm ? (s.gateProgress >= 1 ? 'Desplegada' : 'Descendiendo') : (s.gateProgress <= 0 ? 'Levantada' : 'Ascendiendo');
  s.relay = s.detected || s.alarm;
  s.buzzer = s.alarm || s.time < s.buzzerUntil;
  return { presenceStarted: s.detected && !wasDetected, alarmStarted: s.alarm && lastGate === 0, roomDenied };
}

/** Interaction only succeeds within range; E and taps use the same rule. */
export function collectNearby(s) {
  const room = ROOMS.find(r => !s.rooms[r.id].collected &&
    roomAt(s.player.x, s.player.y)?.id === r.id &&
    Math.hypot(s.player.x - r.treasureX, s.player.y - r.treasureY) <= 53);
  if (room) {
    if (s.movement === 'Corriendo') { s.notice = `Camina para recoger el tesoro de ${room.name}`; s.noticeUntil = s.time + 3; return null; }
    s.rooms[room.id].collected = true;
    s.score += 1;
    s.notice = `Tesoro de ${room.name}: +1 punto (${s.score}/${MAX_SCORE})`;
    s.noticeUntil = s.time + 3.5;
    return { id: room.id, points: 1 };
  }
  if (Math.hypot(s.player.x - 600, s.player.y - 195) <= 76 && !s.safeCollected) {
    if (s.alarm || s.gateProgress > .2) { s.notice = 'Caja fuerte bloqueada: restablece la alarma'; s.noticeUntil = s.time + 3; return null; }
    if (!s.crouched) { s.notice = 'Para abrir la caja fuerte, mantén CTRL o AGACHAR y pulsa E'; s.noticeUntil = s.time + 3; return null; }
    s.safeCollected = true;
    s.score += 3;
    s.notice = `¡Caja fuerte abierta! +3 puntos (${s.score}/${MAX_SCORE})`;
    s.noticeUntil = s.time + 4;
    return { id: 'safe', points: 3 };
  }
  return null;
}

export function resetAlarm(s) {
  s.alarm = false;
  s.pushback = 0;
  s.notice = 'Alarma restablecida; reja ascendiendo';
  s.noticeUntil = s.time + 3;
}
