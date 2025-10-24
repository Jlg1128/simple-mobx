import { clearObserving, IDerivation, IDerivationState, shouldCompute, trackDerivationFn } from "./derivation";
import globalState, { endBatch, startBatch } from "./globalstate";
import { $mobx, IObservable } from "./observableBase";

export function runReactions() {
    if (globalState.inBatch) {
        // 后续的reaction都在globalState.pendingReactions中
        return;
    }
    let reactions = globalState.pendingReactions;
    while (reactions.length) {
        // iterate too much error
        const remainingReaction = reactions.splice(0)[0];
        remainingReaction._runReaction();
    }
}

interface IReaction {
    dispose: () => void;
}

export interface IReactionDisposer {
    (): void
    [$mobx]: Reaction
}

class Reaction implements IDerivation, IReaction {
    observing_: IObservable[] = [];
    newObserving_: IObservable[] = [];
    dependenciesState_ = IDerivationState.NOT_TRACKING;
    runId_ = 0;
    disposesd = false;

    constructor(
        public name_: string = "Reaction@" + globalState.getDevId(),
        private onInvalidate: () => void,
    ) {

    }

    dispose = () => {
        if (!this.disposesd) {
            this.disposesd = true;
            clearObserving(this);
        }
    };

    getDisposer(): IReactionDisposer {
        const dispose = (() => {
            this.dispose()
        }) as IReactionDisposer
        dispose[$mobx] = this

        if ("dispose" in Symbol && typeof Symbol.dispose === "symbol") {
            dispose[Symbol.dispose] = dispose
        }
        return dispose;
    }

    _schedule() {
        globalState.pendingReactions.push(this);
        runReactions();
    }

    _onBecomeStale() {
        this._schedule();
    }

    _runReaction() {
        const prev = globalState.trackingDerivation
        globalState.trackingDerivation = this;
        if (shouldCompute(this)) {
            try {
                this.onInvalidate();
            } catch (error) {
                throw error;
            }
        }
        globalState.trackingDerivation = prev;
    }

    track(fn) {
        startBatch();
        trackDerivationFn(this, fn);
        endBatch();
    }
}
function isReaction(value: any): value is Reaction {
    return value instanceof Reaction;
}

export {
    Reaction,
    isReaction,
}