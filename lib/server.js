
// TODO Establish a common convention for referencing local vs. global modules
var sys = require("sys");
var tcp = require("net");

var xml = require("../vendor/node-xml/lib/node-xml");
var Do  = require("../vendor/do/lib/do");

var XMPPUpstreamPipeline   = require("./upstream").XMPPUpstreamPipeline;
var XMPPDownstreamPipeline = require("./downstream").XMPPDownstreamPipeline;
var Log                    = require("./common").Log;





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
            upstream.process(data)(Log.info, Log.error);
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
})();


                                 






