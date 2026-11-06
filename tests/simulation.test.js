import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, stepSimulation, resetAlarm, isWalkable, zoneFor } from '../src/simulation.js';
const advance = (s, input, seconds) => { for (let i=0; i<Math.ceil(seconds/.016); i++) stepSimulation(s, input, .016); };
test('starts outside with a closed door, raised gate, and no fabricated activity', () => {
  const s = createSimulation();
  assert.deepEqual([s.player.x,s.player.y], [600,710]);
  assert.equal(s.closedLimit,true); assert.equal(s.openLimit,false);
  assert.equal(s.gateProgress,0); assert.equal(s.alarm,false); assert.equal(s.sound,0);
});
test('presence opens door, actuates end switches and pulses relay/buzzer', () => {
  const s = createSimulation();
  advance(s,{up:true},.2);
  assert.equal(s.detected,true);
  assert.equal(s.buzzer,true);
  assert.equal(s.relay,true);
  advance(s,{},1);
  assert.equal(s.openLimit,true); assert.equal(s.closedLimit,false);
  assert.equal(s.servoAngle,90);
});
test('ambient light drives analog LDR and outdoor lamps', () => {
  const s = createSimulation();
  stepSimulation(s,{},.016);
  assert.equal(s.lights,false); assert.equal(s.ldr,737);
  s.settings.ambient = 12;
  stepSimulation(s,{},.016);
  assert.equal(s.lights,true); assert.equal(s.ldr,123);
});
test('quiet walking does not alarm; sprint by safe trips LEDs and gate, pushes back', () => {
  const s = createSimulation();
  s.player.y = 370;
  advance(s,{up:true},.08);
  assert.equal(s.alarm,false);
  assert.ok(s.sound < 58);
  advance(s,{up:true,run:true},.6);
  assert.equal(s.alarm,true);
  assert.ok(s.player.y >= 390, 'la alarma empuja al personaje hacia la salida');
  advance(s,{},1.2);
  assert.equal(s.gateState,'Desplegada');
  assert.equal(s.gateProgress,1);
  assert.equal(s.buzzer,true);
  resetAlarm(s); advance(s,{},1.2);
  assert.equal(s.gateState,'Levantada'); assert.equal(s.alarm,false);
});
test('walking cannot pass walls or closed entrance, zones remain distinct', () => {
  const s = createSimulation();
  assert.equal(isWalkable(400,400),true);
  assert.equal(isWalkable(600,100),false);
  assert.equal(isWalkable(500,350),false);
  assert.equal(zoneFor(400,420),'Sala');
  assert.equal(zoneFor(800,420),'Estudio');
  s.player.y = 586;
  stepSimulation(s,{up:true},.05);
  assert.ok(s.player.y >= 580);
});
test('distance threshold can be adjusted without changing the physical distance', () => {
  const s = createSimulation({detectionRange:40});
  s.player.y = 665;
  stepSimulation(s,{},.016);
  const measured = s.distanceCm;
  assert.equal(s.detected,false);
  s.settings.detectionRange=100;
  stepSimulation(s,{},.016);
  assert.equal(s.detected,true); assert.equal(s.distanceCm,measured);
});
