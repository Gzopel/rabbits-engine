import { vectorDistanceToVector,
  vectorSub,
  vectorAdd,
  normalizeVector,
  mutiplyVectorFromScalar,
  angleFromVectors,
} from './math';

/*
 *  Here is were higher level rules are applied. This is the base class,
 *  intended to be used by the clients, no dice are rolled and actions are idempotent.
 * */


const calculateOrientation = (from, to) => {
  const direction = vectorSub(to, from);
  const normalized = normalizeVector(direction);
  return normalized;
};

const calculateMovePosition = (from, to, moveSpeed) => {
  if (vectorDistanceToVector(from, to) <= moveSpeed) {
    return to;
  }
  const orientation = calculateOrientation(from, to);
  const result = vectorAdd(from, mutiplyVectorFromScalar(orientation, moveSpeed));
  return result;
}

const calculateWalkPosition = (character, position) => {
  const speed = character.getMoveSpeed();
  return calculateMovePosition(character.position, position, speed);
};

const calculateFirstCollisionPosition = (character, nextPosition, collidables) => {
  let collisionDistance = 0;
  let collider = null;
  let collision = null;
  let collisionRadius = 0;
  const minAngle = Math.PI / 2;
  const maxAngle = 3 * Math.PI / 2;
  for (const other of collidables.values()) { // mmmm...
    if (character.collidesWith(other)) {
      // collision radius
      const r = other.radius + character.radius;
      if (other.position) { // this is an ugly hack for players that haven't spawned yet.
        // const d = distanceToVector(other.position, character.position, nextPosition);
        // since we do step by step the below logic works fine,
        const d = vectorDistanceToVector(other.position, nextPosition);
        if (d < r) {
          const directionToNext = calculateOrientation(character.position, nextPosition);
          const directionToOther = calculateOrientation(character.position, other.position);
          const angle = angleFromVectors(directionToNext, directionToOther);
          // This angle stuff is to only consider the collision if other is in the way
          if ((angle < minAngle || angle > maxAngle) && (collision == null || d < collisionDistance)) {
            collision = other.position;
            collisionDistance = d;
            collisionRadius = r;
            collider = other;
          }
        }
      }
    }
  }
  return collision ? {
    position: calculateMovePosition(collision, character.position, collisionRadius), // step back
    collider: collider,
  } : null;
}

const outOfMapCoords = (position, map) => (position.x > map.size.x || position.x < 0
                                        || position.z > map.size.z || position.z < 0 )


var destinationFromOrientation = (character, walkOrientation) => {
  const from = character.position;
  const orientation = walkOrientation || character.orientation;
  const moveSpeed = character.getMoveSpeed();
  const destination = vectorAdd(from, mutiplyVectorFromScalar(orientation, moveSpeed));
  return destination;
};

export class BaseRuleBook {
  constructor(map, characters) {
    this.characters = characters;
    this.map = map;
  }

  execute = (state) => {
    if (!this[state.action]) {
      return [];
    }
    return this[state.action] && this[state.action](state);
  }

  walk = (state) => {
    const character = this.characters.get(state.owner);
    const position = state.direction;
    return this._doWalk(character, position, this.characters, this.map, state.orientation);
  }

  basicAttack = (state) => {
    const characterOne = this.characters.get(state.owner);
    if (!characterOne)
      return [];
    const characterTwo = this.characters.get(state.target);
    if (!characterTwo) {
      return [{
        action: ACTIONS.BASIC_ATTACK,
        duration: 0,
        result: ACTIONS.IDLE,
        character: characterOne.id,
        aggressor: characterOne.id,
      }];
    }
    const distance = vectorDistanceToVector(characterOne.position, characterTwo.position) - ( characterOne.radius +characterTwo.radius);
    const weaponRange = characterOne.get('items.weapon.range') || 4;
    if (distance <= weaponRange) {
      return this._doAttack(characterOne, characterTwo);
    }
    return this._doWalk(characterOne, characterTwo.position, this.characters, this.map);
  }

  shoot(state) {
    const character = this.characters.get(state.owner);
    return [{
      action: ACTIONS.SHOOT,
      character: state.owner,
      position: destinationFromOrientation(character),
      orientation: character.orientation,
      result: 'shoot',
      duration: 500,
    }];
  }

  die(state) { // this is just silly
    return [{
      action: ACTIONS.DIE,
      character: state.owner,
      result: ACTIONS.IDLE,
      remainingHealth: 0,
      duration: 0,
    }];
  }

  _doAttack(characterOne, characterTwo) {
    const attackDuration = 1000 / characterOne.getAttackSpeed();
    return [{
      action: ACTIONS.BASIC_ATTACK,
      character: characterTwo.id,
      result: 'damaged',
      damage: 0,
      aggressor: characterOne.id,
      remainingHealth: characterTwo.health,
      duration: attackDuration,
    }];
  }
  
  _doWalk(character, destination, characters, map, walkOrientation) {
    if (!destination) {
      destination = destinationFromOrientation(character, walkOrientation);
    }
    const nextPosition = calculateWalkPosition(character, destination, map);
    const orientation = calculateOrientation(character.position, nextPosition);
    const exit = calculateFirstCollisionPosition(character, nextPosition, new Set(map.exits));//HACK!
    if (exit) {
      return [{
        action: 'walk',
        character: character.id,
        result: 'warp',
        destination: exit.collider.destination,
        orientation: orientation,
        position: nextPosition,
        speed: character.getMoveSpeed(),
        duration: 100,
      }];
    }
    const collision = calculateFirstCollisionPosition(character, nextPosition, characters);
    if (collision) {
      return [{
        action: 'walk',
        character: character.id,
        result: 'collision',
        position: collision.position,
        collidedWith: collision.collider.id,
        orientation: orientation,
        speed: character.getMoveSpeed(),
        duration: 100,
      }];
    }
    if (outOfMapCoords(nextPosition, map)) {
      return [{
        action: 'walk',
        character: character.id,
        result: 'collision',
        orientation: orientation,
        position: {
          x: Math.max(0, Math.min(nextPosition.x, map.size.x)),
          z: Math.max(0, Math.min(nextPosition.z, map.size.z)),
        },
        speed: character.getMoveSpeed(),
        duration: 100,
      }];
    }
    return [{
      action: 'walk',
      character: character.id,
      orientation: orientation,
      result: 'walk',
      position: nextPosition,
      speed: character.getMoveSpeed(),
      duration: 100,
    }];
  }
};

export const ACTIONS = {
  BASIC_ATTACK: 'basicAttack',
  DIE: 'die',
  IDLE: 'idle',
  SHOOT: 'shoot',
  SPAWN: 'spawn',
  WALKING: 'walk',
};

export default BaseRuleBook;
