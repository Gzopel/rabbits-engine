import uuid from 'uuid';

export const STATES = {
  IDLE: 'IDLE',
  WALKING: 'WALKING',
  BASIC_ATTACK: 'BASIC_ATTACK',
};

// TODO: we are definin duration on states, but this shuould be computed when action gets processed. 
// This might be a source of bugs since the FSM checks for the value that other is updating asynchronously. 
const states = {
  IDLE: {
    action: STATES.IDLE,
    duration: 0,
    next() { return this}, // return itself cause its never done and should emit new events out of it
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
  BASIC_ATTACK: {
    action: STATES.BASIC_ATTACK,
    duration: 0,
    //target: characterUUID
    next: () => { // TODO: we might want to make it so it keeps attacking but that will make us access the global characters
                  // to check if player is dead or gone for some other reason
      return buildState(STATES.IDLE);
    }
  }
}

export const buildState = (stateName, options) => {
  if (!states[stateName]) {
    throw new Error(`No state by the name: ${stateName}`);
  }
  return {
    ...states[stateName],
    ...options,
    start: new Date().getTime(),// TODO: we set a start time but in most cases this gets stored and then clobbered, there should be a better approach
    id: uuid.v4(),
  };
}

export default buildState;
