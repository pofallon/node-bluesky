/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require('sax');
var MemoryStream = require('memorystream');
var BlobReadStream = require('./blobReadStream');
var u_ = require("underscore");

var skyutil = require("./util");
    
function Container (b,options) {
  this.options = options;
  this.name = b;
}

Container.listContainers = function(options, callback) {
  
  var saxStream = sax.createStream(true);
  var insideBlobName = false;
  var blobs = [];
  var isError = 0;
  
  var onResponse = function(error, response) {
    if (error) {
      callback(error);
    }
  };
  
  saxStream.on('opentag', function(tag) {
    if (tag.name === "Name") {
      insideBlobName = true;
    } else if (tag.name === "error") {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });
  
  saxStream.on('text', function(s) {
    if (insideBlobName) {
      blobs.push(s);
      insideBlobName = false;
    } else if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });
  
  saxStream.on('closetag', function(name) {
    if (name === "Containers") {
      callback(null,blobs);
    }
  });

  saxStream.on('error', function(err) {
    // console.log("ERROR: " + err);
  });
  
  skyutil.doGet({
    'host' : options.account + '.blob.core.windows.net',
    'queryString' : 'comp=list',
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream,
    'enhancedAuth' : true,    // Blob & Queue auth differently than Tables
    'authQueryString' : true
  });
};

Container.createContainer = function(name,options,callback) {

  var saxStream = sax.createStream(true);
  var isError = 0;

  saxStream.on('opentag', function(tag) {
    if (tag.name === 'error') {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
    if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });

  saxStream.on('error', function(err) {

  });
  
  var onResponse = function(error, response) {
    if (response.statusCode === 201) {
      var c = new Container(name,options);
      callback(null,c);
    }
  };
  
  skyutil.doPut({
    'host' : options.account + '.blob.core.windows.net',
    'path' : name,
    'queryString' : 'restype=container',
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream,
    'enhancedAuth' : true,
    'metaData' : {
      'Name' : name
    }
  });
  
};

Container.removeContainer = function(b,options,callback) {

  var saxStream = sax.createStream(true);
  var isError = 0;

  saxStream.on('opentag', function(tag) {
    if (tag.name === 'error') {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
    if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });

  saxStream.on('error', function(err) {

  });
  
  var onResponse = function(error, response) {
    if (response.statusCode === 202) {
      callback(null,true);
    }
  };
  
  skyutil.doDelete({
    'host' : options.account + '.blob.core.windows.net',
    'path' : b,
    'queryString' : 'restype=container',
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream,
    'enhancedAuth' : true
  });
  
};

Container.prototype.list = function(callback) {

  callback(new Error('NotImplemented'));
  
};

Container.prototype.put = function(name) {

  var that = this;
  var s = new MemoryStream(null, {readable: false});

  var saxStream = sax.createStream(true);
  var isError = 0;

  saxStream.on('opentag', function(tag) {
    if (tag.name === 'error') {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
    if (isError === 2) {
      isError = 0;
      s.emit("error",new Error(s));
      s.destroy();
    }
  });

  saxStream.on('error', function(err) {

  });

  s.on('end', function() {

    skyutil.doPut({
      'host' : that.options.account + '.blob.core.windows.net',
      'path' : that.name + '/' + name,
      'account' : that.options.account,
      'key' : that.options.key,
      'body' : s.getAll(),
      'enhancedAuth' : true,
      'responseStream' : saxStream,
      'headers' : {
        'x-ms-blob-type' : 'BlockBlob'
      }
    });

  });

  return(s);
  
};

Container.prototype.get = function(name, callback) {

  var blobReadStream = new BlobReadStream();
  var getStream;

  var onResponse = function(error,response) {
    if (response.statusCode !== 200) {
      callback(new Error(response.statusCode));
    } else {
      u_.keys(response.headers).forEach(function(key) {
        if (key.indexOf('x-ms-meta') === 0) {
          blobReadStream.metadata[key.substring(10)] = response.headers[key];
        } else if (key.indexOf('x-ms-') === 0) {
          blobReadStream.property[key.substring(5)] = response.headers[key]);
        }
      });
      callback(null,getStream.pipe(blobReadStream));
    }
  };

  getStream = skyutil.doGet({
    'host' : this.options.account + '.blob.core.windows.net',
    'path' : this.name + '/' + name,
    'account' : this.options.account,
    'key' : this.options.key,
    'onResponse' : onResponse,
    'enhancedAuth' : true
  });

};

Container.prototype.snapshot = function(b,callback) {

  callback(new Error('NotImplemented'));
  
};

Container.prototype.copy = function(b1,b2,callback) {

  callback(new Error('NotImplemented'));
  
};

Container.prototype.del = function(b,callback) {

  callback(new Error('NotImplemented'));
  
};

module.exports = Container;
