/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */
 
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var skyutil = require('./util');
    
function Queue (q,options) {
  this.options = options;
  this.name = q;
}

util.inherits(Queue,EventEmitter);

Queue.listQueues = function(prefix, options, callback) {

  var queueCounter = 0;

  var processResults = function(err, theseQueues, continuation) {
    if (err) {
      emitter.emit('error', err);
    } else {
      theseQueues.forEach(function(queue) {
        if (!options.limit || (queueCounter < options.limit)) {
          emitter.emit('data', queue.name);
          queueCounter++;
        }
      });
      if (continuation && continuation.hasNextPage()) {
        if (!options.limit || (queueCounter < options.limit)) {
          fetchQueues(continuation);
        }
      } else {
        emitter.emit('end',queueCounter);
      }
    }
  };

  var fetchQueues = function(more) {

    try {

      if (more) {
        more.getNextPage(processResults);
      } else {
        if (prefix) {
          options.queueService.listQueues({prefix:prefix},processResults);
        } else {
          options.queueService.listQueues(processResults);
        }
      }

    } catch (err) {
      emitter.emit('error', err);
    }

  };

  var emitter = skyutil.getEmitter(callback);
  fetchQueues();
  return(emitter);

};

Queue.createQueue = function(name,options,callback) {

  try {

    options.queueService.createQueueIfNotExists(name, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, new Queue(name,options));
      }
    });

  } catch (err) {
    callback(err);
  }
  
};

Queue.removeQueue = function(name,options,callback) {

  try {

    options.queueService.deleteQueue(name, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null,true);
      }
    });

  } catch (err) {
    callback(err);
  }
  
};

Queue.prototype.put = function(message,callback) {

  callback = skyutil.safeCallback(callback);

  try {
  
    this.options.queueService.createMessage(this.name, message, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null,true);
      }
    });

  } catch (err) {
    callback(err);
  }

};

Queue.prototype.get = function(callback) {  

  var that = this;

  try {

    this.options.queueService.getMessages(this.name, {numofmessages: 1}, function(err, messages) {
      if (err) {
        callback(err);
      } else if (messages.length > 0) {
        callback(null, messages[0].messagetext, function(err) {
          if (!err) {
            that.del(messages[0]);
          }
        });
      } else {
        callback(null, null, function() {
          // no message, so nothing to delete
        });
      }
    });

  } catch (err) {
    callback(err);
  }
  
};

Queue.prototype.peek = function(callback) {

  try {
  
    this.options.queueService.peekMessages(this.name, {numofmessages: 1}, function(err, messages) {
      if (err) {
        callback(err);
      } else if (messages.length > 0) {
        callback(null,messages[0]); 
      } else {
        callback(null,null);
      }
    });

  } catch (err) {
    callback(err);
  }
  
};

Queue.prototype.del = function(id,receipt,callback) {

  // Support passing in a message to delete,
  // rather than its individual components
  if (arguments.length < 3) {
    if ((typeof receipt) === 'function') {
      callback = receipt;
    }
    if ((typeof id) === "object") {
      receipt = id.popreceipt;
      id = id.messageid;
    }
  }

  callback = skyutil.safeCallback(callback);

  try {

    this.options.queueService.deleteMessage(this.name, id, receipt, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null,true);
      }
    });

  } catch (err) {
    callback(err);
  }

};

Queue.prototype.clear = function(callback) {

  callback = skyutil.safeCallback(callback);

  try {

    this.options.queueService.clearMessages(this.name, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null,true);
      }
    });

  } catch (err) {
    callback(err);
  }
  
};

/* Queue.prototype.update = function(m,callback) {

}; */

Queue.prototype.poll = function(opts, t) {

  if (arguments.length === 1) {
    t = opts;
  }

  var that = this;
  
  if (t > 0) {    
    this.interval = setInterval(function() {
      that.get(function(err, msg, done) {
        if (err) {
          that.emit('error',err);
        } else if (msg) {
          that.emit('message',msg, done);
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
