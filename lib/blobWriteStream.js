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

function BlobWriteStream() {

	this.writable = true;
	
	this.properties = {};
	this.metadata = {};

	this.blockGuids = [];  // Array of GUID's / blockId's used in this stream

	this.bufferArray = [];	// Buffers being queued for this block
	this.blockSize = 0;		// Size of this block
	
	this.defaultBlockSize = 256*1024;
  
	this.on('pipe', function(src) {
		if (src instanceof BlobReadStream) {
      u_.defaults(this.properties, src.properties);
      u_.defaults(this.metadata, src.metadata); 
    }
	});

}

util.inherits(BlobWriteStream, Stream);

BlobWriteStream.prototype.write = function(data) {

  if (this.writable) {
	
  	if (Buffer.isBuffer(data)) {
  		this.bufferArray.push(data);
  		this.blockSize += data.length;
  	} else {    
  		var theBuffer = new Buffer(data);
  		this.bufferArray.push(theBuffer);
  		this.blockSize += theBuffer.length;
  	}

  	if (this.blockSize > this.defaultBlockSize) {

  		var blockId = new Buffer(uuid.v4()).toString('base64');
      this.blockGuids.push(blockId);

  		this.emit('block',{ id: blockId, 
                          buffer: prepareBlock(this.blockSize, this.bufferArray), 
                          index: this.blockGuids.length });

      this.blockSize = 0;
      this.bufferArray = [];
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
      var blockId = new Buffer(uuid.v4()).toString('base64');
      this.blockGuids.push(blockId);
      this.emit('block',{ id: blockId, 
                          buffer:prepareBlock(this.blockSize, this.bufferArray), 
                          index: this.blockGuids.length });      
    }

    this.emit('commit');

  } else {
    
    this.emit('single',prepareBlock(this.blockSize, this.bufferArray));
  }

};


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