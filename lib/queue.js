/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */
 
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require("sax");

var azureutil = require("./util");
    
function Queue (q,options) {
  this.options = options;
  this.name = q;
}

util.inherits(Queue,EventEmitter);

Queue.listQueues = function(options, callback) {

};

Queue.createQueue = function(q,options,callback) {
  
};

Queue.removeQueue = function(q,options,callback) {
  
};

Queue.prototype.put = function(m,callback) {
  
};

Queue.prototype.get = function(callback) {
  
};

Queue.prototype.peek = function(callback) {
  
};

Queue.prototype.del = function(m,callback) {
  
};

Queue.prototype.clear = function(callback) {
  
};

Queue.prototype.update = function(m,callback) {
  
};

Queue.prototype.poll = function(t) {
  
  if (t > 0) {    
    this.interval = setInterval(function() {
      this.get(function(err,msg) {
        if (msg) {
          this.emit('message',msg);
        }        
      });
    },t);
  } else {
    clearInterval(this.interval);
  }
  
};