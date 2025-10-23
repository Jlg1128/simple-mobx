import { UPDATE } from "../constant";
import { Lambda, toPrimitive } from "../utils";
import { comparer, IEqualsComparer } from "../utils/comparer";
import { autorun } from "./autorun";
import { clearObserving, IDerivation, IDerivationState, shouldCompute, trackDerivationFn } from "./derivation";
import globalState, { endBatch, getDevId, startBatch, untrackedEnd, untrackedStart } from "./globalstate";
import { IObservable, reportChanged, reportObserved } from "./observableBase";

export interface IComputedValue<T> {
    get(): T;
    set(value: T): void;
}

// @ts-ignore
function computed<T>(fn: () => T, options?: ComputedOption<T>) {
    return new Computed<T>(fn, options);
}

type IComputedDidChange<T = any> = {
    type: "update"
    observableKind: "computed"
    object: unknown
    debugObjectName: string
    newValue: T | undefined;
    oldValue: T | undefined
}

type ComputedOption<T> = {
    name?: string;
    equalFn?: IEqualsComparer<T>;
    compareStructural?: boolean;
    struct?: string;
    keepAlive?: boolean;
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
    // @ts-ignore
    value_: T | undefined;
    name: string;
    private equals_: IEqualsComparer<any>;
    private keepAlive?: boolean;

    constructor(
        public fn: () => T,
        options?: ComputedOption<T>,
    ) {
        this.equals_ =
            options?.equalFn ||
            (options?.compareStructural || options?.struct
                ? comparer.structural
                : comparer.default)
        this.name = options?.name || ('Computed@' + getDevId());
        this.keepAlive = options?.keepAlive || false;
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
        this.value_ = trackDerivationFn<T>(this, this.fn);
        let changed = false;
        if (!this.equals_(oldValue, this.value_)) {
            changed = true;
        }
        return changed;
    }

    get(): T {
        if (this.observers_.size === 0 && !globalState.inBatch && !this.keepAlive) {
            if (shouldCompute(this)) {
                // this.warnAboutUntrackedRead_()
                startBatch() // See perf test 'computed memoization'
                this.value_ = this.fn()
                endBatch()
            }
        } else {
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
        }
        return this.value_!;
    }

    public set(value: T) {

    }

    _suspend() {
        if (!this.keepAlive) {
            clearObserving(this);
            this.value_ = undefined;
        }
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

    _observe(listener: (change: IComputedDidChange<T>) => void, fireImmediately?: boolean): Lambda {
        let firstTime = true
        let prevValue: T | undefined = undefined
        return autorun(() => {
            // TODO: why is this in a different place than the spyReport() function? in all other observables it's called in the same place
            let newValue = this.get()
            if (!firstTime || fireImmediately) {
                const prevU = untrackedStart()
                listener({
                    observableKind: "computed",
                    debugObjectName: this.name,
                    type: UPDATE,
                    object: this,
                    newValue,
                    oldValue: prevValue
                })
                untrackedEnd(prevU)
            }
            firstTime = false
            prevValue = newValue
        })
    }

    toJSON() {
        return this.get()
    }

    toString() {
        return `${this.name}[${this.value_}]`
    }

    valueOf(): T {
        return toPrimitive(this.get())
    }

    [Symbol.toPrimitive]() {
        return this.valueOf()
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