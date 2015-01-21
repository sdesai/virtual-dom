var Rx = require('rx-dom/dist/rx.dom.js'); // For requestAnimationFrame scheduler
var Observable = Rx.Observable;
var log = require('../utils').log;

var elem = require('../h');
var diff = require('../diff');
var patch = require('../patch');
var create = require('../create-element');

var Component = require('../Component');
var Model = require('../Model');

function logDiff(pair) {
    var oldVDOMChildren = pair[0].children;
    var newVDOMChildren = pair[1].children;

    log('Root vdoms pair onNexted (OLD): ' + oldVDOMChildren[0].children[0].text);
    log('Root vdoms pair onNextd (NEW): ' + newVDOMChildren[0].children[0].text);
}

// ---- Custom Components ----

var Prefix = Component.create('Prefix', {

    render: function(state) {

        var selected = state.get('selected');

        var vdom = elem('div', {

            key: state.get('key'),

            style: {
                backgroundColor: (selected) ? '#7AADCF' : '#eee',
                border: '2px solid blue',
                margin: '5px',
                padding: '5px',
                display: 'inline-block'
            },

            onclick: this.mapEvent(this.click)

        }, this.renderChildren(state));

        return vdom;
    },

    renderChildren: function(state) {
        return [String(state.get('text'))];
    },

    click: function(state) {
        return state.set('selected', !state.get('selected'));
    }
});

var Label = Component.create('Label', {

    render: function(state) {

        var vdom = elem('div', {

            key: state.get('key'),

            style: {
                backgroundColor: '#eee',
                border: '2px solid green',
                margin: '5px',
                padding: '5px',
                display: 'inline-block'
            }

        }, this.renderChildren(state));

        return Observable.of(vdom);
    },

    renderChildren: function(state) {
        var children = [];

        if (state.get('prefix')) {
            children.push(Prefix(state.bind('prefix')));
        }
        children.push(String(state.get('text')));

        return children;
    }

});

var Root = Component.create('Root', {

    render: function(state) {

        var vdom = elem('div', {

            onclick: this.mapEvent(this.click),

            style: {
                webkitUserSelect: 'none',
                border: '2px solid red',
                cursor: 'pointer',
                padding: '5px',
                backgroundColor: '#aaa'
            },

        }, this.renderChildren(state));

        return vdom;
    },

    renderChildren: function(state) {

        var count = state.get('count');

        var countText = elem('div', {
            style: {
                color: '#fff',
                paddingRight: '5px',
                display: 'inline-block'
            }
        }, ['Count: ' + count]);

        return [
            countText,
            Label(state.bind('a')),
            Label(state.bind('b'))
        ];
    },

    click: function(state) {

        var count = state.get(['count']) + 1,
            path = (count % 2) ? 'a' : 'b';

        state = state.set('count', count);
        state = state.set([path, 'text'], count);

        return state;
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

function updateRootComponent(state) {
    rootComponent.setState(state);
}

rootModel = new Model({

    count: 0,

    a: {
        text: 0,
        key: 'a',
        prefix: {
            text: 'A:'
        }
    },

    b: {
        text: 0,
        key: 'b',
        prefix: {
            text: 'B:'
        }
    }
});

rootComponent = Root(rootModel).toComponent();

rootModel.
    changes.
    sample(0, Rx.Scheduler.requestAnimationFrame).
    forEach(updateRootComponent);

rootComponent.
    take(1).
    forEach(initialRender);

rootComponent.
    sample(0, Rx.Scheduler.requestAnimationFrame).
    pairwise().
    forEach(incrementalRender);


// ---------- DOM Fluff ----------

function makeContainer() {
    var container = document.createElement('div');
    container.id = 'container';
    container.style.display = 'inline-block';
    document.body.appendChild(container);
    return container;
}