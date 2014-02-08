/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var Stream = require('stream').Stream;
var util = require('util');

module.exports = BlobReadStream;
function BlobReadStream() {
  this.writable = true;
  this.readable = true;
}

util.inherits(BlobReadStream, Stream);

BlobReadStream.prototype.write = function(data) {
  this.emit('data',data);
}

BlobReadStream.prototype.done = function() {
    this.emit('end');
}

BlobReadStream.prototype.end = function(data) {
  if (data) {
    this.emit('data',data);
  }
};

BlobReadStream.prototype.destroy = function() {
  this.emit('close');
};
