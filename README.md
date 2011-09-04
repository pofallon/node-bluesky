# node-azure
A node.js library for accessing the Windows Azure REST API's.

## Usage

```javascript
var storage = require('azure').storage;
var t = storage.table(account, key, tableName);
t.query({'user':'joe','visits':1,'isPremium':true}).forEach(function(err,row) {
  console.log(row.user + ", " + row.visits + ", " + row.isPremium);
}, function(err, count) {
  console.log(count + " users matched your query");
});
```

See the [tests](node-azure/tree/master/test) for additional examples

## Platform Support

The library can used with both Windows and non-Windows versions of node.js:

![Tests](https://img.skitch.com/20110904-8fdbnpfe8dj36f55a8462mdc8p.jpg)

## Dependencies

This library depends on:

* mikeal/request
* felixge/node-dateformat
* isaacs/sax-js
* caolan/nodeunit (for unit tests)

## Install

<pre>
  npm install azure
</pre>

On Windows, manually download the above dependencies and place them in node-azure/node_modules

# API

## Table Storage

### storage.createTable(account, key, tableName, callback)

Creates a new table with the supplied `tableName` on the specified `account`.  `callback` is passed a reference to the newly created table.

### storage.listTables(account, key, callback)

Lists all tables in the specified `account`.  Invokes `callback` with an array of table names.

### storage.removeTable(account, key, tableName, callback)

Removes the table specified by `tableName`.

### storage.table(account, key, tableName)

Returns a reference to a table (the same as returned by `storage.createTable`).

***

### table.insert(partition, row, data, callback)

Inserts the key/value pairs specified in `data` into the table using the supplied `partition` and `row` keys.  Boolean, Number, String and DateTime datatypes supported -- Number currently defaults to `Edm.Double`.

### table.del(partition, row, callback)

Removes the table data at the supplied `partition` and `row` keys.

### table.query(criteria).all(callback)

Executes the specified query and invokes the callback with an array of results.

### table.query(criteria).forEach(callback, doneCallback)

Executes the specified query and invokes `callback` for each row in the results and (optionally) `doneCallback` with the count of rows when done.  Errors are sent to `callback` or `doneCallback` (if provided).  Both callback and doneCallback expect 'err' as their first parameter.

# TODO

* Finish table, add blob and queue API's
* Management API's
* AppFabric API's
