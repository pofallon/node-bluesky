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

    this.queueName = "foobar";
    callback();
    
  },
  
  createQueue: function (test) {
    var theQueue = this.queueName;
    storage.createQueue(theQueue, function(err,queue) {
      test.equals(err,null);
      test.equals(queue.name,theQueue);
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
  },
  
});