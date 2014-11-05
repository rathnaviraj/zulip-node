'use strict';

var querystring = require('querystring'),
    request = require('request'),
    EventEmitter = require('events').EventEmitter,
    util = require('util');

/**
 * @class  Client constructor
 * @param {string} email  Zulip account address
 * @param {string} apiKey Zulip API key
 */
function Client(email, apiKey) {
  // Call the EventEmitter constructor on this
  EventEmitter.call(this);

  this.email = email;
  this.apiKey = apiKey;  
  this.urls = {
    users: 'https://api.zulip.com/v1/users',
    sendMessage: 'https://api.zulip.com/v1/messages',
    register: 'https://api.zulip.com/v1/register',
    events: 'https://api.zulip.com/v1/events',
    streams: 'https://api.zulip.com/v1/streams',
    subscriptions: 'https://api.zulip.com/v1/users/me/subscriptions'
  };
  this.queueId = null;
  this.lastEventId = -1;
}

// Inherit the EventEmitter prototype
util.inherits(Client, EventEmitter);

/**
 * Send a message
 * @param  {Object}   opts     Message options per https://zulip.com/api/endpoints/
 * @param {String} opts.type One of {private, stream}
 * @param {String} opts.content The content of the message. Maximum message size of 10000 bytes.
 * @param {String} opts.to In the case of a stream message, a string identifying the stream. In the case of a private message, a JSON-encoded list containing the usernames of the recipients.
 * @param {String} opts.subject The topic for the message (Only required if type is “stream”). Maximum length of 60 characters.
 * @param  {Function} [callback] Optional callback function with (err, results) params
 */
Client.prototype.sendMessage = function(opts, callback) {
  var self = this;

  request.post(this.urls.sendMessage, {
    json:true,
    auth: { user: this.email, pass: this.apiKey },
    form: opts
  }, function(err, resp, json) {
    if (err) {
      self.emit('error', err);

      if (callback)
        return callback(err, null);
    }
    else if (resp.statusCode !== 200) {
      self.emit('error', resp.statusCode + ': ' + resp.body.msg);
      if (callback)
        return callback(true, null);
    }

    if (callback)
      callback(null, json);
  });
};

/**
 * Send a stream message
 * @param  {Object}   opts     Message options per https://zulip.com/api/endpoints/
 * @param {String} opts.content The content of the message. Maximum message size of 10000 bytes
 * @param {String} opts.to A string identifying the stream.
 * @param {String} opts.subject The topic for the message. Maximum length of 60 characters.
 * @param  {Function} callback Optional callback function with (err, results) params
 */
Client.prototype.sendStreamMessage = function(opts, callback) {
  opts.type = 'stream';

  this.sendMessage(opts, callback);
};

/**
 * Send a private message
 * @param  {Object}   opts     Message options per https://zulip.com/api/endpoints/
 * @param {String} opts.content The content of the mssage. Maximum message size of 10000 bytes.
 * @param {String} opts.to A JSON-encoded list containing the usernames of the recipients.
 * @param  {Function} callback Optional callback function with (err, results) params
 */
Client.prototype.sendPrivateMessage = function(opts, callback) {
  opts.type = 'private';

  this.sendMessage(opts, callback);
};

/**
 * Register to receive Zulip events
 * @param  {Object} opts      Register options per https://zulip.com/api/endpoints/
 * @param {Array} event_types A JSON-encoded array indicating which types of events you're interested in. Values include message, subscriptions, realm_user, 
 * @param  {Boolean} [watch = false]     If true, will automatically poll for events
 * @param  {Object} [watchOpts] Optional set of options to be passed to getEvents while polling
 */
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

    if (watch)
      self.getEvents(true, watchOpts);

  });
};

/**
 * Gets a list of all Zulip users in the realm
 * @param  {Function} callback Callback function with (err, users) params
 */
Client.prototype.getUsers = function(callback) {
  var self = this;

  if (!callback)
    return self.emit('error', 'getUsers requires a callback');

  request.get(this.urls.users, {
    json: true,
    auth: {
      user: this.email,
      pass: this.apiKey
    },
  }, function(err, resp, json) {
    if(!err && resp.statusCode == 200) {
      return callback(null, json);
    }
    else {
      callback(err, null);
    }

    if (err) {
      self.emit('error', err);
      return callback(err, null);
    }
    else if (resp.status !== 200) {
      self.emit('error', resp.statusCode + ': ' + resp.body.msg);
      return callback(resp.body, null);
    }
  });
};

/**
 * Gets events from the subscribed queue
 * @param  {Object} [watchOpts] Optional set of options to override defaults
 * @param {String} [watchOpts.queueId = this.queueId] The ID of a queue that you registered via registerQueue().
 * @param {String} [watchOpts.lastEventId = this.lastEventId] The highest event ID in this queue that you've received and wish to acknowledge.
 * @param {String} [watchOpts.dontBlock = false] set to “true” if the client is requesting a nonblocking reply. If not specified, the request will block until either a new event is available or a few minutes have passed, in which case the server will send the client a heartbeat event.
 */
Client.prototype.getEvents = function(watch, watchOpts) {
  watchOpts = watchOpts || {};

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

    // set lastEventId
    if(events.length > 0) {
      self.lastEventId = events[events.length -1].id;
    }

    if (watch) {
      var rateLimit = resp.headers['x-ratelimit-limit'] || 120,
          interval = Math.floor(rateLimit / 60) * 1500;

      setTimeout(function() {
        self.getEvents(true, watchOpts);
      }, interval);
    }

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
  });
};

/**
 * Gets a list of all public streams
 * @param  {Function} callback Callback function with (err, streams) properties
 */
Client.prototype.getStreams = function(callback) {
  var self = this;

  if (!callback)
    return self.emit('error', 'getStreams requires a callback');

  request.get(this.urls.streams, {
    json: true,
    auth: {
      user: this.email,
      pass: this.apiKey
    }
  }, function(err, resp, json) {
    if (err)
      return self.emit('error', err);
    else if (resp.statusCode !== 200)
      return self.emit('error', resp.statusCode + ': ' + resp.body.msg);

    callback(null, json);
  });
};

Client.prototype.getSubscriptions = function(callback) {
  var self = this;

  if (!callback)
    return self.emit('error', 'getSubscriptions requires a callback');

  request.get(this.urls.subscriptions, {
    json: true,
    auth: {
      user: this.email,
      pass: this.apiKey
    }
  }, function(err, resp, json) {
    if (err) {
      callback(err, null);
      return self.emit('error', err);
    }
    else if (resp.statusCode !== 200) {
      callback(resp.body.msg, null);
      return self.emit('error', resp.statusCode + ': ' + resp.body.msg);
    }

    callback(null, json.subscriptions);
  });
};


module.exports = Client;

/**
 * @event Client#registered
 * @property {Object} response Contains the response from the Zulip API
 */

/**
 * @event Client#error
 * @property {Object|String} err Either an object returned from another call or a description of the error
 */

/**
 * @event Client#event
 * @property {Object} event Contains all details of an event received from Zulip
 */

/**
 * @event Client#message
 * @property {Object} message Contains message details
 */

/**
 * @event Client#presence
 * @property {Object} event Contains presence event details
 */
