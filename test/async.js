var Rx = require('rx-dom/dist/rx.dom.js'); // For requestAnimationFrame scheduler

var elem = require('../h');
var diff = require('../diff');
var patch = require('../patch');
var create = require('../create-element');
var utils = require('../utils');

var Component = require('../Component');
var Model = require('../Model');

var enterKeyDowns = Rx.Observable.fromEvent(document.body, 'keydown').
    pluck('keyCode').
    where(utils.eq(13));

function logDiff(pair) {
    var oldVDOMChildren = pair[0].children;
    var newVDOMChildren = pair[1].children;

    console.log('Root vdoms pair onNexted (OLD): ' + oldVDOMChildren[0].children[0].text + ',' + oldVDOMChildren[1].children[0].text + ',' + oldVDOMChildren[2].children[0].text);
    console.log('Root vdoms pair onNextd (NEW): ' + newVDOMChildren[0].children[0].text + ',' + newVDOMChildren[1].children[0].text + ',' + newVDOMChildren[2].children[0].text);
}

// ---- Custom Components ----

var Label = Component.create('Label', {

    render: function renderLabel(model) {

        var children = [];

        if (model.get('prefix')) {
            children.push(Label(model.bind('prefix')));
        }
        children.push(String(model.get('text')));

        var vdom = elem('div', {
            key: this._cacheKey,
            style: { backgroundColor: '#eee', margin: '2px', padding: '5px', display: 'inline-block' }
        }, children);

        return vdom;
    }

});

var Root = Component.create('Root', {

    render: function renderRoot(model) {

        var count = model.get('count');

        var vdom = elem('div', {
            key: this._cacheKey,
        }, [
                elem('span', { style: {color: '#fff', paddingRight: '5px'} }, ['Count: ' + count]),

                (count % 2) ?
                    Label(model.bind('a')) :
                    Label(model.bind('b'))
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

    // logDiff(VDOMPair);

    var patches = diff(oldVDOM, newVDOM);
    rootElem = patch(rootElem, patches);
}

function updateRootModel() {

    var count = rootModel.get(['count']);
    var newCount = count + 1;

    console.log('model.set(root)');

    rootModel.set(['count'], newCount);

    if (newCount % 2) {
        console.log('model.set(a)');

        rootModel.set(['a', 'text'], 'A:' + newCount);
    } else {
        console.log('model.set(b)');

        rootModel.set(['b', 'text'], 'B:' + newCount);
    }
}

function updateRootComponent(model) {
    console.log('Model "changes" onNexted');

    rootComponent.setState(model);
}

rootModel = new Model({

    count: 0,

    a: {
        text: 'A:' + 0,

        prefix: {
            text: 'Foo - '
        }
    },

    b: {
        text: 'B:' + 0,

        prefix: {
            text: 'Bar - '
        }
    }
});

rootComponent = Root(rootModel);

rootModel.
    changes.
    sample(16, Rx.Scheduler.requestAnimationFrame).
    forEach(updateRootComponent);

rootComponent.
    take(1).
    forEach(initialRender);

rootComponent.
    sample(16, Rx.Scheduler.requestAnimationFrame).
    pairwise().
    forEach(incrementalRender);

enterKeyDowns.
    forEach(updateRootModel);


// ---------- DOM Fluff ----------

function makeContainer() {

    var container = document.createElement('div');

    container.id = 'container';
    container.style.backgroundColor = '#666';
    container.style.padding = '4px';
    container.style.display = 'inline-block';

    document.body.appendChild(container);

    return container;
}