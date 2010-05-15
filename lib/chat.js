
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

    this.route = function(id) {
        return function(message, index) {
            Log.debug("Routing : " + sys.inspect(index, 4) + ";;" + sys.inspect(message, 4).unlines());
            var downstream = connections[id];
            downstream.process(message)(Log.info, Log.error);
        }
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
function XMPPServer() {
    var router = new XMPPRouter();
    var server = tcp.createServer(function (socket) {
	var upstream   = new XMPPUpstreamPipeline();
	var downstream = new XMPPDownstreamPipeline(socket);
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
            upstream.process(data)(function(messages) { messages.map(router.route(socketID)); }, Log.error);  
            Log.info(socketID + " says " + data.trim());
  	});
	
	// Unregister the conenction this is closing
	socket.addListener("end", function () {
	    router.unregister(socketID);
            socket.end();
            Log.info(socketID + " disconnected");
	});
    });

    this.start = function(port) {
	server.listen(port, "localhost");
        Log.info("Server listening on port " + port);
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
    var server = new XMPPServer();
    server.start(5222);
 })();


