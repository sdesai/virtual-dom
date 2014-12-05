var Rx = require('rx');

var Observable = Rx.Observable;
var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate);

function toArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike, 0);
}

function Component(state) {
    this.states = new Rx.BehaviorSubject(state);
    this.mounted = new Rx.BehaviorSubject(false);
}

Component._cache = {};

Component.create = function(proto) {

    var component = function(state) {

        var comp;

        if (state && state._guid) {
            comp = Component._cache[state._guid];
        }

        if (!comp) {

            if (!(this instanceof component)) {
                comp = new component(state);
            } else {
                Component.call(this, state);

                if (state && state._guid) {
                    Component._cache[state._guid] = this;
                }

                comp = this;
            }

        } else {
            comp.setState(state);
        }

        return comp;
    };

    component.prototype = Object.create(Component.prototype);
    component.prototype.constructor = component;

    for (var o in proto) {
        component.prototype[o] = proto[o];
    }

    return component;
}

Component.prototype = Object.create(Observable.prototype);
Component.prototype.constructor = Component;
Component.prototype.type = "Widget";

Component.prototype.render = function(state) {return null};

Component.prototype.setState = function(state) {
    this.states.onNext(state);
};

Component.prototype.toVDOMS = function toVDOMS(component) {

    var obs,
        children = component.children,
        childObservables;

    if (component instanceof Observable) {
        obs = component.switchMap(toVDOMS);

    } else if (children && children.length > 0) {
        childObservables = children.map(toVDOMS);

        childObservables.push(function() {
            var latestChildren = toArray(arguments);
            component.children = latestChildren;
            return component;
        });

        obs = Observable.combineLatest.apply(Observable, childObservables);

    } else {
        obs = ObservableOfSync(component);

    }

    return obs;
};

Component.prototype.mount = function() {
    this.mounted.onNext(true);
};

Component.prototype.unmount = function() {
    this.mounted.onNext(false);
};

Component.prototype._subscribe = function() {

    if (!this.vdoms) {
        this.vdoms = this.toVDOMS(this.states.map(this.render));
    }

    return this.vdoms.subscribe.apply(this.vdoms, arguments);
};

module.exports = Component;
