import uuid from 'uuid';
import { ACTIONS } from '../rules/BaseRuleBook';

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
    if (fsm.state.orientation || (fsm.state.direction &&
      p.x === fsm.state.direction.x && p.z === fsm.state.direction.z)) {
      return buildState(ACTIONS.IDLE, { owner: fsm.state.owner });
    }
    return buildState(ACTIONS.WALKING, fsm.state);
  },
};
states['infiniteWalk'] = { //first state that doesn't correspond directly with an action, pattern starts to crumble.
  action: ACTIONS.WALKING,
  next: (fsm) => {
    return buildState('infiniteWalk', fsm.state);
  },
};
states[ACTIONS.BASIC_ATTACK] = {
  action: ACTIONS.BASIC_ATTACK,
  // target: characterUUID
  next: (fsm) => {
    return buildState(ACTIONS.BASIC_ATTACK, fsm.state);
  },
};
states[ACTIONS.SHOOT] = {
  action: ACTIONS.SHOOT,
  // target: characterUUID
  next: (fsm) => {
    return buildState(ACTIONS.IDLE, fsm.state);
  },
};

states[ACTIONS.SPAWN] = {
  action: ACTIONS.SPAWN,
  duration: 0,
  next: (fsm) => {
    return buildState(ACTIONS.SPAWN, { owner: fsm.state.owner });
  },
};
states[ACTIONS.DIE] = {
  action: ACTIONS.DIE,
  duration: 0,
  next: (fsm) => {
    return buildState(ACTIONS.DIE, { owner: fsm.state.owner });
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
