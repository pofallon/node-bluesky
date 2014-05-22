# node-bluesky
A lightweight, simplified node.js library for accessing Windows Azure storage

This module is available in two forms:  'bluesky', which includes Microsoft's azure library as a dependency, and 'bluesky-lite', which allows you to pass in your own instance of 'azure'.  This second option can be helpful in overcoming file path limits that prevent you from using 'bluesky' directly (for example, when using this with Azure Mobile Services).

## Usage

```javascript
// Default usage
var s = require('bluesky').storage({account: 'account', key: 'key'});

// or, if using bluesky-lite
var azure = require('azure');
var s = require('bluesky-lite').storage({azure: azure, account: 'account', key: 'key'});

// queues, with events
var q = s.queue('happenings');
q.on('message', function(msg, done) {
  console.log(msg);
  done();  // delete the message
});
q.poll(1000);

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

With 'azure' as a dependency (the most common way):

<pre>
  npm install bluesky
</pre>

Without 'azure' as a dependency:

<pre>
  npm install bluesky-lite
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
