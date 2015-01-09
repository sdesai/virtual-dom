var Rx = require('rx-dom/dist/rx.dom.js'); // For requestAnimationFrame scheduler

var elem = require('../h');
var diff = require('../diff');
var patch = require('../patch');
var create = require('../create-element');
var utils = require('../utils');
var log = utils.log;

var Component = require('../Component');
var Model = require('../Model');

var enterKeyDowns = Rx.Observable.fromEvent(document.body, 'keydown').
    pluck('keyCode').
    where(utils.eq(13));

function logDiff(pair) {
    var oldVDOMChildren = pair[0].children;
    var newVDOMChildren = pair[1].children;

    log('Root vdoms pair onNexted (OLD): ' + oldVDOMChildren[0].children[0].text);
    log('Root vdoms pair onNextd (NEW): ' + newVDOMChildren[0].children[0].text);
}

// ---- Custom Components ----

var Label = Component.create('Label', {

    render: function(model) {

        log('Rendering: ' + this._cacheKey);

        var vdom = elem('div', {

            key: this._cacheKey,

            style: {
                backgroundColor: '#eee',
                margin: '2px',
                padding: '2px',
                display: 'inline-block'
            }

        }, this.renderChildren(model));

        return vdom;
    },

    renderChildren: function(model) {
        var children = [];

        if (model.get('prefix')) {
            children.push(Label(model.bind('prefix')));
        }

        children.push(String(model.get('text')));

        return children;
    }

});

var Root = Component.create('Root', {

    render: function(model) {

        log('Rendering: ' + this._cacheKey);

        var vdom = elem('div', null, this.renderChildren(model));
        return vdom;
    },

    renderChildren: function(model) {

        var count = model.get('count');
        var countText = elem('span', { style: {color: '#fff', paddingRight: '5px'} }, ['Count: ' + count]);

        return [
            countText,
            (count % 2) ? Label(model.bind('a')), Label(model.bind('b'))
        ];
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

    logDiff(VDOMPair);

    var patches = diff(oldVDOM, newVDOM);
    rootElem = patch(rootElem, patches);
}

function updateRootModel() {

    var count = rootModel.get(['count']) + 1,
        path = (count % 2) ? 'a' : 'b';

    log('model.set(root, count)');
    log('model.set(' + path + ', text)');

    rootModel.set('count', count);
    rootModel.set([path, 'text'], count);
}

function updateRootComponent(model) {
    log('Model "changes" onNexted');

    rootComponent.setState(model);
}

rootModel = new Model({

    count: 0,

    a: {
        text: 0,

        prefix: {
            text: 'A:'
        }
    },

    b: {
        text: 0,

        prefix: {
            text: 'B:'
        }
    }
});

rootComponent = Root(rootModel).toComponent();

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