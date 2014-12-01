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

function render(tree) {

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

// ----

var render = ObservableOfAsync;

/*
var tree = render([
    render([
        Observable.interval(3000).map(function(i) { return String.fromCharCode(65 + (i % 26)); }),
        "b"
    ]),
    Observable.interval(1000).map(function(i) { var char = String.fromCharCode(65 + (i % 26)); return char + char; }),
    "g"
]);
*/

/*
var componentA = (function() {

    var A = {

        states: new Rx.Subject(),

        setState: function(state) {
            return this.states.onNext(state);
        },

        render: function(state) {

            if (!this.vdoms) {
                this.vdoms = this.states.map(this.renderer.bind(this));
            }

            this.setState(state);

            return this.vdoms;
        },

        renderer: function(state) {
            return '<span class="A">' + state + '</span>';
        }
    };

    return A.render.bind(A);
}());

var componentB = (function() {

    var B = {

        states: new Rx.Subject(),

        setState: function(state) {
            return this.states.onNext(state);
        },

        render: function(state) {

            if (!this.vdoms) {
                this.vdoms = this.states.map(this.renderer.bind(this));
            }

            this.setState(state);

            return this.vdoms;
        },

        renderer: function(state) {
            return '<span class="B">' + state + '</span>';
        }
    };

    return B.render.bind(B);
}());

var componentC = (function() {

    var C = {

        states: new Rx.Subject(),

        setState: function(state) {
            return this.states.onNext(state);
        },

        render: function(state) {

            if (!this.vdoms) {
                this.vdoms = this.states.map(this.renderer.bind(this));
            }

            this.setState(state);

            return this.vdoms;
        },

        renderer: function(state) {
            return [
                componentA(state), // Observable.of("vdom1", "vdom2", "vdom3")
                componentB(state)
            ];
        }
    };

    return C.render.bind(C);
}());
*/

function Component(state) {
    this.states = new Rx.Subject();

    if (state) {
        this.setState(state);
    }
}

Component.create = function(proto) {

    var component = function(state) {

        if (!(this instanceof component)) {
            return new component(state);
        } else {
            Component.call(this, state);

            if (this.init) {
                this.init(state);
            }
        }
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
    return "<div></div>";
};

Component.prototype.setState = function(state) {
    this.states.onNext(state);
};

Component.prototype.subscribe = function() {

    var self = this,
        lastVDOM = null;

    var obs = Observable.create(function(observer) {

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

    return obs.subscribe.apply(obs, arguments);
};

var Label = Component.create({

    render: function(state) {
        return "<span>" + state.text + "</span>";
    },

    init: function(state) {
        var self = this;
        Rx.Observable.interval(1000).take(20).subscribe(function(i) {
            self.setState({text:i});
        });
    }
});

Label({text:"100"}).subscribe(function(vdom) {
    console.log(vdom);
});


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
