/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var fs = require('fs');
var testCase = require('nodeunit').testCase;

var path = process.env.HOME || (process.env.HOMEDRIVE + process.env.HOMEPATH);
var testCredentials = JSON.parse(fs.readFileSync(path + '/.azurejs/test.json','ascii'));
    
var storage = require('../lib/azure').storage({account: testCredentials.account, key: testCredentials.key});

module.exports = testCase({

  setUp: function (callback) {

    this.tableName = "foobar";
    this.partitionKey = "foo";
    this.rowKey = "bar";
    
    callback();
  },

  createTable: function (test) {
    var theTable = this.tableName;
    storage.createTable(theTable, function(err,table) {
      test.equals(err,null);
      test.equals(table.name,theTable);
      test.done();
    });
  },

  createdTableInList: function (test) {
    var theTable = this.tableName;
    storage.listTables(function(err,tables) {
      test.notStrictEqual(tables.indexOf(theTable),-1);
      test.done();
    });
  },

  tableInsertRow: function (test) {
    var t = storage.table(this.tableName);
    t.insert(this.partitionKey,this.rowKey,{'one':'uno', 'two': 2, 'three': true, 'four': new Date('2010-12-23T23:12:11.234Z') }, function(err) {
      test.equals(err,null);
      test.done();
    });
  },

  tableQueryAll: function (test) {
    var myPartition = this.partitionKey;
    var myRow = this.rowKey;

    var t = storage.table(this.tableName);
    t.query().all(function(err, results) {
      test.equals(results[0].PartitionKey,myPartition);
      test.equals(results[0].RowKey,myRow);
      
      test.equals(typeof(results[0].one), 'string');
      test.equals(results[0].one, 'uno');
      
      test.equals(typeof(results[0].two), 'number');
      test.equals(results[0].two, 2);
      
      test.equals(typeof(results[0].three), 'boolean');
      test.equals(results[0].three, true);
      
      test.equals((results[0].four instanceof Date), true);
      var d = new Date('2010-12-23T23:12:11.234Z');
      test.deepEqual(results[0].four,d);
      
      test.done();
    });
  },
  
  tableQueryBasicFilter: function (test) {
    var myPartition = this.partitionKey;
    var myRow = this.rowKey;
    
    var t = storage.table(this.tableName);
    
    t.insert(this.partitionKey,'foo2',{'one':'unouno', 'two':4, 'three':false, 'four': new Date() }, function(err) {
      test.equals(err,null,"Second table row insert failed");
      t.query().all(function(err,r) {
        test.equals(r.length,2,"Second table row not returned in results");
        t.query({'one':'uno','two': 2, 'three': true}).all(function(err, results) {
          test.equals(results.length,1);
          test.equals(results[0].PartitionKey,myPartition);
          test.equals(results[0].RowKey,myRow);
          test.equals(results[0].one,'uno');
          test.done();
        });
      });
    });
  },
  
  tableQueryForEach: function(test) {
    var myPartition = this.partitionKey;
    var myRow = this.rowKey;
    
    var t = storage.table(this.tableName);
    
    var manualCount = 0;
    
    t.query().forEach(function(err, row) {
      manualCount++;
    }, function(err, count) {
      test.equals(count,manualCount);
      var secondCount = 0;
      t.query().forEach(function(err, row) {
        if (count == ++secondCount) {
          test.done();
        }
      });
    });
  },

  tableDeleteRow: function (test) {
    var t = storage.table(this.tableName);
    t.del(this.partitionKey,this.rowKey,function(err) {
      test.equals(err,null);
      test.done();
    });
  },

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
  },

});
