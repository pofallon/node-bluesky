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
      'Authorization' : buildAuthorization('GET',now,this.acct,this.key,path)
    }
  };
  
  return (new ResultSet(params));
    
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
        console.log("Error: " + error);
        callback(error,null);
      } else {
        
        // console.log("Body:  " + body);

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

listTables = function(acct,key,callback) {
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
        'Authorization' : buildAuthorization('GET',now,acct,key,path)
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
            console.log("Done! with tables = " + JSON.stringify(tables));
            callback(null,tables);
          }
        });

        p.parse(body);

      }
    }
  );
};

exports.listTables = listTables;

var buildAuthorization = function(verb, ts, acct, key, path) {
  var canonicalizedResource = "/" + acct + "/" + path;
  var stringToSign = verb + "\n\n\n" + ts + "\n" + canonicalizedResource;
  var signature = crypto.createHmac('sha256',base64_decode(key)).update(stringToSign,input_encoding='ascii',output_encoding='utf8').digest('base64');
  return("SharedKey " + acct + ":" + signature);
}

var getNow = function() {
  return(dateFormat(Date(),"UTC:ddd, dd mmm yyyy HH:MM:ss") + " GMT");
}