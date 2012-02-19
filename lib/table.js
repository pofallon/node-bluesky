/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require("sax");

var skyutil = require("./util");

var u_ = require("underscore");
var TableQuery = require("azure/lib/services/table/tablequery");
var ISO8061Date = require("azure/lib/util/iso8061date");
    
function Table (t,options) {
  this.options = options;
  this.name = t;
  this._query = TableQuery.select().from(this.name);
}
    
Table.listTables = function(options,callback) {
  
  var tableList = [];

  var processResults = function(err, theseTables, continuation) {
    if (err) {
      callback(err);
    } else {
      tableList = tableList.concat(u_.map(theseTables, function(t) { return t.TableName; }));
      if (continuation && continuation.hasNextPage()) {
        fetchTables(continuation);
      } else {
        callback(null,tableList);
      }
    }
  };

  (function fetchTables(more) {

    if (more) {
      more.getNextPage(processResults);
    } else {
      options.tableService.queryTables(processResults);
    }

  })();
  
};
  
Table.createTable = function(name,options,callback) {

  options.tableService.createTableIfNotExists(name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, new Table(name,options));
    }
  });

};
  
Table.removeTable = function(name,options,callback) {

  options.tableService.deleteTable(name, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);  
    }
  });

};
  
Table.prototype.del = function(partition,row,callback) {

  this.options.tableService.deleteEntity(this.name, {PartitionKey:partition, RowKey:row}, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);
    }
  })

};

Table.prototype.update = function(partition,row,elem,opts,callback) {
  
  if (arguments.length === 4) {
    callback = opts;
  }

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

};
  
Table.prototype.insert = function(partition,row,elem,callback) {

  var entity = u_.clone(elem);
  entity.PartitionKey = partition;
  entity.RowKey = row;

  this.options.tableService.insertEntity(this.name, formatEntity(entity), function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null,true);
    }
  });

};

Table.prototype.select = function() {
  this._query = TableQuery.select.apply(this._query, arguments).from(this.name);
  return this;
}

Table.prototype.whereKeys = function() {
  this._query.whereKeys.apply(this._query, arguments);
  return this;
}

Table.prototype.where = function() {
  this._query.where.apply(this._query, arguments);
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
        that.where(key + ' eq ?', value);
      } else {
        that.and(key + ' eq ' + value);
      }
    }
  })
  return this;
}

Table.prototype.and = function() {
  this._query.and.apply(this._query, arguments);
  return this;
}

Table.prototype.or = function() {
  this._query.or.apply(this._query, arguments);
  return this;
}

Table.prototype.rows = function(callback, doneCallback) {

  var that = this;
  var rowList = [];

  var processResults = function(err, theseRows, continuation) {

    var rowCount = 0;

    if (err) {
      callback(err);
    } else {
      
      if (doneCallback) {
        theseRows.forEach(function (row) {
          rowCount++;
          if (typeof(callback) === 'function') {
            callback(row, rowCount);
          }
        });      
      } else {
        rowList = rowList.concat(theseRows); 
      }

      if (continuation && continuation.hasNextPage()) {
        fetchRows(continuation);
      } else {

        if (doneCallback) {
          if (typeof(doneCallback) === 'function') {
            doneCallback(null,rowCount);
          }
        } else {
          callback(null,rowList);
        }

      }
    }
  };

  (function fetchRows(more) {

    if (more) {
      more.getNextPage(processResults);
    } else {

      that.options.tableService.queryEntities(that._query, processResults);
      
      // Reset the query
      that._query = TableQuery.select().from(that.name);
    }

  })();
  
}

Table.prototype.service = function() {
  return this.options.tableService;
}

function formatEntity(entity) {

  var elemType, elemValue;
  var retEntity = {};

  for (var i in entity) {

    elemType = null;
    elemValue = entity[i];
    
    if (typeof(elemValue) === 'number') {
      elemType = 'Edm.Double';
    } else if (typeof(elemValue) === 'boolean') {
      elemType = 'Edm.Boolean';
      elemValue = elemValue.toString();
    } else if (elemValue instanceof Date) {
      elemType = 'Edm.DateTime';
      elemValue = ISO8061Date.format(elemValue);
    }

    if (elemType) {
      retEntity[i] = { '@': { type: elemType }, '#': elemValue }
    } else {
      // String or already formatted objects will just fall through
      retEntity[i] = elemValue;
    }

  }

  return(retEntity);

}

module.exports = Table;
