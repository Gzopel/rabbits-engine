import { assert } from 'chai';
import { EventEmitter2 } from 'eventemitter2';

import { ACTIONS } from '../lib/rules/BaseRuleBook';
import GameEngine from '../lib/ClientGameEngine';
import { buildTransitionTable, TRANSITIONS }from '../lib/FSM/transitions';

const axeGuy = require('./testData/axeGuy.json');
const archer = require('./testData/archer.json');
const map = {
  size: { x: 400, z: 400 },
  spawnLocations: [{ position: { x: 10, z: 10 }, radius: 10 }],
  exits: [{ position: { x: 40, z: 0 }, radius: 10, destination: 1}],
};

describe(__filename, () => {

  let timestamp = new Date().getTime();
  const emitter = new EventEmitter2();
  const engine = new GameEngine(map, emitter);
  const characterOne = JSON.parse(JSON.stringify(axeGuy));
  const characterTwo = JSON.parse(JSON.stringify(archer));

  it('should add charaters on spwan', (done) => {
    const characterOnePosition = { x: 10, z: 15 };
    const testFn = (event) => {
      assert.equal(event.result, ACTIONS.SPAWN, 'Should have spawned');
      assert.equal(event.character, characterOne.id, 'not the expected id');
      assert.equal(event.position.x, characterOnePosition.x, 'not the expected x');
      assert.equal(event.position.z, characterOnePosition.z, 'not the expected z');
      emitter.removeListener('characterUpdate', testFn);
      done();
    };
    emitter.on('characterUpdate', testFn);

    engine.onCharacterUpdate({
      character: characterOne.id,
      action: 'spawn',
      result: 'spawn',
      position: characterOnePosition,
      sheet: characterOne.sheet,
    });
    timestamp += 100;
    engine.tick(timestamp);
  });

  it('should produce harmless attacks', (done) => {
    let interval;
    const testFn = (event) => {
      if (event.action === ACTIONS.BASIC_ATTACK) {
        assert.equal(event.character, characterTwo.id, 'not the expected id');
        assert.equal(event.aggressor, characterOne.id, 'not the expected aggressor');
        assert.equal(event.damage, 0, 'should do no damage');
        clearInterval(interval);
        emitter.removeListener('characterUpdate', testFn);
        done();
      } else if (event.action === ACTIONS.IDLE && characterTwo.id === event.character) {
        engine.handlePlayerAction({
          character: characterOne.id,
          type: ACTIONS.BASIC_ATTACK,
          target: characterTwo.id,
        });
      }
    };
    emitter.on('characterUpdate', testFn);
    engine.onCharacterUpdate({
      character: characterTwo.id,
      action: 'spawn',
      result: 'spawn',
      position: { x: 15, z: 10 },
      sheet: characterTwo.sheet,
    });

    interval = setInterval(() => {
      engine.tick(timestamp + 100 * (new Date().getTime()-timestamp));
    },5)
  });
});