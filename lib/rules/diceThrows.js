import rollDice from '../dice';

export const attackCharacter= (characterOne, characterTwo) => {
  const dextrecityOne = characterOne.sheet.attributes.physical.dextrecity;
  const weapon = characterOne.items.weapon;
  const habilityOne = habilityForWeapon(characterOne.sheet, weapon.type)
}

habilityForWeapon = (sheet,weaponType) => {
  switch(weaponType) {
    case 'RANGED':
      return sheet.abilities.skills.archery;
  }
}