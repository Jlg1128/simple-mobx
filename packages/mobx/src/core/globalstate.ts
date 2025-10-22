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

export default globalState;


