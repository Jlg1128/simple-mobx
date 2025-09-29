import { endBatch, startBatch } from "./globalstate";

function runInAction<T>(fn: () => T): T {
    startBatch();
    const res = fn();
    endBatch();
    return res;
}

export default runInAction;
