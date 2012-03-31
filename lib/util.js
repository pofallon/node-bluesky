/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var EventEmitter = require('events').EventEmitter;

var safeCallback = function(cb) {
  if ((typeof cb) === 'function') {
    return cb;
  } else {
    return function() {};
  }
}

var prepFetch = function(args, callback) {
	// prefix, options, callback, doFetch

  var params = {};
  var theList = [];

  [args.prefix,args.options,args.callback].forEach(function(elem, idx, a) {
    switch (typeof elem) {
      case "string":
        params.prefix = elem;
        break;
      case "object":
        params.options = elem;
        break;
      case "function":
        params.callback = elem;
        break;
    }
    if ((idx+1) === a.length) {

      // If we have a callback, trap emissions ourselves
      // and pass them back all at once in the callback
      if (params.callback) {
        args.emitter.on('data', function(item) {
          theList.push(item);
        });
        args.emitter.on('end', function() {
          params.callback(null,theList);
        });
        args.emitter.on('error', function(err) {
          params.callback(err);
        });
      }

      callback(params);
    }

  });

}

exports.prepFetch = prepFetch;
exports.safeCallback = safeCallback;