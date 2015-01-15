var EvStore = require('ev-store');
var log = require('./utils').log;

module.exports = function(eventHandler, model) {

    return Object.create({

        hook: function(node, prop) {

            var es = EvStore(node);
            var eventName = prop.substring(2);
            var boundHandler;

            if (!es[eventName] || !es[eventName].handler || (es[eventName].handler !== eventHandler)) {

                boundHandler = eventHandler.bind(null, model);

                es[eventName] = {
                    handler: eventHandler,
                    boundHandler : boundHandler
                };

                node.addEventListener(eventName, boundHandler);
            }
        },

        unhook: function(node, prop) {

            var es = EvStore(node);
            var eventName = prop.substring(2);

            if (es[eventName] && es[eventName].boundHandler) {
                node.removeEventListener(eventName, es[eventName].boundHandler);
            }
        }
    });
}