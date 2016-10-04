import rollDice from './dice';
import { vectorDistanceToVector, vectorSub, vectorAdd, noramilzeVector, mutiplyVectorFromScalar, distanceToVector } from './math';

/*
 *  Here is were higher level rules are applied and dice are rolled.
 * */

const doAttack = (characterOne, characterTwo) => {
  const hitDices = characterOne.getBasicAttackHitDices();
  // considering single weapon for now
  const hitDifficulty = characterOne.get('items.weapon.difficulty') || 6;
  const hitRoll = rollDice(hitDices, hitDifficulty).total;
  const attackDuration = 1000 / characterOne.getAttackSpeed();
  if (hitRoll < 1) {
    return [{
      action:  ACTIONS.BASIC_ATTACK,
      character: characterTwo.id,
      result: 'missed',
      aggressor: characterOne.id,
      duration: attackDuration,
    }];
  }
  const dodgeDices = characterTwo.getDodgeDices();
  const dodgeTotal = rollDice(dodgeDices, 7).total;
  const hitSuccess = hitRoll - dodgeTotal;
  if (hitSuccess < 1) {
    return [{
      action: ACTIONS.BASIC_ATTACK,
      character: characterTwo.id,
      result: 'dodge',
      aggressor: characterOne.id,
      duration: attackDuration,
    }];
  }
  const extraDamage = hitSuccess - 1;
  const weaponDamage = characterOne.getWeaponDamage();
  const armour = characterTwo.getArmour();
  const damageRoll = rollDice(weaponDamage + extraDamage, 7).total;
  const armourRoll = rollDice(armour, 7).total;
  const effectiveDamage = Math.max(0, damageRoll - armourRoll);
  if (effectiveDamage < 1) {
    return [{
      action: ACTIONS.BASIC_ATTACK,
      character: characterTwo.id,
      result: 'block',
      aggressor: characterOne.id,
      duration: attackDuration,
    }];
  }
  return [{
    action: ACTIONS.BASIC_ATTACK,
    character: characterTwo.id,
    result: 'damaged',
    damage: effectiveDamage,
    aggressor: characterOne.id,
    remainingHealth: characterTwo.health - effectiveDamage,
    duration: attackDuration,
  }];
}

const calculateMovePosition = (from, to, moveSpeed) => {
  if (vectorDistanceToVector(from, to) <= moveSpeed) {
    return to;
  }
  const direction = vectorSub(to, from);
  const normalized = noramilzeVector(direction);
  const result = vectorAdd(from, mutiplyVectorFromScalar(normalized, moveSpeed));
  return result;
}

const calculateWalkPosition = (character, position) => {
  const speed = character.getMoveSpeed();
  return calculateMovePosition(character.position, position, speed);
};

const calculateFirstCollisionPosition = (character, nextPosition, characters) => {
  const r = 2; // collision radius
  let collisionDistance = 0;
  let collision = null;
  const distance = vectorDistanceToVector(character.position, nextPosition);
  for (const other of characters.values()) { // mmmm...
    const d = distanceToVector(other.position, character.position, nextPosition);
    if (character.id !== other.id && d < r) {
      const otherToNext = vectorDistanceToVector(other.position, nextPosition);
      // if otherToNext > distance we are going in the other direction
      // maybe there is a cheaper way to calculate this, but this works.
      if (distance > otherToNext && (collision == null || d < collisionDistance)) {
        collision = other.position;
        collisionDistance = d;
      }
    }
  };
  return collision ? calculateMovePosition(collision, character.position, r) : null; // step back
}

const outOfMapCoords = (position, map) => (position.x > map.size.x || position.x < 0
  || position.z > map.size.z || position.z < 0 )

const doWalk = (character, position, characters, map) => {
  const nextPosition = calculateWalkPosition(character, position, map);
  const collision = calculateFirstCollisionPosition(character, nextPosition, characters);
  if (collision) {
    return [{
      action: 'walk',
      character: character.id,
      result: 'collision',
      position: collision,
      duration: 100,
    }];
  }
  if (outOfMapCoords(nextPosition, map)) {
    return [{
      action: 'walk',
      character: character.id,
      result: 'collision',
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
    result: 'walk',
    position: nextPosition,
    duration: 100,
  }];
}

export class RuleBook {
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
    return doWalk(character, position, this.characters, this.map);
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
        aggressor: characterOne.id
      }];
    }
    const distance = vectorDistanceToVector(characterOne.position, characterTwo.position);
    const weaponRange = characterOne.get('items.weapon.range') || 2;
    if (distance <= weaponRange) {
      return doAttack(characterOne, characterTwo);
    }
    return doWalk(characterOne, characterTwo.position, this.characters, this.map);
  }
};

export const ACTIONS = {
  IDLE: 'idle',
  WALKING: 'walk',
  BASIC_ATTACK: 'basicAttack',
};

export default RuleBook;
