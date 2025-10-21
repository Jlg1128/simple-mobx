import { IDerivation, IDerivationState, shouldCompute, trackDerivationFn } from "./derivation";
import { getDevId } from "./globalstate";
import { IObservable, reportChanged, reportObserved } from "./observableBase";

export interface IComputedValue<T> {
    get(): T
    set(value: T): void;
}

// @ts-ignore
function computed(fn: () => void) {
    if (fn) {
        return new Computed(fn);
    }
    return null;
}

class Computed<T> implements IDerivation, IComputedValue<T>, IObservable {
    observing_: IObservable[] = [];
    newObserving_: IObservable[] = [];
    dependenciesState_ = IDerivationState.NOT_TRACKING;
    runId_ = 0;
    disposesd = false;
    lastAccessedBy_ = 0;
    lowestObserverState_ = IDerivationState.UP_TO_DATE;
    observers_: Set<IDerivation> = new Set();
    value_: T;

    constructor(
        public fn: () => void,
        public name = 'Computed@' + getDevId(),
    ) {

    }

    _onBecomeStale() {
        if (this.lowestObserverState_ !== IDerivationState.UP_TO_DATE) {
            return
        }
        this.lowestObserverState_ = IDerivationState.POSSIBLY_STALE;
        this.observers_.forEach((observer) => {
            if (observer.dependenciesState_ === IDerivationState.UP_TO_DATE) {
                observer.dependenciesState_ = IDerivationState.POSSIBLY_STALE;
                observer._onBecomeStale();
            }
        })
    }

    trackAndCompute() {
        const oldValue = this.value_;
        this.value_ = trackDerivationFn(this, this.fn);
        let changed = false;
        if (!Object.is(oldValue, this.value_)) {
            changed = true;
        }
        return changed;
    }

    get() {
        this.reportObserved();
        if (shouldCompute(this)) {
            if (this.trackAndCompute()) {
                if (this.lowestObserverState_ !== IDerivationState.STALE) {
                    this.lowestObserverState_ = IDerivationState.UP_TO_DATE;
                    this.observers_.forEach((observer) => {
                        if (observer.dependenciesState_ === IDerivationState.POSSIBLY_STALE) {
                            observer.dependenciesState_ = IDerivationState.STALE;
                        }
                    })
                }
            }
        }
        return this.value_;
    }

    public set(value: T) {

    }

    reportChanged() {
        reportChanged(this);
    }

    reportObserved() {
        reportObserved(this);
    }

    onUnObserved(): void {

    }

    onObserved(): void {

    }
}

function isComputed(value: any): value is Computed<any> {
    return value instanceof Computed;
}

export {
    computed,
    Computed,
    isComputed,
}