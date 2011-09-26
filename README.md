# node-azure
A node.js library for accessing the Windows Azure REST API's.

## Usage

```javascript
var storage = require('azure').storage({account: 'account', key: 'key'});

var t = storage.table(tableName);

t.query({'user': 'joe', 'visits': 1, 'isPremium': true}).forEach(function(err, row) {
  
  console.log(row.user + ", " + row.visits + ", " + row.isPremium);
  
}, function(err, count) {
  
  console.log(count + " users matched your query");
  
});
```

See the [tests](node-azure/tree/master/test) for additional examples

## Platform Support

The library can used with both Windows and non-Windows versions of node.js:

![Tests](https://bit.ly/onBj8Q)

## Dependencies

This library depends on:

* [mikeal/request](https://github.com/mikeal/request)
* [felixge/node-dateformat](https://github.com/felixge/node-dateformat)
* [isaacs/sax-js](https://github.com/isaacs/sax-js)
* [caolan/nodeunit](https://github.com/caolan/nodeunit) (for unit tests)

## Install

<pre>
  npm install azure
</pre>

On Windows, manually download the above dependencies and place them in node-azure/node_modules

## Table Storage API

### require('azure').storage(options);

Returns a reference to 'storage' with the supplied options.  Available options include:

* account (required)
* key (required)

### storage.createTable(tableName, callback)

Creates a new table with the supplied `tableName` on this storage account.  `callback` is passed a reference to the newly created table.

### storage.listTables(callback)

Lists all tables in this storage account.  Invokes `callback` with an array of table names.

### storage.removeTable(tableName, callback)

Removes the table specified by `tableName`.

### storage.table(tableName)

Returns a reference to a table (the same as returned by `storage.createTable`).

***

### table.insert(partition, row, data, callback)

Inserts the key/value pairs specified in `data` into the table using the supplied `partition` and `row` keys.  Boolean, Number, String and DateTime datatypes supported -- Number currently defaults to `Edm.Double`.

### table.update(partition, row, data, options?, callback)

Replaces any existing data at the supplied `partition` and `row` keys with the values provided in `data`.  Available options include:

* upsert - When `true`, and no value currently exists at `partition` and `row`, the data will be inserted.  Defaults to `false`.

### table.del(partition, row, callback)

Removes the table data at the supplied `partition` and `row` keys.

### table.filter(criteria).all(callback)

Applies the filter and invokes the callback with an array of results.

### table.filter(criteria).forEach(callback, doneCallback)

Applies the filter and invokes `callback` for each row in the results and (optionally) `doneCallback` with the count of rows when done.  Errors are sent to `callback` or `doneCallback` (if provided).  Both callback and doneCallback expect 'err' as their first parameter.

### table.fields(fieldArray).all(callback)

Returns only the subset of fields specified in fieldArray.  Can be useful for performance and bandwidth purposes.

### A Note about `filter` and `fields`

These are meant to be chained in a fluent API style, for example:

```javascript
table.fields(['firstName','lastName']).filter({'state':'CA}).all(callback);
```

`filter` and `fields` are also optional, so 
```javascript
table.all(callback);
```
is also valid.

## Special Thanks

…to Cerebrata for [Cloud Storage Studio](http://www.cerebrata.com/products/cloudstoragestudio/) - an indispensible tool (along with [fiddler2](http://www.fiddler2.com/fiddler2/)) in the node-azure debugging process!

## TODO

* Finish table, add blob and queue API's
* Management API's
* AppFabric API's
