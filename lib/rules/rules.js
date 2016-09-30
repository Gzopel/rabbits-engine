import rollDice from './dice';
import { vectorDistanceToVector, vectorSub, vectorAdd, noramilzeVector, mutiplyVectorFromScalar, distanceToVector } from './math';

const abilityForWeapon = (sheet, weaponType) => {
  switch (weaponType) {
    case 'BOW':
      return sheet.abilities.skills.archery || 0;
    case 'SWORD':
    case 'DAGGER':
    case 'AXE':
    case 'CLUB':
      return sheet.abilities.skills.melee || 0;
    default:
      return sheet.abilities.talent.brawl || 0;
  }
};

const damageTakenHandicap = (character) => {
  const damageTaken = character.sheet.maxHealth - character.health;
  return -Math.floor(damageTaken / 2);
};

const dexterityHandicap = (character) => {
  let handicap = 0;//damageTakenHandicap(character);
  Object.keys(character.items).forEach((itemKey) => {
    handicap -= character.items[itemKey].dexterityHandicap || 0;
  });
  return handicap;
};

const calculateWeaponDamage = (character) => {
  if (character.items.weapon.type === 'BOW') {
    return character.items.weapon.damage;
  }
  const baseDamage = character.items.weapon ? character.items.weapon.damage : 0;
  return baseDamage + (character.sheet.attributes.physical.strength || 0);
};

const characterArmour = (character) => {
  let armour = character.sheet.attributes.physical.stamina || 0;
  Object.keys(character.items).forEach((itemKey) => {
    armour += character.items[itemKey].armour || 0;
  });
  return armour;
};

const doAttack = (characterOne, characterTwo) => {
  const dexterityOne = characterOne.sheet.attributes.physical.dexterity || 0;
  const dexterityTwo = characterTwo.sheet.attributes.physical.dexterity || 0;
  const weapon = characterOne.items.weapon;
  const abilityOne = abilityForWeapon(characterOne.sheet, weapon.type);
  const abilityTwo = characterTwo.sheet.abilities.talents.dodge || 1;
  const hitDices = dexterityOne + abilityOne - dexterityHandicap(characterOne);
  const hitDifficulty = weapon ? weapon.difficulty : 6;
  const hitRoll = rollDice(hitDices, hitDifficulty).total;
  if (hitRoll < 1) {
    return [{
      character: characterTwo.id,
      result: 'missed',
      aggressor: characterOne.id,
      duration: 1000,
    }];
  }
  const dodgeDices = dexterityTwo + abilityTwo - dexterityHandicap(characterTwo);
  const dodgeTotal = rollDice(dodgeDices, 7).total;
  const hitSuccess = hitRoll - dodgeTotal;
  if (hitSuccess < 1) {
    return [{
      character: characterTwo.id,
      result: 'dodge',
      aggressor: characterOne.id,
      duration: 1000,
    }];
  }
  const extraDamage = hitSuccess - 1;
  const weaponDamage = calculateWeaponDamage(characterOne);
  const armour = characterArmour(characterTwo);
  const damageRoll = rollDice(weaponDamage + extraDamage, 7).total;
  const armourRoll = rollDice(armour, 7).total;
  const effectiveDamage = Math.max(0, damageRoll - armourRoll);
  if (effectiveDamage < 1) {
    return [{
      character: characterTwo.id,
      result: 'block',
      aggressor: characterOne.id,
      duration: 1000,
    }];
  }
  return [{
    character: characterTwo.id,
    result: 'damaged',
    damage: effectiveDamage,
    aggressor: characterOne.id,
    remainingHealth: characterTwo.health - effectiveDamage,
    duration: 1000,
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

export const moveSpeed = (character) => {
  return (character.sheet.attributes.physical.dexterity || 0) + (character.sheet.abilities.talents.athletics || 0);
}

const calculateWalkPosition = (character, position) => {
  // TODO: this is not in the manual, find a better way of calculating move speed
  const speed = moveSpeed(character);
  return calculateMovePosition(character.position, position, speed);
};

export const viewRange = (character) => {
  return character.sheet.attributes.mental.perception + character.sheet.abilities.talents.alertness;
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

const doWalk = (character, position, characters) => {
  const nextPosition = calculateWalkPosition(character, position);
  const collision = calculateFirstCollisionPosition(character, nextPosition, characters);
  if (collision) {
    return [{
      character: character.id,
      result: 'collision',
      position: collision,
      duration: 100,
    }];
  }
  return [{
    character: character.id,
    result: 'walk',
    position: nextPosition,
    duration: 100,
  }];
}

export class RuleBook {
  constructor(characters) {
    this.characters = characters;
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
    return doWalk(character, position, this.characters);
  }

  basicAttack = (state) => {
    const characterOne = this.characters.get(state.owner);
    const characterTwo = this.characters.get(state.target);
    const distance = vectorDistanceToVector(characterOne.position, characterTwo.position);
    const weaponRange = characterOne.items.weapon ? characterOne.items.weapon.range : 2;
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
