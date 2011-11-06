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

    this.containerName = "foobar";
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

  /* blobGet: function (test) {
    var c = storage.container(this.containerName);
    var s = c.get('blob.txt');
    s.on("end", function() {
      process.stdout.write("Goodbye\n");
    });
    s.pipe(process.stdout, { end: false });
    
    // console.dir(s);
  }, */
  
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
