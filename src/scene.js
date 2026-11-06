/** Vector floor plan. Room geometry is shared with the simulation model. */
import { ROOMS } from './rooms.js';
const roomFloor = room => {
  const x = room.side === 'left' ? 242 : 706;
  const labelX = room.side === 'left' ? 263 : 734;
  const furnitureX = room.side === 'left' ? 409 : 764;
  return `<g class="room-interior">
    <rect x="${x}" y="${room.top + 6}" width="252" height="${room.bottom - room.top - 11}" fill="url(#roomFloor)"/>
    <text x="${labelX}" y="${room.top + 32}" class="room-number">${room.number} / ${room.name.toUpperCase()}</text>
    <text x="${labelX}" y="${room.top + 49}" class="room-detail">${room.detail}</text>
    <g opacity=".85"><rect x="${furnitureX - 27}" y="${room.top + 70}" width="53" height="39" rx="5" fill="#36545a" stroke="#71918d" stroke-width="2"/><text x="${furnitureX}" y="${room.top + 98}" fill="#86afab" font-size="24" font-family="DM Sans" text-anchor="middle">${room.icon}</text></g>
    <path d="M${x + 17} ${room.bottom - 15}h62" stroke="#82a6a0" stroke-opacity=".35" stroke-width="2"/>
  </g>`;
};
const roomDoor = room => {
  const x = room.doorX, y = room.doorY;
  return `<g id="room-door-${room.id}" class="room-door">
    <path d="M${x} ${y-23}a47 47 0 0 ${room.side === 'left' ? '0 -47 47' : '1 47 47'}" fill="none" stroke="#80d2be" stroke-opacity=".4" stroke-dasharray="4 5"/>
    <g class="room-door-panel"><rect x="${x-6}" y="${y-22}" width="12" height="44" rx="3" fill="#c7ac80" stroke="#f0d1a1" stroke-width="2"/></g>
    <circle cx="${x}" cy="${y-23}" r="6" fill="#1c383d" stroke="#78e3c5" stroke-width="2"/>
    <circle class="room-sonar" cx="${room.side === 'left' ? x+25 : x-25}" cy="${y}" r="7" fill="#152e34" stroke="#78d9c1" stroke-width="2"/>
    <path class="room-sound-wave" d="M${room.side === 'left' ? x+34 : x-34} ${y-11}q${room.side === 'left' ? 14 : -14} 11 0 22" fill="none" stroke="#7fdac0" stroke-width="2"/>
    <text x="${room.side === 'left' ? x+39 : x-39}" y="${y+32}" text-anchor="middle" class="room-detail">1 M</text>
  </g>`;
};
const treasure = room => `<g class="treasure" data-treasure="${room.id}" role="button" tabindex="0" aria-label="Tesoro de ${room.name}, 1 punto. Acércate y pulsa E.">
  <circle cx="${room.treasureX}" cy="${room.treasureY}" r="28" fill="#f1bd6d" opacity=".12"/>
  <circle cx="${room.treasureX}" cy="${room.treasureY}" r="17" fill="#594831" stroke="#f6cb7a" stroke-width="2"/>
  <path d="M${room.treasureX} ${room.treasureY-12}l11 11-11 12-11-12z" fill="#ffdc83" stroke="#fff0ba" stroke-width="1"/>
  <text x="${room.treasureX}" y="${room.treasureY+39}" text-anchor="middle" class="treasure-value">+1 PTO</text>
</g>`;
const wallPath = `M231 566V103H969V566H655 M545 566H231 M231 260H500 M700 260H969 M231 405H500 M700 405H969 M500 110V174 M500 220V318 M500 364V455 M500 501V565 M700 110V174 M700 220V318 M700 364V455 M700 501V565`;
const plant = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})"><circle r="21" fill="#162b2b" stroke="#3a6053" stroke-width="2"/><path d="M0 0 Q-23 -24 -13 -28 Q-2 -27 0 0 M0 0 Q12 -28 24 -21 Q25 -10 0 0 M0 0 Q-24 12 -17 20 Q-5 20 0 0 M0 0 Q18 9 21 18 Q8 23 0 0" fill="#3e806a" stroke="#68aa7f" stroke-width="1"/><circle r="3" fill="#9ab98c"/></g>`;
const lamp = (x, y, id) => `<g class="lamp" id="${id}"><circle class="lamp-halo" cx="${x}" cy="${y}" r="90" fill="url(#lampGlow)"/><circle cx="${x}" cy="${y}" r="12" fill="#1b3038" stroke="#709098" stroke-width="2"/><circle class="lamp-core" cx="${x}" cy="${y}" r="6" fill="#617d83"/><path d="M${x-16} ${y-16}l-8-8 M${x+16} ${y-16}l8-8 M${x-16} ${y+16}l-8 8 M${x+16} ${y+16}l8 8" stroke="#768c8c" stroke-width="2"/></g>`;

export function createScene(container) {
  container.innerHTML = `<svg id="house-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 150 1200 670" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Plano de la casa inteligente. Mueve al personaje para explorar.">
  <defs>
    <pattern id="groundGrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#273b41" stroke-width=".9"/></pattern>
    <pattern id="floorLines" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#31505a" stroke-width=".75"/></pattern>
    <pattern id="roomFloor" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#314a50" stroke-width=".8"/></pattern>
    <pattern id="walkway" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="42" height="42" fill="#253b42"/><path d="M0 0H42 M0 42H42" stroke="#3e5b62" stroke-width="2"/></pattern>
    <radialGradient id="lampGlow"><stop stop-color="#ffd786" stop-opacity=".45"/><stop offset="1" stop-color="#ffd786" stop-opacity="0"/></radialGradient>
    <radialGradient id="alarmGlow"><stop stop-color="#ff504c" stop-opacity=".55"/><stop offset="1" stop-color="#ff504c" stop-opacity="0"/></radialGradient>
    <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#63818b"/><stop offset="1" stop-color="#304a55"/></linearGradient>
    <linearGradient id="hall" x2="1" y2="1"><stop stop-color="#27434d"/><stop offset="1" stop-color="#1c333c"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#020b10" flood-opacity=".65"/></filter>
    <filter id="characterShadow"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <rect width="1200" height="820" fill="#172930"/><rect width="1200" height="820" fill="url(#groundGrid)"/>
  <g opacity=".35" fill="none" stroke="#4b6971" stroke-width="1"><path d="M36 130h32m-16-16v32 M1130 130h32m-16-16v32 M36 760h32m-16-16v32 M1130 760h32m-16-16v32"/></g>
  <text x="72" y="98" class="map-micro">NEXO / SITE 01</text><text x="1128" y="98" text-anchor="end" class="map-micro">PLANO INTERACTIVO · 01:100</text>
  <!-- yard and paving -->
  <path d="M530 565H670L756 820H444Z" fill="url(#walkway)" stroke="#54727b" stroke-width="2"/>
  <path d="M513 566L422 820 M687 566L778 820" stroke="#72969a" stroke-opacity=".4" stroke-width="2" stroke-dasharray="8 9"/>
  <path d="M160 620h220m440 0h220 M130 690h260m420 0h260" stroke="#31534d" stroke-width="2" opacity=".5"/>
  ${plant(177,624,1.3)} ${plant(302,699,.9)} ${plant(1015,638,1.3)} ${plant(903,732,1)}
  <text x="93" y="676" class="exterior-label">EXTERIOR</text><text x="93" y="695" class="room-detail">JARDÍN / ACCESO</text>
  <text x="1065" y="700" text-anchor="end" class="map-micro">N  ↑</text>
  <!-- building shadow and floor -->
  <rect x="222" y="94" width="756" height="490" rx="8" fill="#09171d" filter="url(#shadow)"/>
  <rect x="235" y="106" width="730" height="460" fill="#223940"/>
  <rect x="500" y="111" width="200" height="455" fill="url(#hall)"/>
  ${ROOMS.map(roomFloor).join('')}
  <rect x="503" y="111" width="194" height="455" fill="url(#floorLines)"/>
  <path d="M600 558V126" stroke="#77a1a0" stroke-width="1" stroke-dasharray="7 13" opacity=".32"/>
  <path d="M531 530h138M531 445h138M531 350h138M531 216h138" stroke="#85adb0" stroke-opacity=".15" stroke-width="2"/>
  <!-- security zone -->
  <rect x="510" y="112" width="180" height="156" rx="5" fill="#242e38" stroke="#82675a" stroke-width="1"/>
  <path d="M517 121h166v137H517z" fill="none" stroke="#e49b68" stroke-opacity=".22" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="600" y="134" text-anchor="middle" class="room-number" fill="#f2ac7a">ZONA RESTRINGIDA</text>
  <g id="alarm-beacon-left" class="beacon"><circle cx="519" cy="286" r="50" fill="url(#alarmGlow)"/><circle cx="519" cy="286" r="8" fill="#4b4544" stroke="#bd7566" stroke-width="2"/></g>
  <g id="alarm-beacon-right" class="beacon"><circle cx="681" cy="286" r="50" fill="url(#alarmGlow)"/><circle cx="681" cy="286" r="8" fill="#4b4544" stroke="#bd7566" stroke-width="2"/></g>
  <text x="600" y="390" text-anchor="middle" class="room-number">PASILLO / 06 SALAS</text>
  <text x="600" y="408" text-anchor="middle" class="room-detail">ACCESO SOLO CAMINANDO</text>
  <g class="hall-sensor"><path d="M570 355q30-30 60 0 M580 359q20-20 40 0" fill="none" stroke="#67d6c1" stroke-opacity=".6" stroke-width="2"/><circle cx="600" cy="361" r="4" fill="#67d6c1"/></g>
  ${ROOMS.map(treasure).join('')}
  <!-- safe -->
  <g id="safe" class="safe-interactive" tabindex="0" role="button" aria-label="Caja fuerte, acércate para inspeccionar"><rect x="550" y="153" width="100" height="81" rx="8" fill="#101f28" filter="url(#shadow)"/><rect x="555" y="150" width="90" height="78" rx="6" fill="#52636a" stroke="#c19d6c" stroke-width="3"/><rect x="562" y="158" width="76" height="62" rx="3" fill="#354c55" stroke="#8fa3a1" stroke-width="1.5"/><circle cx="600" cy="189" r="20" fill="#243b44" stroke="#c5a77c" stroke-width="3"/><circle cx="600" cy="189" r="8" fill="#b6aa8e"/><path d="M600 169v11m0 18v11m-20-20h11m18 0h11" stroke="#b6aa8e" stroke-width="2"/><circle cx="629" cy="167" r="3" fill="#73dcbd"/></g>
  <text x="600" y="249" text-anchor="middle" class="room-detail">CAJA FUERTE / AGÁCHATE / +3</text>
  <!-- Architectural walls with a servo-operated threshold per room. -->
  <path d="${wallPath}" fill="none" stroke="#0d222a" stroke-width="22" stroke-linecap="square"/>
  <path d="${wallPath}" fill="none" stroke="url(#wall)" stroke-width="12" stroke-linecap="square"/>
  <path d="${wallPath}" fill="none" stroke="#b4c2ba" stroke-width="2" opacity=".62"/>
  ${ROOMS.map(roomDoor).join('')}
  <!-- door servo and swing -->
  <path d="M551 566a101 101 0 0 0 101-101" fill="none" stroke="#83d8c3" stroke-width="1" stroke-dasharray="4 6" opacity=".5"/>
  <g id="door-panel"><rect x="548" y="560" width="105" height="13" rx="3" fill="#c5a77b" stroke="#f0d2a2" stroke-width="2"/><circle cx="640" cy="564" r="3" fill="#182a2e"/></g>
  <circle cx="550" cy="566" r="10" fill="#1a363d" stroke="#72deca" stroke-width="2"/><circle cx="550" cy="566" r="3" fill="#72deca"/>
  <circle id="door-limit-closed" cx="652" cy="580" r="4" fill="#70d4ba"/><circle id="door-limit-open" cx="555" cy="470" r="4" fill="#5d7777"/>
  <text x="731" y="591" class="map-micro">SERVO / PUERTA 01</text>
  <!-- grate -->
  <g id="gate" filter="url(#shadow)"><rect x="500" y="266" width="200" height="30" rx="3" fill="#132329" stroke="#e19d73" stroke-width="2"/><path d="M518 266v30m18-30v30m18-30v30m18-30v30m18-30v30m18-30v30m18-30v30m18-30v30m18-30v30m18-30v30" stroke="#d4a477" stroke-width="7"/><path d="M500 272h200m-200 18h200" stroke="#f0c49b" stroke-width="2"/></g>
  <text x="744" y="280" class="room-detail">REJA / L298N</text>
  <!-- external lights & detector -->
  ${lamp(402,592,'lamp-left')} ${lamp(798,592,'lamp-right')}
  <g id="ultrasonic"><rect x="577" y="578" width="46" height="18" rx="4" fill="#304b54" stroke="#80c9c2" stroke-width="2"/><circle cx="588" cy="587" r="6" fill="#162d35" stroke="#81c8c7" stroke-width="2"/><circle cx="612" cy="587" r="6" fill="#162d35" stroke="#81c8c7" stroke-width="2"/><path id="sonar-wave" d="M560 610q40-28 80 0 M544 627q56-40 112 0 M528 646q72-54 144 0" fill="none" stroke="#68dbbd" stroke-opacity=".5" stroke-width="2"/></g>
  <text x="686" y="635" class="room-detail">HC-SR04 / ENTRADA</text>
  <!-- character -->
  <g id="character" transform="translate(600 710)"><ellipse cy="10" rx="21" ry="9" fill="#000" opacity=".45" filter="url(#characterShadow)"/><circle r="20" fill="#7cddbc" opacity=".15"/><circle r="14" fill="#112d36" stroke="#9ff4ce" stroke-width="3"/><circle r="8" fill="#d4e8d1"/><path d="M0-19l-6 9h12z" fill="#a7ffd2"/><circle r="27" fill="none" stroke="#92eac4" stroke-opacity=".38" stroke-width="1" stroke-dasharray="3 5"/></g>
  <g id="interaction-prompt"><rect x="-86" y="-57" width="172" height="28" rx="7" fill="#122730" stroke="#74d6bc" stroke-width="1"/><text x="0" y="-38" text-anchor="middle" fill="#bdf9da" font-family="DM Sans" font-size="11" font-weight="700">E · RECOGER +1</text></g>
  <text x="85" y="788" class="map-micro">SIMULACIÓN · COORDENADAS VIRTUALES</text><text x="1115" y="788" text-anchor="end" class="map-micro">SECURITY SYSTEM / IoT</text>
</svg>`;
  const svg = container.querySelector('svg');
  const refs = Object.fromEntries(['character','door-panel','gate','lamp-left','lamp-right','alarm-beacon-left','alarm-beacon-right','sonar-wave','interaction-prompt','door-limit-open','door-limit-closed'].map(id => [id, svg.querySelector(`#${id}`)]));
  return {
    svg,
    update(state, camera) {
      const { player, servoAngle, gateProgress, lights, alarm, detected } = state;
      refs.character.setAttribute('transform', `translate(${player.x.toFixed(1)} ${player.y.toFixed(1)}) rotate(${player.direction}) scale(${state.crouched ? '.72' : '1'})`);
      refs['door-panel'].setAttribute('transform', `rotate(${-servoAngle} 550 566)`);
      refs.gate.setAttribute('transform', `translate(0 ${(-46 * (1 - gateProgress)).toFixed(1)})`);
      refs.gate.style.opacity = String(.36 + gateProgress * .64);
      for (const id of ['lamp-left','lamp-right']) refs[id].classList.toggle('lit', lights);
      for (const id of ['alarm-beacon-left','alarm-beacon-right']) refs[id].classList.toggle('active', alarm);
      refs['sonar-wave'].style.opacity = detected ? '1' : '.13';
      refs['door-limit-open'].setAttribute('fill', servoAngle >= 89 ? '#70d4ba' : '#5d7777');
      refs['door-limit-closed'].setAttribute('fill', servoAngle <= 1 ? '#70d4ba' : '#5d7777');
      for (const room of ROOMS) {
        const door = state.rooms[room.id];
        const group = svg.querySelector(`#room-door-${room.id}`);
        const panel = group.querySelector('.room-door-panel');
        panel.setAttribute('transform', `rotate(${(room.side === 'left' ? 1 : -1) * door.servoAngle} ${room.doorX} ${room.doorY-23})`);
        group.classList.toggle('denied', door.warningUntil > state.time);
        group.classList.toggle('detected', door.detected);
        svg.querySelector(`[data-treasure="${room.id}"]`).classList.toggle('collected', door.collected);
      }
      svg.querySelector('#safe').classList.toggle('collected', state.safeCollected);
      const nearbyRoom = ROOMS.find(room => !state.rooms[room.id].collected &&
        Math.hypot(player.x-room.treasureX, player.y-room.treasureY) <= 53);
      const nearSafe = !state.safeCollected && !alarm && Math.hypot(player.x-600, player.y-195) <= 76;
      refs['interaction-prompt'].style.display = nearbyRoom || nearSafe ? '' : 'none';
      refs['interaction-prompt'].querySelector('text').textContent = nearbyRoom ? 'E · RECOGER +1' : state.crouched ? 'E · ABRIR +3' : 'CTRL + E · ABRIR +3';
      refs['interaction-prompt'].setAttribute('transform', `translate(${player.x} ${player.y})`);
      const targets = { exterior: [600,645,1050], entrada: [600,548,710], pasillo: [600,403,660], caja: [600,210,570] };
      let [cx, cy, width] = camera === 'follow' ? [player.x, player.y - 70, container.clientWidth < 650 ? 650 : 900] : targets[camera];
      const aspect = Math.max(.9, container.clientWidth / Math.max(1, container.clientHeight));
      const height = width / aspect;
      cx = Math.max(width / 2, Math.min(1200 - width / 2, cx));
      cy = Math.max(height / 2, Math.min(820 - height / 2, cy));
      svg.setAttribute('viewBox', `${(cx-width/2).toFixed(1)} ${(cy-height/2).toFixed(1)} ${width} ${height.toFixed(1)}`);
    }
  };
}
