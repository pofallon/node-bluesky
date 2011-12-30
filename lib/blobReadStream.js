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
	this.writable = true;
	this.readable = true;
	this.properties = {};
	this.metadata = {};
}
util.inherits(BlobReadStream, Stream);

BlobReadStream.prototype.write = function(data) {
	this.emit('data',data);
};

BlobReadStream.prototype.end = function() {
	this.emit('end');
};

BlobReadStream.prototype.destroy = function() {
	this.emit('close');
};