import { assert } from 'chai';
import { EventEmitter2 } from 'eventemitter2';

import { ACTIONS } from '../lib/rules/rules';
import GameEngine from '../lib/GameEngine';
import { buildTransitionTable, TRIGGERS }from '../lib/FSM/transitions';

const axeGuy = require('./testData/axeGuy.json');
const archer = require('./testData/archer.json');
const map = { size: { x: 400, z: 400 } };

describe(__filename, () => {
  describe('Basic player usage', () => {

    it('1. Should allow player to join and will emit \'newCharacter\' event', (done) => {
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));

      const testFn = (event) => {
        assert.deepEqual(event.character, character, 'not the expected character');
        assert.equal(event.characterType, 'player', 'not the expected type');
        emitter.removeListener('newCharacter', testFn);
        done();
      };
      emitter.on('newCharacter', testFn);
      engine.addCharacter(character, 'player');
    });

    it('2. Given a walk action should emmit \'characterUpdate\' event after tick', () => {
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));

      let prevTimestamp = new Date().getTime() + 100;
      let prevX = axeGuy.position.x;
      let prevZ = axeGuy.position.z;
      const targetX = 10;
      const targetZ = 50;
      return new Promise((resolve) => {
        const testFn = (event) => {
          assert.equal(event.type, 'characterUpdate', 'not the expected event');
          assert.equal(event.result, ACTIONS.WALKING, 'not the expected event');
          assert.equal(event.character, axeGuy.id, 'not the expected player');
          assert(event.position, 'should have a position');
          assert(event.position.x > prevX, 'should have increased x');
          assert(event.position.x <= targetX, 'not that much');
          assert(event.position.z > prevZ, 'should have increased z');
          assert(event.position.z <= targetZ, 'not that much');
          assert.equal(event.timestamp, prevTimestamp, 'should have tick timestamp');

          if (event.position.x === targetX && event.position.z === targetZ) {
            emitter.removeListener('characterUpdate', testFn);
            resolve();
            return;
          }
          prevTimestamp+=100;
          engine.tick(prevTimestamp);
        };
        engine.addCharacter(character, 'player');
        emitter.on('characterUpdate', testFn);
        engine.handlePlayerAction({
          character: character.id,
          type: ACTIONS.WALKING,
          direction: { x: targetX, z: targetZ},
        });
        engine.tick(prevTimestamp);
      });
    });

    it('3. Should emit a collision after walking off the border', () => {
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));
      let prevTimestamp = new Date().getTime() + 100;

      return new Promise((resolve) => {
        const testFn = (event) => {
          assert.equal(event.type, 'characterUpdate', 'not the expected event');
          assert.equal(event.character, axeGuy.id, 'not the expected player');
          assert(event.position, 'should have a position');
          assert(event.position.x >= 0, 'x should be positive');
          assert(event.position.z >= 0, 'z should be positive');
          if (event.result === 'collision') {
            emitter.removeListener('characterUpdate', testFn);
            return resolve();
          }
          assert.equal(event.result, 'walk', 'not the expected event');
          prevTimestamp +=100;
          engine.tick(prevTimestamp);
        };
        engine.addCharacter(character, 'player');
        emitter.on('characterUpdate', testFn);
        engine.handlePlayerAction({
          character: character.id,
          type: ACTIONS.WALKING,
          direction: { x: -100, z: 50 },
        });
        prevTimestamp += 100;
        engine.tick(prevTimestamp);
      });
    });

    it('4. Should allow player to leave and will emit \'rmCharacter\' event', (done) => {
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));
      const testFn = (event) => {
        assert.equal(event.characterId, character.id, 'not the expected id');
        emitter.removeListener('rmCharacter', testFn);
        done();
      };
      emitter.on('rmCharacter', testFn);
      engine.addCharacter(character, 'player');
      engine.removeCharacter(character.id);
    });

  });

  describe('NPC transitions integration', () => {
    it('Archer should attack walking axeGuy', () => {
      let timestamp = new Date().getTime() +100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      characterOne.position.x = 4;
      characterOne.position.z = 4;
      const characterTwo = JSON.parse(JSON.stringify(archer));
      characterTwo.position.x = 2;
      characterTwo.position.z = 2;
      const aggressiveTransitions = buildTransitionTable([TRIGGERS.attackOnRangeIfIDLE]);
      engine.addCharacter(characterOne, 'player');
      engine.addCharacter(characterTwo, 'NPC', aggressiveTransitions);
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterOne.id
            && (event.result === 'damaged' || event.result === 'block'
            || event.result === 'dodge' || event.result === 'missed')) {
            emitter.removeListener('characterUpdate', testFn);
            return resolve();
          }
          timestamp += 100;
          engine.tick(timestamp);
        };
        emitter.on('characterUpdate', testFn);
        engine.handlePlayerAction({
          character: characterOne.id,
          type: ACTIONS.WALKING,
          direction: { x: 20, z: 20},
        });
        engine.tick(timestamp);
      });
    })

    it('AxeGuy should retaliate archer\'s attack', () => {
      let timestamp = new Date().getTime() +100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      characterOne.position.x = 4;
      characterOne.position.z = 4;
      const characterTwo = JSON.parse(JSON.stringify(archer));
      characterTwo.position.x = 2;
      characterTwo.position.z = 2;
      const defensiveTransitions = buildTransitionTable([TRIGGERS.attackWhenAttackedAndIDLE,
        TRIGGERS.attackWhenAttackedAndWalking]);
      engine.addCharacter(characterOne, 'NPC', defensiveTransitions);
      engine.addCharacter(characterTwo, 'player');
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterTwo.id
            && (event.result === 'damaged' || event.result === 'block'
            || event.result === 'dodge' || event.result === 'missed')) {
            emitter.removeListener('characterUpdate', testFn);
            return resolve();
          }
          timestamp += 100;
          engine.tick(timestamp);
        };
        emitter.on('characterUpdate', testFn);
        engine.handlePlayerAction({
          character: characterTwo.id,
          type: ACTIONS.BASIC_ATTACK,
          target: characterOne.id,
        });
        engine.tick(timestamp);
      });
    })



    // For some reason this test fails sometimes TODO look into it.
    // Seems like idleAfter collision is not working, and
    // attack when idle doesn't detect collision either;
/*
     it('Archer should attack walking axeGuy, this should retaliate', () => {
       let timestamp = new Date().getTime() +100;
       const emitter = new EventEmitter2();
       const engine = new GameEngine(map, emitter);
       const characterOne = JSON.parse(JSON.stringify(axeGuy));
       const characterTwo = JSON.parse(JSON.stringify(archer));
       const agressiveTransitions = buildTransitionTable([TRIGGERS.attackOnRangeIfIDLE])
       const defensiveTransitions = buildTransitionTable([TRIGGERS.attackWhenAttackedAndIDLE,
         TRIGGERS.attackWhenAttackedAndWalking, TRIGGERS.uneasy, TRIGGERS.idleAfterCollision]);
       engine.addCharacter(characterOne, 'NPC', defensiveTransitions);
       engine.addCharacter(characterTwo, 'NPC', agressiveTransitions);
       return new Promise((resolve) => {
       const testFn = (event) => {
         console.log(event)
         if (event.character === archer.id
           && (event.result === 'damaged' || event.result === 'block'
         || event.result === 'dodge' || event.result === 'missed')) {
           emitter.removeListener('characterUpdate', testFn);
           resolve();
         }
         timestamp += 100;
         engine.tick(timestamp);
        };
        emitter.on('characterUpdate', testFn);
        emitter.emit('start the uneasy guy', { type: 'time to move' });
        engine.tick(timestamp);
       });
     });*/

  });
});