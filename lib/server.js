
// TODO Establish a common convention for referencing local vs. global modules
var sys = require("sys");
var tcp = require("net");

var xml = require("../vendor/node-xml/lib/node-xml");
var Do  = require("../vendor/do/lib/do");





/*******************************************************************************
 **** Util *********************************************************************
 *******************************************************************************/

/**
 * Adds utility method trim to String Object.
 *   TODO Determine whether this prototype is exported globally from a NodeJS 
 *        Module.
 */
String.prototype.trim = function() {
    return this.replace(/^\s*/, "").replace(/\s*$/, "").replace(/\n*/,  "").replace(/\r*/,  "");
}





/**
 * Static logging Object
 */ 
var Log = {
    info:  function(msg) { sys.log(" INFO  : " + msg); },
    warn:  function(msg) { sys.log(" WARN  : " + msg); },
    error: function(msg) { sys.log(" ERROR : " + msg); },
    debug: function(msg) { sys.log(" DEBUG : " + msg); }
}





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
        function(callback, errorHandler) {
            next = callback;
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
        function(callback, errorHandler) {
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
 **** XMPP Router **************************************************************
 *******************************************************************************/

/**
 * XMPP routing handler.  Keeps a persistent map of socketIDs to sockets
 * plus metadata about JIDs, and routes XMPPMessages to the correct pipeline.
 *   TODO Implement me!
 * @constructor
 */
function XMPPRouter() {

    // Add this socket to the global registry
    this.register = function(x, y) { }

    // Remove this socket from the global registry
    this.unregister = function(x) {}
}





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
function XMPPUpstreamPipeline(router) {
    var xml    = new XMLParser();
    var stanza = new StanzaParser();
    var xmpp   = new XMPPParser();
    
    // Processes a chunk of character data - calls router asynchronously on each 
    // generated XMPP message.
    this.process = function(data) {
        return Do.chain(function() { return xml.parse(data); }, stanza, xmpp);
    }
}





/**
 * XMPP downstream message handling pipeline.  Still responsible for a single 
 * connection.
 *   TODO Implement me!
 * @constructor
 */
function XMPPDownstreamPipeline() {

    // Process an XMPPMessage into character stream
    this.process = function(data) { }
}





/**
 * XMPP Server instance. 
 * @constructor
 */
function XMPPServer(port) {
    var router = new XMPPRouter();
    var server = tcp.createServer(function (socket) {
	var upstream   = new XMPPUpstreamPipeline();
	var downstream = new XMPPDownstreamPipeline();
	var socketID;

	socket.setEncoding("utf8");

	// Register newly opened conenctions with the router so it can access
        // all open conenctions
	socket.addListener("connect", function () {
            socketID = socket.remoteAddress + ":" + socket.remotePort;
	    router.register(socketID, downstream);
	    Log.info(socket.remoteAddress + ":" + socket.remotePort + " connected");
            Log.debug("Created socketID " + socketID);
	});

	// Process the data in the upstream stack, then inject all resulting
        // messages into the router.
	socket.addListener("data", function (data) {
            upstream.process(data)(router.route, errorHandler);
            Log.debug("SocketID " + socketID + " says " + data.trim());
  	});
	
	// Unregister the conenction this is closing
	socket.addListener("end", function () {
	    router.unregister(socketID);
            socket.end();
	});
    });

    this.start = function() {
	server.listen(port, "localhost");
    }

    this.stop = function() {
	server.stop();
    }
}


                                 



/*******************************************************************************
 **** Main *********************************************************************
 *******************************************************************************/

/** 
 * Main application entry point.
 */ 
(function() {
    var server = new XMPPServer(7000);
    server.start();
})();


                                 






