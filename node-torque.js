// Load the http module to create an http server.
var http = require('http');
var url = require('url');
var fs = require('fs');
var pg = require('pg');
var async = require('async');

var conString = "postgres://torque:torque@192.168.1.217/torque";

// Configure our HTTP server to respond with Hello World to all requests.
var server = http.createServer(function (request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  var url_parts = url.parse(request.url, true);
  var query = url_parts.query;
  var keys = Object.keys(query);
  //The first thing we need to do is save our event and get our eventid
  if ('session' in query && 'time' in query){
    pg.connect(conString, function(err, client, done) {
        if(err) {
          response.end("BAD!");
          done(client);
          return console.error('could not connect to postgres', err);
        }
        client.query("insert into event (session, time) values (cast($1 as bigint), cast($2 as bigint)) returning eventid", [query['session'], query['time']] , function(iErr, iRes){
          if (iErr){
            response.end("BAD!");
            done(client);
            return console.error('error inserting event', err);
          }
          var inserted = iRes.rows[0].eventid;
          
          async.eachLimit(keys, 4, function(dataKey, cb) { 
            if (dataKey.slice(0,1) == "k") {
              client.query("insert into event_data (eventid, name, value) values ((cast($1 as bigint)), $2, (cast($3 as numeric(30,20))))", [inserted, dataKey, query[dataKey]], function(e, r){
                if (e)
                  cb(e);
                else
                  cb();
              });
            } else {
              cb();
            }
          }, 
          function(e, r){
            if (e) {
              response.end("BAD!");
              done(client);
              return console.error('error inserting datapoints', err);
            }
            done();
          });
        });
      response.end("OK!");
    });
  } else {
    response.end("responded bad");
    response.end("BAD!");
  }
});

// Listen on port 8000, IP defaults to 127.0.0.1
server.listen(8000, "192.168.1.217");

console.log("Server running at http://127.0.0.1:8000/");
