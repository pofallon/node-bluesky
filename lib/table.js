/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require("sax");

var util = require("./util");
    
function Table (t,options) {
  this.options = options;
  this.name = t;
  this.params = {};
};
    
Table.listTables = function(options,callback) {
  var now = util.now();
  var path = "Tables";
  
  var saxStream = sax.createStream(true);
  var insideTableName = false;
  var tables = [];
  
  saxStream.on('opentag', function(tag) {
    if (tag.name === "d:TableName") {
      insideTableName = true;
    }
  });
  
  saxStream.on('text', function(s) {
    if (insideTableName) {
      tables.push(s);
      insideTableName = false;
    }
  });
  
  saxStream.on('closetag', function(name) {
    if (name === "feed") {
      callback(null,tables);
    }
  });
    
  util.request.get(
    { uri : 'http://' + options.host + '/' + path,
      headers : {
        'x-ms-date' : now,
        'Date' : now,
        'Authorization' : util.buildAuthorization('GET',now,options.account,options.key,path, '', '')
      }
    }).pipe(saxStream);
};
  
Table.createTable = function(t,options,callback) {
  var now = util.now();
  var path = "Tables";
  
  var message = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><entry xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom"><title /><updated>' + dateFormat(Date(),"yyyy-mm-dd'T'HH:MM:ss'.0000000'o") + '</updated><author><name/></author><id/><content type="application/xml"><m:properties><d:TableName>' + t + '</d:TableName></m:properties></content></entry>';

  var contentType = 'application/atom+xml';
  var contentLength = message.length;
  var md5 = crypto.createHash('md5').update(message).digest('base64');
  
  var saxStream = sax.createStream(true);
  var insideTableName = false;
  
  saxStream.on('opentag', function(tag) {
    if (tag.name === "d:TableName") {
      insideTableName = true;
    }
  });
  
  saxStream.on('text', function(s) {
    if (insideTableName) {
      if (s === t) {
        var table = new Table(t,options);
        callback(null,table);
      }
    }
  });
  
  saxStream.on('error', function(error) {
    callback(error.message);
  });
   
  util.request.post(
    { uri : 'http://' + options.host + '/' + path,
      body : message,
      headers : {
        'x-ms-version' : '2011-08-18',
        'Accept-Charset' : 'UTF-8',
        'Accept' : 'application/atom+xml,application/xml',
        'DataServiceVersion' : '1.0;NetFx',
        'MaxDataServiceVersion' : '2.0;NetFx',    
        'User-Agent' : 'node-azure/0.2.0',
        'x-ms-date' : now,
        'Date' : now,
        'Content-Type' : contentType,
        'Content-Length' : contentLength,
        'Content-MD5' : md5,
        'Authorization' : util.buildAuthorization('POST',now,options.account,options.key,path,md5,contentType),
      },
      onResponse : function(error, response) {
        if (error) {
          callback(error);
        }
      }
    }).pipe(saxStream);
};
  
Table.removeTable = function(t,options,callback) {
  var now = util.now();
  var path = "Tables(%27" + t + "%27)";
  
  var contentType = 'application/atom+xml';
    
  util.request.del(
    { uri : 'http://' + options.host + '/' + path,
      headers : {
        'x-ms-version' : '2011-08-18',
        'Accept-Charset' : 'UTF-8',
        'Accept' : 'application/atom+xml,application/xml',
        'DataServiceVersion' : '1.0;NetFx',
        'MaxDataServiceVersion' : '2.0;NetFx',    
        'User-Agent' : 'node-azure/0.2.0',
        'x-ms-date' : now,
        'Date' : now,
        'Content-Type' : contentType,
        'Content-Length' : 0,
        'Authorization' : util.buildAuthorization('DELETE',now,options.account,options.key,path, '', contentType)
      }
    }, function (error, response, body) {
      if(error) {
        callback(error);
      } else if (response.statusCode !== 204) {
        callback("response " + response.statusCode,null);
      } else {
        callback(null,true);
      }
    }
  );
};
  
Table.prototype.del = function(partition,row,callback) {
  var now = util.now();
  var path = this.name + "(PartitionKey=%27" + partition + "%27,RowKey=%27" + row + "%27)";

  var contentType = 'application/atom+xml';

  util.request.del(
    { uri : 'http://' + this.options.host + '/' + path,
      headers : {
        'x-ms-version' : '2011-08-18',
        'Accept-Charset' : 'UTF-8',
        'Accept' : 'application/atom+xml,application/xml',
        'DataServiceVersion' : '1.0;NetFx',
        'MaxDataServiceVersion' : '2.0;NetFx',    
        'User-Agent' : 'node-azure/0.2.0',
        'x-ms-date' : now,
        'Date' : now,
        'Content-Type' : contentType,
        'Content-Length' : 0,
        'If-Match' : '*',
        'Authorization' : util.buildAuthorization('DELETE',now,this.options.account,this.options.key,path, '', contentType)
      }
    }, function (error, response, body) {
      if(error) {
        callback && callback(error);
      } else if (response.statusCode !== 204) {
        callback && callback("response " + response.statusCode,null);
      } else {
        callback && callback(null,true);
      }
    }
  );
};

Table.prototype.update = function(partition,row,elem,opts,callback) {
  
  if (arguments.length === 4) {
    callback = opts;
  }
  
  var upsert = this.options.upsert || opts.upsert;
  
  var now = util.now();
  var path = this.name + "(PartitionKey='" + partition + "',RowKey='" + row + "')";
  
  var message = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><entry xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom"><title/><updated>' + dateFormat(Date(),"yyyy-mm-dd'T'HH:MM:ss'.0000000'o") + '</updated><author><name/></author><id>' + 'http://' + this.options.host + '/' + path + '</id><content type="application/xml"><m:properties><d:PartitionKey>' + partition + '</d:PartitionKey><d:RowKey>' + row + '</d:RowKey><d:Timestamp m:type="Edm.DateTime">' + dateFormat(Date(),"UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'") + '</d:Timestamp>';
  
  path = path.replace(/'/g,"%27");
  // console.log("Path = " + path);

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

  message += "</m:properties></content></entry>";
  
  var contentType = 'application/atom+xml';
  var contentLength = message.length;
  var md5 = crypto.createHash('md5').update(message).digest('base64');
  
  var theHeaders = {
    'x-ms-version' : '2011-08-18',
    'Accept-Charset' : 'UTF-8',
    'Accept' : 'application/atom+xml,application/xml',
    'DataServiceVersion' : '1.0;NetFx',
    'MaxDataServiceVersion' : '2.0;NetFx',    
    'User-Agent' : 'node-azure/0.2.0',
    'x-ms-date' : now,
    'Date' : now,
    'Content-Type' : contentType,
    'Content-Length' : contentLength,
    'Content-MD5' : md5,
    'Authorization' : util.buildAuthorization('PUT',now,this.options.account,this.options.key,path,md5,contentType)
  };
  
  if (!upsert) {
    theHeaders['If-Match'] = '*';
  }

  util.request.put(
    { uri : 'http://' + this.options.host + '/' + path,
      body : message,
      headers : theHeaders,
    }, function (error, response, body) {
      if(error) {
        callback(error);
      } else if (response.statusCode !== 204) { 
        callback("Response code: " + response.statusCode);
        // callback("Body: " + body);
      } else {
        callback(null,true);
      }
    });
  
};

  
Table.prototype.insert = function(partition,row,elem,callback) {

  var now = util.now();
  var path = this.name;

  var message = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><entry xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom"><title/><updated>' + dateFormat(Date(),"yyyy-mm-dd'T'HH:MM:ss'.0000000'o") + '</updated><author><name/></author><id/><content type="application/xml"><m:properties><d:PartitionKey>' + partition + '</d:PartitionKey><d:RowKey>' + row + '</d:RowKey><d:Timestamp m:type="Edm.DateTime">0001-01-01T00:00:00</d:Timestamp>';

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

  message += "</m:properties></content></entry>";

  var contentType = 'application/atom+xml';
  var contentLength = message.length;
  var md5 = crypto.createHash('md5').update(message).digest('base64');

  util.request.post(
    { uri : 'http://' + this.options.host + '/' + path,
      body : message,
      headers : {
        'x-ms-version' : '2011-08-18',
        'Accept-Charset' : 'UTF-8',
        'Accept' : 'application/atom+xml,application/xml',
        'DataServiceVersion' : '1.0;NetFx',
        'MaxDataServiceVersion' : '2.0;NetFx',    
        'User-Agent' : 'node-azure/0.2.0',
        'x-ms-date' : now,
        'Date' : now,
        'Content-Type' : contentType,
        'Content-Length' : contentLength,
        'Content-MD5' : md5,
        'Authorization' : util.buildAuthorization('POST',now,this.options.account,this.options.key,path,md5,contentType)
      }
    }, function (error, response, body) {
      if(error) {
        callback(error);
      } else if (response.statusCode !== 201) { 
        callback("Response code: " + response.statusCode);
      } else {
        callback(null,true);
      }
    });
};
  
Table.prototype.query = function() {
  
  var now = util.now();
  var path = this.name + '()';
  
  var filter = "";
  
  if ((arguments.length === 1) && (typeof(arguments[0]) === "object")) {
    
    var filterArray = [];
    var filterArgs = arguments[0];
    var key;
    
    for (key in filterArgs) {
      if (typeof(filterArgs[key]) === 'string') {
        filterArray.push(key + '%20eq%20%27' + filterArgs[key] + '%27');
      } else if ((typeof(filterArgs[key]) === 'number') || (typeof(filterArgs[key]) === 'boolean')) {
        filterArray.push(key + '%20eq%20' + filterArgs[key]);
      }
    }
    
    if (filterArray.length > 0) {
      filter = "?$filter="+ filterArray.join('%20and%20');
    }
  }
  
  var params = {
    method : 'GET',
    uri : 'http://' + this.options.host + '/' + path + filter,
    headers : {
      'x-ms-version' : '2011-08-18',
      'Accept-Charset' : 'UTF-8',
      'Accept' : 'application/atom+xml,application/xml',
      'DataServiceVersion' : '1.0;NetFx',
      'MaxDataServiceVersion' : '2.0;NetFx',    
      'User-Agent' : 'node-azure/0.2.0',
      'x-ms-date' : now,
      'Date' : now,
      'Authorization' : util.buildAuthorization('GET',now,this.options.account,this.options.key,path, '', '')
    }
  };
  
  this.params = params;
  
  return (this);
    
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
  
  _doTableRequest(this.params, errFunction, doneFunction, rowFunction);
  
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
  
  _doTableRequest(this.params, errFunction, doneFunction, rowFunction);
  
};

module.exports = Table;

function _doTableRequest (params, errFunc, doneFunc, rowFunc, continuePartition, continueRow) { 
  
  var fullParams = {};
  fullParams.method = params.method;
  fullParams.uri = params.uri;
  fullParams.headers = params.headers;
  
  if (continuePartition !== undefined) {
    if (fullParams.uri.indexOf("?") < 0) {
      fullParams.uri += "?";
    }
    fullParams.uri = fullParams.uri + "&NextPartitionKey=" + continuePartition;
    if (continueRow !== undefined) {
      fullParams.uri = fullParams.uri + "&NextRowKey=" + continueRow;
    }
  }
   
  var saxStream = sax.createStream(true);
  var currElement = "";
  var currType = "";
  var rowData = {};
  
  saxStream.on('opentag', function(tag) {
    if (tag.name.substring(0,2) === "d:") {
      currElement = tag.name.substring(2);
      currType = tag.attributes['m:type'];
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
    }
  });
  
  saxStream.on('closetag', function(name) {
    if (name === "entry") {
      rowFunc(rowData);
      rowData = {};
    }
  });
  
  util.request(fullParams, function(error, response) {
   
    if(error) {
      errFunc(error);
    } else {
      if (response.headers["x-ms-continuation-nextpartitionkey"] !== undefined) {
        _doTableRequest(params, errFunc, doneFunc, rowFunc, 
                        response.headers["x-ms-continuation-nextpartitionkey"], 
                        response.headers["x-ms-continuation-nextrowkey"]);
       } else {
         doneFunc();
       }
    }
    
  }).pipe(saxStream);
 
};