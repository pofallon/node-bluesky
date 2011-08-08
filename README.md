# azurejs #
A node.js library for accessing the Windows Azure REST API's.

## Usage

See the [tests](azurejs/tree/master/test) for examples

# API

## Storage > Table

### storage.createTable(account, key, tableName, callback)

Creates a new table with the supplied `tableName` on the specified `account`.  `callback` is passed an instance of `Table` representing the newly created table.

### storage.listTables(account, key, callback)

Lists all tables in the specified `account`.  Invokes `callback` with an array of table names.

### storage.removeTable(account, key, tableName, callback)

Removes the table specified by `tableName`.

*** 

### var table = new Table(account, key, tableName)

Creates a new instance of the `Table` object (the same as returned by `storage.createTable`).

### table.insert(partition, row, data, callback)

Inserts the key/value pairs specified in `data` into the table using the supplied `partition` and `row` keys.  (Boolean, Number, String and DateTime datatypes supported -- Number currently defaults to Edm.Double)

### table.del(partition, row, callback)

Removes the table data at the supplied `partition` and `row` keys.

### table.query(criteria)

Returns a ResultSet object representing the appropriate query.  Currently supports only tests for equality (i.e. no greater than, etc. yet).  Note that the REST call isn't actually made until a method on the ResultSet is invoked.

### resultset.all(callback)

Invokes the callback with an array of results.  (Currently does not support paging through results via the REST API.)

# TODO

* Finish table, add blob and queue API's
* Management API's
* AppFabric API's
