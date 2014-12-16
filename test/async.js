var elem = require('../h');
var diff = require('../diff');
var patch = require('../patch');
var create = require('../create-element');

var Rx = require('rx');
var Observable = Rx.Observable;

var Component = require('../Component');
var Model = require('../Model');

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

var Label = Component.create("Label", {

    render: function renderLabel(model) {

        var text = model.get("text");

        var vdom = elem('div', {
            id: model.guid,
            style: {
                backgroundColor: "#eee",
                margin: "2px",
                padding: "5px",
                display: "inline-block"
            }
        }, String(text));

        return vdom;
    }

});

var Root = Component.create("Root", {

    render: function renderRoot(model) {

        var count = model.get('count');

        var vdom = elem('div', { id:'foo' }, [
            Label( model.bind('a', { text: 'A: ' + (count * 2) }) ),
            Label( model.bind('b', { text: 'B: ' + (count) }) )
        ]);

        return vdom;
    }

});

// ---- App Code ----

var model = new Model('root', { count:0 });

var rootComponent = Root(model);
var rootVDOMs = rootComponent.publish().refCount();
var rootElem;
var i = 0;

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

function updateRootState(prev, curr) {

    var currentCount = model.get("count");
    model.set("count", currentCount + 1);

    return model;
}

function setRootState(model) {
   rootComponent.setState(model);
}

rootVDOMs.take(1).forEach(initialRender);
rootVDOMs.pairwise().forEach(incrementalRender);

rootVDOMs.forEach(function(vdom) {
    console.log("Root VDOM onNext'ed: " + vdom.children[0].children[0].text + "," +  vdom.children[1].children[0].text);
})

enterKeyDowns.
    scan(model, updateRootState).
    forEach(setRootState);

// ---------- DOM Fluff ----------

function makeContainer() {

    var container = document.createElement("div");

    container.id = "container";
    container.style.backgroundColor = "#666";
    container.style.padding = "4px";
    container.style.display = "inline-block";

    document.body.appendChild(container);

    return container;
}