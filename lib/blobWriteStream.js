/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var Stream = require('stream').Stream;
var util = require('util');
var uuid = require('node-uuid');
var BlobReadStream = require('./blobReadStream');
var u_ = require('underscore');

module.exports = BlobWriteStream;

function BlobWriteStream(options) {

  var self = this;

  if (options === null) {
    options = {};
  }

  this.options = options;

	this.writable = true;
  this.readyToCommit = false;
	
	this.properties = {};
	this.metadata = {};

	this.blockGuids = [];  // Array of GUID's / blockId's used in this stream

	this.bufferArray = [];	// Buffers being queued for this block
	this.blockSize = 0;		// Size of this block
  this.currentUploads = 0;  // Number of uploads currently in progress
	
	this.defaultBlockSize = 256*1024;  // 256kb
  this.maxCurrentUploads = 3;

  
	this.on('pipe', function(src) {
		if (src instanceof BlobReadStream) {
      src.on('details', function(details) {
        u_.defaults(self.properties, details.properties);
        u_.defaults(self.metadata, details.metadata);
      }); 
    }
	});

}

util.inherits(BlobWriteStream, Stream);

BlobWriteStream.prototype.write = function(data) {

  if (this.writable) {

    if (this.currentUploads < this.maxCurrentUploads) {
	
    	if (Buffer.isBuffer(data)) {
    		this.bufferArray.push(data);
    		this.blockSize += data.length;
    	} else {    
    		var theBuffer = new Buffer(data);
    		this.bufferArray.push(theBuffer);
    		this.blockSize += theBuffer.length;
    	}

    	if (this.blockSize > this.defaultBlockSize) {
    		this.sendBlock(false);
        this.blockSize = 0;
        this.bufferArray = [];
      }

      return true;

    } else {
        
      return false;
    
  	}

  } else {

    this.emit("error", new Error('Stream no longer writable'));
  
  }

};

BlobWriteStream.prototype.end = function() {

  this.writable = false;
  this.emit('close');

  if (this.blockGuids.length > 0) {
    
    // If we were in the middle of a block when 'end' was received, flush that block before committing
    if (this.blockSize > 0) {
      this.sendBlock(false,true);      
    }

    this.readyToCommit = true;

    if (this.currentUploads === 0) {
      this.commit();
    }

  } else {

    this.sendBlock(true);

  }

};

BlobWriteStream.prototype.commit = function() {

  var that = this;
  
  this.options.onCommit(
    { name: this.options.name, 
      guids: this.blockGuids,
      properties: this.properties,
      metadata: this.metadata
    }, function(err) {
      if (err) {
        that.emit('error', err);
      } else {
        that.emit('end');
      }
    }
  );

};

BlobWriteStream.prototype.sendBlock = function(isOne,isLast) {

  var that = this;

  if (isLast === null) {
    isLast = isOne;
  }
  
  var opts = {
    name: this.options.name,
    block: prepareBlock(this.blockSize, this.bufferArray) 
  };

  if (!isOne) {
    // It's one of a multi-block upload
    var blockId = new Buffer(uuid.v4()).toString('base64');
    this.blockGuids.push(blockId);
    this.currentUploads++;
    opts.id = blockId
  } else {
    // It's a single block
    opts.properties = this.properties;
    opts.metadata = this.metadata;
  }

  this.options.onBlock(opts, function(err) {
    if (err) {
     that.emit('error',err);
    } else {
      if ((that.currentUploads-- === that.maxCurrentUploads) && !isOne && !isLast) {
        that.emit('drain');
      }

      if (isOne) {
        that.emit('end');
      }

      if ((that.currentUploads === 0) && (that.readyToCommit === true)) {
        that.commit();
      }
    } 
  });
}

function prepareBlock(blockSize, bufferArray) {

  var count = bufferArray.length;
  var i = 0;
  var blockPosition = 0;
  var currentBuffer;

  var blockBuffer = new Buffer(blockSize);
  var arrayLength = bufferArray.length;

  u_.times(arrayLength, function() {
    currentBuffer = bufferArray.shift();
    currentBuffer.copy(blockBuffer,blockPosition);
    blockPosition += currentBuffer.length;
  });

  return(blockBuffer);
  
};