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

test("dynamic", function (done) {
    try {
        const x = observable.box(3)
        const y = m.computed(function () {
            return x.get()
        })
        const b = buffer()
        m.observe(y, b, true)

        expect(3).toBe(y.get()) // First evaluation here..

        x.set(5)
        expect(5).toBe(y.get())

        expect(b.toArray()).toEqual([3, 5])
        expect(mobx._isComputingDerivation()).toBe(false)

        done()
    } catch (e: any) {
        console.log(e.stack)
    }
})

test("dynamic2", function () {
    try {
        const x = observable.box(3)
        const y = computed(function () {
            return x.get() * x.get()
        })

        expect(9).toBe(y.get())
        const b = buffer()
        m.observe(y, b)

        x.set(5)
        expect(25).toBe(y.get())

        //no intermediate value 15!
        expect([25]).toEqual(b.toArray())
        expect(mobx._isComputingDerivation()).toBe(false)
    } catch (e: any) {
        console.log(e.stack)
    }
})


test("box uses equals", function (done) {
    try {
        const x = observable.box("a", {
            equals: (oldValue, newValue) => {
                return oldValue.toLowerCase() === newValue.toLowerCase()
            }
        })

        const b = buffer()
        m.observe(x, b)

        x.set("A")
        x.set("b")
        x.set("B")
        x.set("C")

        expect(["b", "C"]).toEqual(b.toArray())
        expect(mobx._isComputingDerivation()).toBe(false)

        done()
    } catch (e: any) {
        console.log(e.stack)
    }
})

test("box uses equals2", function (done) {
    try {
        const x = observable.box("01", {
            equals: (oldValue, newValue) => {
                return parseInt(oldValue) === parseInt(newValue)
            }
        })

        const y = computed(function () {
            // @ts-ignore
            return parseInt(x)
        })

        const b = buffer()
        m.observe(y, b)

        x.set("2")
        x.set("02")
        x.set("002")
        x.set("03")

        expect([2, 3]).toEqual(b.toArray())
        expect(mobx._isComputingDerivation()).toBe(false)

        done()
    } catch (e: any) {
        console.log(e.stack)
    }
})

test("readme1", function (done) {
    try {
        const b = buffer()

        const vat = observable.box(0.2)
        const order: any = {}
        order.price = observable.box(10)
        // Prints: New price: 24
        // in TS, just: value(() => this.price() * (1+vat()))
        order.priceWithVat = computed(function () {
            return order.price.get() * (1 + vat.get())
        })

        m.observe(order.priceWithVat, b)

        order.price.set(20)
        expect([24]).toEqual(b.toArray())
        order.price.set(10)
        expect([24, 12]).toEqual(b.toArray())
        expect(mobx._isComputingDerivation()).toBe(false)

        done()
    } catch (e: any) {
        console.log(e.stack)
        throw e
    }
})

test("batch", function () {
    const a = observable.box(2)
    const b = observable.box(3)
    const c = computed(function () {
        return a.get() * b.get()
    })
    const d = computed(function () {
        return c.get() * b.get()
    })
    const buf = buffer()
    m.observe(d, buf)

    a.set(4)
    b.set(5)
    // Note, 60 should not happen! (that is d begin computed before c after update of b)
    expect(buf.toArray()).toEqual([36, 100])

    const x = mobx.transaction(function () {
        a.set(2)
        b.set(3)
        a.set(6)
        expect(d.value_).toBe(100) // not updated; in transaction
        expect(d.get()).toBe(54) // consistent due to inspection
        return 2
    })

    expect(x).toBe(2) // test return value
    expect(buf.toArray()).toEqual([36, 100, 54]) // only one new value for d
})

test("transaction with inspection", function () {
    const a = observable.box(2)
    let calcs = 0
    const b = computed(function () {
        calcs++
        return a.get() * 2
    })

    // if not inspected during transaction, postpone value to end
    mobx.transaction(function () {
        a.set(3)
        expect(b.get()).toBe(6)
        expect(calcs).toBe(1)
    })
    expect(b.get()).toBe(6)
    expect(calcs).toBe(2)

    // if inspected, evaluate eagerly
    mobx.transaction(function () {
        a.set(4)
        expect(b.get()).toBe(8)
        expect(calcs).toBe(3)
    })
    expect(b.get()).toBe(8)
    expect(calcs).toBe(4)
})

test("transaction with inspection 2", function () {
    const a = observable.box(2)
    let calcs = 0
    let b
    mobx.autorun(function () {
        calcs++
        b = a.get() * 2
    })

    // if not inspected during transaction, postpone value to end
    mobx.transaction(function () {
        a.set(3)
        expect(b).toBe(4)
        expect(calcs).toBe(1)
    })
    expect(b).toBe(6)
    expect(calcs).toBe(2)

    // if inspected, evaluate eagerly
    mobx.transaction(function () {
        a.set(4)
        expect(b).toBe(6)
        expect(calcs).toBe(2)
    })
    expect(b).toBe(8)
    expect(calcs).toBe(3)
})

// test("scope", function () {
//     const vat = observable.box(0.2)
//     const Order = function () {
//         this.price = observable.box(20)
//         this.amount = observable.box(2)
//         this.total = computed(
//             function () {
//                 return (1 + vat.get()) * this.price.get() * this.amount.get()
//             },
//             { context: this }
//         )
//     }

//     const order = new Order()
//     m.observe(order.total, voidObserver)
//     order.price.set(10)
//     order.amount.set(3)
//     expect(36).toBe(order.total.get())
//     expect(mobx._isComputingDerivation()).toBe(false)
// })

// test("props1", function () {
//     const vat = observable.box(0.2)
//     const Order = function () {
//         mobx.extendObservable(this, {
//             price: 20,
//             amount: 2,
//             get total() {
//                 return (1 + vat.get()) * this.price * this.amount // price and amount are now properties!
//             }
//         })
//     }

//     const order = new Order()
//     expect(48).toBe(order.total)
//     order.price = 10
//     order.amount = 3
//     expect(36).toBe(order.total)

//     const totals = []
//     const sub = mobx.autorun(function () {
//         totals.push(order.total)
//     })
//     order.amount = 4
//     sub()
//     order.amount = 5
//     expect(totals).toEqual([36, 48])

//     expect(mobx._isComputingDerivation()).toBe(false)
// })

// test("props2", function () {
//     const vat = observable.box(0.2)
//     const Order = function () {
//         mobx.extendObservable(this, {
//             price: 20,
//             amount: 2,
//             get total() {
//                 return (1 + vat.get()) * this.price * this.amount // price and amount are now properties!
//             }
//         })
//     }

//     const order = new Order()
//     expect(48).toBe(order.total)
//     order.price = 10
//     order.amount = 3
//     expect(36).toBe(order.total)
// })

// test("props4", function () {
//     function Bzz() {
//         mobx.extendObservable(this, {
//             fluff: [1, 2],
//             get sum() {
//                 return this.fluff.reduce(function (a, b) {
//                     return a + b
//                 }, 0)
//             }
//         })
//     }

//     const x = new Bzz()
//     x.fluff
//     expect(x.sum).toBe(3)
//     x.fluff.push(3)
//     expect(x.sum).toBe(6)
//     x.fluff = [5, 6]
//     expect(x.sum).toBe(11)
//     x.fluff.push(2)
//     expect(x.sum).toBe(13)
// })

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
