import { buildState } from './states';
import { vectorDistanceToVector, vectorAdd, vectorSub, mutiplyVectorFromScalar } from '../rules/math';
import { ACTIONS, viewRange, moveSpeed } from '../rules/rules';


export const TRIGGERS = {
  attackOnRangeIfIDLE: 'attackOnRangeIfIDLE',
  attackWhenAttackedAndIDLE: 'attackWhenAttackedAndIDLE',
  attackWhenAttackedAndWalking: 'attackWhenAttackedAndWalking',
  fleeOnSight: 'fleeOnSight',
  uneasy: 'uneasy',
  idleAfterCollision: 'idleAfterCollision',
  stopAttackingWhenResultIdle: 'stopAttackingWhenResultIdle',
};

const triggers = {
  stopAttackingWhenResultIdle: {
    characterUpdate: {
      basicAttack: (fsm, event) => {
        if (event.character !== fsm.character.id &&
          event.type === ACTIONS.BASIC_ATTACK && event.result === ACTIONS.IDLE) {
          return buildState(ACTIONS.IDLE, { owner: fsm.state.owner });
        }
        return null;
      }
    }
  },
  attackOnRangeIfIDLE: {
    characterUpdate: {
      idle: (fsm, event) => {
        if (event.character !== fsm.character.id &&
          (event.result === 'walk' || event.result === 'collision') &&
          vectorDistanceToVector(fsm.character.position, event.position) <= viewRange(fsm.character)) {
          return buildState(ACTIONS.BASIC_ATTACK, { ...fsm.state, target: event.character});
        };
        return null;
      },
    },
  },
  attackWhenAttackedAndIDLE: {
    characterUpdate: {
      idle: (fsm, event) => {
        if ( event.character === fsm.character.id &&
          (event.result === 'damaged' || event.result === 'dodge' || event.result === 'block')) {
          return buildState(ACTIONS.BASIC_ATTACK, { ...fsm.state, target: event.aggressor});
        };
        return null;
      },
    },
  },
  attackWhenAttackedAndWalking: {
    characterUpdate: {
      walk: (fsm, event) => {
        if ( event.character === fsm.character.id &&
          (event.result === 'damaged' || event.result === 'dodge' || event.result === 'block')) {
          return buildState(ACTIONS.BASIC_ATTACK, { ...fsm.state, target: event.aggressor});
        };
        return null;
      },
    },
  },
  fleeOnSight: {
    characterUpdate: {
      '*': (fsm, event) => {
        if (event.character !== fsm.character.id &&
          vectorDistanceToVector(fsm.character.position, event.position) <= viewRange(fsm.character)) {
          const direction = vectorSub(fsm.character.position, event.position);
          const fromPosition = vectorAdd(fsm.character.position, direction);
          const oppositeDirection = mutiplyVectorFromScalar(fromPosition, moveSpeed(fsm.character));
          return buildState(ACTIONS.WALKING, { ...fsm.state, direction: oppositeDirection});
        };
        return null;
      },
    },
  },
  uneasy: {
    '*': {
      idle: (fsm, event) => {
        const x = Math.random()*2 - 1;
        const z = Math.random()*2 - 1;
        const s = moveSpeed(fsm.character);
        return buildState(ACTIONS.WALKING, { ...fsm.state, direction: { x: x * s, z: z * s }});
      },
    },
  },
  idleAfterCollision: {
    characterUpdate: {
      walk: (fsm, event) => {
        if (event.character === fsm.character.id && event.result === 'collision') {
          return buildState(ACTIONS.IDLE, { owner: fsm.state.owner });
        }
        return null;
      },
      basicAttack: (fsm, event) => {
        if (event.character === fsm.character.id && event.result === 'collision') {
          return buildState(ACTIONS.BASIC_ATTACK, { owner: fsm.state.owner, target: fsm.state.target });
        }
        return null;
      },
    },
  },
};

const deepMixin = (receiving, giving) => {
  Object.keys(giving).forEach((event) => {
    if (!receiving[event]) {
      receiving[event] = {};
    }
    Object.keys(giving[event]).forEach((state) => {
      if (!receiving[event][state]) {
        receiving[event][state] = [giving[event][state]];
      } else {
        receiving[event][state] = [].concat(receiving[event][state],giving[event][state]);
      }
    })
  });
};

export const buildTransitionTable = (triggerNames) => {
  const names = [].concat(triggerNames).sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
  const transitions = {};
  names.forEach((name) => {
    if (!triggers[name]) {
      throw new Error(`No transition trigger by the name: ${name}`);
    }
    const transition = triggers[name];
    deepMixin(transitions,transition);
  });
  return transitions;
};

export default buildTransitionTable;
