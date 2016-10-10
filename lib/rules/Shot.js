import Character from './Character';

export class Shot extends Character {
  constructor(data){
    super({
      radius: 1,
      ...data,
      sheet: {
        maxHealth: 1,
      }
    });
    this.owner = data.character;
  }

  getWeaponDamage() {
    return 6;
  }

  getMoveSpeed() {
    return 10;
  }

  collidesWith(character) {
    return character.id !== this.owner;
  };

}

export default Shot;