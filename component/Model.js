var Immutable = require('immutable');
var Rx = require('rx');

function Model(state) {
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

        if (!(path instanceof Array)) {
            path = [path];
        }

        return this.state.getIn(path);
    },

    isRoot: function() {
        return this === this.root;
    },

    set: function(path, value) {

        var fullPath = this.path.concat(path);

        if (this.isRoot()) {
            this.state = this.state.setIn(fullPath, value);
            this.changes.onNext(this);
        } else {
            this.root.set(fullPath, value);
            this.state = this.root.state.getIn(this.path);
        }

        return this;
    }
};

module.exports = Model;
