import { normalizeVector } from './math'

export class Character {
  constructor(characterData, modifiers = new Map()) {
    this.id = characterData.id;
    this.type = characterData.type;
    this.sheet = characterData.sheet;
    this.modifiers = modifiers;
    this.radius = characterData.radius || 4;
    this.position = characterData.position;
    if (characterData.position) {
      this.orientation = characterData.orientation || normalizeVector(characterData.position);
    }
    this.health = this.sheet.maxHealth;
  }

  get(path) {
    let base = this.getBase(path);
    if (this.modifiers.has(path)) { // TODO subpaths
      for (let modifier of this.modifiers.get(path)) {
        base += modifier.mod;
      }
    }
    return base;
  }

  getBase(path) {
    let base = this.sheet;
    for (let subPath of path.split('.')) {
      base = base[subPath];
      if (!base) {
        return 0;
      }
    }
    return base;
  }

  updateModifiers(timestamp) {
    for (let entry of this.modifiers.entries()) {
      const mods = this.modifiers.get(entry[0]);
      const updated = [];
      for (let mod of  mods) {
        if (mod.ttl >= timestamp) {
          updated.push(mod);
        }
      };
      if (updated.length) {
        this.modifiers.set(entry[0], updated);
      } else {
        this.modifiers.delete(entry[0]);
      }
    }
  }

  addModifiers(modifier) {
    const modifiers = [].concat(modifier);
    for (let modi of modifiers) {
      if (this.modifiers.has(modi.path)) {
        // if same source lets overwrite it
        this.modifiers.set(modi.path, this.modifiers.get(modi.path)
          .filter(oldModi => oldModi.source !== modi.source));
      } else {
        this.modifiers.set(modi.path,[]);
      }
      this.modifiers.get(modi.path).push({ ttl: modi.ttl, mod: modi.mod, source: modi.source });
    }
  }

  getViewRange() {
    return 20 + 4 * (this.get('attributes.mental.perception') + this.get('abilities.talents.alertness'));
  }

  getAttackSpeed() {
    return 1; // TODO something with dexterity
  }

  getMoveSpeed() {
    /* TODO: A character walks 7 yards/meters per turn. If jogging,
     a character moves at (12 + Dexterity) yards/meters per
     turn. If all-out running, a character moves at (20 + [3
     x Dexterity]) yards/meters per turn.
     */
    return 10 + 3 * (this.get('attributes.physical.dexterity') + this.get('abilities.talents.athletics'));
  }
  
  getArmour() {
    let armour = this.get('attributes.physical.stamina');
    Object.keys(this.get('items')).forEach((itemKey) => {
      armour += this.get('character.items.'+itemKey+'.armour');
    });
    return armour;
  }

  getWeaponDamage() {
    if (this.get('character.items.weapon.type') === 'BOW') {
      return this.get('character.items.weapon.damage');
    }
    const baseDamage = this.get('items.weapon.damage');
    return baseDamage + this.get('attributes.physical.strength');
  };

  getDamageTakenHandicap() {
    const damageTaken = this.get('maxHealth') - this.health;
    return -Math.floor(damageTaken / 2);
  };

  getDexterityHandicap() {
    let handicap = this.getDamageTakenHandicap();
    Object.keys(this.get('items')).forEach((itemKey) => {
      handicap -= this.get('items.'+itemKey+'.dexterityHandicap');
    });
    return handicap;
  };

  getAbilityForWeapon(weaponType) {
    switch (weaponType) {
      case 'BOW':
        return this.get('abilities.skills.archery');
      case 'SWORD':
      case 'DAGGER':
      case 'AXE':
      case 'CLUB':
        return this.get('abilities.skills.melee');
      default:
        return this.get('abilities.talent.brawl');
    }
  };

  getBasicAttackHitDices() {
    const dexterity = this.get('attributes.physical.dexterity');
    const ability = this.getAbilityForWeapon(this.get('items.weapon.type'));
    return dexterity + ability - this.getDexterityHandicap();
  }
  
  getDodgeDices() {
    const dexterity = this.get('attributes.physical.dexterity');
    const ability = this.get('abilities.talents.dodge');
    return dexterity + ability - this.getDexterityHandicap();
  }

  collidesWith(other) { return this.id !== other.id};
}

export default  Character;
