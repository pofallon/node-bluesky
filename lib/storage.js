/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var request = require('request');
var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require("sax");

var Table = require("./table");

var table = function(acct,key,t) {
  
  return (new Table(acct,key,t));

};

exports.table = table;
  
var listTables = function(acct,key,callback) {
  Table.listTables(acct,key,callback);
};

exports.listTables = listTables;

var createTable = function(acct,key,t,callback) {
  Table.createTable(acct,key,t,callback);
};

exports.createTable = createTable;

var removeTable = function(acct,key,t,callback) {
  Table.removeTable(acct,key,t,callback);
};

exports.removeTable = removeTable;
