
// TODO Establish a common convention for referencing local vs. global modules
var sys = require("sys");
var tcp = require("net");

var xml = require("../vendor/node-xml/lib/node-xml");
var Do  = require("../vendor/do/lib/do");

var XMPPUpstreamPipeline   = require(__dirname + "/chat/upstream").XMPPUpstreamPipeline;
var XMPPDownstreamPipeline = require(__dirname + "/chat/downstream").XMPPDownstreamPipeline;
var Log                    = require(__dirname + "/chat/common").Log;





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

    var connections = {};

    this.route = function(message) {
        Log.info(sys.inspect(message, 4).unlines());
    }

    // Add this socket to the global registry
    this.register = function(id, conn) { 
        connections[id] = conn
    }

    // Remove this socket from the global registry
    this.unregister = function(id) {
        delete connections[id];
    }
}





/*******************************************************************************
 **** Server Config ************************************************************
 *******************************************************************************/

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
	    Log.info(socketID + " connected");
	});

	// Process the data in the upstream stack, then inject all resulting
        // messages into the router.
	socket.addListener("data", function (data) {
            Do.chain( upstream.process(data), 
                      function(messages) { return Do.map(messages, router.route); })(router.route, Log.error);  
            Log.debug(socketID + " says " + data.trim());
  	});
	
	// Unregister the conenction this is closing
	socket.addListener("end", function () {
	    router.unregister(socketID);
            socket.end();
            Log.info(socketID + " disconnected");
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
    Log.info("Server listening on port 7000");
})();


