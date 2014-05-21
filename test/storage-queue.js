/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var fs = require('fs');
var testCase = require('nodeunit').testCase;

var path = process.env.HOME || (process.env.HOMEDRIVE + process.env.HOMEPATH);
var testCredentials = JSON.parse(fs.readFileSync(path + '/.bluesky/test.json','ascii'));

// For this test, let's pass in an 'azure', rather than requiring it internally
var azure = require('azure');
var storage = require('../lib/bluesky').storage({azure: azure, account: testCredentials.account, key: testCredentials.key});

module.exports = testCase({

  setUp: function (callback) {

    this.queueName = 'fooqueue';

    callback();

  },

  createQueue: function (test) {
    var theQueue = this.queueName;
    storage.createQueue(theQueue, function(err,queue) {
      test.equals(err,null);
      test.notEqual(queue,null);
      if (queue) {
        test.equals(queue.name,theQueue);
      }
      test.done();
    });
  },

  createdQueueInList: function (test) {
    var theQueue = this.queueName;
    storage.listQueues(function(err,queues) {
      test.equals(err,null);
      test.notEqual(queues,null);
      if (queues) {
        test.notStrictEqual(queues.indexOf(theQueue),-1);
      }
      test.done();
    });
  },

  getQueueByPrefix: function (test) {
    storage.createQueue("barqueue", function(err, queue) {
      storage.listQueues("bar", function(err,queues) {
        test.equals(err,null);
        test.notEqual(queues,null);
        if (queues) {
          test.strictEqual(queues.length,1);
          test.strictEqual(queues[0],"barqueue");
        }
        test.done();
      });
    });
  },

  listQueuesAsEmitter: function (test) {
    var count = 0;
    var e = storage.listQueues();
    e.on('data', function (queue) {
      test.notEqual(queue,null);
      count++;
    });
    e.on('end', function(c) {
      test.notEqual(c,null);
      test.strictEqual(count,c);
      test.strictEqual(count,2);
      test.done();
    });
  },

  getQueuesWithLimit: function(test) {
    storage.listQueues({limit:1},function(err,queues) {
      test.equals(err,null);
      test.notEqual(queues,null);
      if (queues) {
        test.strictEqual(queues.length,1);
      }
      test.done();
    });
  },

  queuePutMessage: function (test) {
    var queue = storage.queue(this.queueName);
    queue.put('Queue Test Message', function(err) {
      test.equals(err,null);
      test.done();
    });
  },

  queuePeekMessage: function (test) {
    var queue = storage.queue(this.queueName);
    queue.peek(function(err, message) {
      test.equals(err,null);
      test.equals(message.messagetext, 'Queue Test Message');
      test.done();
    });
  },

  queueGetMessage: function(test) {
    var queue = storage.queue(this.queueName);
    queue.get(function(err, message, done) {
      test.equals(err,null);
      test.equals(message,'Queue Test Message');
      setTimeout(function() {
        done();
        test.done();
      },500);
    });
  },

  removeQueue: function (test) {
    storage.removeQueue(this.queueName, function(err) {
      test.equals(err,null);
      storage.removeQueue('barqueue', function(err) {
        test.done();
      });
    });
  },

  queueNoLongerInList: function (test) {
    var theQueue = this.queueName;
    storage.listQueues(function(err,queues) {
      test.equals(err,null);
      test.notEqual(queues,null);
      if (queues) {
        test.strictEqual(queues.indexOf(theQueue),-1);
      }
      test.done();
    });
  }

});
