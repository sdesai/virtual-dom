var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');

var Rx = require('rx');
var Observable = Rx.Observable;

var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate);

Observable.prototype.replayLast = function() {
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
};

function eq(equalToVal) {
    return function(val) {
        return val === equalToVal;
    };
}

function argsToArray() {
    return Array.prototype.slice.call(arguments, 0);
}

function Component(state) {

    this._states = new Rx.BehaviorSubject(state);
    this.states = this._states.distinctUntilChanged();

    this.mounted = new Rx.BehaviorSubject(false);
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

                if (this.init) {
                    this.init(state);
                }

                if (state) {
                    Component._cache[state.guid] = this;
                }

                return this;
            }
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
    var obs;

    if (!(component instanceof Array) && !(component instanceof Observable)) {
        obs = ObservableOfSync(component);

    } else if (component instanceof Array) {
        obs = Observable.combineLatest.apply(Observable, component.map(toVDOMS).concat(argsToArray));

    } else if (component instanceof Observable) {
        obs = component.switchMap(toVDOMS).startWith("");
    }

    return obs;
};

Component.prototype.mount = function() {
    this.mounted.onNext(true);
    return this;
};

Component.prototype.unmount = function() {
    this.mounted.onNext(false);
    return this;
};

Component.prototype._subscribe = function() {

    if (!this.vdoms) {
        this.vdoms = new Rx.ReplaySubject(1);
        this.toVDOMS(this.states.map(this.render)).subscribe(this.vdoms);
    }

    return this.vdoms.subscribe.apply(this.vdoms, arguments);
};

var Label = Component.create({
    render: function(state) {
        return '<span id="' + state.guid + '">' + state.text + '</span>';
    }
});

var Root = Component.create({
    render: function(state) {
        return [
            Label({guid: "a", text: state.count}),
            Label({guid: "b", text: state.count})
        ];
    }
});

Root({guid:"root", count:"initVal"}).forEach(
    function(vdom) {
        console.log(vdom);
    },
    function() {
        console.log("error");
    },
    function() {
        console.log("complete");
    });

var COUNT = 0;

document.addEventListener("click", function(e) {
    var count = COUNT++;
    if ((count % 2)) {
        Component._cache["b"].setState({guid:"b", text: count});
    } else {
        Component._cache["a"].setState({guid:"a", text: count});
    }

    e.preventDefault();
}, false);