import { UPDATE } from "../constant";
import { hasListeners, IListenable, isPlainObject, Lambda, notifyListeners, registerListener, toPrimitive } from "../utils";
import { comparer, IEqualsComparer } from "../utils/comparer";
import globalState from "./globalstate";
import { isObservable, observable } from "./observable";
import { ObservableBase } from "./observableBase";

export function deepEnhancer(v: any, name: string) {
    // it is an observable already, done
    if (isObservable(v)) {
        return v
    }
    // something that can be converted and mutated?
    if (Array.isArray(v)) {
        return observable.array(v, { name })
    }
    if (isPlainObject(v)) {
        return observable(v, { name })
    }
    // if (isES6Map(v)) {
    //     return observable.map(v, { name })
    // }
    // if (isES6Set(v)) {
    //     return observable.set(v, { name })
    // }
    // if (typeof v === "function" && !isAction(v) && !isFlow(v)) {
    //     if (isGenerator(v)) {
    //         return flow(v)
    //     } else {
    //         return autoAction(name, v)
    //     }
    // }
    return v
}

export type IValueDidChange<T = any> = {
    type: "update"
    observableKind: "value"
    object: ObservableValue<T>
    debugObjectName: string
    newValue: T
    oldValue: T | undefined
}

export interface IEnhancer<T> {
    (newValue: T, name: string): T
}

class ObservableValue<T> extends ObservableBase implements IListenable {
    value_: T;
    changeListeners_: Function[] = [];
    constructor(
        value: T,
        public enhancer: IEnhancer<T> = deepEnhancer,
        public name: string = 'observableValue@' + globalState.getDevId(),
        private equals: IEqualsComparer<any> = comparer.default
    ) {
        super(name);
        this.value_ = enhancer(value, name);
        this.equals = equals;
    }

    public get() {
        this.reportObserved();
        return this.value_;
    }

    public set(newValue: T) {
        const oldValue = this.value_;
        newValue = this.prepareNewValue(newValue);
        if (newValue !== ObservableValue.UNCHANGED) {
            this.value_ = newValue;
            this.reportChanged();
            if (hasListeners(this)) {
                notifyListeners(this, {
                    type: UPDATE,
                    object: this,
                    newValue,
                    oldValue,
                })
            }
        }
        return newValue;
    }

    public prepareNewValue(newValue): any {
        if (this.equals(newValue, this.value_)) {
            return ObservableValue.UNCHANGED;
        }
        this.value_ = this.enhancer(newValue, this.name);
        return this.value_;
    }


    _observe(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda {
        if (fireImmediately) {
            listener({
                observableKind: "value",
                debugObjectName: this.name,
                object: this,
                type: UPDATE,
                newValue: this.value_,
                oldValue: undefined
            })
        }
        return registerListener(this, listener)
    }

    static UNCHANGED = {};

    toJSON() {
        return this.get()
    }

    toString() {
        return `${this.name}[${this.value_}]`
    }

    valueOf(): T {
        return toPrimitive(this.get())
    }

    [Symbol.toPrimitive]() {
        return this.valueOf()
    }
}

export {
    ObservableValue,
}