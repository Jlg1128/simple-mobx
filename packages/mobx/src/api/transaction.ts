import { endBatch, startBatch } from "../core/globalstate";

export function transaction(func: Function, ...args: any) {
    startBatch()
    try {
        return func.apply(null, args)
    } finally {
        endBatch()
    }
}