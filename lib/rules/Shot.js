import Character from './Character';

export class Shot extends Character {
  constructor(data){
    super({
      radius: 1,
      ...data,
      sheet: {
        maxHealth: 1,
      },
      type:'shot',
    });
    this.owner = data.character;
  }

  getWeaponDamage() {
    return 6;
  }
  getBasicAttackHitDices() {
    return 10;
  }
  getMoveSpeed() {
    return 20;
  }


  collidesWith(character) {
    return character.id !== this.owner && character.id !== this.id;
  };

}

export default Shot;