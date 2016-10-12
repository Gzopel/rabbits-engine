import rollDice from './dice';
import { vectorDistanceToVector, normalizeVector } from './math';
import { BaseRuleBook, ACTIONS } from './BaseRuleBook';
/*
 *  Here is were higher level rules are applied and dice are rolled.
 *  Intended for the server were full calculations are needed.
 * */

const noCollision = (characterId, position, characters) => {
  for (const other of characters.values()) {
    // collision radius
    const r = other.radius || 2;
    if (characterId !== other.id && other.position) { //this is an ugly hack for players that haven't spawned yet.
      const d = vectorDistanceToVector(other.position, position);
      if (d <= r) {
        return false;
      }
    }
  }
  return true;
};

export class RuleBook extends BaseRuleBook {
  constructor(map, characters) {
    super(map, characters);
  }

  _doAttack(characterOne, characterTwo) {
    const hitDices = characterOne.getBasicAttackHitDices();
    // considering single weapon for now
    const hitDifficulty = characterOne.get('items.weapon.difficulty') || 6;
    const hitRoll = rollDice(hitDices, hitDifficulty).total;
    const attackDuration = 1000 / characterOne.getAttackSpeed();
    if (hitRoll < 1) {
      return [{
        action: ACTIONS.BASIC_ATTACK,
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

  spawn = (state) => {
    let result = [];
    if (state.origin) {
      const originLocations = this.map.spawnLocations.filter((location) => {
        return location.origin === state.origin;
      });
      if (originLocations.length) {
        result = this._trySpawn(state, originLocations[0]);
      }
    }
    for (const location of this.map.spawnLocations) {
      if (!result.length) {
        result = this._trySpawn(state, location);
      }
    }
    return result;
  }

  _trySpawn(state, location) {
    let tries = 0;
    const diameter = location.radius * 2;
    while (tries < 100) {
      const position = {
        x: location.position.x + Math.ceil(diameter * (Math.random() - 0.5)),
        z: location.position.z + Math.ceil(diameter * (Math.random() - 0.5)),
      };
      if (noCollision(state.owner, position, this.characters)) {
        return [{
          character: state.owner,
          orientation: normalizeVector(position),
          position: position,
          result: 'spawn',
          action: 'spawn',
        }];
      }
      tries++;
    }
    return [];
  }
};


export default RuleBook;
