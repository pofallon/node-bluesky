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
    if (more) {
      more.getNextPage(processResults);
    } else {
      if (prefix) {
        options.queueService.listQueues({prefix:prefix},processResults);
      } else {
        options.queueService.listQueues(processResults);
      }
    }
  };

  var emitter = skyutil.getEmitter(callback);
  fetchQueues();
  return(emitter);

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

  callback = skyutil.safeCallback(callback);
  
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

  this.options.queueService.deleteMessage(this.name, id, receipt, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);
    }
  });

};

Queue.prototype.clear = function(callback) {

  callback = skyutil.safeCallback(callback);

  this.options.queueService.clearMessages(this.name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);
    }
  });
  
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
      that.get(function(err,msg) {
        if (err) {
          that.emit('error',err);
        } else if (msg) {
          that.emit('message',msg);
          if (opts["del"]) {
            that.del(msg, function(err) {
              if (err) {
                that.emit('error',err);
              }
            })
          }
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
