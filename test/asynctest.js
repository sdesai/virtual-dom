/* "use strict" */

var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var Rx = require('vtree/rx');

var eq = function(eqVal) {
    return function(v) {
        return v === eqVal;
    };
};

function render(count)  {

    var span = {
        type: "Thunk",
        render: function() {
            return h('span', { id: 'myspan', style: { border: "2px solid red", display:"block", width: "20px", height:"20px" }, foo: 20 });
        }
    };

    var bold = {
        type: "Thunk",
        render: function() {
            return h('b', { id: 'mybold', style: { border: "2px solid blue", display:"block", width: "30px", height:"30px" }, foo: 20 });
        }
    };

    var italic = {
        type: "Thunk",
        render: function() {
            return h('i', {id: 'myitalic', style: { border: "2px solid green", display:"block", width: "40px", height:"40px" }, foo: 20  });
        }
    };

    var section = {
        type: "Thunk",
        render: function() {
            return h('section', {id: 'mysection', style: { border: "2px solid black", display:"block", width: "50px", height:"50px" }, foo: 20 });
        }
    };

    var div = {
        type: "Thunk",
        render: function() {
            return h('div', {id: 'mydiv', style: { border: "2px solid yellow", display:"block", width: "60px", height:"60px" }, foo: 20 });
        }
    };

    var childrenOne = [
        span,
        bold,
        italic,
        div
    ];

    var childrenTwo = [
        italic,
        section
    ];

    var children = (count % 2) ? childrenOne : childrenTwo;

    return {
        type: "Thunk",
        render: function() {
            return h('div', {
                style: {
                    height: '200px',
                    width: '200px',
                    border: '1px solid ' + (count + 1) + 'px'
                }
            }, children);
        }
    }
}

var STATE = 0;
var tree = render(STATE);
var rootNode = createElement(tree);

document.body.appendChild(rootNode);

Rx.Observable.fromEvent(document.body, 'keydown').
                pluck('keyCode').
                filter(eq(13)).
                map(function() {
                    return (++STATE);
                }).
                map(function(state) {
                    return render(state);
                }).
                map()
                subscribe(function(newTree) {
                    var patches = diff(tree, newTree);
                    rootNode = patch(rootNode, patches);
                    tree = newTree;
                });
