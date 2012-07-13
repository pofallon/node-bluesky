/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var BlobReadStream = require('./blobReadStream');
var BlobWriteStream = require('./blobWriteStream');
var MemoryStream = require('memorystream');
var u_ = require('underscore');
var mime = require('mime');
var EventEmitter = require('events').EventEmitter;
var skyutil = require('./util');
    
function Container (b,options) {
  this.options = options;
  this.name = b;
}

Container.listContainers = function(prefix, options, callback) {
  
  var containerCounter = 0;

  var processResults = function(err, theseContainers, continuation) {
    if (err) {
      emitter.emit('error', err);
    } else {
      theseContainers.forEach(function(container) {
        if (!options.limit || (containerCounter < options.limit)) {
          emitter.emit('data', container.name);
          containerCounter++;
        }
      });
      if (continuation && continuation.hasNextPage()) {
        if (!options.limit || (containerCounter < options.limit)) {
          fetchContainers(continuation);
        }
      } else {
        emitter.emit('end', containerCounter);
      }
    }
  };

  var fetchContainers = function(more) {

    if (more) {
      more.getNextPage(processResults);
    } else {
      if (prefix) {
        options.blobService.listContainers({prefix:prefix},processResults);
      } else {
        options.blobService.listContainers(processResults);
      }
    }
  };
  
  var emitter = skyutil.getEmitter(callback);
  fetchContainers();
  return(emitter);

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

Container.prototype.list = function(prefix,options,callback) {

  var params = {};
  var that = this;
  var blobCounter = 0;

  var processResults = function(err, theseBlobs, continuation) {
    if (err) {
      emitter.emit('error',err);
    } else {
      theseBlobs.forEach(function(blob) {
        if (!params.options.limit || (blobCounter < params.options.limit)) {
          emitter.emit('data', blob.name);
          blobCounter++;
        }
      });
      if (continuation && continuation.hasNextPage()) {
        if (!params.options.limit || (blobCounter < params.options.limit)) {
          fetchBlobs(continuation);
        }
      } else {
        emitter.emit('end',blobCounter);
      }
    }
  };

  var fetchBlobs = function(more) {

    if (more) {
      more.getNextPage(processResults);
    } else {
      if (params.prefix) {
        that.options.blobService.listBlobs(that.name,{prefix:params.prefix},processResults)
      } else {
        that.options.blobService.listBlobs(that.name,processResults);  
      }
    }

  };

  var emitter;

  skyutil.parseArgs({
    prefix: prefix,
    options: options,
    callback: callback
  }, function(p) {
    params = p;
    emitter = skyutil.getEmitter(params.callback);
    fetchBlobs();
  });

  return(emitter);
  
};

Container.prototype.put = function(name,options) {

  //TODO:  Pass in # of concurrent uploads in options
  
  var that = this;
  
  var s = new BlobWriteStream({
    name: name,
    onBlock: function(opts,callback) {

      var memStream = new MemoryStream(opts.block);

      if (opts.id) {
        // This is a single block of a larger blob
        that.options.blobService.createBlobBlockFromStream(opts.id, that.name, name, memStream, opts.block.length, callback); 
      } else {
        // Single blob put, so add properties & metadata here
        var createOpts = populateOptions(opts.properties,opts.metadata);
        if (!createOpts.contentType) {
          createOpts.contentType = mime.lookup(name);
        }
        
        that.options.blobService.createBlockBlobFromStream(that.name, name, memStream, opts.block.length, createOpts, callback);
      }

    },
    onCommit: function(opts,callback) {

      // Put blob properties & metadata here
      var commitOpts = populateOptions(opts.properties,opts.metadata);
      if (!commitOpts.contentType) {
        commitOpts.contentType = mime.lookup(name);
      }
      
      var blockList = {};
      blockList.UncommittedBlocks = opts.guids;

      that.options.blobService.commitBlobBlocks(that.name, name, blockList, commitOpts, callback);

    }
  });

  return(s);

}

Container.prototype.get = function(name, callback) {

  var blobReadStream = new BlobReadStream();

  if (callback) {

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

  } else {

    this.options.blobService.getBlobToStream(this.name, name, blobReadStream, function() {});
    blobReadStream.ready();
    return(blobReadStream);

  }

};

Container.prototype.snapshot = function(b,callback) {

  callback(new Error('NotImplemented'));
  
};

Container.prototype.copy = function(b1,b2,callback) {

  callback(new Error('NotImplemented'));
  
};

Container.prototype.del = function(name,callback) {

  callback = skyutil.safeCallback(callback);

  this.options.blobService.deleteBlob(this.name, name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);  
    }
  });
  
};

Container.prototype.service = function() {
  return this.options.blobService;
}

module.exports = Container;

function populateOptions(properties, metadata) {
  
  var options = {}
  var headers = ["contentType", "contentEncoding", "contentLanguage", "contentMD5", "cacheControl"];

  for (var i in headers) {
    if (properties[headers[i]]) {
      options[headers[i]] = properties[headers[i]];
    }
  }

  if (metadata) {
    options.metadata = {};
    options.metadata = u_.clone(metadata);
  }

  return options;
}

