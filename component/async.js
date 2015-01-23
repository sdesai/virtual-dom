var Rx = require('rx-dom/dist/rx.dom.js');
var requestAnimationFrame = Rx.Scheduler.requestAnimationFrame;

var diff = require('../diff');
var patch = require('../patch');
var create = require('../create-element');

var Model = require('./Model');

/*
var log = require('./utils').log;
function logDiff(pair) {
    var oldVDOMChildren = pair[0].children;
    var newVDOMChildren = pair[1].children;

    log('Root vdoms pair onNexted (OLD): ' + oldVDOMChildren[0].children[0].text);
    log('Root vdoms pair onNextd (NEW): ' + newVDOMChildren[0].children[0].text);
}
*/

var Root = require('./Root');

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

    var patches = diff(oldVDOM, newVDOM);
    rootElem = patch(rootElem, patches);
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

rootComponent.
    take(1).
    forEach(initialRender);

rootComponent.
    sample(0, requestAnimationFrame).
    pairwise().
    forEach(incrementalRender);