
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
    var next;
    var parser = new xml.SaxParser(function(handler) {
	handler.onStartDocument(function() {});
	handler.onEndDocument(function() {});
	handler.onComment(function(msg) {});
	handler.onWarning(function(msg) {});
	
	handler.onStartElementNS(function(element_, attrs_, prefix_, uri_, namespaces_) {
            Log.debug("Start Element parsed");
            next({ type    : "start", 
                   element : element_,
                   attrs   : attrs_ });
        });
	
	handler.onEndElementNS(function(elem, prefix, uri) {
            next({ type    : "end",
	           element : element_,
                   attrs   : attrs_ });
        });

	handler.onCharacters(function(chars) {
            if (chars.trim().length > 0) {
	        next({ type : "characters",
                       body : chars });
            }
	});

	handler.onCdata(function(cdata) {
            next({ type : "cdata",
                   body : cdata });
	});

	handler.onError(function(msg) {
            Log.error(JSON.stringify(msg));
	});
    });

    // NOTE This is an evil hack that makes me want to stab myself in the ear with a pencil
    this.parse = function(data) {
        Log.debug("XMLParser invoked");
        return function(callback, errorHandler) {
            next = callback;
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
            Log.debug(sys.inspect(xmlElement));

            // TODO This may be drastically wrong
            // TODO Handle CDATA
            if (xmlElement.type === "start" && xmlElement.element === "stream:stream") {
                callback({ type : "stream:stream",
                           from : xmlElement.attrs.from,
                           to   : xmlElement.attrs.to });
            } else {
                if (xmlElement.type === "start") { 
                    depth ++;
                    buffer.push(xmlElement);
                } else if (xmlElement === "end") {
                    buffer.push(xmlElement);
                    depth --;
                    
                    if (depth === 0) {
                        callback(new Stanza(buffer));
                        buffer = [];
                    }
                } else if (xmlElement === "characters") {
                    buffer.push(xmlElement);
                } else {
                    // TODO call the errorHandler
                }
            }
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
