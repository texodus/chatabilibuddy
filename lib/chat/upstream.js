
var sys = require("sys");
var tcp = require("net");

var Log        = require("./common").Log;
var XMPPParser = require("./xmpp").XMPPParser;

var xml = require("../../vendor/node-xml/lib/node-xml");
var Do  = require("../../vendor/do/lib/do");





/*******************************************************************************
 **** XML Parser ***************************************************************
 *******************************************************************************/

/**
 * The main parsing object - keeps internal state as to the status of the
 * parsing, calls internal handlers tagsoup style when complete XML elements are
 * received.  Acts as a wrapper to node.xml
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
            Log.debug(prefix_);
            Log.debug("Start Element parsed");

            // Convert the attributes Array of Arrays into an Object
            // TODO Fix node-xml to return this format
            var attrs__ = new Object();
            for (pair in attrs_) {
                attrs__[pair[0]] = pair[1];
            }

            callback({ type    : "start", 
                       element : prefix_ + ":" + element_,
                       attrs   : attrs__ });
        });
        
        handler.onEndElementNS(function(element_, prefix_, uri_) {
            callback({ type    : "end",
	               element : prefix_ + ":" + element_ });
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
    // TODO Fix node-xml.parseString to take a callback function
    this.parse = function(data) {
        Log.debug("XMLParser invoked");
        return function(callback_, errorHandler_) {
            callback = callback_;
            errorHandler = errorHandler_;
            parser.parseString(data);
        }
    }
}






   
/*******************************************************************************
 **** Stanza Parser ************************************************************
 *******************************************************************************/

/**
 * Stanza Object represents a single XMPP Stanza.  There is no error checking, 
 * so we depend on previous layers to only feed valid xml.  The constructors
 * takes as input an array buffer of XML elemnts, and returns a single XML
 * Object.
 * @constructor 
 */
function Stanza(buffer) {
    var tag  = buffer[0];
    var self = this;
    buffer.shift();
    
    this.element  = tag.element;
    this.attrs    = tag.attrs;
    this.children = [];

    // Recursively call new Stanza() for all elements that are children of this
    while (buffer.length > 0 && buffer[0].type != "end") {
        if (buffer[0].type === "characters") {
            self.children.push(buffer[0].body);
            buffer.shift();
        } else if (buffer[0].type === "start") {
            self.children.push(new Stanza(buffer));
        }
    }

    // Clear the closing end tag
    buffer.shift();
}





/**
 * StanzaParser is responsible for generating XMPP stanzas from a stream of XML
 * Element Objects.  Short circuits on stream:stream messages.
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
                callback({ element : "stream:stream",
                           attrs   : xmlElement.attrs });
            } else {
                if (xmlElement.type === "start") { 
                    buffer.push(xmlElement);
                    depth++;
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
                    errorHandler("Unexpected XML Element");
                }
            }

            Log.debug("  Stanza message : " + sys.inspect(xmlElement).unlines());
            Log.debug("  Stanza buffer  : " + sys.inspect(buffer).unlines());
            Log.debug("  Stanza depth   : " + depth);
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
