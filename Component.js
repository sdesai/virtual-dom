var Rx = require('rx');
var utils = require('./utils');
// var AttributeSetHook = require('./virtual-hyperscript/hooks/attribute-hook.js');

var toArray = utils.toArray;
var log = utils.log;
var extend = utils.extend;
var cloneVirtualNode = utils.cloneVirtualNode;

var Observable = Rx.Observable;
var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate);

function Component(model) {
    this.states = new Rx.BehaviorSubject(model);
    this.mounted = new Rx.BehaviorSubject({mounted:false});

    var self = this;
    this.mounted.subscribe(function(o){

        var component = o.vNode && o.vNode._component,
            cacheKey = component && component._cacheKey;

        if (cacheKey) {
            if (o.mounted) {
                log("Mounted: " + cacheKey);
            } else {
                log("Unmounted: " + cacheKey);
            }
        }

    });
}

extend(Component, Observable, {

    type: 'Widget',

    setState: function(state) {
        log('Component setState(): ' + this._cacheKey);
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

    mount: function(vNode) {

        this._mount(vNode);

        if (vNode.children && vNode.children.length > 0) {
            vNode.children.forEach(function(childVNode) {
                if (childVNode._component) {
                    childVNode._component.mount(childVNode);
                }
            });
        }
    },

    unmount: function(vNode) {

        this._unmount(vNode);

        if (vNode.children && vNode.children.length > 0) {
            vNode.children.forEach(function(childVNode) {
                if (childVNode._component) {
                    childVNode._component.unmount(childVNode);
                }
            });
        }
    },

    _mount: function(vNode) {
        this.mounted.onNext({
            mounted: true,
            vNode: vNode
        });
    },

    _unmount: function(vNode) {
        delete Component._cache[this._cacheKey];

        this.mounted.onNext({
            mounted: false,
            vNode: vNode
        });
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

                                log('Are "states" distinct: ' + !same);

                                return same;
                            }).
                        doAction(function() {
                            log('Rendering: ' + self._cacheKey)
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

    extend(component, Component, proto);
    component.prototype.name = componentName;

    return component;
}


module.exports = Component;
