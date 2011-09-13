/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var Table = require("./table");

module.exports = function(options) {
  
  if (options.devStorage === true) {
    options.host = "127.0.0.1";
  } else {
    options.host = options.account + ".table.core.windows.net";
  }

  function Storage () {
  };
  
  Storage.table = function(t) {
    return (new Table(t,options));
  };
    
  Storage.listTables = function(callback) {
    Table.listTables(options,callback);
  };
  
  Storage.createTable = function(t,callback) {
    Table.createTable(t,options,callback);
  };
  
  Storage.removeTable = function(t,callback) {
    Table.removeTable(t,options,callback);
  };
  
  return Storage;
  
}
