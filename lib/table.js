/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var u_ = require("underscore");
var TableQuery = require("azure").TableQuery;
var EventEmitter = require('events').EventEmitter;
var skyutil = require('./util');
var uuid = require('node-uuid');

function Table (t,options) {
  this.options = options;
  this.name = t;
  this._query = new TableQuery().select();
}

Table.listTables = function(prefix,options,callback) {

  var tableCounter = 0;

  var processResults = function(err, theseTables, continuation) {
    if (err) {
      emitter.emit('error',err);
    } else {
      theseTables.forEach(function(table) {
        if (!options.limit || (tableCounter < options.limit)) {
          if (prefix) {
            if (table.TableName.indexOf(prefix) === 0) {
              emitter.emit('data',table.TableName);
              tableCounter++;
            }
          } else {
            emitter.emit('data',table.TableName);
            tableCounter++;
          }
        }
      });
      if (continuation && continuation.hasNextPage()) {
        if (!options.limit || (tableCounter < options.limit)) {
          fetchTables(continuation);
        }
      } else {
        emitter.emit('end', tableCounter);
      }
    }
  };

  var fetchTables = function(more) {

    try {

      if (more) {
        more.getNextPage(processResults);
      } else {
        options.tableService.queryTables(processResults);
      }

    } catch (err) {
      emitter.emit('error',err);
    }

  };

  var emitter = skyutil.getEmitter(callback);
  fetchTables();
  return(emitter);

};

Table.createTable = function(name,options,callback) {

  try {

    options.tableService.createTableIfNotExists(name, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, new Table(name,options));
      }
    });

  } catch (err) {
    callback(err);
  }

};

Table.removeTable = function(name,options,callback) {

  try {

    options.tableService.deleteTable(name, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null,true);
      }
    });

  } catch (err) {
    callback(err);
  }

};

Table.prototype.del = function(partition,row,callback) {

  callback = skyutil.safeCallback(callback);

  try {

    this.options.tableService.deleteEntity(this.name, {PartitionKey:partition, RowKey:row}, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null,true);
      }
    });

  } catch (err) {
    callback(err);
  }

};

Table.prototype.update = function(partition,row,elem,opts,callback) {

  if (arguments.length === 4) {
    callback = opts;
  }

  callback = skyutil.safeCallback(callback);

  var entity = u_.clone(elem);
  entity.PartitionKey = partition;
  entity.RowKey = row;

  var processResults = function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);
    }
  }

  var doUpsert = this.options.upsert || opts.upsert;
  var doMerge = this.options.merge || opts.merge;

  try {

    if (doUpsert) {

      if (doMerge) {
        this.options.tableService.insertOrMergeEntity(this.name, entity, processResults);
      } else {
        this.options.tableService.insertOrReplaceEntity(this.name, entity, processResults);
      }

    } else if (doMerge) {
      this.options.tableService.mergeEntity(this.name, entity, processResults);
    } else {
      this.options.tableService.updateEntity(this.name,entity, processResults);
    }

  } catch (err) {
    callback(err);
  }

};

Table.prototype.insert = function(partition,row,elem,callback) {

  var entity = {};

  if ((typeof row === "object") || (typeof row === "function")) {
    callback = elem;
    elem = row;
    row = null;
  }

  switch (typeof elem) {
    case "function":
      callback = elem;
      entity = {};
      break;
    case "object":
      entity = u_.clone(elem);
      break;
  }

  callback = skyutil.safeCallback(callback);

  entity.PartitionKey = partition;
  entity.RowKey = row || getRowKey(this.options.rowKey,elem);

  try {

    this.options.tableService.insertEntity(this.name, entity, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null,entity.RowKey);
      }
    });

  } catch (err) {
    callback(err);
  }

};

Table.prototype.select = function() {
  this._query = new TableQuery().select.apply(this._query, Array.prototype.slice.call(arguments));
  return this;
}

Table.prototype.whereKeys = function() {
  this._query.whereKeys.apply(this._query, Array.prototype.slice.call(arguments));
  return this;
}

Table.prototype.where = function() {
  this._query.where.apply(this._query, Array.prototype.slice.call(arguments));
  return this;
}

Table.prototype.filter = function(criteria) {
  var that = this;
  var fieldCount = 0;

  u_.each(criteria, function(value, key) {
    if (fieldCount++ === 0) {
      if (typeof(value) === 'string') {
        that.where(key + ' eq ?', value);
      } else {
        that.where(key + ' eq ' + value);
      }
    } else {
      if (typeof(value) === 'string') {
        that.and(key + ' eq ?', value);
      } else {
        that.and(key + ' eq ' + value);
      }
    }
  })
  return this;
}

Table.prototype.and = function() {
  this._query.and.apply(this._query, Array.prototype.slice.call(arguments));
  return this;
}

Table.prototype.or = function() {
  this._query.or.apply(this._query, Array.prototype.slice.call(arguments));
  return this;
}

Table.prototype.top = function(count) {
  console.log("Requested count = " + count)
  this._query.top.apply(this._query, Array.prototype.slice.call(arguments));
  console.dir(this._query);
  return this;
}

Table.prototype.rows = function(callback) {

  var that = this;

  var rowCount = 0;

  var processResults = function(err, theseRows, continuation) {
    if (err) {
      emitter.emit('error',err);
    } else {
      theseRows.forEach(function (row) {
        emitter.emit('data',row);
        rowCount++;
      });
      if (continuation && continuation.hasNextPage()) {
        fetchRows(continuation);
      } else {
        emitter.emit('end',rowCount);
      }
    }
  };

  var fetchRows = function(more) {

    try {

      if (more) {
        more.getNextPage(processResults);
      } else {

        that.options.tableService.queryEntities(that.name, that._query, processResults);

        // Reset the query
        that._query = new TableQuery().select();
      }

    } catch (err) {
      emitter.emit('error', err);
    }

  };

  var emitter = skyutil.getEmitter(callback);
  fetchRows();

  return(emitter);

}

Table.prototype.service = function() {
  return this.options.tableService;
}

function getRowKey(keyPref,elem) {

  var rowKey = null;

  switch(typeof keyPref) {
    case 'function':
      rowKey = keyPref(elem);
      break;
    case 'string':
      switch(rowType) {
        case 'timestamp':
          rowKey = (new Date()).toISOString();
          break;
        case 'epoch':
          rowKey = Date.now();
          break;
        case 'uuid':
          rowKey = uuid.v4();
	default:
          rowKey = uuid.v4();
      }
    default:
      rowKey = uuid.v4();
  }

  return(rowKey);

}

module.exports = Table;
