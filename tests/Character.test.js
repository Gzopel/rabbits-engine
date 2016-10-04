import { assert } from 'chai';
import Character from  '../lib/Character';

const axeGuy = require('./testData/archer.json');

describe(__filename, () => {
  it('Should create a new character that wraps the character sheet', () => {
    const character = new Character(axeGuy);
    assert.equal(axeGuy.sheet.attributes.physical.dexterity, character.getBase('attributes.physical.dexterity'));
    assert.equal(axeGuy.sheet.attributes.physical.stamina, character.getBase('attributes.physical.stamina'));
    assert.equal(axeGuy.sheet.attributes.mental.perception, character.getBase('attributes.mental.perception'));
    assert.equal(axeGuy.sheet.abilities.talents.dodge, character.getBase('abilities.talents.dodge'));
  });

  it('Should accept temporary modificators from different sources', () => {
    const timestamp = new Date().getTime();
    const modificators = new Map();
    const path = 'attributes.physical.dexterity';
    modificators.set(path,
      [{ mod: 2, ttl: timestamp, source: 1 }, { mod: 2, ttl: timestamp + 100, source: 2 }]);
    const character = new Character(axeGuy, modificators);
    assert.equal(axeGuy.sheet.attributes.physical.dexterity + 4, character.get(path));
    character.updateModifiers(timestamp + 50);
    assert.equal(axeGuy.sheet.attributes.physical.dexterity + 2, character.get(path));
    character.updateModifiers(timestamp + 150);
    assert.equal(axeGuy.sheet.attributes.physical.dexterity, character.get(path));
    character.addModifiers({ path: path, mod: 1, ttl: timestamp, source: 1 });
    assert.equal(axeGuy.sheet.attributes.physical.dexterity + 1, character.get(path));
    character.addModifiers({ path: path, mod: 2, ttl: timestamp, source: 2 });
    assert.equal(axeGuy.sheet.attributes.physical.dexterity + 3, character.get(path));
    character.addModifiers({ path: path, mod: -2, ttl: timestamp, source: 2 });
    assert.equal(axeGuy.sheet.attributes.physical.dexterity - 1, character.get(path));
  });


});