/*!
 * node-bluesky
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var fs = require('fs');
var testCase = require('nodeunit').testCase;

var path = process.env.HOME || (process.env.HOMEDRIVE + process.env.HOMEPATH);
var testCredentials = JSON.parse(fs.readFileSync(path + '/.bluesky/test.json','ascii'));
    
var storage = require('../lib/bluesky').storage({account: testCredentials.account, key: testCredentials.key});

module.exports = testCase({

  setUp: function (callback) {

    this.tableName = "longtable";
    this.partitionKey = "foo";
    this.rowKey = "bar";
    
    callback();
  },

  createTable: function (test) {
    var theTable = this.tableName;
    storage.createTable(theTable, function(err,table) {
      test.equals(err,null);
      test.notEqual(table,null);
      if (table) {
        test.equals(table.name,theTable);
      }
      test.done();
    });
  },

  createdTableInList: function (test) {
    var theTable = this.tableName;
    storage.listTables(function(err,tables) {
      test.equals(err,null);
      test.notEqual(tables,null);
      if (tables) {
        test.notStrictEqual(tables.indexOf(theTable),-1);
      }
      test.done();
    });
  },

  rowsContinuations: function(test) {
    var counter = 0;
    var size = 1002;
    var t = storage.table(this.tableName);
    for (var i = 0; i < size; i++) {
      t.insert('c','' + i, function(err) {
        test.equals(err,null);
        if (++counter === size) {
          t.rows().on('end', function(count) {
            test.equals(size,count);
            test.done();
          });
        }
      });
    }
  },

  // rowsWithLimit: function(test) {
  //   var limitCount = 5;
  //   t.rows({limit: limitCount}).on('end', function(count) {
  //     test.equals(limitCount, count);
  //     test.done();
  //   });
  // },

  removeTable: function (test) {
    storage.removeTable(this.tableName, function(err) {
      test.equals(err,null);
      test.done();
    });
  },

  tableNoLongerInList: function (test) {
    var theTable = this.tableName;
    storage.listTables(function(err, tables) {
      test.strictEqual(tables.indexOf(theTable),-1);
      test.done();
    });
  }

});