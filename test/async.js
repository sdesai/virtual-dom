var elem = require('../h');
var diff = require('../diff');
var patch = require('../patch');
var create = require('../create-element');
var Component = require('../Component');

var Rx = require('rx');
var Observable = Rx.Observable;

// ---- Utils ----

function eq(equalToVal) {
    return function(val) {
        return val === equalToVal;
    };
}

var enterKeyDowns = Rx.Observable.fromEvent(document.body, "keydown").
    pluck("keyCode").
    where(eq(13));

// ---- Custom Components ----

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
        }, String(state.text));

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

// ---- App Code ----

var root = Root({guid:"root"});
var rootVDOMs = root.publish().refCount();
var rootElem;

function initialRender(VDOM) {
    var container = makeContainer();

    rootElem = create(VDOM);
    container.appendChild(rootElem);
}

function incrementalRender(VDOMPair) {
    var oldVDOM = VDOMPair[0];
    var newVDOM = VDOMPair[1];
    var patches = diff(oldVDOM, newVDOM);

    rootElem = patch(rootElem, patches);
}

function setRootState(model) {
    root.setState({guid:"root", model: model});
}

rootVDOMs.take(1).forEach(initialRender);
rootVDOMs.pairwise().forEach(incrementalRender);

enterKeyDowns.
    scan({i: 0, a: 0, b: 0}, function(prev) {
        if (++prev.i % 2) {
            prev.a++;
        } else {
            prev.b++;
        }

        return prev;
    }).
    forEach(setRootState);

// ---------- DOM Fluff ----------

document.body.appendChild(document.createTextNode("Press Enter..."));

function makeContainer() {

    var container = document.createElement("div");

    container.id = "container";
    container.style.backgroundColor = "#666";
    container.style.padding = "4px";
    container.style.display = "inline-block";

    document.body.appendChild(container);

    return container;
}