
var sys = require("sys");
var tcp = require("net");

var Log = require("./common").Log;

var xml = require("../vendor/node-xml/lib/node-xml");
var Do  = require("../vendor/do/lib/do");





/*******************************************************************************
 **** XML Parser ***************************************************************
 *******************************************************************************/

/**
 * The main parsing object - keeps internal state as to the status of the
 * parsing, calls internal handlers tagsoup style when complete XML elements are
 * received.  
 * @constructor
 */ 
function XMLParser() {
    var callback, errorHandler;
    var parser = new xml.SaxParser(function(handler) {
	handler.onStartDocument(function() {});
	handler.onEndDocument(function() {});
	handler.onComment(function(msg) {});
	handler.onWarning(function(msg) {});
	
	handler.onStartElementNS(function(element_, attrs_, prefix_, uri_, namespaces_) {
            Log.debug("Start Element parsed");
            callback({ type    : "start", 
                       element : element_,
                       attrs   : attrs_ });
        });
	
	handler.onEndElementNS(function(element_, prefix, uri) {
            callback({ type    : "end",
	               element : element_ });
        });

	handler.onCharacters(function(chars) {
            if (chars.trim().length > 0) {
	        callback({ type : "characters",
                           body : chars });
            }
	});

	handler.onCdata(function(cdata) {
            callback({ type : "cdata",
                       body : cdata });
	});

	handler.onError(function(msg) {
            errorHandler(JSON.stringify(msg));
	});
    });

    // NOTE This is an evil hack that makes me want to stab myself in the ear 
    // with a pencil.  May also cause bizarre race conditions, if parse is 
    // called multiple times before invoke - this wont happen with current
    // implementation, but is not safe.
    this.parse = function(data) {
        Log.debug("XMLParser invoked");
        return function(callback_, errorHandler_) {
            callback = callback_;
            errorHandler = errorHandler_;
            Log.debug("XMLParse inner invoked");
            parser.parseString(data);
        }
    }
}




   
/*******************************************************************************
 **** Stanza Parser ************************************************************
 *******************************************************************************/

/**
 * Stanza Object represents a single XMPP Stanze
 * @constructor 
 */
function Stanza(buffer) {

}

/**
 * StanzaParser is responsible for generating XMPP stanzas from a stream of XML
 * Element Objects.
 * @constructor
 */
function StanzaParser() {
    var depth  = 0;
    var buffer = [];

    this.parse = function(xmlElement) {
        return function(callback, errorHandler) {
            Log.debug("StanzaParser invoked");
         
            // TODO This may be drastically wrong
            // TODO Handle CDATA
            if (xmlElement.type === "start" && xmlElement.element === "stream:stream") {
                callback({ type : "stream:stream",
                           from : xmlElement.attrs.from,
                           to   : xmlElement.attrs.to });
            } else {
                if (xmlElement.type === "start") { 
                    depth++;
                    buffer.push(xmlElement);
                } else if (xmlElement.type === "end") {
                    buffer.push(xmlElement);
                    depth --;
                    
                    if (depth === 0) {
                        callback(new Stanza(buffer));
                        buffer = [];
                    }
                } else if (xmlElement.type === "characters") {
                    buffer.push(xmlElement);
                } else {
                    // TODO call the errorHandler
                }
            }

            Log.debug("  message : " + sys.inspect(xmlElement));
            Log.debug("  buffer  : " + sys.inspect(buffer).replace(/\n/, ""));
            Log.debug("  depth   : " + depth);
        }
    }              
}





/*******************************************************************************
 **** Stanza Parser ************************************************************
 *******************************************************************************/

/**
 * Parses XMPP Logic
 * @constructor
 */
function XMPPParser() {

    this.parse = function(data) {
        return function(callback, errorHandler) {
            Log.debug("XMPPParser invoked");
            Log.debug(sys.inspect(data));
        }
    }
}





/*******************************************************************************
 **** Public *******************************************************************
 *******************************************************************************/

/**
 * XMPP updstream message processing pipeline.  Each instance is responsible for 
 * a single connection, taking raw character stream in chunks as input any 
 * resulting messages that are generated as a result of processing input are 
 * pushed to supplied router callback.
 * @constructor
 */
exports.XMPPUpstreamPipeline = function(router) {
    var xml    = new XMLParser();
    var stanza = new StanzaParser();
    var xmpp   = new XMPPParser();
    
    // Processes a chunk of character data - calls router asynchronously on each 
    // generated XMPP message.
    this.process = function(data) {
        return Do.chain(xml.parse(data), stanza.parse, xmpp.parse);
    }
}
