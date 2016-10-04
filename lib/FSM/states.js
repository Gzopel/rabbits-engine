import uuid from 'uuid';
import { ACTIONS } from '../rules/RuleBook';

const states = {};
states[ACTIONS.IDLE] = {
  action: ACTIONS.IDLE,
  duration: 40,
  next(fsm) { return fsm.state },
  // return itself cause its never done and should emit new events out of it
};
states[ACTIONS.WALKING] = {
  action: ACTIONS.WALKING,
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
  // target: characterUUID
  next: (fsm) => {
    return buildState(ACTIONS.BASIC_ATTACK, fsm.state);
  },
};

export const buildState = (stateName, options) => {
  if (!states[stateName]) {
    throw new Error(`No state by the name: ${stateName}`);
  }
  return {
    ...options,
    ...states[stateName],
    id: uuid.v4(),
  };
}

export default buildState;
