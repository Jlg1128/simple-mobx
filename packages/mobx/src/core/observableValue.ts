import { isPlainObject } from "../utils";
import globalState from "./globalstate";
import { isObservable, observable } from "./observable";
import { ObservableBase } from "./observableBase";

export function deepEnhancer(v: any, name: string) {
    // it is an observable already, done
    if (isObservable(v)) {
        return v
    }

    // something that can be converted and mutated?
    // if (Array.isArray(v)) {
    //     return observable.array(v, { name })
    // }
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

export interface IEnhancer<T> {
    (newValue: T, name: string): T
}

class ObservableValue extends ObservableBase {
    value_: any;
    constructor(
        value: any,
        public enhancer: IEnhancer<any> = deepEnhancer,
        name: string = 'observableValue@' + globalState.getDevId(),
    ) {
        super(name);
        this.value_ = enhancer(value, name);
    }

public get() {
        this.reportObserved();
        return this.value_;
    }

    public set(newValue: any) {
        newValue = this.prepareNewValue(newValue);
        if (newValue !== ObservableValue.UNCHANGED) {
            this.value_ = newValue;
            this.reportChanged();
        }
    }
    
    public prepareNewValue(newValue) {
        if (Object.is(newValue, this.value_)) {
            return ObservableValue.UNCHANGED;
        }
        this.value_ = this.enhancer(newValue, this.name);
        return this.value_;
    }

    static UNCHANGED = {};
}

export {
    ObservableValue,
}