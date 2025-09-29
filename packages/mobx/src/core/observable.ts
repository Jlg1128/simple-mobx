import { isPlainObject } from "../utils";
import { getDevId } from "./globalstate";
import { $mobx } from "./observableBase";
import { ObservableObjectAdministration } from "./observableObject";
import { deepEnhancer, ObservableValue } from "./observableValue";

function initObservableObject(value: Object, options: { name?: string }) {
    const name = options.name ?? 'ObservableObject@' + getDevId()
    const adm = new ObservableObjectAdministration(value, name);
    const proxy = new Proxy(value, {
        get(target: any, key: string) {
            return adm._get(key);
        },
        set(target: any, key: string, newValue: any) {
            return adm._set(key, newValue) ?? true;
        },
        has(target, key) {
            return adm._has(key);
        },
        ownKeys() {
            return adm._ownKeys();
        },
        deleteProperty(target, key) {
            return adm._delete(key);
        },
        defineProperty(target, key, attributes) {
            return adm._defineProperty(key, attributes);
        },
        preventExtensions(target) {
            return false;
        }
    })
    Object.entries(value).forEach(([key, childVal]) => {
        adm.defineObservableProperty_(key, childVal, deepEnhancer)
    })
    adm._proxy = proxy;
    Object.defineProperty(value, $mobx, {
        value: adm,
        enumerable: false,
        writable: true,
        configurable: true
    })
    return proxy;
}

export const observableFactories = {
    object(value: Object, options: {name?: string} = {}) {
        return initObservableObject(value, options);
    },
    map() {

    },
    set() {
    },
    array() {
    },
    primary(value: string | number) {
        return new ObservableValue(value);
    },
}

export function isObservable(value: any) {
    return typeof value === 'object' && !!value[$mobx];
}

export function observable(target: any, options: { name?: string } = {}) {
    if (isObservable(target)) {
        return target;
    }
    if (isPlainObject(target)) {
        return observableFactories.object(target, options);
    }
    if (typeof target === 'object' && target !== null) {
        return target;
    }
    return observableFactories.primary(target);
}
