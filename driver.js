var Client = require('./client.js');


client = new Client(
    'paul-bot@students.hackerschool.com', 
    'bOaIQperQhvdeG1UeYG973Dp9qJDwNrF');

// client.sendStreamMessage('test-bot', 'paulbot', 'hi', 
//   function(resp) {
//     console.log('success');
//     console.log(resp);
//   }, function(err) {
//     console.log('error');
//     console.log(err);
//   });
  
// client.sendPrivateMessage('paulwang727@gmail.com', 'hi', 
//   function(resp) {
//     console.log('success');
//     console.log(resp);
//   }, function(err) {
//     console.log('error');
//     console.log(err);
//   });  


client.getEvents('1385217399:1049', -1, false, 
  function(resp) {
    console.log('succes');
    console.log(resp);
  }, function(err) {
    console.log('error');
    console.log(err);
  });