import { assert } from 'chai';
import eventEmitter from 'event-emitter';

import { ACTIONS } from '../lib/rules/rules';
import ActionApplier from '../lib/rules/ActionApplier';

const axeGuy = require('./testData/axeGuy.json');
const archer = require('./testData/archer.json');

describe(__filename, () => {
  describe('Move collition', () => {
    const characterOne =JSON.parse(JSON.stringify(axeGuy))
    const characterTwo = JSON.parse(JSON.stringify(archer));
    const characters = { 1: characterOne, 2: characterTwo };
    const emitter = eventEmitter();
    const applier = new ActionApplier(emitter, characters);

    it('should collide instantly if next to each other', (done) => {
      const testFn = (update) => {
        assert(update.character === characterTwo.id, 'Should update character two');
        assert(update.result === 'collision', 'Should collide');
        assert(characterTwo.position.z === archer.position.z, 'Should not increase z position');
        assert(characterTwo.position.x === archer.position.x, 'Should not increase x position');
        emitter.off('characterUpdate', testFn);
        done();
      };
      emitter.on('characterUpdate', testFn);
      emitter.emit('newState', {
        action: ACTIONS.WALKING,
        owner: characterTwo.id,
        direction: { x: 0, z: 0},
      });
    });

    it('should collide after updating position if there is a gap', (done) => {
      characterOne.position.x = 2;
      characterOne.position.z = 2;
      characterTwo.position.x = 5;
      characterTwo.position.z = 5;
      const testFn = (update) => {
        assert(update.character === characterTwo.id, 'Should update character two');
        assert(update.result === 'collision', 'Should collide');
        console.log(characterTwo);
        assert(characterTwo.position.z < 5, 'Should increase z position');
        assert(characterTwo.position.z > 2, 'but not that much');
        assert(characterTwo.position.x < 5, 'Should increase x position');
        assert(characterTwo.position.x > 2, 'but not that much');
        emitter.off('characterUpdate', testFn);
        done();
      };
      emitter.on('characterUpdate', testFn);
      emitter.emit('newState', {
        action: ACTIONS.WALKING,
        owner: characterTwo.id,
        direction: { x: 0, z: 0},
      });
    });
  });

  describe('Epic fight!', () => {
    const characterOne = JSON.parse(JSON.stringify(axeGuy))
    const characterTwo = JSON.parse(JSON.stringify(archer));
    const characters = { 1: characterOne, 2: characterTwo };
    const emitter = eventEmitter();
    const applier = new ActionApplier(emitter, characters);

    it('1. Axe should hit', (done) => {
      const testFn = (update) => {
        assert(update.aggressor === characterOne.id, 'Character one should be the aggressor');
        assert(update.character === characterTwo.id, 'Should update character two');
        assert(update.result === 'damaged' || update.result === 'block' || update.result === 'dodge');
        if (update.result === 'damaged') {
          assert(update.damage > 0, 'if damaged there should be damage');
        }
        emitter.off('characterUpdate', testFn);
        done();
      };
      emitter.on('characterUpdate', testFn);
      emitter.emit('newState', {
        action: ACTIONS.BASIC_ATTACK,
        owner: characterOne.id,
        target: characterTwo.id,
      });
    });

    it('2. Archer should flee', (done) => {
      const testFn = (update) => {
        assert(update.character === characterTwo.id, 'Should update character two');
        assert(update.result === 'walk', 'should be walking');
        assert(characterTwo.position.z > archer.position.z, 'Should increase z position');
        assert(characterTwo.position.x === archer.position.x, 'Should not increase x position');
        emitter.off('characterUpdate', testFn);
        done();
      };
      emitter.on('characterUpdate', testFn);
      emitter.emit('newState', {
        action: ACTIONS.WALKING,
        owner: characterTwo.id,
        direction: { x: 0, z: 20},
      });
    });

    it('3. Archer should be able to attack from the distance', (done) => {
      const testFn = (update) => {
        assert(update.aggressor === characterTwo.id, 'Character two should be the aggressor');
        assert(update.character === characterOne.id, 'Should update character one');
        assert(update.result === 'damaged' || update.result === 'block' || update.result === 'dodge');
        if (update.result === 'damaged') {
          assert(update.damage > 0, 'if damaged there should be damage');
        }
        emitter.off('characterUpdate', testFn);
        done();
      };
      emitter.on('characterUpdate', testFn);
      emitter.emit('newState', {
        action: ACTIONS.BASIC_ATTACK,
        owner: characterTwo.id,
        target: characterOne.id,
      });
    });

    it('4. Axe should try to hit but move instead', (done) => {
      const testFn = (update) => {
        assert(update.character === characterOne.id, 'Should update character one');
        assert(update.result === 'walk', 'Should be walking');
        assert(characterOne.position.z > axeGuy.position.z, 'Should increase z position');
        assert(characterOne.position.x === axeGuy.position.x, 'Should not increase x position');
        emitter.off('characterUpdate', testFn);
        done();
      };
      emitter.on('characterUpdate', testFn);
      emitter.emit('newState', {
        action: ACTIONS.BASIC_ATTACK,
        owner: characterOne.id,
        target: characterTwo.id,
      });
    });
  });
});