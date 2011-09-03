var request = require('request');
var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require("sax");

var _request = request.defaults({
  headers: {
    'x-ms-version' : '2009-09-19',
    'Accept-Charset' : 'UTF-8',
    'Accept' : 'application/atom+xml,application/xml',
    'DataServiceVersion' : '1.0;NetFx',
    'MaxDataServiceVersion' : '1.0;NetFx',    
    'User-Agent' : 'azurejs/0.0.1'
  }
});

var Table = function (acct, key, t) {
  this.acct = acct;
  this.key = key;
  this.name = t;
};

Table.prototype.query = function() {
  
  var now = getNow();
  var path = this.name + '()';
  
  var filter = "";
  
  if ((arguments.length === 1) && (typeof(arguments[0]) === "object")) {
    
    var filterArray = [];
    var filterArgs = arguments[0];
    
    for (var key in filterArgs) {
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
    uri : 'http://' + this.acct + '.table.core.windows.net/' + path + filter,
    headers : {
      'x-ms-date' : now,
      'Date' : now,
      'Authorization' : buildAuthorization('GET',now,this.acct,this.key,path, '', '')
    }
  };
  
  return (new ResultSet(params));
    
};

Table.prototype.del = function(partition,row,callback) {
  var now = getNow();
  var path = this.name + "(PartitionKey=%27" + partition + "%27,RowKey=%27" + row + "%27)";

  var contentType = 'application/atom+xml';

  _request.del(
    { uri : 'http://' + this.acct + '.table.core.windows.net/' + path,
      headers : {
        'x-ms-date' : now,
        'Date' : now,
        'Content-Type' : contentType,
        'Content-Length' : 0,
        'If-Match' : '*',
        'Authorization' : buildAuthorization('DELETE',now,this.acct,this.key,path, '', contentType)
      }
    }, function (error, response, body) {
      if(error,null) {
        callback(error);
      } else if (response.statusCode !== 204) {
        callback("response " + response.statusCode,null);
      } else {
        callback(null);
      }
    }
  );
}

Table.prototype.insert = function(partition,row,elem,callback) {

  var now = getNow();
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

  _request.post(
    { uri : 'http://' + this.acct + '.table.core.windows.net/' + path,
      body : message,
      headers : {
        'x-ms-date' : now,
        'Date' : now,
        'Content-Type' : contentType,
        'Content-Length' : contentLength,
        'Content-MD5' : md5,
        'Authorization' : buildAuthorization('POST',now,this.acct,this.key,path,md5,contentType)
      }
    }, function (error, response, body) {
      if(error) {
        callback(error);
      } else if (response.statusCode !== 201) { 
        callback("Response code: " + response.statusCode);
      } else {
        callback(null);
      }
    });
};

var table = function(acct,key,t) {
  
  return (new Table(acct,key,t));

};

exports.table = table;

var ResultSet = function(p) {
  
  this.params = p;
  
};

ResultSet.prototype.all = function(callback) {
  
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
  
}

ResultSet.prototype.forEach = function(callback, doneCallback) {
  
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
  
}

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
  
  _request(fullParams, function(error, response) {
   
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
 
}
  
var listTables = function(acct,key,callback) {
  var now = getNow();
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
    
  _request.get(
    { uri : 'http://' + acct + '.table.core.windows.net/' + path,
      headers : {
        'x-ms-date' : now,
        'Date' : now,
        'Authorization' : buildAuthorization('GET',now,acct,key,path, '', '')
      }
    }).pipe(saxStream);
};

exports.listTables = listTables;

var createTable = function(acct,key,t,callback) {
  var now = getNow();
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
        var table = new Table(acct,key,t);
        callback(null,table);
      }
    }
  });
  
  saxStream.on('error', function(error) {
    callback(error.message);
  });
   
  _request.post(
    { uri : 'http://' + acct + '.table.core.windows.net/' + path,
      body : message,
      headers : {
        'x-ms-date' : now,
        'Date' : now,
        'Content-Type' : contentType,
        'Content-Length' : contentLength,
        'Content-MD5' : md5,
        'Authorization' : buildAuthorization('POST',now,acct,key,path,md5,contentType)
      }
    }, function(error, response, body) {
      if (error) {
        callback(error);
      }
    }).pipe(saxStream);
};

exports.createTable = createTable;

var removeTable = function(acct,key,t,callback) {
  var now = getNow();
  var path = "Tables(%27" + t + "%27)";
  
  var contentType = 'application/atom+xml';
    
  _request.del(
    { uri : 'http://' + acct + '.table.core.windows.net/' + path,
      headers : {
        'x-ms-date' : now,
        'Date' : now,
        'Content-Type' : contentType,
        'Content-Length' : 0,
        'Authorization' : buildAuthorization('DELETE',now,acct,key,path, '', contentType)
      }
    }, function (error, response, body) {
      if(error,null) {
        callback(error);
      } else if (response.statusCode !== 204) {
        callback("response " + response.statusCode,null);
      } else {
        callback(null);
      }
    }
  );
};

exports.removeTable = removeTable;

var buildAuthorization = function(verb, ts, acct, key, path, md5, ctype) {
  var canonicalizedResource = "/" + acct + "/" + path;
  var stringToSign = verb + "\n" + md5 + "\n" + ctype + "\n" + ts + "\n" + canonicalizedResource;
  var decodedKey = new Buffer(key,'base64');
  var signature = crypto.createHmac('sha256',decodedKey.toString('binary')).update(stringToSign).digest('base64');
  return("SharedKey " + acct + ":" + signature);
}

var getNow = function() {
  return(dateFormat(Date(),"UTC:ddd, dd mmm yyyy HH:MM:ss") + " GMT");
}
