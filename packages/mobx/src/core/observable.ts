import { isPlainObject } from "../utils";
import { Computed } from "./computed";
import { getDevId } from "./globalstate";
import { $mobx, ObservableBase } from "./observableBase";
import { ObservableObjectAdministration } from "./observableObject";
import { deepEnhancer, ObservableValue } from "./observableValue";
import { Reaction } from "./reaction";

function initObservableObject<T extends Object = any>(value: T, options: { name?: string }): T {
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
    Object.defineProperty(value, $mobx, {
        value: adm,
        enumerable: false,
        writable: true,
        configurable: true
    })
    return proxy;
}

export const observableFactories: IObservableFactory = {
    object<T extends object>(value: T, options: CreateObservableOptions = {}) {
        return initObservableObject(value, options);
    },
    map() {

    },
    set() {
    },
    array() {
    },
    box<T>(value: T) {
        return new ObservableValue<T>(value);
    },
} as any;

export function isObservable(value: any) {
    return value !== null && typeof value === 'object' &&
        (
            !!value[$mobx]
            || value instanceof ObservableBase
            || value instanceof Computed
            || value instanceof Reaction
        );
}

function createObservable(target: any, options: { name?: string } = {}) {
    if (isObservable(target)) {
        return target;
    }
    if (isPlainObject(target)) {
        return observableFactories.object(target, options);
    }
    if (typeof target === 'object' && target !== null) {
        return target;
    }
    return observableFactories.box(target);
}

export const observable: IObservableFactory = Object.assign(createObservable, observableFactories);

export interface CreateObservableOptions {
    name?: string;
}
export interface IObservableValueFactory {
    <T>(value: T, options?: CreateObservableOptions): ObservableValue<T>
    <T>(value?: T, options?: CreateObservableOptions): ObservableValue<T | undefined>
}

export interface IObservableFactory {
    <T extends object>(
        value: T,
        options?: CreateObservableOptions
    ): T;
    <T = any>(
        value: T,
        options?: CreateObservableOptions
    ): ObservableValue<T>;
    box: IObservableValueFactory
    object: <T extends object>(
        value: T,
        options?: CreateObservableOptions
    ) => T;
    map: any;
    set: any;
    array: any;
}

