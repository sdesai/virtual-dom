var elem = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var create = require('virtual-dom/create-element');

var Rx = require('rx');
var Observable = Rx.Observable;

var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate);

function eq(equalToVal) {
    return function(val) {
        return val === equalToVal;
    };
}

function toArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike, 0);
}

Rx.Observable.prototype.replayLast = function() {
    var self = this,
    last;

    return Observable.create(function(observer) {
        if (last !== undefined) {
            observer.onNext(last);
        }

        return self.subscribe(
            function onNext(value) {
                last = value;
                observer.onNext(value);
            },
            function onError(e) {
                last = null;
                observer.onError(e);
            },
            function () {
                last = null;
                observer.onCompleted();
            });
        });
}

function Component(state) {
    this._states = new Rx.Subject();

    this.mounted = new Rx.BehaviorSubject(false);
    this.states = this._states;//.distinctUntilChanged();

    this._subscribe = this.subscribe;
}

Component._cache = {};

Component.create = function(proto) {

    var component = function(state) {

        var comp;

        if (state && state.guid) {
            comp = Component._cache[state.guid];
        }

        if (!comp) {
            if (!(this instanceof component)) {
                comp = new component(state);
            } else {
                Component.call(this, state);

                if (state) {
                    Component._cache[state.guid] = this;
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

Component.prototype.render = function(state) {
    return null;
};

Component.prototype.setState = function(state) {
    this._states.onNext(state);
};

Component.prototype.toVDOMS = function toVDOMS(component) {
    var obs,
        children = (component.children),
        obsChildren;

    if (component instanceof Observable) {
        obs = component.switchMap(toVDOMS);

    } else if (children && children.length > 0) {

        obsChildren = children.map(toVDOMS);

        obsChildren.push(function combineLatestSelector() {
            var latestChildren = toArray(arguments);
            component.children = latestChildren;
            return component;
        });

        obs = Observable.combineLatest.apply(Observable, obsChildren);

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

Component.prototype.subscribe = function() {

    if (!this.vdoms) {
        // this.vdoms = new Rx.ReplaySubject(1);
        // this.toVDOMS(this.states.map(this.render)).subscribe(this.vdoms);
        //
        // this.vdoms = this.states.map(this.render).replayLast();

        this.vdoms = this.toVDOMS(this.states.map(this.render));
    }

    return this.vdoms.subscribe.apply(this.vdoms, arguments);
};

var Label = Component.create({

    render: function(state) {
        var vdom = elem('div', {
            id: state.guid,
            style: {
                backgroundColor: "#eee",
                margin: "2px",
                padding: "5px",
                display: "inline-block"
            }
        }, state.text + "");

        return vdom;
    }

});

var Root = Component.create({

    render: function(state) {
        var vdom = elem("div", null, [
            Label({guid: "a", text: state.model.a}),
            Label({guid: "b", text: state.model.b})
        ]);

        return vdom;
    }

});

var appRoot;
var container = makeContainer();

var root = Root({guid:"root", model: {i: -1, a: -1, b: -1}}).publish().refCount();

root.take(1).forEach(function(vdom) {
    appRoot = create(vdom);
    container.appendChild(appRoot);
});

root.pairwise().
    forEach(
        function(pair) {
            var patches = diff(pair[0], pair[1]);
            appRoot = patch(appRoot, patches);
        },
        function() {
            console.log("error");
        },
        function() {
            console.log("complete");
        });

Rx.Observable.fromEvent(document.body, "keydown").
    doAction(function(e) {
        e.preventDefault();
    }).
    pluck("keyCode").
    where(eq(13)).
    scan({
        i: 0,
        a: 0,
        b: 0
    }, function(prev, curr) {

        if (++prev.i % 2) {
            prev.a++;
        } else {
            prev.b++;
        }

        return prev;
    }).
    subscribe(function(model) {
        Component._cache["root"].setState({guid:"root", model: model});
    });

function makeContainer() {

    var container = document.createElement("div");

    container.id = "container";
    container.style.backgroundColor = "#666";
    container.style.padding = "4px";
    container.style.display = "inline-block";

    document.body.appendChild(container);

    return container;
}