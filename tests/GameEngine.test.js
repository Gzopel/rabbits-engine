import { assert } from 'chai';
import { EventEmitter2 } from 'eventemitter2';

import { ACTIONS } from '../lib/rules/rules';
import GameEngine from '../lib/GameEngine';
import { buildTransitionTable, TRIGGERS }from '../lib/FSM/transitions';

const axeGuy = require('./testData/axeGuy.json');
const archer = require('./testData/archer.json');

describe(__filename, () => {
  describe('Basic player usage', () => {

    const emitter = new EventEmitter2();
    const engine = new GameEngine(emitter);
    const character = JSON.parse(JSON.stringify(axeGuy));

    it('1. Should allow player to join and will emit \'newCharacter\' event', (done) => {
      // For some reason this tests fails 1/20 times TODO look into it.
      const testFn = (event) => {
        assert.deepEqual(event.character, character, 'not the expected character');
        assert.equal(event.characterType, 'player', 'not the expected type');
        emitter.removeListener('newCharacter', testFn);
        done();
      };
      emitter.on('newCharacter', testFn);
      engine.addCharacter(character, 'player');
    });

    it('2. Given a walk action should emmit \'characterUpdate\' event after tick', (done) => {
      const timestamp = new Date().getTime() + 100;
      const testFn = (event) => {
        assert.equal(event.type, 'characterUpdate', 'not the expected event');
        assert.equal(event.result, ACTIONS.WALKING, 'not the expected event');
        assert.equal(event.character, axeGuy.id, 'not the expected player');
        assert(event.position, 'should have a position');
        assert(event.position.x > axeGuy.position.x, 'should have increased x');
        assert(event.position.z > axeGuy.position.z, 'should have increased z');
        assert.equal(event.timestamp, timestamp, 'should have tick timestamp');
        emitter.removeListener('characterUpdate', testFn);
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

  describe('NPC transitions integration', () => {
    const start = new Date().getTime();
    const emitter = new EventEmitter2();
    const engine = new GameEngine(emitter);
    const characterOne = JSON.parse(JSON.stringify(axeGuy));
    const characterTwo = JSON.parse(JSON.stringify(archer));
    const agressiveTransitions = buildTransitionTable([TRIGGERS.attackOnRangeIfIDLE])
    const defensiveTransitions = buildTransitionTable([TRIGGERS.attackWhenAttackedAndIDLE,
      TRIGGERS.attackWhenAttackedAndWalking, TRIGGERS.uneasy, TRIGGERS.idleAfterCollision]);
    it('Archer should attack walking axeGuy, this should retaliate', () => {
      engine.addCharacter(characterOne, 'NPC', defensiveTransitions);
      engine.addCharacter(characterTwo, 'NPC', agressiveTransitions);
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === archer.id) {
            if (event.result === 'damaged' || event.result === 'block'
               || event.result === 'dodge' || event.result === 'missed') {
              emitter.removeListener('characterUpdate', testFn);
              resolve();
            }
          }
        };
        emitter.on('characterUpdate', testFn);
        emitter.emit('start the uneasy guy', { type: 'time to move' });
        for (let i = 1; i < 100; i++) {
          engine.tick(start + (40 * i));
        }
      });
    })
  });
});