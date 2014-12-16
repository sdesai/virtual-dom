var Immutable = require('immutable');

function cacheKey(path) {
    return path;
}

function Model(path, state) {
    this._cache = {};
    this.path = path;
    this.state = Immutable.fromJS(state);
    this.guid = cacheKey(path);
}

Model.prototype.get = function(prop) {
    return this.state.get(prop);
};

Model.prototype.set = function(prop, value) {
    this.state = this.state.set(prop, value);
};

Model.prototype.merge = function(state) {
    this.state = this.state.mergeDeep(state);
};

Model.prototype.bind = function(path, state) {

    var guid = cacheKey(path),
        model = this._cache[guid];

    if (!model) {
        model = this._cache[guid] = new Model(path, state);
    } else {
        model.merge(state);
    }

    return model;
};

module.exports = Model;


