const plainObjectString = Object.toString()

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