
var sys = require("sys");
var tcp = require("net");

var Log = require("./common").Log;
var Do  = require("../../vendor/do/lib/do");



/**
 * XMPPParser takes Stanzas and generates a list of Stanzas for routing.  The
 * primary XMPP protocol functionality occurs here, including login, messaging,
 * presence, etc. - thus this class carries alot of state about the connection
 * @constructor
 */
exports.XMPPParser = function() {

    var streamID        = undefined;
    var jid             = undefined;

    var isAuthenticated = false;
    var resource        = undefined;

    // List of response message templates
    var messages = {
        stream: {
            stream:     { element : "stream",
			  prefix  : "stream",
			  attrs   : {} },

            features:   { element  : "features",
                          prefix   : "stream",
                          attrs    : {},
                          children : [{ element  : "mechanisms",
					attrs    : { xmlns : "urn:ietf:params:xml:ns:xmpp-sasl" },
					children : [{ element  : "mechanism",
                                                      children : [ "PLAIN" ]},
                                                    // Whoops!  this is fucking hard!
                                                    //  { element  : "mechanism",
                                                    //    children : [ "DIGEST-MD5" ]},
                                                    { element  : "required" }]},
                                      { element  : "bind",
					attrs    : { xmlns : "urn:ietf:params:xml:ns:xmpp-bind" },
					children : [{ element : "required" }]},
                                      { element  : "session",
					attrs    : { xmlns : "urn:ietf:params:xml:ns:xmpp-session" },
					children : [{ element : "optional" }]}]},

	    failure:    { element  : "failure",
			  attrs    : { xmlns : "urn:ietf:params:xml:ns:xmpp-sasl" },
			  children : [{ element : "temporary-auth-failure" }]},

	    success:    { element  : "success",
			  attrs    : { xmlns : "urn:ietf:params:xml:ns:xmpp-sasl" }},

	    presence:   { element  : "presence",
			  attrs    : { from : undefined,
				       to   : undefined,
				       id   : undefined }},

	    unpresence: { element  : "presence",
			  attrs    : { from : undefined,
				       to   : undefined,
				       type : "unavailable" }}
        }
    }
                      
                      
    // List of incoming message processing functions - the object array
    // accessors let us look up the logic by looking at the function indexed
    // by the first element's name
    var namespaces = {
        stream: { 
            stream: function(message) {
                streamID = Math.uuid();
                var response = Object.clone(messages.stream.stream);
                response.attrs.to = message.attrs.from;
                response.attrs.id = streamID;
                return [response].concat(namespaces.stream.features(message));
            },

            features: function(message) {
                var features = Object.clone(messages.stream.features);
                if (isAuthenticated) { 
                    delete features.children.mechanisms; 
                } else {
                    delete features.children.session;
                }
                if (resource)     { delete features.children.bind; }
                return [features];
            },


            // TODO You got your lisp in my Javascript!

	    disconnect: function(message) {
		// (defmethod parse :disconnect
		//   [_ state]
		//   (cons [:disconnect common/domain (jid state)]
		//         (loop [friends (accounts/get-friends-user-id (:user-id state))
		//                result []]
		//           (if (empty? friends)
		//             result
		//             (recur (rest friends) 
		//                    (cons (Message [:unpresence] 
		// 				  (:jid (first friends)) 
		// 				  (jid state) 
		// 				  [])
		//                          result))))))

	    },
		
	    auth: function(message) {
		// (defmethod parse :auth
		//   [{{mechanism :mechanism} :attrs [password & _] :message} state]
		//   (condp = (if (nil? mechanism) "PLAIN" mechanism)
		//     "PLAIN" (let [chars (.decode (Base64.) (.getBytes password))
		// 		  username (apply str (map char (take-while pos? (drop 1 chars))))
		// 		  password (apply str (map char (drop 1 (drop-while pos? (drop 1 chars)))))
		// 		  user-id (:id (accounts/login username password))]
		// 	      (if (nil? user-id)
		// 		(do (log :info (str "failed to login as username " username))
		// 		    [(Message [:failure] 
		// 			      (jid state) 
		// 			      common/domain 
		// 			      [])])
		//                 (do (log :info (str "logged in successfully as username " username))
		//                     (dosync (alter state assoc :username username :user-id user-id))
		//                     [(Message [:success] 
		//                               (jid state) 
		//                               common/domain 
		//                               [])])))))
	    },

	    presence: function(message) {

		// (defmethod parse :presence
		//   [_ state]
		//   (loop [friends (map :jid (accounts/get-friends-user-id (:user-id @state)))
		//          result []]
		//     (if (empty? friends)
		//       result
		//       (recur (rest friends) 
		//              (cons [(Message [:presence] 
		// 			     (first friends) 
		// 			     (jid state) 
		// 			     [(gen-id)])]  ;  presence does not send reverse notification because it could block on opening a client channel
		//                    result)))))

	    }
        }
    }


    // Parse a single Stanza
    // @return a list of Stanzas
    this.parse = function(message) {
        return function(callback, errorHandler) {
            var command = message.element.split(":");
            var x = namespaces[command[0]][command[1]](message);
            callback(x);
        }
    }
}
        
