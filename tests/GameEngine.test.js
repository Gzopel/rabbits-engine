import { assert } from 'chai';
import eventEmitter from 'event-emitter';

import { ACTIONS } from '../lib/rules/rules';
import GameEngine from '../lib/GameEngine';

const axeGuy = require('./testData/axeGuy.json');

describe(__filename, () => {
  const emitter = eventEmitter();
  const engine = new GameEngine(emitter);
  const character = JSON.parse(JSON.stringify(axeGuy));

  it('1. Should allow player to join and will emit \'newCharacter\' event', (done) => {
    // For some reason this tests fails 1/20 times TODO look into it.
    const testFn = (event) => {
      assert.deepEqual(event.character, character, 'not the expected character');
      assert.equal(event.type , 'player', 'not the expected type');
      emitter.off('newCharacter', testFn);
      done();
    };
    emitter.on('newCharacter', testFn);
    engine.addCharacter(character, 'player');
  });
  
  it('2. Given a walk action should emmit \'characterUpdate\' event after tick', (done) => {
    const timestamp = new Date().getTime();
    const testFn = (event) => {
      assert.equal(event.type, 'characterUpdate', 'not the expected event');
      assert.equal(event.result, ACTIONS.WALKING, 'not the expected event');
      assert.equal(event.character, axeGuy.id, 'not the expected player');
      assert(event.position, 'should have a position');
      assert(event.position.x > axeGuy.position.x, 'should have increased x');
      assert(event.position.z > axeGuy.position.z, 'should have increased z');
      assert.equal(event.timestamp, timestamp, 'should have tick timestamp');
      emitter.off('characterUpdate', testFn);
      done();
    };
    emitter.on('characterUpdate', testFn);
    engine.handlePlayerAction({
      character: character.id,
      type: ACTIONS.WALKING,
      direction: { x: 10, z: 10 },
    });
    engine.tick(timestamp);
  });
});