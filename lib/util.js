var request = require('request');
var crypto = require('crypto');
var dateFormat = require('dateformat');

var msversion = '2011-08-18'

exports.request = request;

var doGet = function(options) {
  
  var now = getNow();
  
  var path = options.path || "";
  var queryString = options.queryString ? '?' + options.queryString : "";
    
  var authParams = {
    'date' : now,
    'account' : options.account,
    'key' : options.key,
    // 'path' : path + queryString
  };
  
  if (options.authQueryString) {
    authParams.path = path + queryString;
  } else {
    authParams.path = path;
  }
  
  if (options.enhancedAuth === true) {
    // enhancedAuth -- used by Blob & Queue -- require additional auth info
    authParams.verb = "GET";
    authParams.md5 = "";
    authParams.contentType = "";
    authParams.headers = {
      'x-ms-date' : now,
      'x-ms-version' : msversion
    }
  }
  
  var params = {
    uri : 'http://' + options.host + '/' + path + queryString,
    headers : _buildHeaders({
      'x-ms-date': now,
      'Date': now,
      'Authorization': _buildAuthorization(authParams)
    })
  };
  if (options.onResponse) { params.onResponse = options.onResponse; }

  if (options.responseStream) {
    request.get(params).pipe(options.responseStream);
  } else {
    return(request.get(params));
  }
    
};
exports.doGet = doGet;

var doPost = function(options) {
  
  var now = getNow();

  var path = options.path || "";
  var queryString = options.queryString ? '?' + options.queryString : "";
  
  var authParams = {
    'date' : now,
    'account' : options.account,
    'key' : options.key,
    // 'path' : path + queryString
    // Why not queryString for PUT like GET ?!?!?
    'path' : path
  };

  
  if (options.enhancedAuth === true) {
    // enhancedAuth -- used by Blob & Queue -- require additional auth info
    authParams.verb = "POST";
    // authParams.md5 = "";
    // authParams.contentType = "";
    // Note:  Auth headers must be in alpha order
    authParams.headers = {
      'x-ms-date' : now,
    };
  
    if (options.metaData) {
      var m;
      for (m in options.metaData) {
        if (options.metaData.hasOwnProperty(m)) {
          authParams.headers['x-ms-meta-' + m.toLowerCase()] = options.metaData[m];       
        }
      }
    }
    
    authParams.headers['x-ms-version'] = msversion;
    
  }

  var contentType = '';
  
  var message = "";
  if (options.tableBody) {
    message = buildTableMessage(options.tableBody,'http://' + options.host + '/' + options.path);
    contentType = 'application/atom+xml';
  } else if (options.body) {
    message = options.body;
    contentType = 'application/atom+xml'
  }
  // var message = buildMessage(options.body);
  var md5 = crypto.createHash('md5').update(message).digest('base64');

  authParams.md5 = md5;
  authParams.contentType = contentType;
  
  var params = {
    uri : 'http://' + options.host + '/' + options.path,
    body : message,
    headers : _buildHeaders({
      'x-ms-date': now,
      'Date': now,
      'Content-Type': contentType,
      'Content-MD5': md5,
      /* 'Authorization': _buildAuthorization({
        'date' : now,
        'account' : options.account,
        'key' : options.key,
        'path' : options.path,
        'md5' : md5,
      }) */
      'Authorization': _buildAuthorization(authParams)
    }, options.metaData)
  };
  if (options.onResponse) { params.onResponse = options.onResponse; }
  
  if (options.responseStream) {
    request.post(params).pipe(options.responseStream);
  } else {
    request.post(params);
  }

  
};
exports.doPost = doPost;

// ######
// doPut
// ######
var doPut = function(options) {
  
  var now = getNow();
  
  var path = options.path || "";
  var queryString = options.queryString ? '?' + options.queryString : "";

  var contentType = options.contentType || '';

  var message = "";
  if (options.tableBody) {
    message = buildTableMessage(options.tableBody,'http://' + options.host + '/' + options.path);
    contentType = 'application/atom+xml';
  } else if (options.body) {
    message = options.body;
    contentType = 'application/atom+xml'
  }

  var md5 = (message === "") ? '' : crypto.createHash('md5').update(message).digest('base64');
  
  var authParams = {
    'date' : now,
    'account' : options.account,
    'key' : options.key,
    // 'path' : path + queryString
    // Why not queryString for PUT like GET ?!?!?
    'path' : path
  };
  
  if (options.enhancedAuth === true) {
    // enhancedAuth -- used by Blob & Queue -- require additional auth info
    authParams.verb = "PUT";
    authParams.md5 = md5;
    authParams.contentType = contentType;
    // Note:  Auth headers must be in alpha order

    authParams.headers = [];
    
    // This is a hack
    if (options.headers && options.headers['x-ms-blob-type']) {
      authParams.headers['x-ms-blob-type'] = options.headers['x-ms-blob-type'];
    }
    
    authParams.headers['x-ms-date'] = now;
  
    if (options.metaData) {
      var m;
      for (m in options.metaData) {
        if (options.metaData.hasOwnProperty(m)) {
          authParams.headers['x-ms-meta-' + m.toLowerCase()] = options.metaData[m];       
        }
      }
    }
    
    authParams.headers['x-ms-version'] = msversion;
    
  }
  
  var params = {
    uri : 'http://' + options.host + '/' + path + queryString,
    body : message,
    headers : _buildHeaders({
      'x-ms-date': now,
      'Date': now,
      'Content-Type': contentType,
      'Content-MD5': md5,
      'Content-Length': message.length,
      'Authorization': _buildAuthorization(authParams)
    }, options.metaData, options.headers)
  };
  if (options.onResponse) { params.onResponse = options.onResponse; }
  
  if (options.responseStream) {
    request.put(params).pipe(options.responseStream);
  } else {
    request.put(params);
  }
  
};
exports.doPut = doPut;

// ######
// doDelete
// ######
var doDelete = function(options) {
  
  var now = getNow();
  
  var path = options.path || "";
  var queryString = options.queryString ? '?' + options.queryString : "";
  
  var authParams = {
    'date' : now,
    'account' : options.account,
    'key' : options.key,
    'path' : path
  };
  
  if (options.enhancedAuth === true) {
    // enhancedAuth -- used by Blob & Queue -- require additional auth info
    authParams.verb = "DELETE";
    authParams.md5 = "";
    authParams.contentType = "";
    // Note:  Auth headers must be in alpha order
    authParams.headers = {
      'x-ms-date' : now,
      'x-ms-version' : msversion
    };  
  }
  
  var params = {
    uri : 'http://' + options.host + '/' + path + queryString,
    headers : _buildHeaders({
      'x-ms-date': now,
      'Date': now,
      'Authorization': _buildAuthorization(authParams)
    },null,options.headers)
  };
  if (options.onResponse) { params.onResponse = options.onResponse; }
  
  if (options.responseStream) {
    request.del(params).pipe(options.responseStream);
  } else {
    request.del(params);
  }
  
};
exports.doDelete = doDelete;

var _buildHeaders = function(headers, metaData, optHeaders) {
  
  var returnHeaders = {
    'x-ms-version' : msversion,
    'Accept-Charset' : 'UTF-8',
    'Accept' : 'application/atom+xml,application/xml',
    'DataServiceVersion' : '2.0;NetFx',
    'MaxDataServiceVersion' : '2.0;NetFx',    
    'User-Agent' : 'node-azure/0.2.0'
  };
  
  var h;
  for (h in headers) {
    if (headers.hasOwnProperty(h)) {
      returnHeaders[h] = headers[h];
    }
  }
  
  if (metaData) {
    var m;
    for (m in metaData) {
      if (metaData.hasOwnProperty(m)) {
        returnHeaders['x-ms-meta-' + m] = metaData[m];
      }
    }
  }
  
  if (optHeaders) {
    var h;
    for (h in optHeaders) {
      if (optHeaders.hasOwnProperty(h)) {
        returnHeaders[h] = optHeaders[h];
      }
    }
  }
  
  return(returnHeaders);
};

var buildTableMessage = function(body,url) {
  return('<?xml version="1.0" encoding="utf-8" standalone="yes"?><entry xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom"><title /><updated>' + dateFormat(Date(),"yyyy-mm-dd'T'HH:MM:ss'.0000000'o") + '</updated><author><name/></author><id>' + url + '</id><content type="application/xml"><m:properties>' + body + '</m:properties></content></entry>');
  
  // When do I use timestamp?
  // <d:Timestamp m:type="Edm.DateTime">' + dateFormat(Date(),"UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'") + '</d:Timestamp>
  
};

var _buildAuthorization = function(options) {
  var md5 = options.md5 || "";
  var contentType = options.contentType || "";
  
  var canonicalizedResource = "/" + options.account + "/" + options.path;
  if (options.queryString) {
    // console.log("Query String = " + options.queryString);
  }
  
  var canonicalizedHeaders = "";
  if (options.headers) {
    var h;
    for (h in options.headers) {
      canonicalizedHeaders = canonicalizedHeaders + h + ':' + options.headers[h] + '\n';
    }
    // console.log("Headers = " + canonicalizedHeaders);
  }
  
  // var stringToSign = options.verb + "\n" + md5 + "\n" + contentType + "\n" + options.date + "\n" + canonicalizedHeaders + canonicalizedResource;
  
  var stringToSign = "";
  
  if (options.verb) {
    // If 'verb' is passed in, assume blob/queue auth which requires more params
    stringToSign = options.verb + "\n" + options.md5 + "\n" + options.contentType + "\n" + "\n" + canonicalizedHeaders + canonicalizedResource;
    // console.log("S2S: " + stringToSign);
  } else {
    stringToSign = options.date + "\n" + canonicalizedResource;
  }
                   
  var decodedKey = new Buffer(options.key,'base64');
  var signature = crypto.createHmac('sha256',decodedKey.toString('binary')).update(stringToSign).digest('base64');
  return("SharedKeyLite " + options.account + ":" + signature);
};
    
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
