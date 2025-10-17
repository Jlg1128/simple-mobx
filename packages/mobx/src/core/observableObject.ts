import { hasProp } from "../utils";
import globalState, { endBatch, startBatch } from "./globalstate";
import { $mobx, propagateChanged } from "./observableBase";
import { deepEnhancer, IEnhancer, ObservableValue } from "./observableValue";

const descriptorCache = Object.create(null)


function getCachedObservablePropDescriptor(key) {
    return (
        descriptorCache[key] ||
        (descriptorCache[key] = {
            get: function () {
                return this[$mobx].getObservablePropValue_(key)
            },
            set: function (value) {
                return this[$mobx].setObservablePropValue_(key, value)
            }
        })
    )
}

export class ObservableObjectAdministration {
    private _values: Map<PropertyKey, ObservableValue<any>> = new Map();
    // 记录被删除的key的observers，以便后续重新赋值该key
    private _pendingKeys: Map<PropertyKey, ObservableValue<any>> = new Map();
    private ownKeysAtom: ObservableValue<string> | undefined;

    constructor(
        private target: any,
        private name: string,
    ) {
        this.ownKeysAtom = new ObservableValue(`${this.name}.keys`)
    }

    defineObservableProperty_(key: PropertyKey, value: any, enhancer: IEnhancer<any>) {
        startBatch();
        try {
            const observableVal = new ObservableValue(value, enhancer, this.name + '.' + key.toString());
            const cachedDescriptor = getCachedObservablePropDescriptor(key);
            const descriptor = {
                configurable: true,
                enumerable: true,
                get: cachedDescriptor.get,
                set: cachedDescriptor.set
            }
            Object.defineProperty(this.target, key, descriptor);
            this._values.set(key, observableVal);
            this._notifyPropertyAddition(key, value);
        } finally {
            endBatch();
        }
    }

    getObservablePropValue_(key) {
        return this._values.get(key).get();
    }

    setObservablePropValue_(key, value) {
        this._values.get(key).set(value);
        return true;
    }

    _get(key: PropertyKey) {
        if (globalState.trackingDerivation && !hasProp(this.target, key)) {
            this._has(key);
        }
        return this.target[key];
    }

    _set(key, newValue) {
        if (hasProp(this.target, key)) {
            this.setObservablePropValue_(key, newValue);
        } else {
            this.defineObservableProperty_(key, newValue, deepEnhancer);
        }
        return true;
    }

    _has(key) {
        if (!globalState.trackingDerivation) {
            return hasProp(this.target, key);
        }
        let entry = this._pendingKeys.get(key);
        if (!entry) {
            entry = new ObservableValue(hasProp(this.target, key), undefined, this.name + `.${key}?`);
            this._pendingKeys.set(key, entry);
        }
        return entry.get();
    }

    _ownKeys() {
        this.ownKeysAtom.reportObserved();
        return Reflect.ownKeys(this.target);
    }

    _delete(key) {
        if (!(key in this.target)) {
            return true;
        }
        const observable = this._values.get(key);
        if (!Reflect.deleteProperty(this.target, key)) {
            return false;
        }
        startBatch();
        this._values.delete(key);
        delete this.target[key];
        propagateChanged(observable);
        this._pendingKeys?.get(key)?.set(hasProp(this.target, key))
        this.ownKeysAtom.reportChanged();
        endBatch();
        return true;
    }

    _defineProperty(key, descriptor) {
        startBatch();
        this._delete(key);
        Object.defineProperty(this.target, key, descriptor);
        this._notifyPropertyAddition(key, descriptor.value);
        endBatch();
        return true;
    }

    _notifyPropertyAddition(key, value) {
        this._pendingKeys.get(key)?.set(true);
        this.ownKeysAtom.reportChanged();
    }
}
