var Rx = require('rx');
var utils = require('./utils');
var AttributeSetHook = require('./virtual-hyperscript/hooks/attribute-hook.js');

var toArray = utils.toArray;
var log = utils.log;
var extend = utils.extend;
var cloneVirtualNode = utils.cloneVirtualNode;

var Observable = Rx.Observable;
var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate);

function Component(model) {

    this.states = new Rx.BehaviorSubject(model);
    this.mounted = new Rx.BehaviorSubject({mounted:false});

    // DEBUG
    this.mounted.subscribe(function(o) {
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

    type: 'Thunk',

    setState: function(state) {
        log('Component setState(): ' + this._cacheKey);
        this.states.onNext(state);
    },

    toVDOMS: function toVDOMS(component, path) {

        var obs,
            children = component.children,
            isVNode = Boolean(children),
            childObservables;

        path = path || [];

        if (component instanceof ComponentDescriptor) {
            return component.toComponent(path);

        } else if (component instanceof Component) {
            return component;

        } else if (component instanceof Observable) {

            obs = component.switchMap(function(comp) {
                return toVDOMS(comp, path);
            });

        } else if (isVNode && children.length > 0) {

            childObservables = children.map(function(val, index) {
                return toVDOMS(val, path.concat(index));
            });

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
                        map(this.render.bind(this)),
                        this._path
                ).
                doAction(function(vdom) {
                    vdom.properties['data-cachekey'] = AttributeSetHook(null, self._cacheKey);
                    vdom._component = self;
                }).
                publish().
                refCount();
        }

        return this.vdoms.subscribe.apply(this.vdoms, arguments);
    }
});

Component._guid = 0;
Component._cache = {};

function ComponentDescriptor(componentConstructor, state) {
    this.state = state;
    this.componentConstructor = componentConstructor;
    this.type = 'Thunk';
}

ComponentDescriptor.prototype.toComponent = function(path) {

    var componentConstructor = this.componentConstructor,
        state = this.state,
        component,
        cacheKey;

    if (path) {
        cacheKey = JSON.stringify(path) + "-" + componentConstructor.prototype.__name + ":" + componentConstructor.guid;
        component = Component._cache[cacheKey];
    }

    if (component) {
        component.setState(state);
    } else {
        component = new componentConstructor(state);
        component._cacheKey = cacheKey;
        component._path = path;

        Component._cache[cacheKey] = component;
    }

    return component;
};

Component.create = function(name, proto) {

    var guid = Component._guid++;

    var componentConstructor = extend(function(state) {
        Component.call(this, state);
    }, Component, proto);

    componentConstructor.guid = guid;
    componentConstructor.prototype.__name = name;

    return function(state) {
        return new ComponentDescriptor(componentConstructor, state);
    };
}

module.exports = Component;
