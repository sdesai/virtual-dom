var Immutable = require("immutable");
var Rx = require("rx");

function Model(state, onChange) {
    this.root = this;
    this.state = Immutable.fromJS(state);
    this.path = [];

    this.changes = new Rx.Subject();

    if (onChange) {
        this.changes.sample(16).forEach(onChange);
    }
}

Model.prototype = {

    bind: function(path) {
        var boundModel = Object.create(this);

        boundModel.state = this.state.getIn(path);
        boundModel.path = this.path.concat(path);

        return boundModel;
    },

    get: function(path) {
        return this.state.getIn(path);
    },

    set: function(path, value) {
        this.root.state = this.root.state.setIn(this.path.concat(path), value);
        this.changes.onNext(this);
    }
};

module.exports = Model;
