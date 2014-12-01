var Rx = require('rx'),
    Observable = Rx.Observable;

var ObservableOf = Observable.of.bind(Observable);                                          // synchronous - currentThread/Trampoline
var ObservableOfSync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.immediate); // synchronous
var ObservableOfAsync = Observable.ofWithScheduler.bind(Observable, Rx.Scheduler.timeout);  // async

function eq(equalToVal) {
    return function(val) {
        return val === equalToVal;
    };
}

function argsToArray() {
    return Array.prototype.slice.call(arguments, 0);
}

function getTree(tree) {

    if (!(tree instanceof Array || tree instanceof Observable)) {
        return ObservableOfSync(tree);
    }

    if (tree instanceof Array) {
        return Observable.combineLatest.apply(Observable, tree.map(getTree).concat(argsToArray));
    }

    if (tree instanceof Observable) {
        return tree.switchMap(function(o) {
            return getTree(o);
        }).startWith("");
    }

}

function Component(state) {
    this._states = new Rx.BehaviorSubject(state);
    this.states = this._states.distinctUntilChanged();
}

Component._cache = {};
Component._guid = 1;

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

                comp = this;

                if (state) {
                    Component._cache[state.guid] = comp;
                }
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

Component.prototype.vdoms = function() {
    return this.states.map(this.render);
};

Component.prototype.render = function(state) {
    return null;
};

Component.prototype.setState = function(state) {
    this._states.onNext(state);
};

Component.prototype._subscribe = function() {

    var self = this,
        lastVDOM = null;

    var vdomsWrapperObs = Observable.create(function(observer) {

        if (lastVDOM) {
            observer.onNext(lastVDOM);
        }

        return self.vdoms().subscribe(

            function onNext(o) {
                lastVDOM = o;
                observer.onNext(o);
            },

            function onError(e) {
                observer.onError(e);
            },

            function onCompleted() {
                observer.onCompleted();
            }
        );
    });

    return vdomsWrapperObs.subscribe.apply(vdomsWrapperObs, arguments);
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

getTree(Root({guid:"root", count:"initVal"})).forEach(
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

document.addEventListener("click", function() {
    var count = COUNT++;
    if (!(count % 2)) {
        Component._cache["a"].setState({guid:"a", text: count});
    } else {
        Component._cache["b"].setState({guid:"b", text: count});
    }
}, false);


// ===========

/*
function Component(subscribe) {
    this.viewModels = new Rx.Subject();
    Observable.apply(this, subscribe);
}

Component.prototype = Object.create(Observable.prototype);

Component.prototype.onNext = function(o) {
    this.viewModels.onNext(o);
}

Component.prototype.getVDOMS = function() {}

Component.prototype.subscribe = function() {

    var lastVDOM;

    return Observable.create(function subscribe(observer) {

        if (lastVDOM) {
            observer.onNext(lastVDOM);
        }

        return this.getVDOMS().subscribe(

                function onNext(vdom) {
                    lastVDOM = vdom;
                    observer.onNext(vdom);
                },

                function onError(e) {
                    observer.onError(e);
                },

                function onCompleted() {
                    observer.onCompleted();
                });

    }).apply(this, arguments);

    // return this.getVDOMS.apply(this, arguments);
};

factory({}, Label)

function Label() {

    var self = this;

    this.clicks = new Rx.Subject();

    this.disposable = this.viewModels.
        switchMap(function(viewModel) {
            return self.clicks.switchMap(function() {
                return viewModel.getValue(["text"]).
                            mergeMap(function(val) {
                                return viewModel.setValue(["text"], val+1);
                            });
            });
        }).subscribe(NOOP);
}

Label.prototype = Object.create(Component.prototype);

Label.prototype.getVDOMs = function() {
    return this.viewModels.map(function(viewModel) {
        return <div onclick={this.clicks}> + viewModel.text + </div>;
    });
}

Parent.prototype.getVDOMs = function() {
    return this.viewModels.map(function(viewModel) {
        return [
            factory(viewModel.bind(["child"]), Label) // Obs<VDOM>
        ];
    });
}


// ---

function factory(state, constructor) {

    if (state.guid) {
        comp = map[state.guid];
    } else {
        comp = new constructor();
    }

    comp.onNext(state);

    return comp.getVDOMs();
}

Rx.Observable.interval(1000).take(20).
                    switchMap(function(state) {
                        return componentB(state);
                    }).
                    forEach(function(vdom) {
                        console.log(vdom);
                    });

var root = Observable.of([
    Observable.of("1"), Observable.of("2")   // A
    Observable.of("3", "4")                  // B
]);
*/

/*
var root = [
    render([render("a"), ["b", [render("bbb"), "c"]], "bbbb"]),
    render(render("c"), render("d"), render("z")),
    render(render("e")),
    render("b"),
    render("f", "h"),
    "g"
];
*/

/*
render(root).forEach(
    function(o) {
        console.log("Next VDOM");
        console.log(JSON.stringify(o, null, 2));
    },
    function() {
        console.log("Error");
    },
    function() {
        console.log("Completed");
    });

console.log("Subscribed");
*/
