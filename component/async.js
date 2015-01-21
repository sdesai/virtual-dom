var Rx = require('rx-dom/dist/rx.dom.js');

var Observable = Rx.Observable;
var requestAnimationFrame = Rx.Scheduler.requestAnimationFrame;

var elem = require('../h');
var diff = require('../diff');
var patch = require('../patch');
var create = require('../create-element');

var Component = require('./Component');
var Model = require('./Model');
var log = require('./utils').log;

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

            className: (selected) ? 'prefix selected' : 'prefix',
            key: state.get('key'),

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

            className: 'label',
            key: state.get('key')

        }, this.renderChildren(state));

        return Observable.of(vdom);
    },

    renderChildren: function(state) {
        var children = [];

        if (state.get('prefix')) {
            children.push(
                Prefix(state.bind('prefix'))
            );
        }
        children.push(String(state.get('text')));

        return children;
    }

});

var Root = Component.create('Root', {

    render: function(state) {

        var vdom = elem('div', {

            className: 'root',
            onclick: this.mapEvent(this.click)

        }, this.renderChildren(state));

        return vdom;
    },

    renderChildren: function(state) {

        var count = state.get('count');
        var countText = elem('div', { className: 'count' }, ['Count: ' + count]);

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
    rootElem = create(VDOM);
    document.getElementById('container').appendChild(rootElem);
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
            text: 'A: ',
            selected: false
        }
    },

    b: {
        text: 0,

        key: 'b',

        prefix: {
            text: 'B: ',
            selected: false
        }
    }
});

rootComponent = Root(rootModel).toComponent();

rootModel.
    changes.
    sample(0, requestAnimationFrame).
    forEach(updateRootComponent);

rootComponent.
    take(1).
    forEach(initialRender);

rootComponent.
    sample(0, requestAnimationFrame).
    pairwise().
    forEach(incrementalRender);