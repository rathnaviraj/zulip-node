'use strict';

var querystring = require('querystring'),
    request = require('request'),
    EventEmitter = require('events').EventEmitter,
    util = require('util');


function Client(email, apiKey) {
  // Call the EventEmitter constructor on this
  EventEmitter.call(this);

  this.email = email;
  this.apiKey = apiKey;  
  this.urls = {
    users: 'https://api.zulip.com/v1/users',
    sendMessage: 'https://api.zulip.com/v1/messages',
    register: 'https://api.zulip.com/v1/register',
    events: 'https://api.zulip.com/v1/events'
  };
  
  this.streamMessageCallbacks = [];
  this.privateMessageCallbacks = [];
  this.presenceCallbacks = [];
  this.queueId = null;
  this.lastEventId = -1;
}

// Inherit the EventEmitter prototype
util.inherits(Client, EventEmitter);


Client.prototype.onPresence = function(callback) {
  this.presenceCallbacks.push(callback);
};
Client.prototype.onPrivateMessage = function(callback) {
  this.privateMessageCallbacks.push(callback);
};
Client.prototype.onStreamMessage = function(callback) {
  this.streamMessageCallbacks.push(callback);
};


Client.prototype.handlePresence = function(event) {
  for(var i=0, len=this.presenceCallbacks.length; i<len; i++) {
    this.presenceCallbacks[i](event);
  }
};

Client.prototype.handlePrivateMessage = function(event) {
  for(var i=0, len=this.privateMessageCallbacks.length; i<len; i++) {
    this.privateMessageCallbacks[i](event.message);
  }
};

Client.prototype.handleStreamingMessage = function(event) {
  for(var i=0, len=this.streamMessageCallbacks.length; i<len; i++) {
    this.streamMessageCallbacks[i](event.message);
  }
};


Client.prototype.sendMessage = function(type, to, subject, content, callback, errback) {
  request.post(this.urls.sendMessage, {
    json:true,
    auth: { user: this.email, pass: this.apiKey },
    form: {
      type: type,
      to: to,
      subject: subject,
      content: content
    }
  }, function(err, resp, json) {
    if(!err && resp.statusCode == 200) {
      callback(json);
      //{ msg: '', result: 'success', id: 13164733 }
    }
    else {
      errback(err);
    }
  });
};


Client.prototype.sendStreamMessage = function(to, subject, content, callback, errback) {
  this.sendMessage('stream', to, subject, content, callback, errback);
};


Client.prototype.sendPrivateMessage = function(to, content, callback, errback) {
  this.sendMessage('private', to, null, content, callback, errback);
};


Client.prototype.registerQueue = function(opts) {
  var self = this;

  if (!opts) {
    opts = {};
  }
  
  request.post(this.urls.register, {
    json: true,
    auth: { user: this.email, pass: this.apiKey },
    form: opts,
  }, function(err, resp) {
    if (err || resp.statusCode !== 200)
      return self.emit('error', err);

    self.queueId = resp.queue_id;
    self.lastEventId = resp.last_event_id;
    self.emit('registered', resp.body);
  });
};


Client.prototype.getUsers = function(callback, errback) {
  request.get(this.urls.users, {
    json: true,
    auth: {
      user: this.email,
      pass: this.apiKey
    },
  }, function(err, resp, json) {
    if(!err && resp.statusCode == 200) {
      callback(json);
    }
    else {
      errback(err);
    }
  });
};


Client.prototype.getEvents = function(dontBlock, callback, errback) {
  var url, qs = '';
  var qsObj = {
    queue_id: this.queueId,
    last_event_id: this.lastEventId
  };
  
  if(!!dontBlock) {
    qsObj.dont_block = dontBlock;
  }
  
  qs = querystring.stringify(qsObj);
  url = [this.urls.events, qs].join('?');
  
  var self = this;
  
  request.get(url, {
    json: true,
    auth: { 
      user:self.email,
      pass:self.apiKey
    }
  }, function(err, resp, json) {
    var events = null;
    var event = null;
    
    if(!err && resp.statusCode == 200) {
      events = json.events;

      for(var i=0, len=events.length; i<len; i++) {
        event = events[i];
        switch(event.type) {
          case 'presence':
            self.handlePresence(event);
            break;
          case 'message':
            if ('private' === event.message.type) {
              self.handlePrivateMessage(event);
            }
            else {
              self.handleStreamingMessage(event);
            }
            break;
        }
      }
      
      // set lastEventId
      if(events.length > 0) {
        self.lastEventId = events[events.length -1].id;
      }
      
      callback(json);
      
    }
    else {
      console.log(json);
      errback(err);
    }
  });
};


module.exports = Client;
