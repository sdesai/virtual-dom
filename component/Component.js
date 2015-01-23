var Rx = require('rx');
var AttributeSetHook = require('../virtual-hyperscript/hooks/attribute-hook');
var EventHook = require('./EventHook');

var utils = require('./utils');
var toArray = utils.toArray;
var log = utils.log;
var extend = utils.extend;
var cloneVirtualNode = utils.cloneVirtualNode;
var pluck = utils.pluck;
var wrapInObservable = utils.wrapInObservable;

var Observable = Rx.Observable;
var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate);

function Component(state) {

    this.states = new Rx.BehaviorSubject(state);
    this.events = new Rx.Subject();

    this.mounted = new Rx.BehaviorSubject({mounted:false});
}

extend(Component, Observable, {

    type: 'Thunk',

    setState: function(state) {
        this.states.onNext(state);
    },

    shouldComponentUpdate: function(prevState, nextState) {
        return (prevState === nextState);
    },

    mapEvent: function(mapping) {
        return EventHook(this.events, this.states, mapping);
    },

    toVDOM: function toVDOM(component, path) {

        var vdomsObs,
            children = component.children,
            isVNode = Boolean(children),
            childObservables;

        path = path || [];

        if (component instanceof ComponentDescriptor) {
            vdomsObs = component.toComponent(path);

        } else if (component instanceof Component) {
            vdomsObs = component;

        } else if (component instanceof Observable) {
            vdomsObs = component.flatMapLatest(function(comp) {
                return toVDOM(comp, path);
            });

        } else if (isVNode && children.length > 0) {
            childObservables = children.map(function(val, index) {
                return toVDOM(val, path.concat(index));
            });

            vdomsObs = Observable.combineLatest(childObservables, function() {
                var latestChildren = toArray(arguments),
                    latestChild,
                    countWithDescendents,
                    count,
                    childIdx,
                    clonedVNode;

                clonedVNode = cloneVirtualNode(component);
                clonedVNode.children = latestChildren;

                count = latestChildren.length;
                countWithDescendents = count;

                for (childIdx = 0; childIdx < count; childIdx++) {
                    latestChild = latestChildren[childIdx];

                    if ('count' in latestChild) {
                        countWithDescendents = countWithDescendents + latestChild.count;
                    }
                }

                clonedVNode.count = countWithDescendents;

                return clonedVNode;
            });

        } else {
            vdomsObs = ObservableOfSync(component);

        }

        return vdomsObs;
    },

    _subscribe: function() {

        var self = this;

        if (!this.vdoms) {

            this.vdoms =
                this.toVDOM(
                    this.states.
                        distinctUntilChanged(
                            pluck('state'),
                            this.shouldComponentUpdate.bind(this)
                        ).
                        flatMapLatest(function(state) {
                            var vdom = self.render(state);

                            return wrapInObservable(vdom);
                        }),
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

    cacheKey = JSON.stringify(path) + "-" + componentConstructor.__name + " (type " + componentConstructor.guid + ")";
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
    componentConstructor.__name = name;

    return function(state) {
        return new ComponentDescriptor(componentConstructor, state);
    };
}

module.exports = Component;
