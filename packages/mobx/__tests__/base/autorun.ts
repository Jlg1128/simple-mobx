import { autorun, observable } from "../../src"

test('autorun base', () => {
    const a = observable(1);
    let count = 0
    autorun(() => {
        count++;
        a.get();
    })
    a.set(1);
    expect(count).toBe(1);
    a.set(2);
    expect(count).toBe(2);
})