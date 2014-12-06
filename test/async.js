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

var LabelList = Component.create({

    render: function(state) {

        return elem('div', {
            style: {
                backgroundColor: '#a00',
                padding: '10px',
                margin: '2px'
            }
        }, state.labels.map(function(label) {
            return Label({text:label});
        }));
    }

});

var Root = Component.create({

    render: function(state) {

        var vdom = elem('div', { id:'foo' },[

            Label({text: "A: " + state.model.a}),
            Label({text: "B: " + state.model.b}),

            LabelList({
                labels: ["foo: " + state.model.i, "bar: " + state.model.i]
            })
        ]);

        return vdom;
    }

});

// ---- App Code ----

var rootComponent = Root({model: {i:0, a:0, b:0}});
var rootVDOMs = rootComponent;
var rootElem;
var i = 0;

rootVDOMs.forEach(function() {
    console.log(i++);
});

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
    rootComponent.setState({model: model});
}

function updateRootState(prevModel) {
    if (++prevModel.i % 2) {
        prevModel.a++;
    } else {
        prevModel.b++;
    }
    return prevModel;
}

rootVDOMs.take(1).forEach(initialRender);
rootVDOMs.pairwise().forEach(incrementalRender);

enterKeyDowns.
    scan(rootComponent.states.value.model, updateRootState).
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