/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var fs = require('fs');
var testCase = require('nodeunit').testCase;

var path = process.env.HOME || (process.env.HOMEDRIVE + process.env.HOMEPATH);
var testCredentials = JSON.parse(fs.readFileSync(path + '/.bluesky/test.json','ascii'));
    
var storage = require('../lib/bluesky').storage({account: testCredentials.account, key: testCredentials.key});

module.exports = testCase({

  setUp: function (callback) {

    this.queueName = 'longqueue';

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

  queuePolling: function(test) {
    var queue = storage.queue(this.queueName);
    queue.on('message', function(m, done) {
      test.equals(m,'Queue Poll Message');
      done();
      queue.poll(false);
      test.done();
    });
    queue.poll(1000);  // Every 1 sec.
    queue.put('Queue Poll Message', function(err) {
      test.equals(err,null);
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
