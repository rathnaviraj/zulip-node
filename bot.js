var Sequelize = require('sequelize');
var Client = require('./client.js');

var CLIENT_USER = process.env.USER;
var CLIENT_PASS = process.env.PASS;

var sequelize = new Sequelize('zulip', 'root', '', {
  host: "localhost",
  port: 3306
});

var MessageRequest = sequelize.define('MessageRequest', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  sender: Sequelize.STRING,
  recipients: Sequelize.STRING,
  message: Sequelize.STRING,
  type: Sequelize.INTEGER,
  alarm_time: Sequelize.DATE,
  updated_at: Sequelize.DATE,
  created_at: Sequelize.DATE
});


var client = new Client(CLIENT_USER, CLIENT_PASS);


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



client.onStreamMessage(function(data) {
  console.log('received stream message');
  console.log(data)
});

client.onPrivateMessage(function(data) {
  var messageFrom = data.sender_email;
  var messageFromFullName = data.sender_full_name;
  var messageContent = data.content;
  
  console.log(messageFrom);
  console.log(messageFromFullName);
  console.log(messageContent);
});

client.onPresence(function(data) {
  console.log('received presence change for ' + data.email);
});


var getEvents = function() {
  client.getEvents(true, 
    function(resp) {
      setTimeout(function() {
        getEvents();
      }, 1000);
      
    }, function(err) {
      console.log('ERROR getEvents');
      console.log(JSON.stringify(err));
      
      setTimeout(function() {
        registerQueue();
      }, 1000);
    });
};

var registerQueue = function() {
  client.registerQueue(['message'], false, 
    function(resp) {
      client.queueId = resp.queue_id;
      client.lastEventId = resp.last_event_id;

      getEvents();
    }, 
    function(err) {
      console.log('ERR');
      console.log(err)
    }
  );
};

registerQueue();