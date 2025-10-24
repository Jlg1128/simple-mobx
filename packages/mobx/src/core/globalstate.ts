import { isComputed } from "./computed";
import { IDerivation } from "./derivation";
import { IObservable } from "./observableBase";
import { Reaction, runReactions } from "./reaction";

type GlobalState = {
    trackingDerivation: IDerivation | null;
    DEV_ID: number;
    getDevId: () => void;
    inBatch: number;
    pendingReactions: Array<Reaction>;
    pendingUnobservations: Array<IObservable>
}

const globalState: GlobalState = {
    trackingDerivation: null,
    DEV_ID: 0,
    getDevId() {
        return ++this.DEV_ID
    },
    inBatch: 0,
    pendingReactions: [],
    pendingUnobservations: [],
}

export const getDevId = globalState.getDevId.bind(globalState);

export function startBatch() {
    globalState.inBatch++;
}

export function endBatch() {
    globalState.inBatch--;
    runReactions();
    globalState.pendingUnobservations.forEach((observable) => {
        observable.onUnObserved();
        if (observable.observers_.size === 0) {
            if (isComputed(observable)) {
                // computed values are automatically teared down when the last observer leaves
                // this process happens recursively, this computed might be the last observabe of another, etc..
                observable._suspend()
            }
        }
    })
    globalState.pendingUnobservations = [];
}

export function untrackedStart() {
    const prev = globalState.trackingDerivation;
    globalState.trackingDerivation = null;
    return prev;
}

export function untrackedEnd(prev: IDerivation | null) {
    globalState.trackingDerivation = prev;
}

export function queueForUnObserve(observable: IObservable) {
    if (observable.isPendingUnobservation === false) {
        globalState.pendingUnobservations.push(observable);
    }
}

export function _getGlobalState() {
    return globalState;
}

export default globalState;


