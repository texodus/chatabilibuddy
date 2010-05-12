
var sys = require("sys");
var tcp = require("net");

var Log = require("./common").Log;

var xml = require("../../vendor/node-xml/lib/node-xml");
var Do  = require("../../vendor/do/lib/do");



/**
 * XMPPParser takes Stanzas and generates a list of Stanzas for routing.  The
 * primary XMPP protocol functionality occurs here, including login, messaging,
 * presence, etc. - thus this class carries alot of state about the connection
 * @constructor
 */
exports.XMPPParser = function() {

    var streamID;
    var jid;

    var isAuthenticated = false;
    var resource        = undefined;

    // List of response message templates
    var messages = {
        stream: {
            stream: { element : "stream",
                      prefix  : "stream",
                      attrs   : {} },

            features: { element  : "features",
                        prefix   : "stream",
                        attrs    : {},
                        children : [{ element  : "mechanisms",
                                      attrs    : { xmlns : "urn:ietf:params:xml:ns:xmpp-sasl" },
                                      children : [{ element  : "mechanism",
                                                    children : [ "PLAIN" ]},
                                                //  { element  : "mechanism",
                                                //    children : [ "DIGEST-MD5" ]},
                                                  { element  : "required" }]},
                                    { element  : "bind",
                                      attrs    : { xmlns : "urn:ietf:params:xml:ns:xmpp-bind" },
                                      children : [{ element : "required" }]},
                                    { element  : "session",
                                      attrs    : { xmlns : "urn:ietf:params:xml:ns:xmpp-session" },
                                      children : [{ element : "optional" }]}]}


        }
    }
                      
                      
    // List of incoming message processing functions - the object array
    // accessors let us look up the logic by looking at the function indexed
    // by the first element's name
    var namespaces = {
        stream: { 
            stream: function(message) {
                streamID = Math.uuid();
                var response = Object.clone(messages.stream.stream);
                response.attrs.to = message.attrs.from;
                response.attrs.id = streamID;
                return [response].concat([namespaces.stream.features(message)]);
            },

            features: function(message) {
                var features = Object.clone(messages.stream.features);
                if (isAuthenticated) { 
                    delete features.children.mechanisms; 
                } else {
                    delete features.children.session;
                }
                if (resource)     { delete features.children.bind; }
                return [features];
            }
        }
    }


    // Parse a single Stanza
    // @return a list of Stanzas
    this.parse = function(message) {
        return function(callback, errorHandler) {
            var command = message.element.split(":");
            var x = namespaces[command[0]][command[1]](message);
            callback(x);
        }
    }
}
        
