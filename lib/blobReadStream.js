/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

// heavily influenced by https://github.com/felixge/node-passthrough-stream

var Stream = require('stream').Stream;
var util = require('util');

module.exports = BlobReadStream;
function BlobReadStream() {
  this.writable = false;
  this.readable = true;
  this.properties = {};
  this.metadata = {};
  this.buffer = null;
  this.readyToEnd = false;
}
util.inherits(BlobReadStream, Stream);

BlobReadStream.prototype.write = function(data) {
  if (this.writable) {
    this.emit('data',data);
    return true;		
  } else {
    this.buffer = data;
    return false;
  }
};

BlobReadStream.prototype.ready = function() {
  if (this.buffer !== null) {
    this.emit('data',this.buffer);
    this.buffer = null;
    this.emit('drain');
  }

  if (this.readyToEnd) {
    this.emit('end');
  } else {
    this.writable = true;
  }
}

BlobReadStream.prototype.end = function(data) {
  if (this.buffer === null) {
	this.writable = false;
    this.emit('end');
  } else {
    this.readyToEnd = true;
  }
};

BlobReadStream.prototype.destroy = function() {
  this.emit('close');
};
