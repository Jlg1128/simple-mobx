import { Computed } from "../core/computed";
import { IValueDidChange, ObservableValue } from "../core/observableValue";
import { isFunction, Lambda } from "../utils";
import { getAdministration } from "../utils/types";

export function observe<T>(
    value: ObservableValue<T> | Computed<T>,
    listener: (change: IValueDidChange<T>) => void,
    fireImmediately?: boolean
): Lambda;
export function observe(thing, propOrCb?, cbOrFire?, fireImmediately?): Lambda {
    if (isFunction(cbOrFire)) {
        return observeObservableProperty(thing, propOrCb, cbOrFire, fireImmediately)
    } else {
        return observeObservable(thing, propOrCb, cbOrFire)
    }
}

function observeObservable(thing, listener, fireImmediately: boolean) {
    return getAdministration(thing)._observe(listener, fireImmediately)
}

function observeObservableProperty(thing, property, listener, fireImmediately: boolean) {
    return getAdministration(thing, property)._observe(listener, fireImmediately)
}
