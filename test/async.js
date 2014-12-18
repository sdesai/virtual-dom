var Rx = require('rx');

var elem = require('../h');
var diff = require('../diff');
var patch = require('../patch');
var create = require('../create-element');
var utils = require('../utils');

var Component = require('../Component');
var Model = require('../Model');

var enterKeyDowns = Rx.Observable.fromEvent(document.body, "keydown").
    pluck("keyCode").
    where(utils.eq(13));

// ---- Custom Components ----

var Label = Component.create("Label", {

    render: function renderLabel(model) {

        var text = model.get(["text"]);

        var vdom = elem('div', {
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

        var vdom = elem('div', null, [
            Label( model.bind('a') ),
            Label( model.bind('b') )
        ]);

        return vdom;
    }

});

// ---- App Code ----

var rootElem;
var rootComponent;
var rootModel;

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

function updateRootModel() {

    var count = rootModel.get(["count"]);
    var newCount = count + 1;

    rootModel.set(["count"], newCount);

    if (newCount % 2) {
        rootModel.set(["a", "text"], "A:" + newCount);
    } else {
        rootModel.set(["b", "text"], "B:" + newCount);
    }
}

function updateRootComponent(model) {
    rootComponent.setState(model);
}

rootModel = new Model({
    count: 0,

    a: {
        text: "A:" + 0
    },

    b: {
        text: "B:" + 0
    }
});

rootComponent = Root(rootModel);

rootModel.changes.sample(16).forEach(updateRootComponent);

rootComponent.take(1).forEach(initialRender);
rootComponent.pairwise().forEach(incrementalRender);

enterKeyDowns.forEach(updateRootModel);

// --- Debug Info ---

rootComponent.forEach(function(vdom) {
    console.log("Root VDOM onNext'ed: " + vdom.children[0].children[0].text + "," +  vdom.children[1].children[0].text);
});


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