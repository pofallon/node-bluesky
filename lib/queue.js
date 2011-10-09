/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require("sax");

var azureutil = require("./util");
    
function Queue (q,options) {
  this.options = options;
  this.name = q;
}

Queue.listQueues = function(options, callback) {

};

Queue.createQueue = function(q,options,callback) {
  
};

Queue.removeQueue = function(q,options,callback) {
  
};

Queue.prototype.put = function(m,options,callback) {
  
};

Queue.prototype.get = function(options,callback) {
  
};

Queue.prototype.peek = function(options,callback) {
  
};

Queue.prototype.del = function(m,options,callback) {
  
};

Queue.prototype.clear = function(options,callback) {
  
};

Queue.prototype.update = function(m,options,callback) {
  
};