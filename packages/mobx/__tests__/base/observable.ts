import * as mobx from '../../src/index'
import { $g } from '../util';
const { autorun, computed, observable, $mobx } = mobx;
const m = mobx

const voidObserver = function () { }

function buffer() {
    const b: any[] = []
    const res = function (x) {
        if (typeof x.newValue === "object") {
            const copy = { ...x.newValue }
            delete copy[$mobx]
            b.push(copy)
        } else {
            b.push(x.newValue)
        }
    }
    res.toArray = function () {
        return b
    }
    return res
}

test("argumentless observable", () => {
    const a = observable.box()

    expect(m.isObservable(a)).toBe(true)
    expect(a.get()).toBe(undefined)
})

test("basic", function () {
    const x = observable.box(3)
    const b = buffer()
    m.observe(x, b)
    expect(3).toBe(x.get())

    x.set(5)
    expect(5).toBe(x.get())
    expect([5]).toEqual(b.toArray())
    expect(mobx._isComputingDerivation()).toBe(false)
})

test("basic2", function () {
    const x = observable.box(3)
    const z = computed(function () {
        return x.get() * 2
    })
    const y = computed(function () {
        return x.get() * 3
    })

    m.observe(z, voidObserver)

    expect(z.get()).toBe(6)
    expect(y.get()).toBe(9)

    x.set(5)
    expect(z.get()).toBe(10)
    expect(y.get()).toBe(15)

    expect(mobx._isComputingDerivation()).toBe(false)
})

test("computed with asStructure modifier", function () {
    const x1 = observable.box(3)
    const x2 = observable.box(5)
    const y = m.computed(
        function () {
            return {
                sum: x1.get() + x2.get()
            }
        },
        { compareStructural: true }
    )
    const b = buffer()
    m.observe(y, b, true)

    expect(8).toBe(y.get().sum)

    x1.set(4)
    expect(9).toBe(y.get().sum)

    m.transaction(function () {
        // swap values, computation results is structuraly unchanged
        x1.set(5)
        x2.set(4)
    })

    expect(b.toArray()).toEqual([{ sum: 8 }, { sum: 9 }])
    expect(mobx._isComputingDerivation()).toBe(false)
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
    let values: any[] = [];
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
    const b: any[] = []

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
