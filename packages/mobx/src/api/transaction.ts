import { endBatch, startBatch } from "../core/globalstate";

export function transaction(func: Function) {
    startBatch();
    func();
    endBatch();
}