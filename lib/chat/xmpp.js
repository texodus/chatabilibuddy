
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

    // List of response message templates
    var messages = {
        stream: {
            stream: {
                element : "stream",
                prefix  : "stream",
                attrs   : {}
            }
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
                
                return [response];
            }
        }
    }


    // Parse a single Stanza
    // @return a list of Stanzas
    this.parse = function(message) {
        return function(callback, errorHandler) {
            var namespace = message.element.split(":")[0];
            var command   = message.element.split(":")[1];
            callback(namespaces[namespace][command](message));
        }
    }
}
        
