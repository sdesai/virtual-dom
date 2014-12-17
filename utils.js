
function toArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike, 0);
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
        return val[prop];
    }
}

module.exports = {
    eq: eq,
    pluck: pluck,
    mix: mix,
    toArray: toArray
};