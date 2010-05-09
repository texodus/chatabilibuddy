
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

String.prototype.unlines = function() {
    return this.replace(/\n/g, "");
}

Object.clone = function(obj) {
    if (obj == null || typeof(obj) != 'object') return obj;
    var temp = obj.constructor();
    for (var key in obj) temp[key] = Object.clone(obj[key]);

    return temp;
}




var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''); 

/**
 * Stolen from Robert Kieffer's Math.uuid.js (http://www.broofa.com/Tools/Math.uuid.js)
 */
Math.uuid = function() {
    var chars = CHARS, uuid = new Array(36), rnd=0, r;
    for (var i = 0; i < 36; i++) {
        if (i==8 || i==13 ||  i==18 || i==23) {
            uuid[i] = '-';
        } else if (i==14) {
            uuid[i] = '4';
        } else {
            if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
            r = rnd & 0xf;
            rnd = rnd >> 4;
            uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
    }
    return uuid.join('');
};



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




