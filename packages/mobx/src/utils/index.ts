const plainObjectString = Object.toString()

export interface Lambda {
    (): void
    name?: string
}

export function isObject(value: any): value is Object {
    return value !== null && typeof value === "object"
}

export function isPlainObject(value: any) {
    if (!isObject(value)) {
        return false
    }
    const proto = Object.getPrototypeOf(value)
    if (proto == null) {
        return true
    }
    const protoConstructor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor
    return (
        typeof protoConstructor === "function" && protoConstructor.toString() === plainObjectString
    )
}

export function isFunction(fn: any): fn is Function {
    return typeof fn === "function"
}

export function hasProp(target: Object, key: PropertyKey) {
    return Object.prototype.hasOwnProperty.call(target, key);
}

export function once(func: Lambda): Lambda {
    let runed = false;
    return function() {
        if (!runed) {
            runed = true;
            return (func as any).apply(this, arguments)
        }
    }
}

export function toPrimitive(value: any) {
    return value === null ? null : typeof value === "object" ? "" + value : value
}

export function getFlag(flags: number, mask: number) {
    return !!(flags & mask)
}

export function setFlag(flags: number, mask: number, newValue: boolean): number {
    if (newValue) {
        flags |= mask
    } else {
        flags &= ~mask
    }
    return flags
}

export const EMPTY_ARRAY = [];
export * from './listenable';