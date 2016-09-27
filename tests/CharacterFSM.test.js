import { assert } from 'chai';
import eventEmitter from 'event-emitter';

import { ACTIONS } from '../lib/rules/actions.js';
import { CharacterFSM } from '../lib/FSM/CharacterFSM';

describe(__dirname, () => {
  describe('A fsm with a transition ', () => {
    const transitions = {
      done: {
        IDLE: (fsm, event) => {
          return {
            id: fsm.state.id + 1,
            action: 'DONE',
            start:0,
          };
        },
      },
    };

    it('should ignore an event with no transitions', () => {
      const emitter = eventEmitter();
      const cFSM = new CharacterFSM(emitter, {}, transitions);
      let timeout = null;
      return new Promise((resolve, reject) => {
        emitter.once('stateChange', reject);
        emitter.emit('not_done', { event: 'not_done' });
        const updated = cFSM.tick(new Date().getTime() + 10);
        assert.isNotOk(updated, 'should have updated')
        timeout = setTimeout(() => {
          if (cFSM.state.action === ACTIONS.IDLE) {
            resolve();
          } else {
            reject('Shouldn\t have update!');
          }
          clearTimeout(timeout);
        }, 200);
      });
    });

    it('should transition and fire an event', () => {
      const emitter = eventEmitter();
      const cFSM = new CharacterFSM(emitter, {}, transitions);
      let timeout = null;
      let resolved = false;
      return new Promise((resolve, reject) => {
        emitter.once('stateChange', resolve);
        emitter.emit('done', { event: 'done' });
        const updated = cFSM.tick(new Date().getTime() + 10);
        assert.isOk(updated, 'should have updated')
        timeout = setTimeout(() => {
          if (!resolved) {
            reject('Timedout!');
          }
          clearTimeout(timeout);
        }, 200);
      }).then(((state) => {
        resolved = true;
        assert(state.action === 'DONE', 'should change state');
      }))
      .catch((error) => {
        assert.isNotOk(error, 'Promise error');
      });
    });
  });

  describe('On tick',() => {
    const transitions = {
      start: {
        IDLE: (fsm, event) => {
          return {
            id: 0, // using an int uuid so we can count
            action: 'STARTED',
            duration:0,
            next(fsm) {
              return {
                ...fsm.state,
                id: fsm.state.id + 1,
              };
            }
          };
        }
      },
    };
    const emitter = eventEmitter();

    it('should create a new next state', (done) => {
      const cFSM = new CharacterFSM(emitter, {}, transitions);
      emitter.emit('start', { event: 'start' });
      cFSM.tick(new Date().getTime() + 10);
      assert(cFSM.state.action === 'STARTED', 'should change state');
      const startedId = cFSM.state.id;
      for (let i = 1; i < 10; i++) {
        cFSM.tick(new Date().getTime() + (i * (10 + i)));
        assert(cFSM.state.id === startedId + i, 'should have increased the id');
      }
      done();
    });
  });
});
