import { assert } from 'chai';
import eventEmitter from 'event-emitter';

import ACTIONS from '../lib/rules/actions';
import ActionApplier from '../lib/rules/ActionApplier';

describe(__dirname, () => {
  const characterOne = {
    id:1,
    position: { x: 0, z: 1 },
    health: 7,
    items: {
      weapon: {
        range: 1,
        type:'AXE',
        damage: 4,
      },
    },
    sheet: {
      attributes: {
        physical: {
          strength: 2,
          dexterity: 2,
        },
      },
      abilities: {
        talents: {},
        skills: {
          melee: 2,
        },
      },
      maxHealth: 7,
    },
  };
  const characterTwo = {
    id:2,
    position: { x: 0, z: 2 },
    health: 7,
    items: {
      weapon: {
        range: 20,
        type:'BOW',
        damage: 7,
      },
    },
    sheet: {
      attributes: {
        physical: {
          dexterity: 2,
          stamina: 3,
        },
      },
      abilities: {
        talents: {
          athletics: 2,
          dodge: 2,
        },
        skills: {
          archery: 2,
        },
      },
      maxHealth: 7,
    },
  };
  const characters = { 1: characterOne, 2: characterTwo };
  describe('Epic fight!', () => {
    const emitter = eventEmitter();
    const applier = new ActionApplier(emitter, characters);

    it('Axe should hit', (done) => {
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
      emitter.on('characterUpdate',testFn);
      emitter.emit('newState',{
        action: ACTIONS.BASIC_ATTACK,
        owner: characterOne.id,
        target: characterTwo.id,
      });
    });

    it('Archer should flee', (done) => {
      const archerOldZ = characterTwo.position.z;
      const testFn = (update) => {
        assert(update.character === characterTwo.id, 'Should update character two');
        assert(update.result === 'walk');
        assert(characterTwo.position.z > archerOldZ, 'Should increase z position')
        assert(characterTwo.position.x === 0, 'Should not increase x position')
        emitter.off('characterUpdate', testFn);
        done();
      };
      emitter.on('characterUpdate',testFn);
      emitter.emit('newState',{
        action: ACTIONS.WALKING,
        owner: characterTwo.id,
        direction: { x: 0, z: 20},
      });
    });

    it('Archer should be able to attack from the distance', (done) => {
      const archerOldZ = characterTwo.position.z;
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
      emitter.on('characterUpdate',testFn);
      emitter.emit('newState',{
        action: ACTIONS.BASIC_ATTACK,
        owner: characterTwo.id,
        target: characterOne.id,
      });
    });

    it('Axe should try to hit but move instead', (done) => {
      const axeOldZ = characterOne.position.z;
      const testFn = (update) => {
        assert(update.character === characterOne.id, 'Should update character one');
        assert(update.result === 'walk');
        assert(characterOne.position.z > axeOldZ, 'Should increase z position')
        assert(characterOne.position.x === 0, 'Should not increase x position')
        emitter.off('characterUpdate', testFn);
        done();
      };
      emitter.on('characterUpdate',testFn);
      emitter.emit('newState',{
        action: ACTIONS.BASIC_ATTACK,
        owner: characterOne.id,
        target: characterTwo.id,
      });
    });
  });
});