/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var Table = require("./table");
var Container = require("./blob");
var Queue = require("./queue");

module.exports = function(options) {
  
  // Remove once everything is ported to use azureutil.on* methods
  if (options.devStorage === true) {
    options.host = "127.0.0.1";
  } else {
    options.host = options.account + ".table.core.windows.net";
  }

  function Storage () {
  }
  
  Storage.table = function(t) {
    return (new Table(t,options));
  };
    
  Storage.listTables = function(callback) {
    Table.listTables(options,callback);
  };
  
  Storage.createTable = function(t,callback) {
    Table.createTable(t,options,callback);
  };
  
  Storage.removeTable = function(t,callback) {
    Table.removeTable(t,options,callback);
  };
  
  Storage.container = function(b) {
    return(new Container(b,options));
  };
  
  Storage.listContainers = function(callback) {
    Container.listContainers(options,callback);
  };
  
  Storage.createContainer = function(b,callback) {
    Container.createContainer(b,options,callback);
  };
  
  Storage.removeContainer = function(b,callback) {
    Container.removeContainer(b,options,callback);
  };
  
  Storage.queue = function(q) {
    return(new Queue(q,options));
  };
  
  Storage.listQueues = function(callback) {
    Queue.listQueues(options,callback);
  };
  
  Storage.createQueue = function(q,callback) {
    Queue.createQueue(q,options,callback);
  };
  
  Storage.removeQueue = function(q,callback) {
    Queue.removeQueue(q,options,callback);
  };
  
  return Storage;
  
};
