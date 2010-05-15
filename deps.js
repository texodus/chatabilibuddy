var sys   = require('sys');
var spawn = require('child_process').spawn;
var fs    = require('fs');

/**
 * Dependency list
 */
deps = { "node-xml" : "http://github.com/robrighter/node-xml.git",
         "do"       : "http://github.com/creationix/do.git" }



/**
 * Clone or update a dependency
 */
function getdep(name, url) {

    sys.puts("Downloading " + name + " from " + url);
    var path = "vendor/" + name;

    // make vendor dir, ignore errors
    fs.mkdir("vendor", 0755, function(e) {});
    
    // make lib dir
    fs.mkdir(path, 0755,  function(e) {
        if (e === undefined) {
            
            // checkout the lib
            var command = spawn("git", ["clone", url, path]);
            
            command.stdout.addListener("data", function (data) {
                sys.puts(data);
            });

            command.addListener("exit", function (code) {
                sys.puts("Cloned " + name);
            });

        } else {

            // update the lib
            var command = spawn("git", ["pull", path]);
            
            command.stdout.addListener("data", function (data) {
                sys.puts(data);
            });

            command.addListener("exit", function (code) {
                sys.puts("Updated " + name);
            });
        }
    });
}

(function() {
    for (var key in deps) {
        getdep(key, deps[key]);
    }
})();

