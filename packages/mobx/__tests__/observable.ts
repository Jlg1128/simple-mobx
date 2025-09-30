import { observable } from '../src/index'

test('primary', () => {
    const a = observable(1)
    expect(a.get()).toBe(1);
});

