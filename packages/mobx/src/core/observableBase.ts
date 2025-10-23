import { IDerivation, IDerivationState } from "./derivation"
import globalState, { endBatch, startBatch } from "./globalstate";

export const $mobx = Symbol("mobx administration")

export interface IObservable {
    // diffValue: number
    /**
     * Id of the derivation *run* that last accessed this observable.
     * If this id equals the *run* id of the current derivation,
     * the dependency is already established
     */
    lastAccessedBy_: number
    // isBeingObserved: boolean

    lowestObserverState_: IDerivationState // Used to avoid redundant propagations
    // isPendingUnobservation: boolean // Used to push itself to global.pendingUnobservations at most once per batch.

    observers_: Set<IDerivation>

    onUnObserved(): void
    onObserved(): void

    reportObserved: () => void;

    reportChanged: () => void;

    recorded?: boolean;
}

export function reportChanged(observable: IObservable) {
    startBatch();
    propagateChanged(observable);
    endBatch();
}

export function reportObserved(observable: IObservable) {
    const derivation = globalState.trackingDerivation;
    if (derivation !== null) {
        derivation.newObserving_!.push(observable);
        observable.onObserved();
    } else if (observable.observers_.size === 0) {
        globalState.pendingUnobservations.push(observable);
    }
}

export function propagateChanged(observable: IObservable) {
    // 避免重复
    if (observable.lowestObserverState_ !== IDerivationState.STALE) {
        observable.lowestObserverState_ = IDerivationState.STALE;
        observable.observers_.forEach((d) => {
            if (d.dependenciesState_ === IDerivationState.UP_TO_DATE) {
                d._onBecomeStale();
            }
            d.dependenciesState_ = IDerivationState.STALE;
        })
    }
}

export class ObservableBase implements IObservable {
    observers_ = new Set<IDerivation>();
    lastAccessedBy_ = 0;
    lowestObserverState_ = IDerivationState.NOT_TRACKING;

    constructor(
        public name = 'observableBase@' + globalState.getDevId()
    ) {

    }

    reportObserved() {
        reportObserved(this);
    }

    reportChanged() {
        reportChanged(this);
    }

    onObserved() {

    }

    onUnObserved() {

    }
}

export function isObservableBase(value: any): value is ObservableBase {
    return value instanceof ObservableBase;
}

export function removeObserver(observable: IObservable, derivation: IDerivation) {
    observable.observers_.delete(derivation);
    if (observable.observers_.size === 0) {
        // deleting last observer
        globalState.pendingUnobservations.push(observable)
    }
}