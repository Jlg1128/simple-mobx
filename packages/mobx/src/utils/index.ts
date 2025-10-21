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

export * from './listenable';