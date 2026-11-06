/** Shared floor-plan geometry and treasure metadata for the virtual rooms. */
export const ROOM_RANGE_CM = 100; // fixed 1 m for each interior ultrasonic sensor
export const ROOM_SOUND_LIMIT = 48;
export const ROOMS = Object.freeze([
  { id: 'biblioteca', name: 'Biblioteca', number: '01', detail: 'ARCHIVO / LECTURA', side: 'left', top: 110, bottom: 260, doorY: 197, treasureX: 339, treasureY: 210, icon: '▤' },
  { id: 'laboratorio', name: 'Laboratorio', number: '02', detail: 'IOT / PROTOTIPOS', side: 'right', top: 110, bottom: 260, doorY: 197, treasureX: 862, treasureY: 210, icon: '⚗' },
  { id: 'sala', name: 'Sala', number: '03', detail: 'ESPACIO SOCIAL', side: 'left', top: 260, bottom: 405, doorY: 341, treasureX: 339, treasureY: 353, icon: '▰' },
  { id: 'estudio', name: 'Estudio', number: '04', detail: 'ÁREA DE TRABAJO', side: 'right', top: 260, bottom: 405, doorY: 341, treasureX: 862, treasureY: 353, icon: '▣' },
  { id: 'cocina', name: 'Cocina', number: '05', detail: 'ZONA DE SERVICIO', side: 'left', top: 405, bottom: 565, doorY: 478, treasureX: 339, treasureY: 493, icon: '◫' },
  { id: 'dormitorio', name: 'Dormitorio', number: '06', detail: 'DESCANSO / SUITE', side: 'right', top: 405, bottom: 565, doorY: 478, treasureX: 862, treasureY: 493, icon: '▥' }
].map(room => Object.freeze({ ...room, doorX: room.side === 'left' ? 500 : 700 })));
export const MAX_SCORE = ROOMS.length + 3;

export function roomAt(x, y) {
  return ROOMS.find(room => y > room.top + 10 && y < room.bottom - 10 &&
    (room.side === 'left' ? x < 490 && x > 250 : x > 710 && x < 950));
}
