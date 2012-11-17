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

  createWithoutCallback: function (test) {
    storage.createContainer("nonblob");
    test.done();
  },

  createdContainerInList: function (test) {
    var theContainer = this.containerName;
    storage.listContainers(function(err,containers) {
      test.equals(err,null);
      test.notStrictEqual(containers.indexOf(theContainer),-1);
      test.done();
    });
  },

  getContainerByPrefix: function (test) {
    storage.createContainer("barblob", function(err, container) {
      storage.listContainers("bar", function(err,containers) {
        test.equals(err,null);
        test.notEqual(containers,null);
        if (containers) {
          test.strictEqual(containers.length,1);
          test.strictEqual(containers[0],"barblob");
        }
        test.done();
      });
    });
  },

  listContainersAsEmitter: function (test) {
    var count = 0;
    var e = storage.listContainers();
    e.on('data', function(container) {
      test.notEqual(container,null);
      count++;
    });
    e.on('end', function(c) {
      test.notEqual(c,null);
      test.strictEqual(count,c);
      test.done();
    });
  },

  getContainersWithLimit: function (test) {
    storage.listContainers({limit:1}, function(err, containers) {
      test.equals(err,null);
      test.notEqual(containers,null);
      test.strictEqual(containers.length,1);
      test.done();
    });
  },

  blobPut: function (test) {
    var c = storage.container(this.containerName);
    var memStream = new MemoryStream();
    var s = c.put('blob.txt');
    s.metadata = {'foo1':'bar1'};
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
          test.deepEqual(s.metadata,{'foo1':'bar1'});
          s.on("error", function(error) {
            test.equals(error,null,'Stream emitted an error event.');
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

  blobDirectGet: function (test) {

    var memStream = new MemoryStream(null, {readable: false});

    var c = storage.container(this.containerName);
    var s = c.get('blob.txt');
    test.notEqual(s,null);
    if (s) {
      s.on("details", function(details) {
        test.equals(details.properties.blobType,'BlockBlob');
        test.deepEqual(details.metadata,{'foo1':'bar1'});
      });
      s.on("error", function(error) {
        test.equals(error,null,'Stream emitted an error event.');
        test.done();
      });
      s.on("end", function() {
        test.equals(memStream.getAll(),'This is a text blob');
        test.done();
      });
      s.pipe(memStream);
    }
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
              test.deepEqual(s2.metadata,{'foo1':'bar1'});
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

  /* blobPutSmallImage: function(test) {
    
    var c = storage.container(this.containerName);
    var imageStream = fs.createReadStream('test/node.png');
    var s = c.put('node.png');
    s.metadata.foo = "bar";
    
    s.on('end', function() {
      test.done();
    });

    s.on('error', function(err) {
      test.equals(err,null,'writeStream emitted an error:' + err.message);
      test.done();
    });

    imageStream.pipe(s);
  
  }, */

  listBlobs: function(test) {

    var c = storage.container(this.containerName);
    c.list(function(err,blobs) {
      test.equals(err,null);
      test.notEqual(blobs,null);
      // Should have blob.txt and blob2.txt
      // If you uncomment the small image test, you'll need to make this '3'
      test.strictEqual(blobs.length,2);
      test.notStrictEqual(blobs.indexOf('blob.txt'),-1);
      test.done();
    });

  },

  listPrefixBlobsAsEmitter: function(test) {

    var counter = 0;

    var c = storage.container(this.containerName);
    var e = c.list('blob2');
    e.on('data', function(blob) {
      test.notEqual(blob,null);
      counter++;
    });
    e.on('end', function(c) {
      test.strictEqual(counter,c);
      test.strictEqual(c,1);
      test.done();
    });

  },

  listBlobsWithLimit: function(test) {
    var c = storage.container(this.containerName);
    c.list({limit:1}, function(err,blobs) {
      test.equals(err,null);
      test.notEqual(blobs,null);
      test.strictEqual(blobs.length,1);
      test.done();
    });
  },

  deleteBlob: function(test) {
    var c = storage.container(this.containerName);
    c.del('blob2.txt', function(err) {
      test.equals(err,null);
      c.list().on('end', function(count) {
        test.strictEqual(count,1);
        test.done();
      });
    });
  },

  removeContainer: function (test) {
    storage.removeContainer(this.containerName, function(err) {
      test.equals(err,null);
      storage.removeContainer('barblob');
      storage.removeContainer('nonblob');
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
