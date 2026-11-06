/** Vector floor plan. Coordinates are shared with the walkable geometry in simulation.js. */
const roomLabel = (x, y, number, name, detail) => `<g class="room-label"><text x="${x}" y="${y}" class="room-number">${number} / ${name}</text><text x="${x}" y="${y+19}" class="room-detail">${detail}</text></g>`;
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
  <rect x="242" y="312" width="252" height="247" fill="url(#roomFloor)"/>
  <rect x="706" y="312" width="252" height="247" fill="url(#roomFloor)"/>
  <rect x="503" y="111" width="194" height="455" fill="url(#floorLines)"/>
  <path d="M600 558V126" stroke="#77a1a0" stroke-width="1" stroke-dasharray="7 13" opacity=".32"/>
  <path d="M531 530h138M531 445h138M531 350h138M531 216h138" stroke="#85adb0" stroke-opacity=".15" stroke-width="2"/>
  <!-- security zone -->
  <rect x="510" y="112" width="180" height="156" rx="5" fill="#242e38" stroke="#82675a" stroke-width="1"/>
  <path d="M517 121h166v137H517z" fill="none" stroke="#e49b68" stroke-opacity=".22" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="600" y="134" text-anchor="middle" class="room-number" fill="#f2ac7a">ZONA RESTRINGIDA</text>
  <g id="alarm-beacon-left" class="beacon"><circle cx="519" cy="286" r="50" fill="url(#alarmGlow)"/><circle cx="519" cy="286" r="8" fill="#4b4544" stroke="#bd7566" stroke-width="2"/></g>
  <g id="alarm-beacon-right" class="beacon"><circle cx="681" cy="286" r="50" fill="url(#alarmGlow)"/><circle cx="681" cy="286" r="8" fill="#4b4544" stroke="#bd7566" stroke-width="2"/></g>
  <!-- room furnishings -->
  <g opacity=".95"><rect x="269" y="358" width="112" height="67" rx="7" fill="#344f55" stroke="#77918e" stroke-width="3"/><rect x="279" y="367" width="92" height="48" rx="5" fill="#405f64"/><rect x="307" y="440" width="78" height="24" rx="5" fill="#34515a" stroke="#738e91" stroke-width="2"/><rect x="256" y="487" width="80" height="44" rx="5" fill="#314d54" stroke="#728d8c" stroke-width="2"/><circle cx="296" cy="508" r="10" fill="#927d66"/></g>
  <g><rect x="821" y="361" width="93" height="121" rx="7" fill="#365359" stroke="#7d9996" stroke-width="3"/><rect x="833" y="370" width="69" height="32" rx="5" fill="#52777a"/><rect x="833" y="412" width="69" height="58" rx="3" fill="#476b70"/><rect x="740" y="482" width="59" height="44" rx="5" fill="#304c54" stroke="#6b8d8e" stroke-width="2"/><path d="M750 494h39m-39 9h39" stroke="#6d9a9b" stroke-width="2"/></g>
  ${roomLabel(263,337,'01','SALA','ESPACIO SOCIAL')} ${roomLabel(735,337,'02','ESTUDIO','ÁREA DE TRABAJO')}
  <text x="600" y="367" text-anchor="middle" class="room-number">03 / PASILLO</text>
  <text x="600" y="385" text-anchor="middle" class="room-detail">SENSOR DE SONIDO ACTIVO</text>
  <g class="hall-sensor"><path d="M570 333q30-30 60 0 M580 337q20-20 40 0" fill="none" stroke="#67d6c1" stroke-opacity=".6" stroke-width="2"/><circle cx="600" cy="339" r="4" fill="#67d6c1"/></g>
  <!-- safe -->
  <g id="safe" class="safe-interactive" tabindex="0" role="button" aria-label="Caja fuerte, acércate para inspeccionar"><rect x="550" y="153" width="100" height="81" rx="8" fill="#101f28" filter="url(#shadow)"/><rect x="555" y="150" width="90" height="78" rx="6" fill="#52636a" stroke="#c19d6c" stroke-width="3"/><rect x="562" y="158" width="76" height="62" rx="3" fill="#354c55" stroke="#8fa3a1" stroke-width="1.5"/><circle cx="600" cy="189" r="20" fill="#243b44" stroke="#c5a77c" stroke-width="3"/><circle cx="600" cy="189" r="8" fill="#b6aa8e"/><path d="M600 169v11m0 18v11m-20-20h11m18 0h11" stroke="#b6aa8e" stroke-width="2"/><circle cx="629" cy="167" r="3" fill="#73dcbd"/></g>
  <text x="600" y="249" text-anchor="middle" class="room-detail">CAJA FUERTE / SF-01</text>
  <!-- physical walls: access openings at y 395..455 -->
  <g fill="none" stroke="#0d222a" stroke-width="22" stroke-linecap="square"><path d="M231 566V103H969V566H655 M545 566H231"/><path d="M231 305H500 M700 305H969 M500 110V396 M500 454V565 M700 110V396 M700 454V565"/></g>
  <g fill="none" stroke="url(#wall)" stroke-width="12" stroke-linecap="square"><path d="M231 566V103H969V566H655 M545 566H231"/><path d="M231 305H500 M700 305H969 M500 110V396 M500 454V565 M700 110V396 M700 454V565"/></g>
  <g fill="none" stroke="#b4c2ba" stroke-width="2" opacity=".62"><path d="M231 566V103H969V566H655 M545 566H231 M231 305H500 M700 305H969 M500 110V396 M500 454V565 M700 110V396 M700 454V565"/></g>
  <!-- side doors (open) -->
  <path d="M501 396l-54 0 M699 396l54 0" stroke="#b5a986" stroke-width="8" stroke-linecap="round"/><path d="M501 396a58 58 0 0 0-58 58 M699 396a58 58 0 0 1 58 58" fill="none" stroke="#b5a986" stroke-width="1" stroke-dasharray="4 5"/>
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
  <g id="interaction-prompt"><rect x="-62" y="-57" width="124" height="28" rx="7" fill="#122730" stroke="#74d6bc" stroke-width="1"/><text x="0" y="-38" text-anchor="middle" fill="#bdf9da" font-family="DM Sans" font-size="11" font-weight="700">E  ·  INSPECCIONAR</text></g>
  <text x="85" y="788" class="map-micro">SIMULACIÓN · COORDENADAS VIRTUALES</text><text x="1115" y="788" text-anchor="end" class="map-micro">SECURITY SYSTEM / IoT</text>
</svg>`;
  const svg = container.querySelector('svg');
  const refs = Object.fromEntries(['character','door-panel','gate','lamp-left','lamp-right','alarm-beacon-left','alarm-beacon-right','sonar-wave','interaction-prompt','door-limit-open','door-limit-closed'].map(id => [id, svg.querySelector(`#${id}`)]));
  return {
    svg,
    update(state, camera) {
      const { player, servoAngle, gateProgress, lights, alarm, detected, proximity } = state;
      refs.character.setAttribute('transform', `translate(${player.x.toFixed(1)} ${player.y.toFixed(1)}) rotate(${player.direction})`);
      refs['door-panel'].setAttribute('transform', `rotate(${-servoAngle} 550 566)`);
      refs.gate.setAttribute('transform', `translate(0 ${(-46 * (1 - gateProgress)).toFixed(1)})`);
      refs.gate.style.opacity = String(.36 + gateProgress * .64);
      for (const id of ['lamp-left','lamp-right']) refs[id].classList.toggle('lit', lights);
      for (const id of ['alarm-beacon-left','alarm-beacon-right']) refs[id].classList.toggle('active', alarm);
      refs['sonar-wave'].style.opacity = detected ? '1' : '.13';
      refs['door-limit-open'].setAttribute('fill', servoAngle >= 89 ? '#70d4ba' : '#5d7777');
      refs['door-limit-closed'].setAttribute('fill', servoAngle <= 1 ? '#70d4ba' : '#5d7777');
      const showPrompt = !alarm && Math.hypot(player.x-600, player.y-195) < 86;
      refs['interaction-prompt'].style.display = showPrompt ? '' : 'none';
      refs['interaction-prompt'].setAttribute('transform', `translate(${player.x} ${player.y})`);
      const targets = { exterior: [600,645,1050], entrada: [600,548,710], pasillo: [600,403,660], caja: [600,210,570] };
      let [cx, cy, width] = camera === 'follow' ? [player.x, player.y - 70, 900] : targets[camera];
      const aspect = Math.max(.9, container.clientWidth / Math.max(1, container.clientHeight));
      const height = width / aspect;
      cx = Math.max(width / 2, Math.min(1200 - width / 2, cx));
      cy = Math.max(height / 2, Math.min(820 - height / 2, cy));
      svg.setAttribute('viewBox', `${(cx-width/2).toFixed(1)} ${(cy-height/2).toFixed(1)} ${width} ${height.toFixed(1)}`);
    }
  };
}
