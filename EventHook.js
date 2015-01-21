var EvStore = require('ev-store');
var Rx = require('rx');

module.exports = function(events, states, mapping) {

    return Object.create({

        unhooked: new Rx.Subject(),

        hook: function(node, prop) {

            var es = EvStore(node);
            var eventName = prop.substring(2);

            if (!es[eventName]) {

                es[eventName] = function(e) {
                    e.stopPropagation();
                    events.onNext(e);
                };

                events.
                    takeUntil(this.unhooked).
                    filter(function(e) {
                        return e.type === eventName;
                    }).
                    withLatestFrom(states, function(e, currentState) {
                        return currentState;
                    }).
                    map(mapping).
                    subscribe(states);

                node.addEventListener(eventName, es[eventName], false);
            }
        },

        unhook: function(node, prop) {

            var es = EvStore(node);
            var eventName = prop.substring(2);

            if (es[eventName]) {
                node.removeEventListener(eventName, es[eventName], false);

                this.unhooked.onNext();
                this.unhooked.onComplete();
            }
        }
    });
}