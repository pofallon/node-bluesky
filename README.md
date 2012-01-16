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

<table>
  <tr><th>Production</th><th>Testing only</th></tr>
  <tr>
    <td>[bentomas/node-mime](/bentomas/node-mime)</td>
    <td>[caolan/nodeunit](/caolan/nodeunit)</td>
  </tr>
  <tr>
    <td>[broofa/node-uuid](/broofa/node-uuid)</td>
    <td>[JSBizon/memorystream](/JSBizon/memorystream)</td>
  </tr>
  <tr>
    <td>[documentcloud/underscore](/documentcloud/underscore)</td>
    <td>[pofallon/loremipstream](/pofallon/loremipstream)</td>
  </tr>
  <tr>
    <td>[felixge/node-dateformat](/felixge/node-dateformat)</td>
    <td></td>
  </tr>
  <tr>
    <td>[isaacs/sax-js](/isaacs/sax-js)</td>
    <td></td>
  </tr>
  <tr>
    <td>[mikeal/request](/mikeal/request)</td>
    <td></td>
  </tr>
</table>

## Special Thanks

…to Cerebrata for [Cloud Storage Studio](http://www.cerebrata.com/products/cloudstoragestudio/) - an indispensible tool (along with [fiddler2](http://www.fiddler2.com/fiddler2/)) in the node-bluesky debugging process!

## TODO

* Finish table, add blob and queue API's
* Management API's
* AppFabric API's
