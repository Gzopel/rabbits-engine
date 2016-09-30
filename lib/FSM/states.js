import uuid from 'uuid';
import { ACTIONS } from '../rules/rules';

// TODO: we are defining duration on states, but this shuould be computed when action gets processed.
// This might be a source of bugs since the FSM checks for the value that other is updating asynchronously.
const states = {};
states[ACTIONS.IDLE] = {
  action: ACTIONS.IDLE,
  duration: 0,
  next() { return this},
  // return itself cause its never done and should emit new events out of it
};
states[ACTIONS.WALKING] = {
  action: ACTIONS.WALKING,
  duration: 0,
  direction: { x: 0, z: 0},
  next: (fsm) => {
    const p = fsm.character.position;
    if (p.x === fsm.state.direction.x && p.z === fsm.state.direction.z) {
      return buildState(ACTIONS.IDLE, { owner: fsm.state.owner });
    }
    return buildState(ACTIONS.WALKING, fsm.state);
  },
};
states[ACTIONS.BASIC_ATTACK] = {
  action: ACTIONS.BASIC_ATTACK,
  duration: 0,
  //target: characterUUID
  next: (fsm) => {
    // Keeps attacking the stop logic should be manage as a transition on event update
    return buildState(ACTIONS.BASIC_ATTACK, fsm.state);
  },
};

export const buildState = (stateName, options) => {
  if (!states[stateName]) {
    throw new Error(`No state by the name: ${stateName}`);
  }
  return {
    id: uuid.v4(),
    ...states[stateName],
    ...options,
    start: new Date().getTime(),
    // TODO: we set a start time but in most cases this gets stored and then clobbered,
    // there should be a better approach
  };
}

export default buildState;
