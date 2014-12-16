var Rx = require('rx');

var Observable = Rx.Observable;
var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate);

function toArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike, 0);
}

function mix(r, s) {
    for (var p in s) {
        r[p] = s[p];
    }
}

function Component(state) {
    this.states = new Rx.BehaviorSubject(state);
    this.mounted = new Rx.BehaviorSubject(false);
}

Component.prototype = Object.create(Observable.prototype);

mix(Component.prototype, {

    constructor: Component,

    type: 'Widget',

    setState: function(state) {
        this.states.onNext(state);
    },

    toVDOMS: function toVDOMS(component) {

        var obs,
            children = component.children,
            childObservables;

        if (component instanceof Observable) {
            obs = component.switchMap(toVDOMS);

        } else if (children && children.length > 0) {
            childObservables = children.map(toVDOMS);

            childObservables.push(function() {

                var latestChildren = toArray(arguments);

                // TODO: This is way too heavy.
                // Has to be a better way (Object.create() maybe a little better),
                // but ideally, something where we don't have to clone at all.
                var copy = {};
                mix(copy, component);

                copy.children = latestChildren;

                return copy;
            });

            obs = Observable.combineLatest.apply(Observable, childObservables);

        } else {
            obs = ObservableOfSync(component);

        }

        return obs;
    },

    mount: function() {
        this.mounted.onNext(true);
    },

    unmount: function() {
        this.mounted.onNext(false);
    },

    _subscribe: function() {

        if (!this.vdoms) {
            this.vdoms = this.toVDOMS(this.states.map(this.render)).publish().refCount();
        }

        return this.vdoms.subscribe.apply(this.vdoms, arguments);
    }
});

Component._cache = {};

Component.create = function(componentName, proto) {

    var component = function(state) {

        var comp,
            key = (state) && (state.guid + "-" + componentName);

        if (key) {
            comp = Component._cache[key];
        }

        if (!comp) {
            if (!(this instanceof component)) {
                comp = new component(state);
            } else {
                Component.call(this, state);

                if (key) {
                    Component._cache[key] = this;
                }

                comp = this;
            }

        } else {
            comp.setState(state);
        }

        return comp;
    };

    component.prototype = Object.create(Component.prototype);

    mix(component.prototype, {
        constructor: component,
        name: componentName
    });

    mix(component.prototype, proto);

    return component;
}


module.exports = Component;
