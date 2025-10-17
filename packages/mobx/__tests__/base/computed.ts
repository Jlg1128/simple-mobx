import { computed, observable } from "../../src";

test('computed calc cache', () => {
    const obj = observable({
        age: {
            value: 1
        },
        name: 'jlg',
    })

    const a = computed(() => {
        console.log('recalc a');
        return obj.age.value + obj.name;
    })

    let count = 0;
    const c = computed(() => {
        console.log('recalc c');
        count ++;
        return a.get();
    })

    c.get()
    obj.age = {
        value: 1
    }

    expect(count).toBe(1);

    obj.age = {
        value: 2
    }
    c.get()
    expect(count).toBe(2);
});

