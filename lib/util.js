/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var EventEmitter = require('events').EventEmitter;
var u_ = require('underscore');

var safeCallback = function(cb) {
  if ((typeof cb) === 'function') {
    return cb;
  } else {
    return function() {};
  }
}

var parseArgs = function(args, callback) {

  var params = {};
  
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

      if (!params.options) { 
        params.options = {}; 
      };

      // Merge options if we have 'em
      if (args.mergeOpts) {
        u_.extend(params.options,args.mergeOpts)
      }

      // Provide a safe callback if required
      if (!params.callback && args.safeCallback) {
        params.callback = function() {};
      }

      callback(params);
    }

  });

}

var getEmitter = function(cb) {
  var emitter = new EventEmitter();
  var theList = [];

  if (cb) {
    emitter.on('data', function(item) {
      theList.push(item);
    });
    emitter.on('end', function() {
      cb(null, theList);
    });
    emitter.on('error', function(err) {
      cb(err);
    });
  }
  return emitter;
}

exports.parseArgs = parseArgs;
exports.getEmitter = getEmitter;
exports.safeCallback = safeCallback;