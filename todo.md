1. observable、autorun
2. 实现reaction、computed


初始化
observableFactories.object -> extendObservable -> adm.extend_(createObservableAnnotation函数的extend_ = adm.defineObservableProperty_)
-> this.values_.set(key, observable) -> this.values(atom).reportObserved -> globalState.trackingDerivation.newObserving_ = observable;

autorun逻辑
autorun创建了一个reaction -> reaction.schedule_ -> runReactions -> reaction.track -> trackDerivedFunction -> 
bindDependencies(将观察到的observables绑定到reaction.observing_)上，并且将reaction添加到observable.observers_上

变更了值
setObservablePropValue_ -> if (newValue !== globalState.UNCHANGED) { -> ;(observable as ObservableValue<any>).setNewValue_(newValue)
-> reportChanged -> propagateChanged -> observable.observers_._onBecomeStale

数据结构

adm
```json
{
    // 负责values、entries、ownKeys的变更
    "keysToAtom":  Atom,
    "target_": 代理对象,
    "values": new Map<string, observable>
}
```

observableValue
```json
{
    "observers": derivations,
    "enhancer: 在初始化时对value进行增强，比如deepEnhancer，对深层次对象进行observable化,
    "value_": 值,
    "name_": 形式ObservableObject@1.test，用来debug，
    "flags_" 掩码标记状态
}

```

reaction
```json
{
    "observing_": observableValue,
    "newObserving_": [],
    "onInvalidate_": () => void, view层,
    "dependenciesState_": NOT_TRACKING(-1), UP_TO_DATE(0), STALE(1)
}
```

## current
还需要什么功能？
1. observable object 测试，打牢基础
2. performance 测试用例，优化性能
    deleteProperty
    keepAlive_是什么，没有keepAlive endBatch之后就没了
    setter是什么
    trackingContext是什么