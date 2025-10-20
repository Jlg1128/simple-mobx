import * as mobx from '../../src/index'
import { $g } from '../util';
const { autorun, computed, observable, $mobx } = mobx;
const m = mobx

function buffer() {
    const b = []
    let count = 0;
    const res = function (x) {
        count++;
        if (count > 1) {
            if (typeof x === "object") {
                const copy = { ...x }
                delete copy[$mobx]
                b.push(copy)
            } else {
                b.push(x)
            }
        }
    }
    res.toArray = function () {
        return b
    }
    return res
}

test('basic', () => {
    const x = observable.box(3)
    const b = buffer()
    autorun(() => {
        x;
        b(x.get());
    })
    // m.observe(x, b)
    expect(3).toBe(x.get())

    x.set(5)
    expect(5).toBe(x.get())
    console.log(b);

    expect([5]).toEqual(b.toArray())
    // expect(mobx._isComputingDerivation()).toBe(false)
})

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
    let count = 1;
    autorun(() => {
        count++;
        Reflect.ownKeys(a);
    })
    expect(count).toBe(2);
    a.foo = {
        bar: 3
    }
    expect(count).toBe(2);
    a.test = 3;
    expect(count).toBe(3);
})
