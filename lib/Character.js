export class Character {
  constructor(characterData, modifiers = new Map()) {
    this.id = characterData.id;
    this.sheet = characterData.sheet;
    this.modifiers = modifiers;
    this.position = characterData.position;
    this.health = this.sheet.maxHealth;
  }

  get(path) {
    let base = this.getBase(path);
    if (this.modifiers.has(path)) {
      for (let modifier of this.modifiers.get(path)) {
        base += modifier.mod; // not taking into account to date here;
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
}

export default  Character;
