/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var fs = require('fs');
var testCase = require('nodeunit').testCase;

var path = process.env.HOME || (process.env.HOMEDRIVE + process.env.HOMEPATH);
var testCredentials = JSON.parse(fs.readFileSync(path + '/.azurejs/test.json','ascii'));
    
var storage = require('../lib/azure').storage({account: testCredentials.account, key: testCredentials.key});

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
      test.notStrictEqual(queues.indexOf(theQueue),-1);
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
      test.done();
    });
  },
  
  queueGetAndDeleteMessage: function(test) {
    var queue = storage.queue(this.queueName);
    queue.get(function(err, message) {
      test.equals(err,null);
      test.equals(message.body,'Queue Test Message');
      setTimeout(function() {
        queue.del(message.id, message.popReceipt, function(err) {
          test.equals(err,null);
          test.done();
        });
      },500);
    });
  }, 

  queuePolling: function(test) {
    var queue = storage.queue(this.queueName);
    queue.on('message', function(m) {
      queue.poll(false);
      test.equals(m.body,'Queue Poll Message');
      queue.del(m.id, m.popReceipt, function(err) {
        test.equals(err,null);
        test.done();
      });
    });
    queue.poll(10000);  // Every 10 sec.
    queue.put('Queue Poll Message', function(err) {
      test.equals(err,null);
    });
  },
  
  removeQueue: function (test) {
    storage.removeQueue(this.queueName, function(err) {
      test.equals(err,null);
      test.done();
    });
  },
  
  queueNoLongerInList: function (test) {
    var theQueue = this.queueName;
    storage.listQueues(function(err,queues) {
      test.equals(err,null);
      test.strictEqual(queues.indexOf(theQueue),-1);
      test.done();
    });
  }
  
});
