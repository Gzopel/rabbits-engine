import uuid from 'uuid';

export const STATES = {
  IDLE: 'IDLE',
};

const states = {
  IDLE: {
    action: STATES.IDLE,
    start: new Date().getTime(),
    duration: 0,
    next() { return this}, // return itself cause its never done
  },
}

export const buildState = (stateName) => {
  if (!states[stateName]) {
    throw new Error(`No state by the name: ${stateName}`);
  }
  return {
    ...states[stateName],
    id: uuid.v4(),
  };
}

export default buildState;
