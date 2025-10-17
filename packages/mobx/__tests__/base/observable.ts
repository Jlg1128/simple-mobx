import * as m from '../../src/index'
import { $g } from '../util';
const { autorun, computed, observable } = m;

test("argumentless observable", () => {
    // @ts-ignore
    const a = observable.box()
    expect(m.isObservable(a)).toBe(true)
    expect(a.get()).toBe(undefined)
})

test('observable primary', () => {
    const a = observable(1)
    expect(a.get()).toBe(1);
});

test('observable object', () => {
    const a = observable({
        foo: {
            bar: 1
        }
    });
    let values = [];
    autorun(() => {
        values.push(a.foo.bar);
    })
    a.foo.bar = 2;
    expect(values).toEqual([1, 2])
})

test('observe autorun dispose', () => {
    const x = observable(3)
    const x2 = computed(function () {
        return x.get() * 2
    })
    const b = []

    const cancel = autorun(function () {
        b.push(x2.get())
    })

    x.set(4)
    x.set(5)
    expect(b).toEqual([6, 8, 10])
    cancel()
    x.set(7)
    expect(b).toEqual([6, 8, 10])
})

test('value reassign', () => {
    const a = $g();
    let count = -1;
    autorun(() => {
        count++;
        a.foo?.bar;
    })
    delete a.foo;
    expect(count).toBe(1)

    delete a.foo;
    expect(count).toBe(1)

    a.foo = { bar: 2 };
    expect(count).toBe(2)
})

test('ownKeys', () => {
    const a = $g();
    autorun(() => {
        Reflect.ownKeys(a);
    })
})