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
  this.rateLimit = null;
  this.watchInterval = null;
}

// Inherit the EventEmitter prototype
util.inherits(Client, EventEmitter);


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


Client.prototype.registerQueue = function(opts, watch, watchOpts) {
  var self = this;

  if (!opts) {
    opts = {};
  }

  request.post(this.urls.register, {
    json: true,
    auth: { user: this.email, pass: this.apiKey },
    form: opts,
  }, function(err, resp, json) {
    if (err)
      return self.emit('error', err);
    else if (resp.statusCode !== 200)
      return self.emit('error', resp.statusCode + ': ' + resp.body.msg);

    self.rateLimit = resp.headers['x-ratelimit-limit'];
    self.queueId = json.queue_id;
    self.lastEventId = json.last_event_id;
    self.emit('registered', json);

    if (watch) {
      watchOpts = watchOpts || {};

      // Assuming the rate limit is per minute
      var interval = Math.floor(self.rateLimit / 60) * 1000;
      self.watchInterval = setInterval(function() {
        self.getEvents(watchOpts);
      }, interval);
    }
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


Client.prototype.getEvents = function(watchOpts) {
  var qsObj = {
    queue_id: watchOpts.queueId || this.queueId,
    last_event_id: watchOpts.lastEventId || this.lastEventId,
    dont_block: watchOpts.dontBlock || false
  };
  
  var qs = querystring.stringify(qsObj),
      url = [this.urls.events, qs].join('?');

  var self = this;

  request.get(url, {
    json: true,
    auth: { 
      user:self.email,
      pass:self.apiKey
    }
  }, function(err, resp, json) {
    if (err)
      return self.emit('error', err);
    else if (resp.statusCode !== 200)
      return self.emit('error', resp.statusCode + ': ' + resp.body.msg);
    
    var events = json.events;

    events.forEach(function(event) {
      self.emit('event', event);

      switch (event.type) {
        case 'message':
          self.emit('message', event.message, event.message.type);
          break;
        case 'presence':
          self.emit('presence', event);
          break;
      }
    });

    // set lastEventId
    if(events.length > 0) {
      self.lastEventId = events[events.length -1].id;
    }
  });
};


module.exports = Client;
