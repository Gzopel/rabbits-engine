import { assert } from 'chai';
import eventEmitter from 'event-emitter';

import ACTIONS from '../lib/rules/actions';
import { buildState } from '../lib/FSM/states';
import { PlayerFSM } from '../lib/FSM/PlayerFSM';

describe(__dirname, () => {
  describe('A playerFSM working as an action queue', () => {
    it('should receive actions and excuted them in each tick', (done) => {
      const pFSM = new PlayerFSM({}, {});
      for (let i = 1; i < 10; i++) {
        pFSM.newAction({
          id: i,
          action: 'FAKE_ACTION',
          duration: 0,
          start: 0,
        });
      }
      const start = new Date().getTime();
      for (let i = 1; i < 10; i++) {
        pFSM.tick(new Date().getTime() + (i * (10 + i)))
        assert(pFSM.state.id === i, 'correct id');
        assert(pFSM.state.start > start, 'positive start');
      }
      done();
    });
  });

  describe('A walking player ', () => {
    const transitions = {
      start: {
        IDLE: () => {
          return buildState(ACTIONS.WALKING, { direction: { x: 5, z: 0 } });
        },
      },
    };
    const emitter = eventEmitter();

    it('should keep walking until it reaches the target', (done) => {
      const character = { position:{ x: 0, z: 0 } };
      const cFSM = new PlayerFSM(emitter, character, transitions);
      emitter.emit('start', { event: 'start' });
      cFSM.tick(new Date().getTime()+10);
      assert(cFSM.state.action === ACTIONS.WALKING, 'should change state');
      let steps = 0;
      while (cFSM.state.action === ACTIONS.WALKING) {
        assert.isBelow(steps, 5);
        steps++;
        character.position.x++;
        cFSM.tick(new Date().getTime() + (steps * (10 + steps)));
      }
      assert(cFSM.state.action === ACTIONS.IDLE, 'should change state');
      assert(character.position.x === 5, 'should complete the walk')
      done();
    })

    it('should keep walking until it reaches the target', (done) => {
      const character = { position: { x: 0, z: 0 } };
      const cFSM = new PlayerFSM(emitter, character, transitions);
      emitter.emit('start', { event: 'start' });
      cFSM.tick(new Date().getTime() + 10);
      assert(cFSM.state.action === ACTIONS.WALKING, 'should change state');
      let steps = 0;
      while(cFSM.state.action === ACTIONS.WALKING) {
        steps++;
        character.position.x++;
        if (steps === 3) {
          cFSM.newAction(buildState(ACTIONS.BASIC_ATTACK), { target:12321 });
        }
        cFSM.tick(new Date().getTime() + (steps * (10 + steps)));
      }
      assert(cFSM.state.action === ACTIONS.BASIC_ATTACK, 'should change state');
      assert(character.position.x === 3, 'shouldn\'t complete the walk')
      done();
    })
  })

});