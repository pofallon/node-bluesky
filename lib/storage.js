/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var Table = require("./table");
var Container = require("./blob");
var Queue = require("./queue");

var azure = require('azure');

module.exports = function(options) {

  function Storage () {

  }
  
  Storage.table = function(t) {
    if (!options.tableService) {
      options.tableService = azure.createTableService(options.account, options.key);
    }
    return (new Table(t,options));
  };
    
  Storage.listTables = function(callback) {
    if (!options.tableService) {
      options.tableService = azure.createTableService(options.account, options.key);
    }
    Table.listTables(options,callback);
  };
  
  Storage.createTable = function(t,callback) {
    if (!options.tableService) {
      options.tableService = azure.createTableService(options.account, options.key);
    }
    Table.createTable(t,options,callback);
  };
  
  Storage.removeTable = function(t,callback) {
    if (!options.tableService) {
      options.tableService = azure.createTableService(options.account, options.key);
    }
    Table.removeTable(t,options,callback);
  };
  
  Storage.container = function(b) {
    if (!options.blobService) {
      options.blobService = azure.createBlobService(options.account, options.key);
    }
    return(new Container(b,options));
  };
  
  Storage.listContainers = function(callback) {
    if (!options.blobService) {
      options.blobService = azure.createBlobService(options.account, options.key);
    }
    Container.listContainers(options,callback);
  };
  
  Storage.createContainer = function(b,callback) {
    if (!options.blobService) {
      options.blobService = azure.createBlobService(options.account, options.key);
    }
    Container.createContainer(b,options,callback);
  };
  
  Storage.removeContainer = function(b,callback) {
    if (!options.blobService) {
      options.blobService = azure.createBlobService(options.account, options.key);
    }
    Container.removeContainer(b,options,callback);
  };
  
  Storage.queue = function(q) {
    if (!options.queueService) {
      options.queueService = azure.createQueueService(options.account, options.key); 
    }
    return(new Queue(q,options));
  };
  
  Storage.listQueues = function(prefix,callback) {
    if (!options.queueService) { 
      options.queueService = azure.createQueueService(options.account, options.key);
    }
    return Queue.listQueues(prefix,options,callback);
  };
  
  Storage.createQueue = function(q,callback) {
    if (!options.queueService) {
      options.queueService = azure.createQueueService(options.account, options.key);
    }
    Queue.createQueue(q,options,callback);
  };
  
  Storage.removeQueue = function(q,callback) {
    if (!options.queueService) {
      options.queueService = azure.createQueueService(options.account, options.key);
    }
    Queue.removeQueue(q,options,callback);
  };
  
  return Storage;
  
};
