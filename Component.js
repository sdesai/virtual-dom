var Rx = require('rx');
var utils = require('./utils');
// var AttributeSetHook = require('./virtual-hyperscript/hooks/attribute-hook.js');

var mix = utils.mix;
var toArray = utils.toArray;
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
        console.log('Component setState(): ' + this._cacheKey);
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
        console.log('Mounted: ' + this._cacheKey);
        this.mounted.onNext(true);
    },

    _unmount: function _unmount(vNode) {

        var component;

        if (vNode && 'VirtualNode' === vNode.type) {

            if (vNode.children && vNode.children.length > 0) {
                vNode.children.forEach(_unmount);
            }

            component = vNode._component;

            if (component) {
                delete Component._cache[component._cacheKey];
                console.log('Unmounted: ' + component._cacheKey);
                component.mounted.onNext(false);
            }
        }
    },

    unmount: function(vNode) {
        this._unmount(vNode);
    },

    _subscribe: function() {

        var self = this;

        if (!this.vdoms) {
            this.vdoms =
                this.toVDOMS(
                    this.states.
                        distinctUntilChanged(
                            function(model) {
                                return model.state;
                            },
                            function(prev, next) {
                                var same = (prev === next);
                                // console.log('Are 'states' distinct: ' + !same);
                                return same;
                            }).
                        doAction(function() {
                            console.log('Rendering: ' + self._cacheKey)
                        }).
                        map(this.render.bind(this))
                ).
                map(function(vdom) {
                    // vdom.properties['data-cachekey'] = AttributeSetHook(null, self._cacheKey);
                    vdom._component = self;
                    return vdom;
                }).
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
            key = (state) && (componentName + '-[' + state.path.join('.') + ']');

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
                    comp._cacheKey = key;
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
