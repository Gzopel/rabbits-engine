import { assert } from 'chai';
import eventEmitter from 'event-emitter';

import { STATES } from '../lib/FSM/states';
import { CharacterFSM } from '../lib/FSM/CharacterFSM';

describe(__dirname, () => {
  it('Should create a character fsm', (done) => {
    const cFSM = new CharacterFSM({}, {}, {});
    assert(cFSM.state.action === STATES.IDLE, 'should start as idle');
    done();
  });

  describe('A fsm with a transition', () => {
    const transitions = {
      done: {
        IDLE: (fsm, event) => {
          return {
            id: fsm.state.id + 1,
            action: 'DONE',
          };
        },
      },
    };
    const emitter = eventEmitter();

    it('should ignore an event with no transitions', (done) => {
      const cFSM = new CharacterFSM({}, emitter, transitions);
      emitter.emit('not done', {});
      assert(cFSM.state.action === STATES.IDLE, 'should remind idle');
      done();
    });

    it('should transition with the correct event', (done) => {
      const cFSM = new CharacterFSM({}, emitter, transitions);
      emitter.emit('done', {});
      assert(cFSM.state.action === 'DONE', 'should change state');
      done();
    });
  });

  describe('On tick',() => {
    const transitions = {
      start: {
        IDLE: (fsm, event) => {
          return {
            id: 0, // using an int uuid so we can count
            action: 'STARTED',
            started: new Date().getTime(),
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

    it('should create a new state', (done) => {
      const cFSM = new CharacterFSM({}, emitter, transitions);
      emitter.emit('start', {});
      assert(cFSM.state.action === 'STARTED', 'should change state');
      const startedId = cFSM.state.id;
      for (let i = 1; i < 10; i++) {
        cFSM.tick(new Date().getTime());
        assert(cFSM.state.id === startedId + i, 'should have increased the id');
      }
      done();
    });
  });

  // TODO: test that emits action on transitions
});
