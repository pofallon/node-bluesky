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

    this.containerName = "longblob";
    callback();
    
  },
  
  createContainer: function (test) {
    var theContainer = this.containerName;
    storage.createContainer(theContainer, function(err,container) {
      test.equals(err,null);
      test.notEqual(container,null);
      if (!container) { container = {}; }
      test.equals(container.name,theContainer);
      test.done();
    });
  },

  createdContainerInList: function (test) {
    var theContainer = this.containerName;
    storage.listContainers(function(err,containers) {
      test.equals(err,null);
      test.notStrictEqual(containers.indexOf(theContainer),-1);
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

  removeContainer: function (test) {
    storage.removeContainer(this.containerName, function(err) {
      test.equals(err,null);
      storage.removeContainer('barblob', function(err) {
        test.done();
      });
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
