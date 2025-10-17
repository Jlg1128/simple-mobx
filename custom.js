// const obj = observable({
//     age: {
//         value: 1
//     },
//     name: 'jlg',
// })
// // autorun(() => {
// //     console.log('value', obj.age.value);
// // })

// // if (typeof runInAction !== undefined) {
// //     runInAction(() => {
// //         obj.age.val
// // ue++
// //         obj.age.value++
// //     })
// // }

// const a = computed(() => {
//     console.log('recalc a');
//     return obj.age.value + obj.name;
// })

// const b = computed(() => {
//     return obj.name;
// })
// const c = computed(() => {
//     console.log('recalc c');
//     return a.get();
// })

// // window.b = b;

// window.c = autorun(() => {
//     console.log('autorun', c.get());
// })

// window.test = function () {
//     runInAction(() => {
//         obj.age = { value: 2 };
//         // obj.name = 2;
//     })
// }

// window.a = a;


// window.obj = obj;

const x = observable(
    {
        foo: {
            bar: 1
        }
    }
)
let count = -1;
autorun(() => {
    count++;
    console.log('c');
    console.log(Object.keys(x));
})

window.x = x;