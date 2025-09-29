import { isComputed } from "./computed";
import globalState from "./globalstate";
import { IObservable } from "./observableBase"

export enum IDerivationState {
    NOT_TRACKING = -1,
    UP_TO_DATE = 0,
    POSSIBLY_STALE = 1,
    STALE = 2
}

type IDerivation = {
    observing_: IObservable[] | null;
    newObserving_: IObservable[] | null;
    dependenciesState_: IDerivationState
    runId_: number
    _onBecomeStale(): void
}

export function shouldCompute(derivation: IDerivation) {
    switch (derivation.dependenciesState_) {
        case IDerivationState.UP_TO_DATE:
            return false;
        case IDerivationState.NOT_TRACKING:
        case IDerivationState.STALE:
            return true;
        case IDerivationState.POSSIBLY_STALE: {
            const observings = derivation.observing_ || [];
            for (let i = 0; i < observings.length; i++) {
                const obj = observings[i];
                if (isComputed(obj)) {
                    obj.get();
                    // @ts-ignore
                    if (derivation.dependenciesState_ === IDerivationState.STALE) {
                        return true;
                    }
                }
            }
            changeDependenciesStateTo0(derivation);
            return false;
        }
        default:
            return true;
    }
}

export function bindDependencies(derivation: IDerivation) {
    const prevObserving = derivation.observing_ || [];
    const newObserving_ = derivation.newObserving_ || [];
    // let lowestNewObservingDerivationState = IDerivationState.UP_TO_DATE;
    prevObserving.forEach((observe) => {
        observe.recorded = false;
    })
    newObserving_.forEach((observe) => {
        observe.recorded = true;
    })
    prevObserving.forEach((observe) => {
        if (!observe.recorded) {
            observe.observers_.delete(derivation);
            if (observe.observers_.size === 0) {
                globalState.pendingUnobservations.push(observe);
            }
        }
    })
    newObserving_.forEach((observe) => {
        observe.observers_.add(derivation);
    })

    derivation.observing_ = newObserving_;
    derivation.newObserving_ = null;
}

export function changeDependenciesStateTo0(derivation: IDerivation) {
    if (derivation.dependenciesState_ === IDerivationState.UP_TO_DATE) {
        return
    }
    derivation.dependenciesState_ = IDerivationState.UP_TO_DATE

    const obs = derivation.observing_
    let i = obs.length
    while (i--) {
        obs[i].lowestObserverState_ = IDerivationState.UP_TO_DATE
    }
}

export function trackDerivationFn(derivation: IDerivation, fn: () => void) {
    changeDependenciesStateTo0(derivation);
    const prevTrackingDerivation = globalState.trackingDerivation;
    globalState.trackingDerivation = derivation;
    derivation.newObserving_ = [];
    const result = fn.call(derivation);
    bindDependencies(derivation);
    globalState.trackingDerivation = prevTrackingDerivation;
    return result;
}

export function clearObserving(derivation: IDerivation) {
    // const obs = derivation.observing_
    // derivation.observing_ = []
    // let i = obs.length
    // while (i--) {
    //     removeObserver(obs[i], derivation)
    // }

    // derivation.dependenciesState_ = IDerivationState_.NOT_TRACKING
}

export {
    IDerivation,
}