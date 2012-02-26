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
  var containerList = [];

  var processResults = function(err, theseContainers, continuation) {
    if (err) {
      callback(err);
    } else {
      containerList = containerList.concat(u_.map(theseContainers, function(c) { return c.name; }));
      if (continuation && continuation.hasNextPage()) {
        fetchContainers(continuation);
      } else {
        callback(null,containerList);
      }
    }
  };

  (function fetchContainers(more) {

    if (more) {
      more.getNextPage(processResults);
    } else {
      options.blobService.listContainers(processResults);
    }

  })();
};

Container.createContainer = function(name,options,callback) {

  options.blobService.createContainerIfNotExists(name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, new Container(name,options));
    }
  });
  
};

Container.removeContainer = function(name,options,callback) {

  options.blobService.deleteContainer(name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);  
    }
  });
  
};

Container.prototype.list = function(callback) {

  var blobList = [];
  var that = this;

  var processResults = function(err, theseBlobs, continuation) {
    if (err) {
      callback(err);
    } else {
      blobList = blobList.concat(u_.map(theseBlobs, function(b) { return b.name; }));
      if (continuation && continuation.hasNextPage()) {
        fetchBlobs(continuation);
      } else {
        callback(null,blobList);
      }
    }
  };

  (function fetchBlobs(more) {

    if (more) {
      more.getNextPage(processResults);
    } else {
      options.blobService.listBlobs(that.name,processResults);
    }

  })();
  
};

Container.prototype.put = function(name) {
  
  var that = this;
  
  var s = new BlobWriteStream({
    name: name,
    onBlock: function(opts,callback) {

      var contentType = mime.lookup(opts.name);

      var req = {
        'host' : that.options.account + '.blob.core.windows.net',
        'path' : that.name + '/' + opts.name,
        'account' : that.options.account,
        'key' : that.options.key,
        'contentType' : contentType,
        'body' : opts.block,
        'enhancedAuth' : true,
        'responseStream' : getResponseStream(callback),
        'headers' : {}
      };

      if (opts.id) {
        // This is a single block of a larger blob
        req.queryString = 'comp=block&blockid=' + opts.id;
      } else {
        // Single blob put, so add properties & metadata here
        req.headers['x-ms-blob-content-type'] = contentType;
        req.headers['x-ms-blob-type'] = 'BlockBlob';
        
        u_.each(u_.keys(opts.properties), function(prop) {
          req.headers['x-ms-blob-' + prop] = opts.properties[prop];
        });
        
        if (opts.metadata) {
          req.metaData = opts.metadata;
        }
      }

      skyutil.doPut(req);
    },
    onCommit: function(opts,callback) {
      var message = '<?xml version="1.0" encoding="utf-8"?><BlockList>' + 
                    u_.map(opts.guids, function(id) { return '<Uncommitted>' + id + '</Uncommitted>'}).join('') + 
                    '</BlockList>';

      var req = {
        'host' : that.options.account + '.blob.core.windows.net',
        'path' : that.name + '/' + opts.name,
        'queryString' : 'comp=blocklist',
        'account' : that.options.account,
        'key' : that.options.key,
        'body' : message,
        'enhancedAuth' : true,
        'responseStream' : getResponseStream(callback),
        'headers' : {}
      };

      // Put blob properties & metadata here
      req.headers['x-ms-blob-content-type'] = mime.lookup(opts.name);
      
      u_.each(u_.keys(opts.properties), function(prop) {
        req.headers['x-ms-blob-' + prop] = opts.properties[prop];
      });

      if (opts.metadata) {
        req.metaData = opts.metadata;
      }

      skyutil.doPut(req);
    }
  });

  return(s);

}

Container.prototype.get = function(name, callback) {

  var blobReadStream = new BlobReadStream();
  
  this.options.blobService.getBlobToStream(this.name, name, blobReadStream, function(err, blobResult) {

    if (err) {
      callback(err);
    } else {
      blobReadStream.properties = u_.clone(blobResult);
      blobReadStream.metadata = u_.clone(blobResult.metadata);

      // Remove what doesn't belong
      delete blobReadStream.properties.getPropertiesFromHeaders;
      delete blobReadStream.properties.metadata;

      callback(null,blobReadStream);
      blobReadStream.ready();
    }

  });

};

Container.prototype.snapshot = function(b,callback) {

  callback(new Error('NotImplemented'));
  
};

Container.prototype.copy = function(b1,b2,callback) {

  callback(new Error('NotImplemented'));
  
};

Container.prototype.del = function(name,callback) {

  this.options.blobService.deleteBlob(this.name, name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);  
    }
  });
  
};

var getResponseStream = function(callback) {
  
  var saxStream = sax.createStream(true);
  var isError = 0;
  var errorOccurred = false;

  saxStream.on('opentag', function(tag) {
    if (tag.name === 'Error') {
      isError++;
    } else if ((tag.name === "Code") && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
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

  return saxStream;
}

module.exports = Container;
