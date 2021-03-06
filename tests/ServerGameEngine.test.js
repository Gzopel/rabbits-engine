import { assert } from 'chai';
import { EventEmitter2 } from 'eventemitter2';

import { ACTIONS } from '../lib/rules/BaseRuleBook';
import GameEngine from '../lib/ServerGameEngine';
import { TRANSITIONS }from '../lib/FSM/transitions';

const axeGuy = require('./testData/axeGuy.json');
const archer = require('./testData/archer.json');
const map = {
  size: { x: 400, z: 400 },
  spawnLocations: [{ position: { x: 10, z: 10 }, radius: 10 }],
  exits: [{ position: { x: 60, z: 0 }, radius: 30, destination: 1}],
};

describe(__filename, () => {
  describe('Basic player usage', () => {
    it('should allow player to join and will emit \'newCharacter\' event', (done) => {
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));

      const testFn = (event) => {
        assert.equal(event.character, character.id, 'not the expected character');
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
      let prevX = 0;
      let prevZ = 0;
      let spawned = false;
      let idle = false;
      const targetX = 10;
      const targetZ = 50;
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.result === ACTIONS.SPAWN && !spawned) {
            spawned = true; //drop it

            prevTimestamp += 100;
            engine.tick(prevTimestamp);
            return;
          }
          if (event.result === ACTIONS.IDLE && !idle) {
            idle = true;
            engine.characters.get(character.id).position = { x: 0 , z: 0 };
            engine.handlePlayerAction({
              character: character.id,
              type: ACTIONS.WALKING,
              direction: { x: targetX, z: targetZ},
            });
            prevTimestamp += 100;
            engine.tick(prevTimestamp);
            return;
          }
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
          prevTimestamp += 100;
          engine.tick(prevTimestamp);
        };
        engine.addCharacter(character, 'player');
        prevTimestamp += 100;
        engine.tick(prevTimestamp);

        emitter.on('characterUpdate', testFn);
      });
    });

    it('should emit a collision after walking off the border', () => {
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));
      let prevTimestamp = new Date().getTime() + 100;
      let spawned = false;
      let idle = false;
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.result === ACTIONS.SPAWN && !spawned) {
            spawned = true; //drop it
            prevTimestamp += 100;
            engine.tick(prevTimestamp);
            return;
          }
          if (event.result === ACTIONS.IDLE && !idle) {
            idle = true;
            engine.characters.get(character.id).position = { x: 0 , z: 0 };
            engine.handlePlayerAction({
              character: character.id,
              type: ACTIONS.WALKING,
              direction: { x: -100, z: -100 },
            });
            prevTimestamp += 100;
            engine.tick(prevTimestamp);
            return;
          }
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
          prevTimestamp += 100;
          engine.tick(prevTimestamp);
        };
        engine.addCharacter(character, 'player');
        engine.tick(prevTimestamp);
        emitter.on('characterUpdate', testFn);
      });
    });

    it('should allow player to leave and will emit \'rmCharacter\' event', (done) => {
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));
      const testFn = (event) => {
        assert.equal(event.character, character.id, 'not the expected id');
        emitter.removeListener('rmCharacter', testFn);
        done();
      };
      emitter.on('rmCharacter', testFn);
      engine.addCharacter(character, 'player');
      engine.removeCharacter(character.id);
    });

    it('should remove a player after it is dead', (done) => {
      let timestamp = new Date().getTime() + 100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      const testFn = (event) => {
        assert.equal(event.character, characterOne.id, 'not the expected id');
        emitter.removeListener('rmCharacter', testFn);
        done();
      };
      emitter.on('rmCharacter', testFn);
      const idleOne = new Promise((resolve) => {
        const onIdle = (event) => {
          if (event.character === characterOne.id && event.action === ACTIONS.IDLE) {
            emitter.removeListener('characterUpdate', onIdle);
            resolve();
          }
        };
        timestamp += 100;
        engine.tick(timestamp);
        emitter.on('characterUpdate', onIdle);
      });
      const idleTwo = new Promise((resolve) => {
        const onIdle = (event) => {
          if (event.character === characterTwo.id && event.action === ACTIONS.IDLE) {
            emitter.removeListener('characterUpdate', onIdle);
            resolve();
          }
          timestamp += 100;
          engine.tick(timestamp);
        };
        emitter.on('characterUpdate', onIdle);
      });
      Promise.all([idleOne, idleTwo]).then(() => {
        engine.handlePlayerAction({
          character: characterTwo.id,
          type: ACTIONS.BASIC_ATTACK,
          target: characterOne.id,
        });
        for (let i = 2; i < 100; i++) {
          engine.tick(timestamp + 100 * i);
        }
      });
      engine.addCharacter(characterOne, 'player');
      engine.addCharacter(characterTwo, 'player');
      engine.tick(timestamp);

    });

    it('should remove a player after it warps on an exit', (done) => {
      let timestamp = new Date().getTime() + 100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));
      const removePromise = new Promise((resolve) => {
        const onRemove = (event) => {
          assert.equal(event.character, character.id, 'not the expected id');
          emitter.removeListener('rmCharacter', onRemove);
          resolve();
        };
        emitter.on('rmCharacter', onRemove);
      });
      const warpPromise = new Promise((resolve) => {
        const onWarp = (event) => {
          assert.equal(event.character, character.id, 'not the expected id');
          if (event.result === 'warp') {
            assert.equal(event.action, 'walk', 'should be a walk action');
            assert(event.destination, 'should have a destination');
            emitter.removeListener('characterUpdate', onWarp);
            resolve();
          }
          timestamp+=100;
          engine.tick(timestamp);
        };
        emitter.on('characterUpdate', onWarp);
      });
      const idlePromise = new Promise((resolve) => {
        const onIdle = (event) => {
          assert.equal(event.character, character.id, 'not the expected id');
          if (event.result === 'idle') {
            engine.characters.get(character.id).position = { x: 0, z: 0};
            // TODO for some reason, when starting from random spawn position sometimes it fails to collide with the exit
            engine.handlePlayerAction({
              character: character.id,
              type: ACTIONS.WALKING,
              direction: { x: 60, z: 0 },
            });
            emitter.removeListener('characterUpdate', onIdle);
            timestamp+=100;
            engine.tick(timestamp);
            resolve();
          }
        };
        emitter.on('characterUpdate', onIdle);
      });
      engine.addCharacter(character, 'player');
      engine.tick(timestamp);

      Promise.all([removePromise, warpPromise,idlePromise]).then(() => done());
    });

    it('should be idle after killing player', (done) => {
      let timestamp = new Date().getTime() + 100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      engine.addCharacter(characterOne, 'player');
      engine.addCharacter(characterTwo, 'player');
      const finishAttackPromise = new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterTwo.id
            && event.result === 'idle') {
            if(event.action === ACTIONS.BASIC_ATTACK) {
              emitter.removeListener('characterUpdate', testFn);
              return resolve();
            }
          }
          timestamp += 100;
          engine.tick(timestamp);
        };
        emitter.on('characterUpdate', testFn);
      });

      const idlePromise = new Promise((resolve) => {
        const onIdle = (event) => {
          if (event.result === 'idle') {
            engine.handlePlayerAction({
              character: characterTwo.id,
              type: ACTIONS.BASIC_ATTACK,
              target: characterOne.id,
            });
            emitter.removeListener('characterUpdate', onIdle);
            resolve();
          }
        };
        emitter.on('characterUpdate', onIdle);
      });
      Promise.all([idlePromise, finishAttackPromise]).then(()=> done())
      engine.tick(timestamp);
    });

    it('should be idle after attacking a disconnected player', () => {
      let timestamp = new Date().getTime() + 100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      engine.addCharacter(characterOne, 'player');
      engine.addCharacter(characterTwo, 'player');
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterTwo.id
            && event.result === 'idle') {
            if(event.action === ACTIONS.BASIC_ATTACK) {
              emitter.removeListener('characterUpdate', testFn);
              return resolve();
            }
            engine.handlePlayerAction({
              character: characterTwo.id,
              type: ACTIONS.BASIC_ATTACK,
              target: characterOne.id,
            });
            engine.removeCharacter(characterOne.id);
          }
          timestamp += 100;
          engine.tick(timestamp);
        };
        emitter.on('characterUpdate', testFn);
        engine.tick(timestamp);
      });
    });

    it('should provide snapshots of the game', (done) => {
      let timestamp = new Date().getTime() +100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      const positionOne = { x: 4, z: 4 };
      const positionTwo = { x: 2, z: 2 };
      engine.addCharacter(characterOne, 'player');
      engine.addCharacter(characterTwo, 'NPC');
      const snapshot = engine.getSnapshot();

      assert(snapshot, 'Should provide a snapshot');
      assert(snapshot.map, 'Should contain a map snapshot');
      assert.deepEqual(snapshot.map,map, 'Should match the map data');
      assert(snapshot.characters, 'Should contain a characters snapshot');

      const snapCharOne = snapshot.characters[characterOne.id];
      const snapCharTwo = snapshot.characters[characterTwo.id];
      assert(snapCharOne, 'Should contain character one');
      assert(snapCharTwo, 'Should contain character two');
      assert.deepEqual(snapCharOne.sheet, characterOne.sheet, 'Should have the same sheet');
      assert.deepEqual(snapCharTwo.sheet, characterTwo.sheet, 'Should have the same sheet');
      assert(snapCharOne.state, 'Should contain a state for character one');
      assert(snapCharTwo.state, 'Should contain a state for character two');
      assert.equal(snapCharOne.state.action, ACTIONS.SPAWN, 'Should be in spawn state');
      assert.equal(snapCharTwo.state.action, ACTIONS.IDLE, 'Should be in spawn state');

      engine.tick(timestamp);
      setTimeout(() => {
        engine.tick(timestamp + 100);
        engine.characters.get(characterOne.id).position = positionOne;
        engine.characters.get(characterTwo.id).position = positionTwo;
        const snapshotTwo = engine.getSnapshot();

        const snapTwoCharTwo = snapshotTwo.characters[characterTwo.id];
        const snapTwoCharOne = snapshotTwo.characters[characterOne.id];
        assert.equal(snapTwoCharOne.state.action, ACTIONS.IDLE, 'Should be in idle state');
        assert.equal(snapTwoCharTwo.state.action, ACTIONS.IDLE, 'Should be in idle state');
        assert.deepEqual(snapTwoCharOne.position, positionOne, 'Should have the same position');
        assert.deepEqual(snapTwoCharTwo.position, positionTwo, 'Should have the same position');
        done();
      },100);
    });
  });

  describe('Shoot action', () => {
    it('should be removed after hitting a border', (done) => {
      let timestamp = new Date().getTime() + 100;
      let interval;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(archer));
      engine.addCharacter(characterOne, 'player');
      const shootPromise = new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterOne.id
            && event.result === 'shoot') {
            emitter.removeListener('characterUpdate', testFn);
            return resolve();
          }
        };
        emitter.on('characterUpdate', testFn);
      });
      const collisionPromise = new Promise((resolve) => {
        const testFn = (event) => {
          if (event.result === 'collision' || event.result === 'warp') {
            // TODO Shots shouldn't warp
            emitter.removeListener('characterUpdate', testFn);
            return resolve();
          }
        };
        emitter.on('characterUpdate', testFn);
      });
      const removePromise = new Promise((resolve) => {
        const testFn = (event) => {
          // some assertion would be nice
          emitter.removeListener('rmCharacter', testFn);
          return resolve();
        };
        emitter.on('rmCharacter', testFn);
      });
      Promise.all([shootPromise, collisionPromise, removePromise]).then(() => {
        clearInterval(interval);
        done();
      });
      engine.tick(timestamp);
      engine.handlePlayerAction({
        character: characterOne.id,
        type: ACTIONS.SHOOT,
      });
      interval = setInterval(() => {
        engine.tick(timestamp + 100*(new Date().getTime()-timestamp));
      }, 10);
    });
  });

  it('should attack after colliding with a character', (done) => {
    const timestamp = new Date().getTime() + 100;
    const emitter = new EventEmitter2();
    const engine = new GameEngine(map, emitter);
    const characterOne = JSON.parse(JSON.stringify(archer));
    const characterTwo = JSON.parse(JSON.stringify(axeGuy));
    engine.addCharacter(characterOne, 'player');
    engine.addCharacter(characterTwo, 'player');
    const collisionPromise = new Promise((resolve) => {
      const testFn = (event) => {
        if (event.result === 'collision') {
          assert(event.collidedWith === characterTwo.id, 'should collide with character two');
          emitter.removeListener('characterUpdate', testFn);
          return resolve();
        }
      };
      emitter.on('characterUpdate', testFn);
    });
    const attackPromise = new Promise((resolve) => {
      const testFn = (event) => {
        if (event.action === 'basicAttack') {
          assert(event.character === characterTwo.id, 'should attack character two');
          emitter.removeListener('characterUpdate', testFn);
          return resolve();
        }
      };
      emitter.on('characterUpdate', testFn);
    });

    Promise.all([attackPromise, collisionPromise]).then(() => done());
    const spawnOnePromise = new Promise((resolve) => {
      const testFn = (event) => {
        if (event.action === 'spawn' && event.character === characterOne.id) {
          emitter.removeListener('characterUpdate', testFn);
          return resolve();
        }
      };
      emitter.on('characterUpdate', testFn);
    });
    const spawnTwoPromise = new Promise((resolve) => {
      const testFn = (event) => {
        if (event.action === 'spawn' && event.character === characterTwo.id) {
          emitter.removeListener('characterUpdate', testFn);
          return resolve();
        }
      };
      emitter.on('characterUpdate', testFn);
    });
    Promise.all([spawnOnePromise, spawnTwoPromise]).then(() => {
      engine.characters.get(characterOne.id).position = { x: 10, z: 100 };
      engine.characters.get(characterOne.id).orientation = { x: 0, z: -1 };
      engine.characters.get(characterTwo.id).position = { x: 10, z: 10 };
      engine.handlePlayerAction({
        character: characterOne.id,
        type: ACTIONS.SHOOT,
      });
      setInterval(() => {
        engine.tick(timestamp + 100 * (new Date().getTime() - timestamp));
      }, 10);
    });
    engine.tick(timestamp);
  });

  describe('NPC transitions integration', () => {

    it('Should be idle after collision', (done) => {
      let timestamp = new Date().getTime() + 100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      const idleAfterCollision = [TRANSITIONS.idleAfterCollision, TRANSITIONS.idleAfterSpawn];
      engine.addCharacter(characterOne, 'player', idleAfterCollision);
      engine.addCharacter(characterTwo, 'NNPC');
      engine.tick(timestamp);
      let collided = false;
      const collidePromise = new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterOne.id && (event.action === ACTIONS.WALKING)
            && event.result === 'collision') {
            collided = true;
            emitter.removeListener('characterUpdate', testFn);
            return resolve();
          }
        };
        emitter.on('characterUpdate', testFn);
      });
      const idlePromise = new Promise((resolve) => {
        const testFn = (event) => {
          if (collided && event.character === characterOne.id && event.action === ACTIONS.IDLE) {
            emitter.removeListener('characterUpdate', testFn);
            return resolve();
          }
          timestamp += 100;
          engine.tick(timestamp);
        };
        emitter.on('characterUpdate', testFn);
      });
      const spawnPromise = new Promise((resolve) => {
        const testFn = (event) => {
          if (event.action === ACTIONS.SPAWN) {
            emitter.removeListener('characterUpdate', testFn);
            engine.characters.get(characterOne.id).position = { x: 2, z: 2 };
            engine.characters.get(characterTwo.id).position = { x: 30, z: 30 };
            engine.handlePlayerAction({
              character: characterOne.id,
              type: ACTIONS.WALKING,
              direction: { x: 40, z: 40 },
            });
            return resolve();
          }
        };
        emitter.on('characterUpdate', testFn);
      });
      Promise.all([spawnPromise, collidePromise, idlePromise]).then(() => done());
      timestamp += 100;
      engine.tick(timestamp);
    });

    it('Archer should attack walking axeGuy', () => {
      let timestamp = new Date().getTime() + 100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      const aggressiveTransitions = [TRANSITIONS.attackOnRangeIfIDLE];
      engine.addCharacter(characterOne, 'player');
      engine.addCharacter(characterTwo, 'NPC', aggressiveTransitions);
      engine.tick(timestamp);
      engine.characters.get(characterOne.id).position = { x: 4, z: 4 };
      engine.characters.get(characterTwo.id).position = { x: 2, z: 2 };
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.character === characterOne.id && (event.action === ACTIONS.BASIC_ATTACK)) {
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

    it('Archer should flee of walking axeGuy', () => {
      let timestamp = new Date().getTime() +100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      const fleeTransitions = [TRANSITIONS.fleeOnSight];
      engine.addCharacter(characterOne, 'player');
      engine.addCharacter(characterTwo, 'NPC', fleeTransitions);
      engine.tick(timestamp);
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
        const onIdle = (event) => {
          if (event.action === 'idle' && event.character === characterOne.id) {
            emitter.removeListener('characterUpdate', onIdle);
            engine.handlePlayerAction({
              character: characterOne.id,
              type: ACTIONS.WALKING,
              direction: { x: 50, z: 50 },
            });
            timestamp += 100;
            engine.tick(timestamp);
          }
        };
        emitter.on('characterUpdate', onIdle);
        engine.characters.get(characterOne.id).position = { x: 5, z: 5 };
        engine.characters.get(characterTwo.id).position = { x: 30, z: 30};
        timestamp += 100;
        engine.tick(timestamp);
      });
    });

    it('AxeGuy should retaliate archer\'s attack', () => {
      let timestamp = new Date().getTime() +100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      const defensiveTransitions = [TRANSITIONS.attackWhenAttackedAndIDLE,
        TRANSITIONS.attackWhenAttackedAndWalking];
      engine.addCharacter(characterOne, 'NPC', defensiveTransitions);
      engine.addCharacter(characterTwo, 'player');
      engine.tick(timestamp);
      engine.characters.get(characterOne.id).position = { x: 4, z: 4 };
      engine.characters.get(characterTwo.id).position = { x: 2, z: 2 };
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
      characterOne.position = { x: 4, z: 4 };
      const uneasy = [TRANSITIONS.uneasy];
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
       characterOne.position = { x: 4, z: 4 };
       characterTwo.position = { x: 2, z: 2 };
       const aggressiveTransitions = [TRANSITIONS.attackOnRangeIfIDLE,
         TRANSITIONS.stopAttackingWhenResultIdle];
       const defensiveTransitions = [TRANSITIONS.attackWhenAttackedAndIDLE,
         TRANSITIONS.attackWhenAttackedAndWalking, TRANSITIONS.uneasy, TRANSITIONS.idleAfterCollision,
         TRANSITIONS.resumeAttackAfterCollision];
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