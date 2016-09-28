import rollDice from './dice';
import { dist2, vectorSub, noramilzeVector, mutiplyVectorFromScalar } from './math';

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

const calculateWalkPosition = (character, position) => {
  // TODO: this is not in the manual, find a better way of calculating move speed
  const moveSpeed = character.sheet.attributes.physical.dexterity + (character.sheet.abilities.talents.athletics || 0);
  const distance = vectorSub(character.position, position);
  const normalized = noramilzeVector(distance);
  return mutiplyVectorFromScalar(normalized, moveSpeed);
};

export class RuleBook {
   constructor(characters = []) {
     this.characters = characters;
   }

   execute = (action) => {
     return this[action] && this[action](arguments.slice(1));
   }

   walk = (character, position) => {
    const nextPosition = calculateWalkPosition(character, position);
    // TODO: check for collitions
    return [{
      character: character.id,
      result: 'walk',
      position: nextPosition,
    }];
  }

  basicAttack = (characterOne, characterTwo) => {
    const distance = dist2(characterOne.position, characterTwo.position);
    const weaponRange = characterOne.items.weapon ? characterOne.items.weapon.range : 1;
    if (distance <= weaponRange) {
      return doAttack(characterOne, characterTwo);
    }
    return this.walk(characterOne, characterTwo.position);
  }
};

export const ACTIONS = {
  IDLE: 'idle',
  WALKING: 'walk',
  BASIC_ATTACK: 'basicAttack',
};


export default RuleBook;
