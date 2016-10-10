import { buildState } from './states';
import { vectorDistanceToVector, vectorAdd, vectorSub, mutiplyVectorFromScalar } from '../rules/math';
import { ACTIONS } from '../rules/BaseRuleBook';


export const TRANSITIONS = {
  attackOnRangeIfIDLE: 'attackOnRangeIfIDLE',
  attackWhenAttackedAndIDLE: 'attackWhenAttackedAndIDLE',
  attackWhenAttackedAndWalking: 'attackWhenAttackedAndWalking',
  fleeOnSight: 'fleeOnSight',
  uneasy: 'uneasy',
  idleAfterCollision: 'idleAfterCollision',
  stopAttackingWhenResultIdle: 'stopAttackingWhenResultIdle',
  resumeAttackAfterCollision: 'resumeAttackAfterCollision',
  idleAfterSpawn: 'idleAfterSpawn',
  attackOnCollision: 'attackOnCollision',
  dieAfterAttack: 'dieAfterAttack',
};

const transitions = {
  stopAttackingWhenResultIdle: {
    characterUpdate: {
      basicAttack: (fsm, event) => {
        if (event.character !== fsm.character.id &&
          event.type === ACTIONS.BASIC_ATTACK && event.result === ACTIONS.IDLE) {
          return buildState(ACTIONS.IDLE, { owner: fsm.state.owner });
        }
        return null;
      },
    },
  },
  attackOnRangeIfIDLE: {
    characterUpdate: {
      idle: (fsm, event) => {
        if (event.character !== fsm.character.id &&
          (event.action === ACTIONS.WALKING) &&
          vectorDistanceToVector(fsm.character.position, event.position) <= fsm.character.getViewRange()) {
          return buildState(ACTIONS.BASIC_ATTACK, { ...fsm.state, target: event.character});
        }
        return null;
      },
    },
  },
  attackWhenAttackedAndIDLE: {
    characterUpdate: {
      idle: (fsm, event) => {
        if (event.character === fsm.character.id && event.action === ACTIONS.BASIC_ATTACK) {
          return buildState(ACTIONS.BASIC_ATTACK, { ...fsm.state, target: event.aggressor });
        }
        return null;
      },
    },
  },
  attackWhenAttackedAndWalking: {
    characterUpdate: {
      walk: (fsm, event) => {
        if (event.character === fsm.character.id && event.action === ACTIONS.BASIC_ATTACK) {
          return buildState(ACTIONS.BASIC_ATTACK, { ...fsm.state, target: event.aggressor });
        }
        return null;
      },
    },
  },
  fleeOnSight: {
    characterUpdate: {
      '*': (fsm, event) => {
        if (event.character !== fsm.character.id &&
          vectorDistanceToVector(fsm.character.position, event.position) <= fsm.character.getViewRange()) {
          const direction = vectorSub(fsm.character.position, event.position);
          const fromPosition = vectorAdd(fsm.character.position, direction);
          const oppositeDirection = mutiplyVectorFromScalar(fromPosition, fsm.character.getMoveSpeed());
          return buildState(ACTIONS.WALKING, { ...fsm.state, direction: oppositeDirection});
        }
        return null;
      },
    },
  },
  uneasy: {
    '*': {
      idle: (fsm, event) => {
        const x = Math.random()*2 - 1;
        const z = Math.random()*2 - 1;
        const s = fsm.character.getMoveSpeed();
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
    },
  },
  resumeAttackAfterCollision: {
    characterUpdate: {
      basicAttack: (fsm, event) => {
        if (event.character === fsm.character.id && event.result === 'collision') {
          return buildState(ACTIONS.BASIC_ATTACK, { owner: fsm.state.owner, target: fsm.state.target });
        }
        return null;
      },
    },
  },
  idleAfterSpawn: {
    characterUpdate: {
      spawn: (fsm, event) => {
        if (event.character === fsm.character.id && event.result === 'spawn') {
          return buildState(ACTIONS.IDLE, { owner: fsm.state.owner });
        }
        return null;
      },
    },
  },
  attackOnCollision: {
    characterUpdate: {
      walk: (fsm, event) => {
        if (event.character === fsm.character.id && event.result === 'collision') {
          return buildState(ACTIONS.BASIC_ATTACK, {owner: fsm.state.owner, target: event.collidedWith});
        }
        return null;
      },
      infiniteWalk: (fsm, event) => {
        if (event.character === fsm.character.id && event.result === 'collision') {
          return buildState(ACTIONS.BASIC_ATTACK, { owner: fsm.state.owner, target: event.collidedWith });
        }
        return null;
      }
    }
  },
  dieAfterAttack: {
    characterUpdate: {
      basicAttack: (fsm, event) => {
        if (event.character === fsm.character.id && event.action === ACTIONS.BASIC_ATTACK) {
          return buildState(ACTIONS.DIE, { owner: fsm.state.owner});
        }
        return null;
      }
    }
  }
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
  const transitionTable = {};
  names.forEach((name) => {
    if (!transitions[name]) {
      throw new Error(`No transition trigger by the name: ${name}`);
    }
    const transition = transitions[name];
    deepMixin(transitionTable, transition);
  });
  return transitionTable;
};

export default buildTransitionTable;
