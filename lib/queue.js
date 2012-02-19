/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */
 
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var u_ = require("underscore");
    
function Queue (q,options) {
  this.options = options;
  this.name = q;
}

util.inherits(Queue,EventEmitter);

Queue.listQueues = function(options, callback) {

  var queueList = [];

  var processResults = function(err, theseQueues, continuation) {
    if (err) {
      callback(err);
    } else {
      queueList = queueList.concat(u_.map(theseQueues, function(q) { return q.name; }));
      if (continuation && continuation.hasNextPage()) {
        fetchQueues(continuation);
      } else {
        callback(null,queueList);
      }
    }
  };

  (function fetchQueues(more) {

    if (more) {
      more.getNextPage(processResults);
    } else {
      options.queueService.listQueues(processResults);
    }

  })();

};

Queue.createQueue = function(name,options,callback) {

  options.queueService.createQueueIfNotExists(name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, new Queue(name,options));
    }
  });
  
};

Queue.removeQueue = function(name,options,callback) {

  options.queueService.deleteQueue(name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);
    }
  });
  
};

Queue.prototype.put = function(message,callback) {
  
  this.options.queueService.createMessage(this.name, message, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);
    }
  })

};

Queue.prototype.get = function(callback) {  

  this.options.queueService.getMessages(this.name, function(err, messages) {
    if (err) {
      callback(err);
    } else {
      callback(null,messages[0]);
    }
  });
  
};

Queue.prototype.peek = function(callback) {
  
  this.options.queueService.peekMessages(this.name, function(err, messages) {
    if (err) {
      callback(err);
    } else {
      callback(null,messages[0]); 
    }
  });
  
};

Queue.prototype.del = function(id,receipt,callback) {

  this.options.queueService.deleteMessage(this.name, id, receipt, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);
    }
  });

};

Queue.prototype.clear = function(callback) {

  this.options.queueService.clearMessages(this.name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);
    }
  });
  
};

Queue.prototype.update = function(m,callback) {

};

Queue.prototype.poll = function(t) {

  var that = this;
  
  if (t > 0) {    
    this.interval = setInterval(function() {
      that.get(function(err,msg) {
        if (err) {
          that.emit('error',err);
        } else if (msg) {
          that.emit('message',msg);
        }        
      });
    },t);
  } else {
    clearInterval(this.interval);
  }
  
};

Queue.prototype.service = function() {
  return this.options.queueService;
}

module.exports = Queue;
