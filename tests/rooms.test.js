import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, ROOM_RANGE_CM, MAX_SCORE, createSimulation, stepSimulation, collectNearby, zoneFor, resetAlarm } from '../src/simulation.js';
const advance = (s, input, seconds) => { for (let i=0; i<Math.ceil(seconds/.016); i++) stepSimulation(s, input, .016); };

test('six independent rooms have fixed 1 m ultrasonic, sound sensor and closed servo at start', () => {
  const s = createSimulation();
  assert.equal(ROOMS.length, 6);
  assert.equal(ROOM_RANGE_CM, 100);
  assert.equal(MAX_SCORE, 9);
  for (const r of ROOMS) {
    assert.deepEqual([s.rooms[r.id].distanceCm,s.rooms[r.id].sound,s.rooms[r.id].servoAngle,s.rooms[r.id].collected],[300,0,0,false]);
  }
});
test('walking approaches sala: ultrasonic detects within 100 cm, servo opens, crossing is possible', () => {
  const s = createSimulation(); s.player.y = 341;
  advance(s,{left:true},1.8);
  assert.ok(s.rooms.sala.distanceCm <= 100);
  assert.equal(s.rooms.sala.detected,true);
  assert.equal(s.rooms.sala.servoAngle,90);
  assert.equal(zoneFor(s.player.x,s.player.y),'Sala');
  assert.ok(s.rooms.sala.sound > 0 && s.rooms.sala.sound < 48);
});
test('sprinting triggers room microphone and locks the door even when it was already open', () => {
  const s = createSimulation(); s.player.y = 341;
  advance(s,{left:true},.7); // door opens; still in corridor
  assert.ok(s.rooms.sala.servoAngle > 67);
  advance(s,{left:true,run:true},.6);
  assert.ok(s.player.x >= 500, 'cannot enter while sprinting');
  assert.ok(s.rooms.sala.warningUntil > s.time - .1);
  assert.ok(s.rooms.sala.sound >= 48);
  advance(s,{},.6); // noise decays
  advance(s,{left:true},1.2);
  assert.equal(zoneFor(s.player.x,s.player.y),'Sala');
});
test('all six rooms are reachable by walking through their respective servo doors', () => {
  for (const room of ROOMS) {
    const s = createSimulation(); s.player.y = room.doorY;
    advance(s,{[room.side === 'left' ? 'left' : 'right']:true},1.75);
    assert.equal(zoneFor(s.player.x,s.player.y),room.name,room.id);
    assert.equal(s.rooms[room.id].servoAngle,90,room.id);
    assert.ok(s.rooms[room.id].distanceCm <= 100,room.id);
    assert.equal(s.alarm,false,room.id);
  }
});
test('one treasure per room scores once; safe requires crouching and scores three', () => {
  const s = createSimulation();
  for (const room of ROOMS) {
    s.player.x=room.treasureX; s.player.y=room.treasureY;
    const reward=collectNearby(s);
    assert.deepEqual(reward,{id:room.id,points:1});
    assert.equal(collectNearby(s),null,'no duplicate reward');
  }
  assert.equal(s.score,6);
  s.player.x=600; s.player.y=255;
  stepSimulation(s,{},.016);
  assert.equal(collectNearby(s),null,'standing does not open safe');
  stepSimulation(s,{crouch:true},.016);
  assert.equal(s.movement,'Agachado');
  assert.deepEqual(collectNearby(s),{id:'safe',points:3});
  assert.equal(collectNearby(s),null);
  assert.equal(s.score,MAX_SCORE);
});
test('safe denies reward under alarm; resetting alarm does not erase earned points', () => {
  const s = createSimulation();
  s.player.y=255;
  s.alarm=true; s.gateProgress=1;
  stepSimulation(s,{crouch:true},.016);
  assert.equal(collectNearby(s),null);
  assert.equal(s.score,0);
  resetAlarm(s); advance(s,{crouch:true},1.1);
  assert.deepEqual(collectNearby(s),{id:'safe',points:3});
});
test('complete playable route: garden → sala treasure → safe while crouched', () => {
  const s = createSimulation();
  advance(s,{up:true},3.78);
  assert.equal(zoneFor(s.player.x,s.player.y),'Pasillo');
  advance(s,{left:true},2.65);
  assert.equal(zoneFor(s.player.x,s.player.y),'Sala');
  assert.deepEqual(collectNearby(s),{id:'sala',points:1});
  advance(s,{right:true},2.65);
  advance(s,{up:true},1.47);
  advance(s,{crouch:true},.1);
  assert.deepEqual(collectNearby(s),{id:'safe',points:3});
  assert.equal(s.score,4);
});
