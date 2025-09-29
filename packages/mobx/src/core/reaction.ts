import { clearObserving, IDerivation, IDerivationState, shouldCompute, trackDerivationFn } from "./derivation";
import globalState, { endBatch, startBatch } from "./globalstate";
import { IObservable } from "./observableBase";

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
        this.disposesd = false;
    };

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
        if (this.disposesd) {
            clearObserving(this);
        }
        startBatch();
        trackDerivationFn(this, fn);
        endBatch();
    }
}

export {
    Reaction
}