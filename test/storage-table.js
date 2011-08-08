var fs = require('fs');
var testCase = require('nodeunit').testCase;
var storage = require('../lib/azure').storage;

module.exports = testCase({

  setUp: function (callback) {
    var testCredentials = JSON.parse(fs.readFileSync(process.env.HOME + '/.azurejs/test.json','ascii'));
    this.account = testCredentials.account;
    this.key = testCredentials.key;

    this.tableName = "foobar";
    this.partitionKey = "foo";
    this.rowKey = "bar";
    
    callback();
  },

  createTable: function (test) {
    var theTable = this.tableName;
    storage.createTable(this.account, this.key, theTable, function(err,table) {
      test.equals(err,null);
      test.equals(table.name,theTable);
      test.done();
    });
  },

  createdTableInList: function (test) {
    var theTable = this.tableName;
    storage.listTables(this.account, this.key, function(err,tables) {
      test.notStrictEqual(tables.indexOf(theTable),-1);
      test.done();
    });
  },

  tableInsertRow: function (test) {
    var t = new storage.table(this.account, this.key, this.tableName);
    t.insert(this.partitionKey,this.rowKey,{'one':'uno', 'two': 2, 'three': true, 'four': new Date('2010-12-23T23:12:11.234Z') }, function(err) {
      test.equals(err,null);
      test.done();
    });
  },

  tableQueryAll: function (test) {
    var myPartition = this.partitionKey;
    var myRow = this.rowKey;

    var t = new storage.table(this.account, this.key, this.tableName);
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
    
    var t = new storage.table(this.account, this.key, this.tableName);
    
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


  tableDeleteRow: function (test) {
    var t = new storage.table(this.account, this.key, this.tableName);
    t.del(this.partitionKey,this.rowKey,function(err) {
      test.equals(err,null);
      test.done();
    });
  },

  removeTable: function (test) {
    storage.removeTable(this.account, this.key, this.tableName, function(err) {
      test.equals(err,null);
      test.done();
    });
  },

  tableNoLongerInList: function (test) {
    var theTable = this.tableName;
    storage.listTables(this.account, this.key, function(err, tables) {
      test.strictEqual(tables.indexOf(theTable),-1);
      test.done();
    });
  },

  /* tearDown: function (callback) {
    // Need a way to remove a table *if* it exists (and not error otherwise)
    storage.removeTable(this.account, key, this.tableName);
  } */

});
