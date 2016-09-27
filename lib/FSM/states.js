import uuid from 'uuid';

export const STATES = {
  IDLE: 'IDLE',
  WALKING: 'WALKING',
};

const states = {
  IDLE: {
    action: STATES.IDLE,
    duration: 0,
    next() { return this}, // return itself cause its never done
  },
  WALKING: {
    action: STATES.WALKING,
    duration: 0,
    direction: { x:0, z:0},
    next: (fsm) => { 
      const p = fsm.character.position;
      if (p.x === fsm.state.direction.x && p.z === fsm.state.direction.z)
        return buildState(STATES.IDLE);
      return buildState(STATES.WALKING, fsm.state);
    },
  },
}

export const buildState = (stateName, options) => {
  if (!states[stateName]) {
    throw new Error(`No state by the name: ${stateName}`);
  }
  return {
    ...states[stateName],
    ...options,
    start: new Date().getTime(),
    id: uuid.v4(),
  };
}

export default buildState;
