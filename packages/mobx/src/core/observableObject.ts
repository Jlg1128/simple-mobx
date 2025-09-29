import { $mobx } from "./observableBase";
import { deepEnhancer, IEnhancer, ObservableValue } from "./observableValue";

const descriptorCache = Object.create(null)


function getCachedObservablePropDescriptor(key) {
    return (
        descriptorCache[key] ||
        (descriptorCache[key] = {
            get: function() {
                return this[$mobx].getObservablePropValue_(key)
            },
            set: function(value) {
                return this[$mobx].setObservablePropValue_(key, value)
            }
        })
    )
}

export class ObservableObjectAdministration {
    _proxy: any;
    _values: Map<PropertyKey, ObservableValue> = new Map();
    constructor(
        public target: any,
        public name: string,
    ) {
    }

    defineObservableProperty_(key: PropertyKey, value: any, enhancer: IEnhancer<any>) {
        const observabledVal = new ObservableValue(value, enhancer, this.name + '.' + key.toString());
        const cachedDescriptor = getCachedObservablePropDescriptor(key);
        const descriptor = {
            configurable: true,
            enumerable: true,
            get: cachedDescriptor.get,
            set: cachedDescriptor.set
        }
        Object.defineProperty(this.target, key, descriptor);
        this._values.set(key, observabledVal);
    }

    getObservablePropValue_(key) {
        return this._values.get(key).get();
    }

    setObservablePropValue_(key, value) {
        this._values.get(key).set(value);
        return true;
    }

    _get(key) {
        return this.target[key];
    }

    _set(key, newValue) {
        if (this.target.hasOwnProperty(key)) {
            this.setObservablePropValue_(key, newValue);
        } else {
            this.defineObservableProperty_(key, newValue, deepEnhancer);
        }
        return true;
    }

    _has(key) {
        return key in this.target;
    }

    _ownKeys() {
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
        this._values.delete(key);
        observable.reportChanged();
        return true;
    }

    _defineProperty(key, descriptor) {
        this._delete(key);
        Object.defineProperty(this.target, key, descriptor);
        return true;
    }
}
