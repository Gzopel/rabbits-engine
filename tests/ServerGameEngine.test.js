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
  exits: [{ position: { x: 40, z: 0 }, radius: 10, destination: 1}],
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
      const targetX = 10;
      const targetZ = 50;
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.result === ACTIONS.SPAWN && !spawned) {
            spawned = true; //drop it
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
        engine.tick(prevTimestamp);
        engine.characters.get(character.id).position = { x: 0 , z: 0 };
        engine.handlePlayerAction({
          character: character.id,
          type: ACTIONS.WALKING,
          direction: { x: targetX, z: targetZ},
        });
        emitter.on('characterUpdate', testFn);
        prevTimestamp += 100;
        engine.tick(prevTimestamp);
      });
    });

    it('should emit a collision after walking off the border', () => {
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));
      let prevTimestamp = new Date().getTime() + 100;
      let spawned = false;
      return new Promise((resolve) => {
        const testFn = (event) => {
          if (event.result === ACTIONS.SPAWN && !spawned) {
            spawned = true; //drop it
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
        engine.handlePlayerAction({
          character: character.id,
          type: ACTIONS.WALKING,
          direction: { x: -100, z: -100 },
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
      let timestamp = new Date().getTime() + 100;
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
      engine.tick(timestamp);
      engine.handlePlayerAction({
        character: characterTwo.id,
        type: ACTIONS.BASIC_ATTACK,
        target: characterOne.id,
      });
      for (let i = 2; i < 100; i++) {
        engine.tick(timestamp + 100 * i);
      }
    });

    it('should remove a player after it warps on an exit', (done) => {
      let timestamp = new Date().getTime() + 100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const character = JSON.parse(JSON.stringify(axeGuy));
      const removePromise = new Promise((resolve) => {
        const onRemove = (event) => {
          assert.equal(event.characterId, character.id, 'not the expected id');
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
        };
        emitter.on('characterUpdate', onWarp);
      });
      engine.addCharacter(character, 'player');
      engine.tick(timestamp);
      engine.handlePlayerAction({
        character: character.id,
        type: ACTIONS.WALKING,
        direction: { x: 40, z: 0 },
      });

      Promise.all([removePromise, warpPromise]).then(() => done());

      for (let i = 2; i < 100; i++) {
        engine.tick(timestamp + 100 * i);
      }
    });

    it('should be idle after attacking a disconnected player', () => {
      let timestamp = new Date().getTime() + 100;
      const emitter = new EventEmitter2();
      const engine = new GameEngine(map, emitter);
      const characterOne = JSON.parse(JSON.stringify(axeGuy));
      const characterTwo = JSON.parse(JSON.stringify(archer));
      engine.addCharacter(characterOne, 'player',[TRANSITIONS.stopAttackingWhenResultIdle]);
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
          if (event.result === 'collision') {
            emitter.removeListener('characterUpdate', testFn);
            return resolve();
          }
        };
        emitter.on('characterUpdate', testFn);
      });
      Promise.all([shootPromise, collisionPromise]).then(() => done());
      engine.tick(timestamp);
      engine.handlePlayerAction({
        character: characterOne.id,
        type: ACTIONS.SHOOT,
      });
      setInterval(()=>{
        engine.tick(timestamp + 100*(new Date().getTime()-timestamp));
      },10);
    });
  });

  it('should be removed after hitting a border', (done) => {
    let timestamp = new Date().getTime() + 100;
    const emitter = new EventEmitter2();
    const engine = new GameEngine(map, emitter);
    const characterOne = JSON.parse(JSON.stringify(archer));
    const characterTwo = JSON.parse(JSON.stringify(axeGuy));
    engine.addCharacter(characterOne, 'player');
    engine.addCharacter(characterTwo, 'player');
    const collisionPromise = new Promise((resolve) => {
      const testFn = (event) => {
        if (event.result === 'collision') {
          assert(event.collidedWith === characterTwo.id,'should collide with character two');
          emitter.removeListener('characterUpdate', testFn);
          return resolve();
        }
      };
      emitter.on('characterUpdate', testFn);
    });
    const attackPromise = new Promise((resolve) => {
      const testFn = (event) => {
        if (event.action === 'basicAttack') {
          assert(event.character === characterTwo.id,'should attack character two');
          emitter.removeListener('characterUpdate', testFn);
          return resolve();
        }
      };
      emitter.on('characterUpdate', testFn);
    });
    Promise.all([attackPromise, collisionPromise]).then(() => done());
    engine.tick(timestamp);
    engine.characters.get(characterOne.id).position = { x: 10, z:100};
    engine.characters.get(characterOne.id).orientation = { x: 0, z:-1};
    engine.characters.get(characterTwo.id).position = { x: 10, z:10};
    engine.handlePlayerAction({
      character: characterOne.id,
      type: ACTIONS.SHOOT,
    });
    setInterval(()=>{
      engine.tick(timestamp + 100*(new Date().getTime()-timestamp));
    },10);
  });

  describe('NPC transitions integration', () => {
    it('Archer should attack walking axeGuy', () => {
      let timestamp = new Date().getTime() +100;
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
      const characterTwo = JSON.parse(JSON.stringify(archer));
      const fleeTransitions = [TRANSITIONS.fleeOnSight];
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
        engine.tick(timestamp);
        engine.characters.get(characterOne.id).position = { x: 5, z: 5 };
        engine.characters.get(characterTwo.id).position = { x: 10, z: 10};
        engine.handlePlayerAction({
          character: characterOne.id,
          type: ACTIONS.WALKING,
          direction: { x: 20, z: 20 },
        });
        emitter.on('characterUpdate', testFn);
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