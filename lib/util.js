var request = require('request');
var crypto = require('crypto');
var dateFormat = require('dateformat');

var request = request.defaults({
  headers: {
    'x-ms-version' : '2009-09-19',
    'Accept-Charset' : 'UTF-8',
    'Accept' : 'application/atom+xml,application/xml',
    'DataServiceVersion' : '1.0;NetFx',
    'MaxDataServiceVersion' : '1.0;NetFx',    
    'User-Agent' : 'node-azure/0.2.0'
  }
});

exports.request = request;
    
var buildAuthorization = function(verb, ts, acct, key, path, md5, ctype) {
  var canonicalizedResource = "/" + acct + "/" + path;
  var stringToSign = verb + "\n" + md5 + "\n" + ctype + "\n" + ts + "\n" + canonicalizedResource;
  var decodedKey = new Buffer(key,'base64');
  var signature = crypto.createHmac('sha256',decodedKey.toString('binary')).update(stringToSign).digest('base64');
  return("SharedKey " + acct + ":" + signature);
};

exports.buildAuthorization = buildAuthorization;

var getNow = function() {
  return(dateFormat(Date(),"UTC:ddd, dd mmm yyyy HH:MM:ss") + " GMT");
};

exports.now = getNow;