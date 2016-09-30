import { ACTIONS, buildState } from './states';
import { vectorDistanceToVector, vectorInvert, vectorSub } from '../rules/math';
import { viewRange, moveSpeed } from '../rules/rules';


export const TRIGGERS = {
  attackOnRangeIfIDLE: 'attackOnRangeIfIDLE',
  attackWhenAttackedAndIDLE: 'attackWhenAttackedAndIDLE',
  attackWhenAttackedAndWalking: 'attackWhenAttackedAndWalking',
  fleeOnSight: 'fleeOnSight',
  unEasy: 'unEasy',
};

const triggers = {
  attackOnRangeIfIDLE: {
    characterUpdate: {
      idle: (fsm, event) => {
        if ( event.character !== fsm.character.id &&
          (event.result === 'walk' || event.result === 'collision') &&
          vectorDistanceToVector(fsm.character.position, event.position) <= viewRange(fsm.character)){
          return buildState(ACTIONS.BASIC_ATTACK, { ...fsm.state, target: event.character});
        }
        return null;
      }
    }
  },
  attackWhenAttackedAndIDLE: {
    characterUpdate: {
      idle: (fsm, event) => {
        if ( event.character === fsm.character.id &&
          (event.result === 'hit' || event.result === 'dodge' || event.result === 'block')){
          return buildState(ACTIONS.BASIC_ATTACK, { ...fsm.state, target: event.aggressor});
        }
        return null;
      }
    }
  },
  attackWhenAttackedAndWalking: {
    characterUpdate: {
      walking: (fsm, event) => {
        if ( event.character === fsm.character.id &&
          (event.result === 'hit' || event.result === 'dodge' || event.result === 'block')){
          return buildState(ACTIONS.BASIC_ATTACK, { ...fsm.state, target: event.aggressor});
        }
        return null;
      }
    }
  },
  fleeOnSight: {
    characterUpdate: {
      '*': (fsm, event) => {
        if ( event.character !== fsm.character.id &&
          (event.result === 'walk' || event.result === 'collision') &&
          vectorDistanceToVector(fsm.character.position, event.position) <= viewRange(fsm.character)){
          const oppositeDirection = vectorInvert(vectorSub(fsm.character.position, event.position));
          return buildState(ACTIONS.WALKING, { ...fsm.state, direction: oppositeDirection});
        }
        return null;
      }
    }
  },
  unEasy: {
    '*': {
      idle: (fsm, event) => {
        const x = Math.random();
        const z = 1 - x;
        const s = moveSpeed(fsm.character);
        return buildState(ACTIONS.WALKING, { ...fsm.state, direction: { x: x * s, z: z * s }});
      }
    }
  },
}

const deepMixin = (receiving, giving) => {
  Object.keys(giving).forEach((event)=>{
    if (!receiving[event]) {
      receiving[event] = giving[event];
    } else {
      receiving[event] = {
        ...receiving[event],
        ...giving[event]
      };
    };
  });
};

export const buildTransitionTable = (triggerNames) => {
  const names = [].concat(triggerNames);
  const transitions = {};
  names.forEach((name)=>{
    if (!triggers[name]) {
      throw new Error(`No transition trigger by the name: ${name}`);
    }
    const transition = triggers[name];
    deepMixin(transitions,transition);
  });
  return transitions;
};

export default buildTransitionTable;
