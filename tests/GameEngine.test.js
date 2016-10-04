import { assert } from 'chai';
import { EventEmitter2 } from 'eventemitter2';

import { ACTIONS } from '../lib/rules/RuleBook';
import GameEngine from '../lib/GameEngine';
import { buildTransitionTable, TRIGGERS }from '../lib/FSM/transitions';

const axeGuy = require('./testData/axeGuy.json');
const archer = require('./testData/archer.json');
const map = { size: { x: 400, z: 400 } };

describe(__filename, () => {
  describe('Basic player usage', () => {
    it('should allow player to join and will emit \'newCharacter\' event', (done) => {
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

    it('given a walk action should emmit \'characterUpdate\' event after tick', () => {
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

    it('should emit a collision after walking off the border', () => {
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

    it('should allow player to leave and will emit \'rmCharacter\' event', (done) => {
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

    it('should remove a player after it is dead', (done) => {
      let timestamp = new Date().getTime();
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      const testFn = (event) => {
        assert.equal(event.characterId, characterOne.id, 'not the expected id');
        emitter.removeListener('rmCharacter', testFn);
        done();
      };
      emitter.on('rmCharacter', testFn);
      engine.addCharacter(characterOne, 'player');
      engine.addCharacter(characterTwo, 'player');
      engine.handlePlayerAction({
        character: characterTwo.id,
        type: ACTIONS.BASIC_ATTACK,
        target: characterOne.id,
      });
      for (let i = 1; i < 100; i++) {
        engine.tick(timestamp + 100 * i);
      }
    });

    it('should be idle after attacking a disconnected player', () => {
      let timestamp = new Date().getTime() +100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      engine.addCharacter(characterOne, 'player',buildTransitionTable('stopAttackingWhenResultIdle'));
      engine.addCharacter(characterTwo, 'player');
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterTwo.id
            && event.result === 'idle') {
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
        engine.removeCharacter(characterOne.id);
        engine.tick(timestamp);
      });
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
          direction: { x: 20, z: 20 },
        });
        engine.tick(timestamp);
      });
    });

    it('Archer should flee for walking axeGuy', () => {
      let timestamp = new Date().getTime() +100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      characterOne.position.x = 2;
      characterOne.position.z = 2;
      const characterTwo = JSON.parse(JSON.stringify(archer));
      characterTwo.position.x = 4;
      characterTwo.position.z = 4;
      const fleeTransitions = buildTransitionTable([TRIGGERS.fleeOnSight]);
      engine.addCharacter(characterOne, 'player');
      engine.addCharacter(characterTwo, 'NPC', fleeTransitions);
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterTwo.id
            && event.result === 'walk') {
            //TODO some extra assert about the direction?
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
          direction: { x: 20, z: 20 },
        });
        engine.tick(timestamp);
      });
    });



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
    });

    it('UneasyGuy should move on any event', () => {
      let timestamp = new Date().getTime() +100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      characterOne.position.x = 4;
      characterOne.position.z = 4;
      const uneasy = buildTransitionTable([TRIGGERS.uneasy]);
      engine.addCharacter(characterOne, 'NPC', uneasy);
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterOne.id
            && (event.result === 'walk' || event.result === 'collision')) {
            emitter.removeListener('characterUpdate', testFn);
            return resolve();
          }
          timestamp += 100;
          engine.tick(timestamp);
        };
        emitter.on('characterUpdate', testFn);
        emitter.emit('some random event', { type: 'move uneasy guy' });
        engine.tick(timestamp);
      });
    });

     it('Archer should attack walking axeGuy, this should retaliate', () => {
       let timestamp = new Date().getTime() +100;
       const emitter = new EventEmitter2();
       const engine = new GameEngine(map, emitter);
       const characterOne = JSON.parse(JSON.stringify(axeGuy));
       const characterTwo = JSON.parse(JSON.stringify(archer));
       const aggressiveTransitions = buildTransitionTable([TRIGGERS.attackOnRangeIfIDLE,
         TRIGGERS.stopAttackingWhenResultIdle]);
       const defensiveTransitions = buildTransitionTable([TRIGGERS.attackWhenAttackedAndIDLE,
         TRIGGERS.attackWhenAttackedAndWalking, TRIGGERS.uneasy, TRIGGERS.idleAfterCollision,
         TRIGGERS.resumeAttackAfterCollision]);
       engine.addCharacter(characterOne, 'NPC', defensiveTransitions);
       engine.addCharacter(characterTwo, 'NPC', aggressiveTransitions);
       return new Promise((resolve) => {
       const testFn = (event) => {
         if (event.character === archer.id && event.aggressor === axeGuy.id
           && (event.result === 'damaged' || event.result === 'block'
         || event.result === 'dodge' || event.result === 'missed')) {
           emitter.removeListener('characterUpdate', testFn);
           return resolve();
         }
         timestamp += 100;
         engine.tick(timestamp);
        };
        emitter.on('characterUpdate', testFn);
        emitter.emit('start the uneasy guy', { type: 'time to move' });
        engine.tick(timestamp);
       });
     });
  });
});