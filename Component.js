var Rx = require('rx');
var utils = require('./utils');
var AttributeSetHook = require('./virtual-hyperscript/hooks/attribute-hook');
var EventHook = require('./EventHook');

var toArray = utils.toArray;
var log = utils.log;
var extend = utils.extend;
var cloneVirtualNode = utils.cloneVirtualNode;

var Observable = Rx.Observable;
var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate);

function Component(state) {

    this.states = new Rx.BehaviorSubject(state);
    this.events = new Rx.Subject();

    this.mounted = new Rx.BehaviorSubject({mounted:false});

    this.bindEvents();

    // DEBUG
    /*
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
    */
}

extend(Component, Observable, {

    type: 'Thunk',

    setState: function(state) {
        log('Component setState(): ' + this._cacheKey);
        this.states.onNext(state);
    },

    eventHandler: function(state) {

        var self = this;

        if (!this._boundHandler) {
            this._boundHandler = function(state, e) {
                self.events.onNext({
                    e: e,
                    state: state
                });
            };
        }

        return EventHook(this._boundHandler, state);
    },

    bindEvents: function() {},

    toVDOM: function toVDOM(component, path) {

        var obs,
            children = component.children,
            isVNode = Boolean(children),
            childObservables;

        path = path || [];

        if (component instanceof ComponentDescriptor) {
            obs = component.toComponent(path);

        } else if (component instanceof Component) {
            obs = component;

        } else if (component instanceof Observable) {
            obs = component.switchMap(function(comp) {
                return toVDOM(comp, path);
            });

        } else if (isVNode && children.length > 0) {

            childObservables = children.map(function(val, index) {
                return toVDOM(val, path.concat(index));
            });

            childObservables.push(function() {

                var latestChildren = toArray(arguments),
                    latestChild,
                    countWithDescendents,
                    count,
                    childIdx,
                    clone;

                // TODO: Is this too heavy?
                clone = cloneVirtualNode(component);
                clone.children = latestChildren;

                count = latestChildren.length;
                countWithDescendents = count;

                for (childIdx = 0; childIdx < count; childIdx++) {
                    latestChild = latestChildren[childIdx];

                    if ('count' in latestChild) {
                        countWithDescendents = countWithDescendents + latestChild.count;
                    }
                }

                clone.count = countWithDescendents;

                return clone;
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
                this.toVDOM(
                    this.states.
                        distinctUntilChanged(
                            function(state) {
                                return state.state;
                            },
                            function(prev, next) {
                                return (prev === next);
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

    path = path || [];

    cacheKey = JSON.stringify(path) + "-" + componentConstructor.prototype.__name + ":type" + componentConstructor.guid;
    component = Component._cache[cacheKey];

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
