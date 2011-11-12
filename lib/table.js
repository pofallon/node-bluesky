/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require("sax");

var azureutil = require("./util");
    
function Table (t,options) {
  this.options = options;
  this.name = t;
  this.params = {};
  this.fieldArray = [];
  this.filters = [];
}
    
Table.listTables = function(options,callback) {
  
  var saxStream = sax.createStream(true);
  var insideTableName = false;
  var tables = [];
  var isError = 0;
  
  saxStream.on('opentag', function(tag) {
    if (tag.name === "d:TableName") {
      insideTableName = true;
    } else if (tag.name === "error") {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });
  
  saxStream.on('text', function(s) {
    if (insideTableName) {
      tables.push(s);
      insideTableName = false;
    } else if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });
  
  saxStream.on('closetag', function(name) {
    if (name === "feed") {
      callback(null,tables);
    }
  });

  saxStream.on('error', function(err) {

  });
  
  azureutil.doGet({
    'host' : options.account + '.table.core.windows.net',
    'path' : 'Tables',
    'account' : options.account,
    'key' : options.key,
    'responseStream' : saxStream,
    'authQueryString' : true
  });
  
};
  
Table.createTable = function(t,options,callback) {
  var saxStream = sax.createStream(true);
  var insideTableName = false;
  var isError = 0;
  
  var onResponse = function(error, response) {
    if (error) {
      callback(error);
    }
  };
  
  saxStream.on('opentag', function(tag) {
    if (tag.name === "d:TableName") {
      insideTableName = true;
    } else if (tag.name === "error") {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });
  
  saxStream.on('text', function(s) {
    if (insideTableName) {
      if (s === t) {
        var table = new Table(t,options);
        callback(null,table);
      }
    } else if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });

  saxStream.on('error', function(error) {
    // callback(error);
  });
  
  azureutil.doPost({
    'host' : options.account + '.table.core.windows.net',
    'path' : 'Tables',
    'tableBody' : '<d:TableName>' + t + '</d:TableName>',
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream  
  });

};
  
Table.removeTable = function(t,options,callback) {
  var saxStream = sax.createStream(true);
  var isError = 0;

  saxStream.on('opentag', function(tag) {
    if (tag.name === 'error') {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
    if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });

  saxStream.on('error', function(err) {

  });
  
  var onResponse = function(error, response) {
    if (response.statusCode === 204) {
      callback(null,true);
    }
  };
  
  azureutil.doDelete({
    'host' : options.account + '.table.core.windows.net',
    'path' : 'Tables(%27' + t + '%27)',
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream
  });

};
  
Table.prototype.del = function(partition,row,callback) {

  var saxStream = sax.createStream(true);
  var isError = 0;

  saxStream.on('opentag', function(tag) {
    if (tag.name === 'error') {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
    if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });

  saxStream.on('error', function(err) {

  });
  
  var onResponse = function(error, response) {
    if (response.statusCode === 204) {
      callback(null,true);
    }
  };
  
  azureutil.doDelete({
    'host' : this.options.account + '.table.core.windows.net',
    'path' : this.name + '(PartitionKey=%27' + partition + '%27,RowKey=%27' + row + '%27)',
    'account' : this.options.account,
    'key' : this.options.key,
    'onResponse' : onResponse,
    'headers' : {
      'If-Match' : '*'
    }
  });

};

Table.prototype.update = function(partition,row,elem,opts,callback) {
  
  if (arguments.length === 4) {
    callback = opts;
  }

  var saxStream = sax.createStream(true);
  var isError = 0;

  saxStream.on('opentag', function(tag) {
    if (tag.name === 'error') {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
    if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });

  saxStream.on('error', function(err) {

  });
 
  var onResponse = function(error, response) {
    if (response.statusCode === 204) {
      callback(null,true);
    }
  };
  
  var upsert = this.options.upsert || opts.upsert;
  
  var message = '<d:PartitionKey>' + partition + '</d:PartitionKey><d:RowKey>' + row + '</d:RowKey>';
  
  if (!elem["Timestamp"]) {
    elem["Timestamp"] = new Date();
  }

  for (var i in elem) {
    var elemType = '';
    var elemValue = elem[i];
    
    if (typeof(elemValue) === 'number') {
      elemType = ' m:type="Edm.Double"';
    } else if (typeof(elemValue) === 'boolean') {
      elemType = ' m:type="Edm.Boolean"';
    } else if (elemValue instanceof Date) {
      elemType = ' m:type="Edm.DateTime"';
      elemValue = dateFormat(elemValue, "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'");
    } 
    
    message += '<d:' + i + elemType + '>' + elemValue + '</d:' + i + '>';
  }

  var params = {
    'host' : this.options.account + '.table.core.windows.net',
    'path' : this.name + "(PartitionKey=%27" + partition + "%27,RowKey=%27" + row + "%27)",
    'tableBody' : message,
    'account' : this.options.account,
    'key' : this.options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream
  };

  if (!upsert) {
    params['headers'] = {
      'If-Match' : '*'
    };
  }

  azureutil.doPut(params);

};
  
Table.prototype.insert = function(partition,row,elem,callback) {

  var saxStream = sax.createStream(true);
  var isError = 0;

  saxStream.on('opentag', function(tag) {
    if (tag.name === 'error') {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });

  saxStream.on('text', function(s) {
    if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });

  saxStream.on('error', function(err) {

  });

  var onResponse = function(error, response) {
    if (response.statusCode === 201) {
      callback(null,true);
    }
  };

  var message = '<d:PartitionKey>' + partition + '</d:PartitionKey><d:RowKey>' + row + '</d:RowKey>';

  if (!elem["Timestamp"]) {
    elem["Timestamp"] = new Date();
  }

  for (var i in elem) {
    var elemType = '';
    var elemValue = elem[i];
    
    if (typeof(elemValue) === 'number') {
      elemType = ' m:type="Edm.Double"';
    } else if (typeof(elemValue) === 'boolean') {
      elemType = ' m:type="Edm.Boolean"';
    } else if (elemValue instanceof Date) {
      elemType = ' m:type="Edm.DateTime"';
      elemValue = dateFormat(elemValue, "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'");
    } 
    
    message += '<d:' + i + elemType + '>' + elemValue + '</d:' + i + '>';
  }

  azureutil.doPost({
    'host' : this.options.account + '.table.core.windows.net',
    'path' : this.name,
    'tableBody' : message,
    'account' : this.options.account,
    'key' : this.options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream
  });

};
  
Table.prototype.filter = function(filterHash) {
  
  if (filterHash && (typeof(filterHash) === "object")) {
    
    var key;
    
    for (key in filterHash) {
      if (typeof(filterHash[key]) === 'string') {
        this.filters.push(key + '%20eq%20%27' + filterHash[key] + '%27');
      } else if ((typeof(filterHash[key]) === 'number') || (typeof(filterHash[key]) === 'boolean')) {
        this.filters.push(key + '%20eq%20' + filterHash[key]);
      }
    }
    
  } else {
    this.filters = [];
  }
  
  return (this);
    
};

Table.prototype.fields = function(fields) {

  if (fields instanceof Array) {
    this.fieldArray = fields;
  }
  
  return(this);
};
    

Table.prototype.all = function(callback) {
  
  var rows = [];
  
  var rowFunction = function(row) {
    rows.push(row);
  };
  
  var doneFunction = function() {
    callback(null,rows);
  };
  
  var errFunction = function(err) {
    if (typeof(doneCallback) === "function") {
      doneCallback(err);
    } else if (typeof(callback) === "function") {
      callback(err);
    }
  };
  
  _buildTableRequest(this, function(err, request) {
  
    if (!err) {
  
      _doTableRequest(request, errFunction, doneFunction, rowFunction);
      
    }

  });
  
};

  
Table.prototype.forEach = function(callback, doneCallback) {
  
  var rowCount = 0;
  
  var rowFunction = function(row) {
    rowCount++;
    if (callback !== null) {
      callback(null,row,rowCount);
    }
  };
  
  var doneFunction = function() {
    if (doneCallback !== undefined ) {
      doneCallback(null,rowCount);
    }
  };
  
  var errFunction = function(err) {
    if (doneCallback !== undefined) {
      doneCallback(err);
    } else if (callback !== undefined) {
      callback(err);
    }
  };
  
  _buildTableRequest(this, function(err, request) {
  
    if (!err) {
  
      _doTableRequest(request, errFunction, doneFunction, rowFunction);
      
    }
    
  });
  
};

module.exports = Table;

function _buildTableRequest (table, callback) {
  var queryString = "";
  
  var queryStringItems = [];
  
  if (table.filters.length > 0) {
    queryStringItems.push("$filter="+ table.filters.join('%20and%20'));
    // Clear out the filters once we've used them
    // (so those re-using this table instance won't mistakenly be subject to them)
    // TODO:  Restore this as an option in the future
    table.filters = [];
  }
  
  if (table.fieldArray.length > 0) {
    queryStringItems.push("$select="+ table.fieldArray.join(','));
    // Clear them out for the same reason as above
    table.fieldArray = [];
  }
  
  if (queryStringItems.length > 0) {
    queryString = queryStringItems.join('&');
  }

  var params = {
    'host' : table.options.account + '.table.core.windows.net',
    'path' : table.name + '()',
    'queryString' : queryString,
    'account' : table.options.account,
    'key' : table.options.key,
  }  

  callback(null,params);
  
}

function _doTableRequest (params, errFunc, doneFunc, rowFunc, continuePartition, continueRow) { 
  
  var fullParams = {
    'host' : params.host,
    'path' : params.path,
    'queryString' : params.queryString,
    'account' : params.account,
    'key' : params.key
  };
  
  if (continuePartition !== undefined) {
    if (fullParams.queryString !== '') {
      fullParams.queryString += "&";
    }
    fullParams.queryString = fullParams.queryString + "NextPartitionKey=" + continuePartition;
    if (continueRow !== undefined) {
      fullParams.uri = fullParams.uri + "&NextRowKey=" + continueRow;
    }
  }
   
  var saxStream = sax.createStream(true);
  var currElement = "";
  var currType = "";
  var rowData = {};

  var isLast = true;
  var isError = 0;

  var onResponse = function(error, response) {
    if (error) {
      errFunc(error);
    } else if (response.headers["x-ms-continuation-nextpartitionkey"] !== undefined) {
        isLast = false;
        _doTableRequest(params, errFunc, doneFunc, rowFunc,
                        response.headers["x-ms-continuation-nextpartitionkey"],
                        response.headers["x-ms-continuation-nextrowkey"]);
    }
  };

  saxStream.on('opentag', function(tag) {
    if (tag.name.substring(0,2) === "d:") {
      currElement = tag.name.substring(2);
      currType = tag.attributes['m:type'];
    } else if (tag.name === "error") {
      isError++;
    } else if ((tag.name === "code") && (isError === 1)) {
      isError++;
    }
  });
  
  saxStream.on('text', function(s) {
    if (currElement !== "") {
      if ((currType === 'Edm.Double') || (currType === 'Edm.Int32') || (currType === 'Edm.Int64')) {
        rowData[currElement] = s*1;
      } else if (currType === 'Edm.Boolean') {
        rowData[currElement] = (s === 'true');
      } else if (currType === 'Edm.DateTime') {
        rowData[currElement] = new Date(s);
      } else {
        rowData[currElement] = s;
      }
      currElement = "";
      currType = "";
    } else if (isError === 2) {
      isError = 0;
      callback(new Error(s));
    }
  });
  
  saxStream.on('closetag', function(name) {
    if (name === "entry") {
      rowFunc(rowData);
      rowData = {};
    }
  });

  saxStream.on('end', function() {
    if (isLast) {
      doneFunc();
    } 
  });

  fullParams["onResponse"] = onResponse;
  fullParams["responseStream"] = saxStream;

  azureutil.doGet(fullParams);
  
}
