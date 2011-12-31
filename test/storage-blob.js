/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var fs = require('fs');
var MemoryStream = require('memorystream');
var testCase = require('nodeunit').testCase;

var path = process.env.HOME || (process.env.HOMEDRIVE + process.env.HOMEPATH);
var testCredentials = JSON.parse(fs.readFileSync(path + '/.bluesky/test.json','ascii'));
    
var storage = require('../lib/bluesky').storage({account: testCredentials.account, key: testCredentials.key});

module.exports = testCase({

  setUp: function (callback) {

    this.containerName = "fooblob";
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

  blobPut: function (test) {
    var c = storage.container(this.containerName);
    var memStream = new MemoryStream();
    var s = c.put('blob.txt');
    s.on('close', function() {
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

    var that = this;

    // Need to give it a second because immediately 
    // 'get'-ing the blob sometimes returns not found

    setTimeout(function() {
      var memStream = new MemoryStream(null, {readable: false});

      var c = storage.container(that.containerName);
      c.get('blob.txt', function(err,s) {
        test.equals(err,null);
        test.notEqual(s,null);
        if (s) {
          s.on("error", function(error) {
            test.equals(error,null,"Stream emitted an error event.");
            test.done();
          });
          s.on("end", function() {
            test.equals(memStream.getAll(),'This is a text blob');
            test.done();
          });
          s.pipe(memStream);
        }
      });
    }, 1000);
    
  },

  blobPipeGetToPut: function (test) {

    var c = storage.container(this.containerName);

    var s = c.put('blob2.txt');
    s.on('close', function() {
      var m1 = new MemoryStream(null, {readable: false});
      c.get('blob.txt', function(err,s1) {
        test.equals(err,null);
        test.notEqual(s1,null);
        s1.on("end", function() {
          setTimeout(function() {
            var m2 = new MemoryStream(null, {readable: false});
            c.get('blob2.txt', function(err,s2) {
              test.equals(err,null);
              test.notEqual(s2,null);
              s2.on("end", function() {
                test.equals(m1.getAll(), m2.getAll());
                test.done();
              });
              s2.pipe(m2);
            });
          }, 1000);
        });
        s1.pipe(m1);
      });
    });
    s.on('error', function(err) {
      test.equals(err,null,'writeStream emitted an error:' + err.message);
      test.done();
    });
    c.get('blob.txt', function(err,b) {
      test.equals(err,null);
      test.notEqual(b,null);
      b.pipe(s);
    });

  },

  blobPutSmallImage: function(test) {
    
    var c = storage.container(this.containerName);
    var imageStream = fs.createReadStream('test/node.png');
    var s = c.put('node.png');
    
    s.on('end', function() {
      test.done();
    });

    s.on('error', function(err) {
      test.equals(err,null,'writeStream emitted an error:' + err.message);
      test.done();
    });

    imageStream.pipe(s);
  
  },

  blobPutLargeFile: function(test) {
    
    var c = storage.container(this.containerName);
    var largeFileStream = fs.createReadStream('test/kjv12.txt');
    var s = c.put('kjv12.txt');

    s.on('end', function() {
      test.done();
    });
    
    s.on('error', function(err) {
      test.equals(err,null,'writeStream emitted an error: ' + err.message);
      test.done();
    });

    largeFileStream.pipe(s);

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
  }
  
});
