# node-bluesky
A lightweight, simplified node.js library for accessing Windows Azure storage

## Usage

```javascript
var s = require('bluesky').storage({account: 'account', key: 'key'});

// queues, with events
var q = s.queue('happenings');
q.on('message', function(msg, done) {
  console.log(msg);
  done();
});
q.poll(10000);

// blobs, as streams
var c1 = s.container('new');
var c2 = s.container('old');
c1.get('readme.txt').pipe(c2.put('archive.txt'));

// and tables, oh my! 
var t = s.table('folks');
t.filter({'isPremium': true}).rows().on('data', function(err, row) {
  console.log(row.user + ', ' + row.visits + ', ' + row.isPremium);
});

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

* [bentomas/node-mime](/bentomas/node-mime)
* [broofa/node-uuid](/broofa/node-uuid)
* [documentcloud/underscore](/documentcloud/underscore)
* [JSBizon/memorystream](/JSBizon/memorystream)
* [WindowsAzure/azure-sdk-for-node](/WindowsAzure/azure-sdk-for-node)

... and for unit tests:

* [caolan/nodeunit](/caolan/nodeunit)
* [pofallon/loremipstream](/pofallon/loremipstream)

## Special Thanks

…to Cerebrata for [Cloud Storage Studio](http://www.cerebrata.com/products/cloudstoragestudio/) - an indispensible tool (along with [fiddler2](http://www.fiddler2.com/fiddler2/)) in the node-bluesky debugging process!
