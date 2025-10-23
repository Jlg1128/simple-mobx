import * as mobx from '../../src/index'
const { autorun, computed, observable, $mobx } = mobx;
const m = mobx

test('transaction', () => {
    const x1 = observable.box(3)
    const x2 = observable.box(5)
    const a = computed(function () {
        return {
            sum: x1.get() + x2.get()
        }
    })
    let count = 0;
    autorun(() => {
        count++;
        a.get();
    })
    m.transaction(function () {
        x1.set(1);
        x2.set(2);
    })
    expect(count).toBe(2)
})