import { vectorDistanceToVector, vectorSub, vectorAdd, normalizeVector, mutiplyVectorFromScalar, distanceToVector } from './math';

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

const calculateFirstCollisionPosition = (character, nextPosition, characters) => {
  let collisionDistance = 0;
  let collider = null;
  let collision = null;
  let collisionRadius = 0;
  const distance = vectorDistanceToVector(character.position, nextPosition);
  for (const other of characters.values()) { // mmmm...
    // collision radius
    const r = other.radius || 2;
    if (other.position) { //this is an ugly hack for players that haven't spawned yet.
      const d = distanceToVector(other.position, character.position, nextPosition);
      if (character.id !== other.id && d < r) {
        const otherToNext = vectorDistanceToVector(other.position, nextPosition);
        // if otherToNext > distance we are going in the other direction
        // maybe there is a cheaper way to calculate this, but this works.
        if (distance > otherToNext && (collision == null || d < collisionDistance)) {
          collision = other.position;
          collisionDistance = d;
          collisionRadius = r;
          collider = other;
        }
      }
    }
  };
  return collision ? {
    position: calculateMovePosition(collision, character.position, collisionRadius),
    collider: collider,
  } : null; // step back
}

const outOfMapCoords = (position, map) => (position.x > map.size.x || position.x < 0
|| position.z > map.size.z || position.z < 0 )


export class BaseRuleBook{
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
    return this._doWalk(character, position, this.characters, this.map);
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
    const distance = vectorDistanceToVector(characterOne.position, characterTwo.position);
    const weaponRange = characterOne.get('items.weapon.range') || 2;
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
      position: character.position,
      orientation: character.orientation,
      result: 'shoot',
      duration: 500,
    }];
  }

  die(state) {
    return [{
      action: ACTIONS.DIE,
      character: state.owner,
      result: ACTIONS.DIE,
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
  
  _doWalk(character, destination, characters, map) {
    if (!destination) {
      const from = character.position;
      const orientation = character.orientation;
      const moveSpeed = character.getMoveSpeed();
      destination = vectorAdd(from, mutiplyVectorFromScalar(orientation, moveSpeed));
    }
    const nextPosition = calculateWalkPosition(character, destination, map);
    const orientation = calculateOrientation(character.position,nextPosition);
    const exit = calculateFirstCollisionPosition(character, nextPosition, new Set(map.exits));//HACK!
    if (exit) {
      return [{
        action: 'walk',
        character: character.id,
        result: 'warp',
        destination: exit.collider.destination,
        orientation: orientation,
        position: nextPosition,
        duration: 0,
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
        duration: 100,
      }];
    }
    return [{
      action: 'walk',
      character: character.id,
      orientation: orientation,
      result: 'walk',
      position: nextPosition,
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
