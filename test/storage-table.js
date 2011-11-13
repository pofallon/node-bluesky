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

  tableInsertRow: function (test) {
    var t = storage.table(this.tableName);
    t.insert(this.partitionKey,this.rowKey,{'one':'uno', 'two': 2, 'three': true, 'four': new Date('2010-12-23T23:12:11.234Z') }, function(err) {
      test.equals(err,null);
      test.done();
    });
  },

  tableNoFilterAll: function (test) {
    var myPartition = this.partitionKey;
    var myRow = this.rowKey;

    var t = storage.table(this.tableName);
    t.all(function(err, results) {
      test.equals(err,null);
      test.notEqual(results,null);
      if (results) {
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
      }
      
      test.done();
    });
  },
  
  tableBasicFilterAll: function (test) {
    var myPartition = this.partitionKey;
    var myRow = this.rowKey;
    
    var t = storage.table(this.tableName);
    
    t.insert(this.partitionKey,'foo2',{'one':'unouno', 'two':4, 'three':false, 'four': new Date() }, function(err) {
      test.equals(err,null,"Second table row insert failed");
      t.all(function(err,r) {
        test.equals(r.length,2,"Second table row not returned in results");
        t.filter({'one':'uno','two': 2, 'three': true}).all(function(err, results) {
          test.equals(err,null);
          test.equals(results.length,1);
          test.equals(results[0].PartitionKey,myPartition);
          test.equals(results[0].RowKey,myRow);
          test.equals(results[0].one,'uno');
          // Now make sure filter is gone for subsequent requests
          t.all(function(err,r2) {
            test.equals(err,null);
            test.equals(r2.length,2);
            test.done();
          });
        });
      });
    });
  },
  
  tableNoFilterForEach: function(test) {
    var myPartition = this.partitionKey;
    var myRow = this.rowKey;
    
    var t = storage.table(this.tableName);
    
    var manualCount = 0;
    
    t.forEach(function(err, row) {
      manualCount++;
    }, function(err, count) {
      test.equals(count,manualCount);
      var secondCount = 0;
      t.forEach(function(err, row) {
        if (count == ++secondCount) {
          test.done();
        }
      });
    });
  },
  
  tableFieldsAll: function(test) {
    
    var t = storage.table(this.tableName);
    
    var thePartitionKey = this.partitionKey;
    var theRowKey = this.rowKey;
    
    t.fields(['PartitionKey','RowKey']).all(function(err,rows) {
      test.equals(err,null);
      test.notEqual(rows,null);
      test.notEqual(rows.length,0);
      if (rows.length > 0) {
        test.equals(rows[0].PartitionKey,thePartitionKey);
        test.equals(rows[0].RowKey.theRowKey);
        test.equals(rows[0].one,null);
        // Make sure full field list is present in subsequent invocations
        t.all(function(err,r2) {
          test.equals(err,null);
          test.equals(r2[0].one,'uno');
          test.done();
        });
      }
    });
  },
    
  
  tableUpdateRow: function (test) {
    var t = storage.table(this.tableName);
    t.update(this.partitionKey,this.rowKey,{'one':'eleven', 'two': 22, 'three': true, 'four': new Date('2010-12-23T23:12:11.234Z') }, function(err) {
      test.equals(err,null);
      t.all(function(err,rows) {
        test.equals(rows[0].one,'eleven');
        test.done();
      });
    });
  },
  
  tableUpsertRow: function (test) {
    var t = storage.table(this.tableName);
    t.update(this.partitionKey,"upsertRow",{'one':'1111', 'two':222, 'three': false }, {upsert: true}, function(err) {
      test.equals(err,null);
      t.forEach(null,function(err,count) {
        test.equals(count,3);
        test.done();
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
  }

});
