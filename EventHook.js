var EvStore = require('ev-store');

module.exports = function(events, states, mapping) {

    return Object.create({

        hook: function(node, prop) {

            var es = EvStore(node);
            var eventName = prop.substring(2);

            if (!es[eventName]) {

                es[eventName] = function(e) {
                    e.stopPropagation();
                    events.onNext(e);
                };

                events.
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
            }
        }
    });
}