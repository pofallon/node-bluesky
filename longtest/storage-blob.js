/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var fs = require('fs');
var MemoryStream = require('memorystream');
var LoremIpStream = require('loremipstream');

var testCase = require('nodeunit').testCase;

var path = process.env.HOME || (process.env.HOMEDRIVE + process.env.HOMEPATH);
var testCredentials = JSON.parse(fs.readFileSync(path + '/.bluesky/test.json','ascii'));
    
var storage = require('../lib/bluesky').storage({account: testCredentials.account, key: testCredentials.key});

module.exports = testCase({

  setUp: function (callback) {

    this.containerPrefix = "longblob";
    this.containerCount = 5050;
    this.containerName = "longblob1";
    callback();
    
  },
  
  createContainers: function (test) {
    var completedCount = 0;
    var theCount = this.containerCount;
    var theContainer = this.containerPrefix;
    for (var i = 1; i <= theCount; i++) {
      storage.createContainer(theContainer+i, function(err,container) {
        test.equals(err,null);
        test.notEqual(container,null);
        if (++completedCount === theCount) {
          test.done();
        }
      });
    };
  },

  createdContainerInList: function (test) {
    var theContainer = this.containerName;
    storage.listContainers(function(err,containers) {
      test.equals(err,null);
      test.notStrictEqual(containers.indexOf(theContainer),-1);
      test.done();
    });
  },

  containerCountEvent: function (test) {
    var theCount = this.containerCount;
    storage.listContainers('longblob').on('end', function(count) {
      test.equals(count,theCount);
      test.done();
    });
  },

  containerLimitNoContinuation: function (test) {
    storage.listContainers({limit: 10}).on('end', function(count) {
      test.equals(count,10);
      test.done();
    });
  },

  containerLimitFollowContinuation: function (test) {
    var theCount = this.containerCount-1;
    storage.listContainers({limit: theCount}).on('end', function(count) {
      test.equals(count,theCount);
      test.done();
    });
  },

  blobPutLargeStream: function(test) {
    
    var c = storage.container(this.containerName);
    var lorem = new LoremIpStream(750*1024);
    var s = c.put('lorem.txt');
    s.metadata.bar = "foo";

    s.on('end', function() {
      test.done();
    });
    
    s.on('error', function(err) {
      test.equals(err,null,'writeStream emitted an error: ' + err.message);
      test.done();
    });

    lorem.pipe(s);

  },

  removeContainers: function (test) {
    storage.listContainers(this.containerPrefix).on('data', function(c) {
     storage.removeContainer(c);
    }).on('end', function() {
      test.done();
    });
  },
  
  containerNoLongerInList: function (test) {
    var theContainer = this.containerName;
    storage.listContainers(function(err,containers) {
      test.equals(err,null);
      test.strictEqual(containers.indexOf(theContainer),-1);
      test.done();
    });
  }
  
});
