/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var fs = require('fs');
var MemoryStream = require('memorystream');
var testCase = require('nodeunit').testCase;

var path = process.env.HOME || (process.env.HOMEDRIVE + process.env.HOMEPATH);
var testCredentials = JSON.parse(fs.readFileSync(path + '/.azurejs/test.json','ascii'));
    
var storage = require('../lib/azure').storage({account: testCredentials.account, key: testCredentials.key});

module.exports = testCase({

  setUp: function (callback) {

    this.containerName = "fooblob";
    callback();
    
  },
  
  createContainer: function (test) {
    var theContainer = this.containerName;
    storage.createContainer(theContainer, function(err,container) {
      test.equals(err,null);
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

  blobPut: function (test) {
    var c = storage.container(this.containerName);
    var memStream = new MemoryStream();
    var s = c.put('blob.txt');
    s.on('end', function() {
      test.done();
    });
    s.on('error', function(err) {
      test.equals(err,null,"Stream emitted an error event.");
      test.done();
    });
    memStream.pipe(s);
    memStream.write('This is a text blob');
    memStream.end();
  },

  blobGet: function (test) {
    var memStream = new MemoryStream(null, {readable: false});

    var c = storage.container(this.containerName);
    var s = c.get('blob.txt');
    s.on("end", function() {
      test.equals(memStream.getAll(),'This is a text blob');
      test.done();
    });
    s.pipe(memStream);
    
  },
  
  removeContainer: function (test) {
    storage.removeContainer(this.containerName, function(err) {
      test.equals(err,null);
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
  },
  
});
