
// TODO Establish a common convention for referencing local vs. global modules
var sys = require("sys");






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
 * Flag debug mode
 */ 
exports.isDebug = (function() {
    for (arg in process.argv) {
        if (process.argv[arg] === "--debug") {
            return true;
        }
    }
    return false;
})();



/**
 * Static logging Object
 */ 
exports.Log = {
    info:  function(msg) { sys.log(" INFO  : " + msg); },
    warn:  function(msg) { sys.log(" WARN  : " + msg); },
    error: function(msg) { sys.log(" ERROR : " + msg); },
    debug: function(msg) { if (exports.isDebug) { sys.log(" DEBUG : " + msg); }}
}




