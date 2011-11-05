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
    'enhancedAuth' : true,    // Blob & Queue auth differently than Tables :-(
    'authQueryString' : true
  });

};

Queue.createQueue = function(name,options,callback) {
  
  var onResponse = function(error, response) {
    if (response.statusCode != 201) {
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
  
  var onResponse = function(error, response) {
    if (response.statusCode != 201) {
      callback(error);
    } else {
      callback(null,true);
    }
  };
  
  // TODO:  Support visibilityTimeout and messageTtl
  
  azureutil.doPost({
    'host' : this.options.account + '.queue.core.windows.net',
    'path' : this.name + '/messages',
    'body' : '<QueueMessage><MessageText>' + new Buffer(m).toString('base64') + '</MessageText></QueueMessage>',
    'account' : this.options.account,
    'key' : this.options.key,
    'onResponse' : onResponse,
    'enhancedAuth' : true,
  });
  
};

Queue.prototype.get = function(callback) {  

  var saxStream = sax.createStream(true);
  var insideMessage = false;
  var currentAttribute = "";
  var message = {};
  
  var onResponse = function(error, response) {
    if (error) {
      callback(error);
    }
  };
  
  saxStream.on('opentag', function(tag) {
    if (tag.name === "QueueMessage") {
      insideMessage = true;
    } else if (insideMessage) {
      currentAttribute = tag.name;
    }
  });
  
  saxStream.on('text', function(s) {
    if (insideMessage) {
      if (currentAttribute === 'MessageText') {
        message.body = new Buffer(s, 'base64').toString('ascii');
      } else if (currentAttribute === 'MessageId') {
        message.id = s;
      } else {
        // TODO:  Convert timestamps to js date format
        message[currentAttribute.charAt(0).toLowerCase() + currentAttribute.slice(1)] = s;
      }
    }
  });
  
  saxStream.on('closetag', function(name) {
    if (name === "QueueMessage") {
      callback(null,message);
    }
  });
  
  azureutil.doGet({
    'host' : this.options.account + '.queue.core.windows.net',
    'path' : this.name + '/messages',
    // 'queryString' : 'peekonly=true',
    'account' : this.options.account,
    'key' : this.options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream,
    'enhancedAuth' : true    // Blob & Queue auth differently than Tables :-(
  });
  
};

Queue.prototype.peek = function(callback) {
  
  var saxStream = sax.createStream(true);
  var insideMessage = false;
  var currentAttribute = "";
  var message = {};
  
  var onResponse = function(error, response) {
    if (error) {
      callback(error);
    }
  };
  
  saxStream.on('opentag', function(tag) {
    if (tag.name === "QueueMessage") {
      insideMessage = true;
    } else if (insideMessage) {
      currentAttribute = tag.name;
    }
  });
  
  saxStream.on('text', function(s) {
    if (insideMessage) {
      if (currentAttribute === 'MessageText') {
        message.body = new Buffer(s, 'base64').toString('ascii');
      } else {
        // TODO:  Convert timestamps to js date format
        message[currentAttribute.charAt(0).toLowerCase() + currentAttribute.slice(1)] = s;
      }
    }
  });
  
  saxStream.on('closetag', function(name) {
    if (name === "QueueMessage") {
      callback(null,message);
    }
  });
  
  azureutil.doGet({
    'host' : this.options.account + '.queue.core.windows.net',
    'path' : this.name + '/messages',
    'queryString' : 'peekonly=true',
    'account' : this.options.account,
    'key' : this.options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream,
    'enhancedAuth' : true    // Blob & Queue auth differently than Tables :-(
  });
  
};

Queue.prototype.del = function(id,receipt,callback) {

  var onResponse = function(error, response) {
    if (response.statusCode != 204) {
      callback(error);
    } else {
      callback(null,true);
    }
  };
  
  // TODO:  Support visibilityTimeout and messageTtl
  
  azureutil.doDelete({
    'host' : this.options.account + '.queue.core.windows.net',
    'path' : this.name + '/messages/' + id,
    'queryString' : 'popreceipt=' + receipt,
    'account' : this.options.account,
    'key' : this.options.key,
    'onResponse' : onResponse,
    'enhancedAuth' : true,
  });

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
