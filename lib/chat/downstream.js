
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
exports.XMPPDownstreamPipeline = function(router) {

    
    this.process = function(data) {


    }
}
