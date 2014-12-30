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

    set: function(path, value) {

        var fullPath = this.path.concat(path);

        this.root.state = this.root.state.setIn(fullPath, value);

        if (this !== this.root) {
            this.state = this.root.state.getIn(fullPath);
        }

        this.changes.onNext(this);
    }
};

module.exports = Model;
