var request = require('request');
var crypto = require('crypto');
var dateFormat = require('dateformat');
var base64_decode = require('base64').decode;
var expat = require('node-expat');

var Table = function (acct, key, t) {
  this.acct = acct;
  this.key = key;
  this.name = t;
};

Table.prototype.query = function() {
  
  var now = getNow();
  var path = this.name + '()';
  
  var params = {
    method : 'GET',
    uri : 'http://' + this.acct + '.table.core.windows.net/' + path,
    headers : {
      'x-ms-version' : '2009-09-19',
      'Accept-Charset' : 'UTF-8',
      'Accept' : 'application/atom+xml,application/xml',
      'DataServiceVersion' : '1.0;NetFx',
      'MaxDataServiceVersion' : '1.0;NetFx',    
      'User-Agent' : 'azurejs/0.0.1',
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

  request.del(
    { uri : 'http://' + this.acct + '.table.core.windows.net/' + path,
      headers : {
        'x-ms-version' : '2009-09-19',
        'Accept-Charset' : 'UTF-8',
        'Accept' : 'application/atom+xml,application/xml',
        'DataServiceVersion' : '1.0;NetFx',
        'MaxDataServiceVersion' : '1.0;NetFx',
        'User-Agent' : 'azurejs/0.0.1',
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
    message += "<d:" + i + ">" + elem[i] + "</d:" + i + ">"
  }

  message += "</m:properties></content></entry>";

  var contentType = 'application/atom+xml';
  var contentLength = message.length;
  var md5 = crypto.createHash('md5').update(message).digest('base64');

  request.post(
    { uri : 'http://' + this.acct + '.table.core.windows.net/' + path,
      body : message,
      headers : {
        'x-ms-version' : '2009-09-19',
        'Accept-Charset' : 'UTF-8',
        'Accept' : 'application/atom+xml,application/xml',
        'DataServiceVersion' : '1.0;NetFx',
        'MaxDataServiceVersion' : '1.0;NetFx',
        'User-Agent' : 'azurejs/0.0.1',
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
 
 request(this.params, function(error, response, body) {
   
   if(error) {
        callback(error,null);
      } else {
        
        var currElement = "";
        var rows = [];
        var rowData = {};

        var p = new expat.Parser("UTF-8");

        p.addListener('startElement', function(name, attrs) {
          if (name.substring(0,2) === "d:") {
            currElement = name.substring(2);
          }
        });

        p.addListener('text', function(s) {
          if (currElement !== "") {
            rowData[currElement] = s;
            currElement = "";
          }
        });

        p.addListener('endElement', function(name) {
          if (name === "entry") {
            rows.push(rowData);
            rowData = {};
          } else if (name === "feed") {
            callback(null,rows);
          }
        });

        p.parse(body);

      }
   
 });
  
}

var listTables = function(acct,key,callback) {
  var now = getNow();
  var path = "Tables";
    
  request.get(
    { uri : 'http://' + acct + '.table.core.windows.net/' + path,
      headers : {
        'x-ms-version' : '2009-09-19',
        'Accept-Charset' : 'UTF-8',
        'Accept' : 'application/atom+xml,application/xml',
        'DataServiceVersion' : '1.0;NetFx',
        'MaxDataServiceVersion' : '1.0;NetFx',    
        'User-Agent' : 'azurejs/0.0.1',
        'x-ms-date' : now,
        'Date' : now,
        'Authorization' : buildAuthorization('GET',now,acct,key,path, '', '')
      }
    }, function (error, response, body) {
      if(error) {
        callback(error,null);
      } else {

        var insideTableName = false;
        var tables = [];

        var p = new expat.Parser("UTF-8");

        p.addListener('startElement', function(name, attrs) {
          if (name === "d:TableName") {
            insideTableName = true;
          }
        });

        p.addListener('text', function(s) {
          if (insideTableName) {
            tables.push(s);
            insideTableName = false;
          }
        });

        p.addListener('endElement', function(name) {
          if (name === "feed") {
            callback(null,tables);
          }
        });

        p.parse(body);

      }
    }
  );
};

exports.listTables = listTables;

var createTable = function(acct,key,t,callback) {
  var now = getNow();
  var path = "Tables";
  
  var message = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><entry xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom"><title /><updated>' + dateFormat(Date(),"yyyy-mm-dd'T'HH:MM:ss'.0000000'o") + '</updated><author><name/></author><id/><content type="application/xml"><m:properties><d:TableName>' + t + '</d:TableName></m:properties></content></entry>';

  var contentType = 'application/atom+xml';
  var contentLength = message.length;
  var md5 = crypto.createHash('md5').update(message).digest('base64');
    
  request.post(
    { uri : 'http://' + acct + '.table.core.windows.net/' + path,
      body : message,
      headers : {
        'x-ms-version' : '2009-09-19',
        'Accept-Charset' : 'UTF-8',
        'Accept' : 'application/atom+xml,application/xml',
        'DataServiceVersion' : '1.0;NetFx',
        'MaxDataServiceVersion' : '1.0;NetFx',    
        'User-Agent' : 'azurejs/0.0.1',
        'x-ms-date' : now,
        'Date' : now,
        'Content-Type' : contentType,
        'Content-Length' : contentLength,
        'Content-MD5' : md5,
        'Authorization' : buildAuthorization('POST',now,acct,key,path,md5,contentType)
      }
    }, function (error, response, body) {
      if(error) {
        callback(error,null);
      } else {

        var insideTableName = false;

        var p = new expat.Parser("UTF-8");

        p.addListener('startElement', function(name, attrs) {
          if (name === "d:TableName") {
            insideTableName = true;
          }
        });

        p.addListener('text', function(s) {
          if (insideTableName) {
            if (s === t) {
              var table = new Table(acct,key,t);
              callback(null,table);
            }
          }
        });

        /* p.addListener('endElement', function(name) {
          if (name === "entry") {
            callback("unknown error",null);
          }
        }); */

        p.parse(body);

      }
    }
  );
};

exports.createTable = createTable;

var removeTable = function(acct,key,t,callback) {
  var now = getNow();
  var path = "Tables(%27" + t + "%27)";
  
  var contentType = 'application/atom+xml';
    
  request.del(
    { uri : 'http://' + acct + '.table.core.windows.net/' + path,
      headers : {
        'x-ms-version' : '2009-09-19',
        'Accept-Charset' : 'UTF-8',
        'Accept' : 'application/atom+xml,application/xml',
        'DataServiceVersion' : '1.0;NetFx',
        'MaxDataServiceVersion' : '1.0;NetFx',    
        'User-Agent' : 'azurejs/0.0.1',
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
  var signature = crypto.createHmac('sha256',base64_decode(key)).update(stringToSign).digest('base64');
  return("SharedKey " + acct + ":" + signature);
}

var getNow = function() {
  return(dateFormat(Date(),"UTC:ddd, dd mmm yyyy HH:MM:ss") + " GMT");
}
