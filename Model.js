var Immutable = require("immutable");
var Rx = require("rx");

function Model(state, onChange) {
    this.root = this;
    this.state = Immutable.fromJS(state);
    this.path = [];

    this.changes = new Rx.Subject();
}

Model.prototype = {

    bind: function(path) {

        var boundModel = Object.create(this);
        var boundPath = this.path.concat(path);

        boundModel.state = this.root.state.getIn(boundPath);
        boundModel.path = boundPath;

        return boundModel;
    },

    get: function(path) {
        return this.state.getIn(path);
    },

    set: function(path, value) {

        var path = this.path.concat(path);

        this.root.state = this.root.state.setIn(path, value);

        if (this !== this.root) {
            this.state = this.root.state.getIn(path);
        }

        this.changes.onNext(this);
    }
};

module.exports = Model;
