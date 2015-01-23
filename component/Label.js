var elem = require('../h');
var Rx = require('rx');
var Observable = Rx.Observable;
var Component = require('./Component');
var Prefix = require('./Prefix');



module.exports = Component.create('Label', {

    render: function(state) {

        var vdom = elem('div', {

            className: 'label',
            key: state.get('key')

        }, this.renderChildren(state));

        return Observable.of(vdom);
    },

    renderChildren: function(state) {
        var children = [];

        if (state.get('prefix')) {
            children.push(
                Prefix(state.bind('prefix'))
            );
        }
        children.push(String(state.get('text')));

        return children;
    }

});