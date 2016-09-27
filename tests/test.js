import eventEmitter from 'event-emitter';
import { assert } from 'chai';
import { STATES } from '../lib/FSM/states';
import { CharacterFSM } from '../lib/FSM/CharacterFSM';

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
  const emitter = eventEmitter();

    const cFSM = new CharacterFSM({}, emitter, transitions);
    let timeout = null;
    let resolved = false;
    new Promise((resolve, reject) => {
      console.log("holis")
      emitter.once('action', resolve);
      emitter.once('frula', reject);
      console.log("going to emit")
      emitter.emit('done');
      console.log("going to tick")
      const updated = cFSM.tick(new Date().getTime());
      console.log("IS UPDATED",updated);
      assert.isOk(updated, 'should have updated')
      timeout = setTimeout(() => {
        if (!resolved) {
          reject('Timedout!');
        }
        clearTimeout(timeout);
      }, 200);
    }).then(((state) => {
        resolved = true;
        //assert(state.action === 'DONE', 'should change state');

      }))
      .catch((error) => {
        assert.isNotOk(error,'Promise error');

      });