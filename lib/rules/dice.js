const DICE_FACES = 10;

const rollDice = (dices, difficulty) => {
  let success = 0;
  let botches = 0;
  let fails = 0;
  let critics = 0;
  for (let i = 0; i < dices; i++) {
    const result = Math.ceil(Math.random() * DICE_FACES);
    if (result <= 1) {
      botches++;
    } else if (result === DICE_FACES) {
      critics++;
    } else if (result >= difficulty) {
      success++;
    } else {
      fails++;
    }
  }
  return {
    botches: botches,
    success: success,
    fails: fails,
    critics: critics,
    total: (success + critics) - botches,
  };
};

export default rollDice;
