/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */
 
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require("sax");

var azureutil = require("./util");
    
function Queue (q,options) {
  this.options = options;
  this.name = q;
}

util.inherits(Queue,EventEmitter);

Queue.listQueues = function(options, callback) {
  
  var saxStream = sax.createStream(true);
  var insideQueueName = false;
  var queues = [];
  
  var onResponse = function(error, response) {
    if (error) {
      callback(error);
    }
  };
  
  saxStream.on('opentag', function(tag) {
    if (tag.name === "Name") {
      insideQueueName = true;
    }
  });
  
  saxStream.on('text', function(s) {
    if (insideQueueName) {
      queues.push(s);
      insideQueueName = false;
    }
  });
  
  saxStream.on('closetag', function(name) {
    if (name === "Queues") {
      callback(null,queues);
    }
  });
  
  azureutil.doGet({
    'host' : options.account + '.queue.core.windows.net',
    'queryString' : 'comp=list',
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream,
    'enhancedAuth' : true    // Blob & Queue auth differently than Tables :-(
  });

};

Queue.createQueue = function(name,options,callback) {
  
  var onResponse = function(error, response) {
    if (response.statusCode != 201) {
      // console.dir(response.headers);
      // console.log("Response = " + response.statusCode);
      callback(error);
    } else {
      var q = new Queue(name,options);
      callback(null,q);
    }
  };
  
  azureutil.doPut({
    'host' : options.account + '.queue.core.windows.net',
    'path' : name,
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'enhancedAuth' : true,
    'metaData' : {
      'Name' : name
    }
  });
  
};

Queue.removeQueue = function(q,options,callback) {
  
  var onResponse = function(error, response) {
    if (response.statusCode != 204) {
      // console.dir(response.headers);
      // console.log("Response = " + response.statusCode);
      callback(error);
    } else {
      callback(null,true);
    }
  };
  
  azureutil.doDelete({
    'host' : options.account + '.queue.core.windows.net',
    'path' : q,
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'enhancedAuth' : true,
  });
  
};

Queue.prototype.put = function(m,callback) {
  
};

Queue.prototype.get = function(callback) {
  
};

Queue.prototype.peek = function(callback) {
  
};

Queue.prototype.del = function(m,callback) {
  
};

Queue.prototype.clear = function(callback) {
  
};

Queue.prototype.update = function(m,callback) {
  
};

Queue.prototype.poll = function(t) {
  
  if (t > 0) {    
    this.interval = setInterval(function() {
      this.get(function(err,msg) {
        if (msg) {
          this.emit('message',msg);
        }        
      });
    },t);
  } else {
    clearInterval(this.interval);
  }
  
};

module.exports = Queue;