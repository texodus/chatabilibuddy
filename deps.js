var sys   = require('sys');
var spawn = require('child_process').spawn;
var fs    = require('fs');



function clone(name, url) {
    return function(callback, errorHandler) {
        var command = spawn("git", ["clone", url, "vendor/" + name]);
        
        command.stdout.addListener('data', function (data) {
            sys.print(" * " + data);
        });
        
        command.stderr.addListener('data', function (data) {
            sys.print(" ! " + data);
        });
        
        command.addListener('exit', function (code) {
            sys.puts("Finished");
            callback();
        });
    }
}

(function() {
    fs.mkdirSync("vendor", 0755); 
    
    clone("node-xml", "http://github.com/robrighter/node-xml.git")(
        function() {
            clone("do", "http://github.com/creationix/do.git")(function() {}, function() {});
        }, function() {});
})();

