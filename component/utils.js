var Rx = require('rx');
var Observable = Rx.Observable;

function toArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike, 0);
}

function log(msg) {
    console.log(msg);
}

function wrapInObservable(value) {
    if (!(value instanceof Observable)) {
        value = Observable.of(value);
    }

    return value;
}

function extend(constructorFn, base, props) {
    constructorFn.prototype = Object.create(base.prototype);
    constructorFn.constructor = constructorFn;
    mix(constructorFn.prototype, props);

    return constructorFn;
}

function mix(r, s) {
    for (var p in s) {
        r[p] = s[p];
    }

    return r;
}

function eq(equalToVal) {
    return function(val) {
        return val === equalToVal;
    };
}

function pluck(prop) {
    return function(val) {
        return val && val[prop];
    }
}

function cloneVirtualNode(vnode) {
    var copy = {};

    for (var p in vnode) {
        // if (vnode.hasOwnProperty(p)) {
            copy[p] = vnode[p];
        // }
    }

    // These come from deeper down
    // in the prototype chain.

    // copy.constructor = vnode.constructor;
    // copy.type = vnode.type;
    // copy.version = vnode.version;

    return copy;
}

module.exports = {
    log: log,
    eq: eq,
    pluck: pluck,
    mix: mix,
    extend: extend,
    toArray: toArray,
    cloneVirtualNode: cloneVirtualNode,
    wrapInObservable: wrapInObservable
};