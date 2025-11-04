import { EMPTY_ARRAY, hasListeners, hasProp, IListenable, isObject, Lambda, notifyListeners, registerListener } from "../utils";
import { getDevId } from "./globalstate";
import { CreateObservableOptions } from "./observable";
import { $mobx } from "./observableBase";
import { deepEnhancer, IEnhancer, ObservableValue } from "./observableValue";

export interface IObservableArray<T = any> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[]
    clear(): T[]
    toJSON(): T[]
}

const SPLICE = "splice"
const UPDATE = "update"

interface IArrayBaseChange<T> {
    observableKind: "array"
    debugObjectName: string
    index: number
}

export interface IArraySplice<T = any> extends IArrayBaseChange<T> {
    type: "splice"
    added: T[]
    addedCount: number
    removed: T[]
    removedCount: number
}

export interface IArrayUpdate<T = any> extends IArrayBaseChange<T> {
    type: "update"
    newValue: T
    oldValue: T
}

export type IArrayDidChange<T = any> = IArrayUpdate<T> | IArraySplice<T>

export var arrayExtensions = {
    clear(): any[] {
        return this.splice(0)
    },

    replace(newItems: any[]) {
        const adm: ObservableArrayAdministration = this[$mobx]
        return adm.spliceWithArray_(0, adm.values_.length, newItems)
    },

    // Used by JSON.stringify
    toJSON(): any[] {
        return this.slice()
    },

    /*
     * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
     * since these functions alter the inner structure of the array, the have side effects.
     * Because the have side effects, they should not be used in computed function,
     * and for that reason the do not call dependencyState.notifyObserved
     */
    splice(index: number, deleteCount?: number, ...newItems: any[]): any[] {
        const adm: ObservableArrayAdministration = this[$mobx]
        switch (arguments.length) {
            case 0:
                return []
            case 1:
                return adm.spliceWithArray_(index)
            case 2:
                return adm.spliceWithArray_(index, deleteCount)
        }
        return adm.spliceWithArray_(index, deleteCount, newItems)
    },

    spliceWithArray(index: number, deleteCount?: number, newItems?: any[]): any[] {
        return (this[$mobx] as ObservableArrayAdministration).spliceWithArray_(
            index,
            deleteCount,
            newItems
        )
    },

    push(...items: any[]): number {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.spliceWithArray_(adm.values_.length, 0, items)
        return adm.values_.length
    },

    pop() {
        return this.splice(Math.max(this[$mobx].values_.length - 1, 0), 1)[0]
    },

    shift() {
        return this.splice(0, 1)[0]
    },

    unshift(...items: any[]): number {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.spliceWithArray_(0, 0, items)
        return adm.values_.length
    },

    reverse(): any[] {
        this.replace(this.slice().reverse())
        return this
    },

    sort(): any[] {
        const copy = this.slice()
        copy.sort.apply(copy, arguments)
        this.replace(copy)
        return this
    },

    remove(value: any): boolean {
        const adm: ObservableArrayAdministration = this[$mobx]
        const idx = adm.values_.indexOf(value)
        if (idx > -1) {
            this.splice(idx, 1)
            return true
        }
        return false
    }
}


export function createObservableArray<T>(
    initialValues: T[] | undefined,
    enhancer: IEnhancer<any> = deepEnhancer,
    options?: CreateObservableOptions,
): IObservableArray<T> {
    const name = options?.name ?? 'ObservableArray@' + getDevId()
    const adm = new ObservableArrayAdministration(initialValues || [], name, enhancer);
    const proxy = new Proxy(adm.values_, {
        get(target: any, name: PropertyKey) {
            if (name === $mobx) {
                return adm
            }
            if (name === "length") {
                return adm.getArrayLength_()
            }
            if (typeof name === "string" && !isNaN(name as any)) {
                return adm.get_(parseInt(name))
            }
            if (hasProp(arrayExtensions, name)) {
                return arrayExtensions[name]
            }
            return target[name]
        },
        set(target: any, name: PropertyKey, newValue: any): boolean {
            const adm: ObservableArrayAdministration = target[$mobx]
            if (name === "length") {
                adm.setArrayLength_(newValue)
            } else if (typeof name === "symbol" || isNaN(name as any)) {
                target[name] = newValue
            } else {
                // numeric string
                adm.set_(parseInt(name as string), newValue)
            }
            return true
        }
    })
    Object.defineProperty(adm.values_, $mobx, {
        value: adm,
        enumerable: false,
        writable: true,
        configurable: true
    })
    return proxy;
}

export class ObservableArrayAdministration implements IListenable {


    atom: ObservableValue<string>;

    // @ts-ignore
    enhancer: IEnhancer<any>;

    changeListeners_: Function[] | undefined;

    constructor(
        readonly values_: any[],
        private name: string,
        enhancer: IEnhancer<any>,
    ) {
        this.enhancer = (newValue: any, name?: string) => {
            return enhancer(newValue, name || "ObservableArray[..]");
        }
        this.atom = new ObservableValue(name);
    }

    getArrayLength_() {
        this.atom.reportObserved();
        return this.values_.length;
    }

    setArrayLength_(newLength: number) {
        const currentLength = this.values_.length;
        if (newLength === currentLength) {
            return
        } else {
            this.values_.length = newLength;
            this.atom.reportChanged();
        }
    }

    notifyArraySplice_(index: number, added: any[], removed: any[]) {
        const notify = hasListeners(this)
        const change: IArraySplice | null =
            notify ? ({
                observableKind: "array",
                debugObjectName: this.atom.name,
                type: SPLICE,
                index,
                removed,
                added,
                removedCount: removed.length,
                addedCount: added.length
            } as const)
                : null

        this.atom.reportChanged()
        if (notify) {
            notifyListeners(this, change)
        }
    }

    get_(name: PropertyKey) {
        this.atom.reportObserved();
        return this.values_[name];
    }

    set_(index: number, value: any): boolean {
        const oldValue = this.values_[index];
        const newValue = this.enhancer(value, this.name)
        if (oldValue !== newValue) {
            this.values_[index] = value;
            this.atom.reportChanged();
            this.notifyUpdate(index, newValue, oldValue)
        }
        return true;
    }

    _observe(callback: (changes: IArrayDidChange<any>) => void, fireImmediately?: boolean): Lambda {
        return registerListener(this, callback)
    }

    notifyUpdate(index: number, newValue: any, oldValue: any) {
        const change: IArrayDidChange<any> = {
            observableKind: 'array',
            debugObjectName: this.name,
            index,
            type: UPDATE,
            newValue,
            oldValue,
        }
        notifyListeners(this, change)
    }

    clear() {
        this.values_.length = 0;
        this.atom.reportChanged();
        return this.values_;
    }

    toJSON() {
        return this.values_;
    }

    spliceWithArray_(index: number, deleteCount?: number, newItems?: any[]): any[] {
        const length = this.values_.length

        if (index === undefined) {
            index = 0
        } else if (index > length) {
            index = length
        } else if (index < 0) {
            index = Math.max(0, length + index)
        }

        if (arguments.length === 1) {
            deleteCount = length - index
        } else if (deleteCount === undefined || deleteCount === null) {
            deleteCount = 0
        } else {
            deleteCount = Math.max(0, Math.min(deleteCount, length - index))
        }

        if (newItems === undefined) {
            newItems = EMPTY_ARRAY
        }

        newItems =
            newItems.length === 0 ? newItems : newItems.map(v => this.enhancer(v, ''))
        const res = this.spliceItemsIntoValues_(index, deleteCount, newItems)

        if (deleteCount !== 0 || newItems.length !== 0) {
            this.notifyArraySplice_(index, newItems, res)
        }
        return res;
    }

    spliceItemsIntoValues_(index: number, deleteCount: number, newItems: any[]): any[] {
        return this.values_.splice(index, deleteCount, ...newItems)
    }
}

export function isObservableArray(thing): thing is IObservableArray<any> {
    return isObject(thing) && thing[$mobx] instanceof ObservableArrayAdministration;
}
