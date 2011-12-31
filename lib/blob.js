/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var sax = require('sax');
var BlobReadStream = require('./blobReadStream');
var BlobWriteStream = require('./blobWriteStream');
var u_ = require('underscore');
var mime = require('mime');

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
  var s = new BlobWriteStream();
  var inProgressBlockCount = 0;
  var lastInProgressCount = 0;
  var waitCount = 0;
  var readyToCommit = false;

  s.on('block', function(block) {
    inProgressBlockCount++;
    console.log(block.id + ": started (" + block.index + "), " + inProgressBlockCount + " in progress");
    that._putBlock(name, block.buffer, block.id, function(err) {
      if (err) {
        s.emit('error',err);
      } else {
        inProgressBlockCount--;
        console.log(block.id + ": completed, " + inProgressBlockCount + " in progress");
      }
    })
  });

  s.on('commit', function(blockIds) {

    console.log("Trying to commit...");
    // Don't commit until inProgressBlockCount = 0;
    if (inProgressBlockCount !== 0) {

      // If we're making *any* progress, reset the counter
      if (inProgressBlockCount !== lastInProgressCount) {
        waitCount = 0;
        lastInProgressCount = inProgressBlockCount;
      }

      console.log("Waiting...");
      
      if (waitCount++ > 500) {
        console.log("Error:  Wait count is now " + waitCount);
        s.emit('error', new Error('Timeout waiting for ' + inProgressBlockCount + ' blocks to complete for ' + name));
      } else {
        console.log('Waiting for ' + inProgressBlockCount + ' blocks to finish (count ' + waitCount + ')');
        setTimeout(function() {
          s.emit('commit', blockIds);
        }, 100);
      }

    } else {
      
      that._putCommit(name, blockIds, function(err) {
        if (err) {
          s.emit('error', err);
        } else {
          s.emit('end');
        }
      });

    }
  });

  s.on('single', function(buffer) {
    that._putBlock(name, buffer, function(err) {
      if (err) {
        s.emit('error', err);
      } else {
        s.emit('end');
      }
    });
  });

  return(s);

}

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
          blobReadStream.properties[key.substring(5)] = response.headers[key];
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

Container.prototype._putBlock = function(name, buffer, id, callback) {

  if (arguments.length === 3) {
    callback = id;
    id = null;
  }

  var saxStream = sax.createStream(true);
  var isError = 0;
  var errorOccurred = false;

  saxStream.on('opentag', function(tag) {
    console.log("B_OPEN: " + tag.name);
    if (tag.name === 'Error') {
      isError++;
    } else if ((tag.name === 'Code') && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
    console.log("B_TEXT: " + s);
    if (isError === 2) {
      isError = 0;
      errorOccurred = true;
      callback(new Error(s));
    }
  });

  saxStream.on('error', function(err) {
    // callback(err);
  });

  saxStream.on('end', function() {
    console.log("B_END!");
    if (!errorOccurred) { 
      callback(null,true);
    }
  });

  var req = {
    'host' : this.options.account + '.blob.core.windows.net',
    'path' : this.name + '/' + name,
    'account' : this.options.account,
    'key' : this.options.key,
    'contentType' : mime.lookup(name),
    'body' : buffer,
    'enhancedAuth' : true,
    'responseStream' : saxStream,
    'headers' : {}
  };

  if (id) {
    // This is a single block of a larger blob
    req.queryString = 'comp=block&blockid=' + id;
  } else {
    // Single blob put, so add properties & metadata here
    req.headers['x-ms-blob-type'] = 'BlockBlob'
  }

  skyutil.doPut(req);

};

Container.prototype._putCommit = function(name, blockIds, callback) {

  console.log("Inside putCommit");

  var saxStream = sax.createStream(true);
  var isError = 0;
  var errorOccurred = false;

  saxStream.on('opentag', function(tag) {
    console.log("C_OPEN: " + tag.name);
    if (tag.name === 'error') {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
    console.log("C_TEXT: " + s);
    if (isError === 2) {
      isError = 0;
      errorOccurred = true;
      callback(new Error(s));
    }
  });

  saxStream.on('error', function(err) {
    // callback(err);
  });

  saxStream.on('end', function() {
    if (!errorOccurred) {
      callback(null,true);
    }
  });

  var message = '<?xml version="1.0" encoding="utf-8"?><BlockList>' + 
                u_.map(blockIds, function(id) { return '<Uncommitted>' + id + '</Uncommitted>'}).join('') + 
                '</BlockList>';

  var req = {
    'host' : this.options.account + '.blob.core.windows.net',
    'path' : this.name + '/' + name,
    'queryString' : 'comp=blocklist',
    'account' : this.options.account,
    'key' : this.options.key,
    'body' : message,
    'enhancedAuth' : true,
    'responseStream' : saxStream,
    'contentType' : mime.lookup(name),
    'headers' : {}
  };

  // Put blob properties & metadata here

  skyutil.doPut(req);
  
};

module.exports = Container;
