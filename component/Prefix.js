var Component = require('./Component');
var elem = require('../h');
var Rx = require('rx');
var Observable = Rx.Observable;

module.exports = Component.create('Prefix', {

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
        return Observable.of(state.set('selected', !state.get('selected')));
    }
});