import { assert } from 'chai';
import { EventEmitter2 } from 'eventemitter2';

import { ACTIONS } from '../lib/rules/BaseRuleBook';
import { buildState } from '../lib/FSM/states';
import { PlayerFSM } from '../lib/FSM/PlayerFSM';
import { TRANSITIONS } from '../lib/FSM/transitions';

describe(__filename, () => {
  describe('A playerFSM working as an action queue', () => {
    it('should ignore actions until it has spwaned', () => {
      const timestamp = new Date().getTime()+200;
      const pFSM = new PlayerFSM({}, { id: 1 });
      pFSM.newAction({
        character: 1,
        type: ACTIONS.WALKING,
        direction: { x: 10 , z: 10 },
      });
      assert(pFSM.tick(timestamp), 'should update');
      assert(pFSM.state.action === ACTIONS.SPAWN, 'should still be spawning');
    });

    it('should receive actions and executed them in each tick', (done) => {
      const emitter = new EventEmitter2();
      const pFSM = new PlayerFSM(emitter, { id: 1 });
      let timestamp = new Date().getTime();
      pFSM.setState(buildState(ACTIONS.IDLE, { owner: 1 },timestamp));
      for (let i = 1; i < 10; i++) {
        pFSM.newAction({
          actionId: i,
          character: 1,
          type: ACTIONS.WALKING,
          direction: { x: 10 * i, z: 10 * i },
        });
      }
      const start = new Date().getTime();
      for (let i = 1; i < 10; i++) {
        timestamp += 100;
        pFSM.tick(timestamp);
        assert(pFSM.state.actionId === i, 'correct id');
        assert(pFSM.state.start > start, 'positive start');
      }
      done();
    });
  });

  describe('A walking player', () => {
    const transitions = {
      start: {
        idle: [() => {
          return buildState(ACTIONS.WALKING, { direction: { x: 5, z: 0 } });
        }],
      },
    };
    const emitter = new EventEmitter2();

    it('should keep walking until it reaches the target', (done) => {
      const timestamp = new Date().getTime();
      const character = { id: 1, position: { x: 0, z: 0 } };
      const cFSM = new PlayerFSM(emitter, character, transitions);
      cFSM.setState(buildState(ACTIONS.IDLE),timestamp);
      emitter.emit('start', { type: 'start' });
      cFSM.tick(timestamp + 100);
      assert(cFSM.state.action === ACTIONS.WALKING, 'should change state');
      let steps = 0;
      while (cFSM.state.action === ACTIONS.WALKING) {
        assert.isBelow(steps, 5);
        steps++;
        character.position.x++;
        cFSM.tick(timestamp + (steps * 200));
      }
      assert(cFSM.state.action === ACTIONS.IDLE, 'should change state');
      assert(character.position.x === 5, 'should complete the walk')
      done();
    })

    it('should keep walking until a new actions is queued', (done) => {
      const timestamp = new Date().getTime();
      const character = { id: 1, position: { x: 0, z: 0 } };
      const cFSM = new PlayerFSM(emitter, character, transitions);
      cFSM.setState(buildState(ACTIONS.IDLE),timestamp);
      emitter.emit('start', { type: 'start' });
      cFSM.tick(timestamp + 100);
      assert(cFSM.state.action === ACTIONS.WALKING, 'should change state');
      let steps = 0;
      while(cFSM.state.action === ACTIONS.WALKING) {
        steps++;
        if (steps === 3) {
          cFSM.newAction({
            type: ACTIONS.BASIC_ATTACK,
            target: 12321,
            character: character.id,
          });
        }
        cFSM.tick(timestamp + 200);
      }
      assert(cFSM.state.action === ACTIONS.BASIC_ATTACK, 'should change state');
      done();
    })
  })
});