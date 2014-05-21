/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var Table = require("./table");
var Container = require("./blob");
var Queue = require("./queue");

// var azure = require('azure');

var skyutil = require('./util');

module.exports = function(options) {

  if (!options) {
    options = {};
  }

  var azure = options["azure"] || require('azure');

  if (!options.account && !options.key) {
    process.env.EMULATED = true;
    options.account = null;
    options.key = null;
  }

  function Storage () {

  }

  Storage.table = function(t) {
    if (!options.tableService) {
      options.tableService = azure.createTableService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }
    return (new Table(t,options));
  };

  Storage.listTables = function(prefix,theseOpts,callback) {
    if (!options.tableService) {
      options.tableService = azure.createTableService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }

    var results;

    skyutil.parseArgs({
      prefix: prefix,
      options: theseOpts,
      callback: callback,
      mergeOpts: options
    }, function(params) {
      results = Table.listTables(params.prefix,params.options,params.callback);
    });

    return results;
  };

  Storage.createTable = function(t,theseOpts,callback) {
    if (!options.tableService) {
      options.tableService = azure.createTableService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }
    skyutil.parseArgs({
      options: theseOpts,
      callback: callback,
      mergeOpts: options,
      safeCallback: true
    }, function(params) {
      Table.createTable(t,params.options,params.callback);
    })

  };

  Storage.removeTable = function(t,theseOpts,callback) {
    if (!options.tableService) {
      options.tableService = azure.createTableService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }
    skyutil.parseArgs({
      options: theseOpts,
      callback: callback,
      mergeOpts: options,
      safeCallback: true
    }, function(params) {
      Table.removeTable(t,params.options,params.callback);
    });

  };

  Storage.container = function(b) {
    if (!options.blobService) {
      options.blobService = azure.createBlobService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }
    return(new Container(b,options));
  };

  Storage.listContainers = function(prefix,theseOpts,callback) {
    if (!options.blobService) {
      options.blobService = azure.createBlobService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }

    var result;

    skyutil.parseArgs({
      prefix: prefix,
      options: theseOpts,
      callback: callback,
      mergeOpts: options
    }, function(params) {
      result = Container.listContainers(params.prefix,params.options,params.callback);
    });

    return result;
  };

  Storage.createContainer = function(b,theseOpts,callback) {
    if (!options.blobService) {
      options.blobService = azure.createBlobService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }
    skyutil.parseArgs({
      options: theseOpts,
      callback: callback,
      mergeOpts: options,
      safeCallback: true
    }, function(params) {
      Container.createContainer(b,params.options,params.callback);
    });

  };

  Storage.removeContainer = function(b,theseOpts, callback) {
    if (!options.blobService) {
      options.blobService = optionsazure.createBlobService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }
    skyutil.parseArgs({
      options: theseOpts,
      callback: callback,
      mergeOpts: options,
      safeCallback: true
    }, function(params) {
      Container.removeContainer(b,params.options,params.callback);
    });

  };

  Storage.queue = function(q) {
    if (!options.queueService) {
      options.queueService = azure.createQueueService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }
    return(new Queue(q,options));
  };

  Storage.listQueues = function(prefix,theseOpts,callback) {
    if (!options.queueService) {
      options.queueService = azure.createQueueService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }

    var result;

    skyutil.parseArgs({
      prefix: prefix,
      options: theseOpts,
      callback: callback,
      mergeOpts: options
    }, function(params) {
      result = Queue.listQueues(params.prefix,params.options,params.callback);
    });

    return result;

  };

  Storage.createQueue = function(q,theseOpts,callback) {
    if (!options.queueService) {
      options.queueService = azure.createQueueService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }

    skyutil.parseArgs({
      options: theseOpts,
      callback: callback,
      mergeOpts: options,
      safeCallback: true
    }, function(params) {
      Queue.createQueue(q,params.options,params.callback);
    });

  };

  Storage.removeQueue = function(q,theseOpts,callback) {
    if (!options.queueService) {
      options.queueService = azure.createQueueService(options.account, options.key).withFilter(new azure.LinearRetryPolicyFilter());
    }

    skyutil.parseArgs({
      options: theseOpts,
      callback: callback,
      mergeOpts: options,
      safeCallback: true
    }, function(params) {
      Queue.removeQueue(q,params.options,params.callback);
    })

  };

  return Storage;

};
