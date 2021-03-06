import { assert } from 'chai';
import diceRoll from '../lib/rules/dice';


describe(__filename, () => {
  it('should do a simple roll', (done) => {
    const dices = 10;
    const result = diceRoll(dices, 6);
    assert(result.total >= -dices);
    assert(result.total <= dices);
    assert(result.critics >= 0);
    assert(result.critics <= dices);
    assert(result.success >= 0);
    assert(result.success <= dices);
    assert(result.fails >= 0);
    assert(result.fails <= dices);
    assert(result.total === (result.critics + result.success) - result.botches);
    assert(dices === (result.critics + result.success + result.fails + result.botches));
    done();
  });
})

