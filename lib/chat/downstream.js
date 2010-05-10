
var sys = require("sys");
var tcp = require("net");

var Log = require("./common").Log;

var xml = require("../../vendor/node-xml/lib/node-xml");
var Do  = require("../../vendor/do/lib/do");






/*******************************************************************************
 **** Server Config ************************************************************
 *******************************************************************************/

/**
 * XMPP updstream message processing pipeline.  Each instance is responsible for 
 * a single connection, taking raw character stream in chunks as input any 
 * resulting messages that are generated as a result of processing input are 
 * pushed to supplied router callback.
 * @constructor
 */
exports.XMPPDownstreamPipeline = function(socket) { 

    // Iteratively render an attribute list as a string
    var renderAttrs = function(attrs) {
        var response = "";
        for (key in attrs) response += key + "=\"" + attrs[key] + "\" ";
        return response.trim(); 
    }

    // Recursively render and XML element as a string
    var renderElement = function(element) {
        if (typeof element === "string") {
            return element;
        } else {
            var response = "<" + ((element.prefix === undefined) ? element.prefix + ":" : "") + " " + renderAttrs(element.attrs) + ">";
            for (child in element.children) {
                response += renderElement(child);
            }
            
            response += "</" + ((element.prefix === undefined) ? element.prefix + ":" : "") + ">";
            return response;
        }
    }

    // Processes a chunk of character data - calls router asynchronously on each 
    // generated XMPP message.
    this.process = function(data) {
        return function(callback, errorHandler) {
             
            // Treat streams as a special case
            if (data.element === "stream" && data.prefix === "stream") {
                callback("<stream:stream " + renderAttrs(data.attrs) + ">")
            } else {
                var response = renderElement(data);
                socket.write(response, function() { Log.debug("Sent " + response) });
            }
        }
    }
}
