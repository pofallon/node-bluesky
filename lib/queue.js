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

Queue.listQueues = function(prefix, options, callback) {

  var params = {};
  var queueList = [];
  var queueCounter = 0;

  var emitter = new EventEmitter();

  var processResults = function(err, theseQueues, continuation) {
    if (err) {
      emitter.emit('error', err);
    } else {
      theseQueues.forEach(function(queue) {
        emitter.emit('data', queue.name);
        queueCounter++;
      });
      if (continuation && continuation.hasNextPage()) {
        fetchQueues(continuation);
      } else {
        emitter.emit('end',queueCounter);
      }
    }
  };

  var fetchQueues = function(more) {
    if (more) {
      more.getNextPage(processResults);
    } else {
      if (params.prefix) {
        params.options.queueService.listQueues({prefix:params.prefix},processResults);
      } else {
        params.options.queueService.listQueues(processResults);
      }
    }
  };

  var setUpEmitter = function() {
    if (params.callback) {
      emitter.on('data', function(queue) {
        queueList.push(queue);
      });
      emitter.on('end', function() {
        params.callback(null,queueList);
      });
      emitter.on('error', function(err) {
        params.callback(err);
      });
    }
    fetchQueues();
  }

  Array.prototype.slice.call(arguments).forEach(function(elem, idx, a) {
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
      setUpEmitter();
    }
  });

  if (!params.callback) {
    return(emitter);
  }

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
            that.del(msg.messageid, msg.popreceipt, function(err) {
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
