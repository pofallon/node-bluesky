# node-bluesky
A lightweight, high-performance node.js library for accessing Windows Azure

## Usage

```javascript
var s = require('bluesky').storage({account: 'account', key: 'key'});

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

See the [tests](node-bluesky/tree/master/test) for additional examples, and the [wiki](node-bluesky/wiki) for API documentation and a Road Map.

## Install

<pre>
  npm install bluesky
</pre>

## Platform Support

The library can used with both Windows and non-Windows versions of node.js

## Dependencies

This library depends on:

* [mikeal/request](https://github.com/mikeal/request)
* [felixge/node-dateformat](https://github.com/felixge/node-dateformat)
* [isaacs/sax-js](https://github.com/isaacs/sax-js)
* [JSBizon/memorystream](https://github.com/JSBizon/memorystream)
* [caolan/nodeunit](https://github.com/caolan/nodeunit) (for unit tests)

## Special Thanks

…to Cerebrata for [Cloud Storage Studio](http://www.cerebrata.com/products/cloudstoragestudio/) - an indispensible tool (along with [fiddler2](http://www.fiddler2.com/fiddler2/)) in the node-bluesky debugging process!

## TODO

* Finish table, add blob and queue API's
* Management API's
* AppFabric API's
