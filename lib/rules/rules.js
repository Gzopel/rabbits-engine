import rollDice from './dice';
import { vectorDistanceToVector, vectorSub, vectorAdd, noramilzeVector, mutiplyVectorFromScalar, distanceToVector } from './math';

const abilityForWeapon = (sheet, weaponType) => {
  switch (weaponType) {
    case 'BOW':
      return sheet.abilities.skills.archery;
    case 'SWORD':
    case 'DAGGER':
    case 'AXE':
    case 'CLUB':
      return sheet.abilities.skills.melee;
    default:
      return sheet.abilities.talent.brawl || 1;
  }
};

const damageTakenHandicap = (character) => {
  const damageTaken = character.sheet.maxHealth - character.health;
  return -Math.floor(damageTaken / 2);
};

const dexterityHandicap = (character) => {
  let handicap = damageTakenHandicap(character);
  Object.keys(character.items).forEach((itemKey) => {
    handicap -= character.items[itemKey].dexterityHandicap || 0;
  });
  return handicap;
};

const calculateWeaponDamage = (character) => {
  if (character.items.weapon.type === 'BOW') {
    return character.items.weapon.damage;
  }
  return character.items.weapon.damage + character.sheet.attributes.physical.strength;
};

const characterArmour = (character) => {
  let armour = character.sheet.attributes.physical.stamina;
  Object.keys(character.items).forEach((itemKey) => {
    armour += character.items[itemKey].armour || 0;
  });
  return armour;
};

const doAttack = (characterOne, characterTwo) => {
  const dexterityOne = characterOne.sheet.attributes.physical.dexterity;
  const dexterityTwo = characterTwo.sheet.attributes.physical.dexterity;
  const weapon = characterOne.items.weapon;
  const abilityOne = abilityForWeapon(characterOne.sheet, weapon.type);
  const abilityTwo = characterTwo.sheet.abilities.talents.dodge || 1;
  const hitDices = dexterityOne + abilityOne - dexterityHandicap(characterOne);
  const dodgeDices = dexterityTwo + abilityTwo - dexterityHandicap(characterTwo);
  const hitSuccess = rollDice(hitDices, weapon.difficulty).total - rollDice(dodgeDices, 7).total;
  if (hitSuccess < 1) {
    return [{
      character: characterTwo.id,
      result: 'dodge',
      aggressor: characterOne.id,
    }];
  }
  const extraDamage = hitSuccess - 1;
  const weaponDamage = calculateWeaponDamage(characterOne);
  const armour = characterArmour(characterTwo);
  const effectiveDamage = Math.min(0, rollDice(weaponDamage + extraDamage, 7).total - rollDice(armour, 7).total);
  if (effectiveDamage < 1) {
    return [{
      character: characterTwo.id,
      result: 'block',
      aggressor: characterOne.id,
    }];
  }
  return [{
    character: characterTwo.id,
    result: 'damaged',
    damage: effectiveDamage,
    aggressor: characterOne.id,
    remainingHealth: characterTwo.health - effectiveDamage,
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
  // TODO: this is not in the manual, find a better way of calculating move speed
  const moveSpeed = character.sheet.attributes.physical.dexterity + (character.sheet.abilities.talents.athletics || 0);
  return calculateMovePosition(character.position, position, moveSpeed);
};

export const viewRange = (character) => {
  return character.sheet.attributes.mental.perception + character.sheet.abilities.talents.alertness;
};

const calculateFirstCollisionPosition = (character, nextPosition, characters) => {
  const r = 2; // collision radius
  let collisionDistance = 0;
  let collision = null;
  const distance = vectorDistanceToVector(character.position, nextPosition);
  Object.keys(characters).forEach((key) => {
    const other = characters[key]; // mmmm...
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
  });
  return collision ? calculateMovePosition(collision, character.position, r) : null; // step back
}

const doWalk = (character, position, characters) => {
  const nextPosition = calculateWalkPosition(character, position);
  const collision = calculateFirstCollisionPosition(character, nextPosition, characters);
  if (collision) {
    return [{
      character: character.id,
      result: 'collision',
      position: collision,
    }];
  }
  return [{
    character: character.id,
    result: 'walk',
    position: nextPosition,
  }];
}

export class RuleBook {
  constructor(characters = {}) {
    this.characters = characters;
  }

  execute = (state) => {
    if (!this[state.action]) {
      return [];
    }
    return this[state.action] && this[state.action](state);
  }

  walk = (state) => {
    const character = this.characters[state.owner];
    const position = state.direction;
    return doWalk(character, position, this.characters);
  }

  basicAttack = (state) => {
    const characterOne = this.characters[state.owner];
    const characterTwo = this.characters[state.target];
    const distance = vectorDistanceToVector(characterOne.position, characterTwo.position);
    const weaponRange = characterOne.items.weapon ? characterOne.items.weapon.range : 1;
    if (distance <= weaponRange) {
      return doAttack(characterOne, characterTwo);
    }
    return doWalk(characterOne, characterTwo.position, this.characters);
  }
};

export const ACTIONS = {
  IDLE: 'idle',
  WALKING: 'walk',
  BASIC_ATTACK: 'basicAttack',
};

export default RuleBook;
