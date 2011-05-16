var account = "your_acct_here";
var key = "your_key_here";

var s = require('../lib/azure').storage;

s.listTables(account,key,function(error,tables) {
  
  if (error) {
    console.log("Error: " + error);
  } else {
    console.log(JSON.stringify(tables));
  }
  
});

/* var t = s.table(account,key,"testTable");

var rs = t.query();

rs.all(function(error, results) {
  
  console.log(JSON.stringify(results));
  
}); */

s.table(account,key,"testTable").query().all(function(error, results) {
  console.log(JSON.stringify(results));
});