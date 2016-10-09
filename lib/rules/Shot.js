import Character from './Character';

export class Shot extends Character {
  constructor(data){
    super({
      ...data,
      sheet: {
        maxHealth: 1,
      }
    });
  }

  getWeaponDamage() {
    return 6;
  }

  getMoveSpeed() {
    return 20;
  }
}

export default Shot;