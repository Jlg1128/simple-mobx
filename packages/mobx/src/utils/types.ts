import { isComputed } from "../core/computed"
import { $mobx, isObservableBase } from "../core/observableBase";
import { ObservableValue } from "../core/observableValue";
import { isReaction } from "../core/reaction";

export function getAtom(thing: any, property?: PropertyKey) {
    if (typeof thing === "object" && thing !== null) {
        const observable = (thing as any)[$mobx]._values.get(property)
        return observable as ObservableValue<any>;
    }
    return null;
}

export function getAdministration(thing: any, property?: string) {
    if (property !== undefined) {
        return getAdministration(getAtom(thing, property))
    }
    if (isObservableBase(thing) || isComputed(thing) || isReaction(thing)) {
        return thing
    }
    // if (isObservableMap(thing) || isObservableSet(thing)) {
    //     return thing
    // }
    if (thing[$mobx]) {
        return thing[$mobx]
    }
    return null;
}