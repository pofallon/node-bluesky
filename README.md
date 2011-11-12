# node-azure
A node.js library for accessing the Windows Azure REST API's.

## Usage

```javascript
var s = require('azure').storage({account: 'account', key: 'key'});

// queues, with events
var q = s.queue('happenings');
q.on('message', function(m) {
  console.log(m.body);
});
q.poll(10000);

// blobs, as streams
var c1 = s.container('new');
var c2 = s.container('old');
c1.get('readme.txt').pipe(c2.put('archive.txt'));

// and tables, oh my! 
var t = s.table('folks');
t.filter({'user': 'joe', 'visits': 1, 'isPremium': true}).forEach(function(err, row) {
  console.log(row.user + ', ' + row.visits + ', ' + row.isPremium);
});

// * Note that blob support is only preliminary and still needs work
```

See the [tests](node-azure/tree/master/test) for additional examples

## Platform Support

The library can used with both Windows and non-Windows versions of node.js:

![Tests](http://bitly.com/tv2uOx)

## Dependencies

This library depends on:

* [mikeal/request](https://github.com/mikeal/request)
* [felixge/node-dateformat](https://github.com/felixge/node-dateformat)
* [isaacs/sax-js](https://github.com/isaacs/sax-js)
* [JSBizon/memorystream](https://github.com/JSBizon/memorystream)
* [caolan/nodeunit](https://github.com/caolan/nodeunit) (for unit tests)
## Install

<pre>
  npm install azure
</pre>

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

* upsert - When `true`, and no row currently exists at `partition` and `row`, the data will be inserted.  Defaults to `false`.

### table.del(partition, row, callback)

Removes the table data at the supplied `partition` and `row` keys.

### table.fields(fieldArray)

Defines a subset of fields to be returned from a query, specified in fieldArray.  Can be useful for performance and bandwidth purposes.

### table.filter(criteria)

Applies a filter to the rows that will be returned from a query.

### table.all(callback)

Applies any `fields` or `filters` and invokes `callback` with an array of the results.

### table.forEach(callback, doneCallback)

Applies any `fields` or `filters` and invokes `callback` for each row in the results and (optionally) `doneCallback` with the count of rows when done.  (Errors are sent to `callback`, or `doneCallback` if provided.  Both callback and doneCallback expect 'err' as their first parameter.)

### A Note about 'table' methods

`filter` and `field` are meant to be chained with `all` or `forEach` in a fluent API style, for example:

```javascript
table.fields(['firstName','lastName']).filter({'state':'CA'}).forEach(callback, doneCallback);
```

## Special Thanks

…to Cerebrata for [Cloud Storage Studio](http://www.cerebrata.com/products/cloudstoragestudio/) - an indispensible tool (along with [fiddler2](http://www.fiddler2.com/fiddler2/)) in the node-azure debugging process!

## TODO

* Finish table, add blob and queue API's
* Management API's
* AppFabric API's
