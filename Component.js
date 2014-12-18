var Rx = require('rx');
var utils = require("./utils");

var mix = utils.mix;
var toArray = utils.toArray;
var pluck = utils.pluck;
var cloneVirtualNode = utils.cloneVirtualNode;

var Observable = Rx.Observable;
var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate);




function Component(model) {
    this.states = new Rx.BehaviorSubject(model);
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
            isVNode = Boolean(children),
            isComponent = (component instanceof Observable),
            childObservables;

        if (isComponent) {
            obs = component.switchMap(toVDOMS);

        } else if (isVNode && children.length > 0) {

            childObservables = children.map(toVDOMS);

            childObservables.push(function() {

                var latestChildren = toArray(arguments);

                // TODO: Is this too heavy?
                // Can we do something where we don't have to clone at all.

                var copy = cloneVirtualNode(component);
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

        var self = this;

        if (!this.vdoms) {
            this.vdoms =
                this.toVDOMS(
                    this.states.
                        distinctUntilChanged(
                            pluck('state'),
                            function(prev, next) {
                                var same = (prev === next);
                                // console.log(same);
                                return same;
                        }).
                        doAction(function() {
                            // console.log("Component State onNexted: " + self._key);
                        }).
                        map(this.render)
                ).
                publish().
                refCount();
        }

        return this.vdoms.subscribe.apply(this.vdoms, arguments);
    }
});

Component._cache = {};

Component.create = function(componentName, proto) {

    var component = function(state) {

        var comp,
            key = (state) && (state.path.join(".") + "-" + componentName);

        if (key) {
            comp = Component._cache[key];
        }

        if (!comp) {
            if (!(this instanceof component)) {
                comp = new component(state);
            } else {
                Component.call(this, state);

                comp = this;

                if (key) {
                    Component._cache[key] = comp;

                    // Temp. For Debugging/Logging
                    comp._key = key;
                }

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
