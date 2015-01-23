var Component = require('./Component');
var Label = require('./Label');
var elem = require('../h');

module.exports = Component.create('Root', {

    render: function(state) {

        var vdom = elem('div', {

            className: 'root',
            onclick: this.mapEvent(this.click)

        }, this.renderChildren(state));

        return vdom;
    },

    renderChildren: function(state) {

        var count = state.get('count');
        var countText = elem('div', { className: 'count' }, ['Count: ' + count]);

        return [
            countText,
            Label(state.bind('a')),
            Label(state.bind('b'))
        ];
    },

    click: function(state) {

        var count = state.get(['count']) + 1,
            path = (count % 2) ? 'a' : 'b';

        state = state.set('count', count);
        state = state.set([path, 'text'], count);

        return state;
    }

});