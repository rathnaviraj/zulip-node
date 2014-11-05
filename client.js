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
    me: 'https://api.zulip.com/v1/users/me',
    messages: 'https://api.zulip.com/v1/messages',
    register: 'https://api.zulip.com/v1/register',
    events: 'https://api.zulip.com/v1/events',
    streams: 'https://api.zulip.com/v1/streams',
    subscriptions: 'https://api.zulip.com/v1/users/me/subscriptions',
    presence: 'https://api.zulip.com/v1/users/me/presence'
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

  request.post(this.urls.messages, {
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
 * @param {Array} [opts.event_types = all] A JSON-encoded array indicating which types of events you're interested in. Values include message, subscriptions, realm_user, pointer
 * @param {Boolean} [opts.apply_markdown = false] Set to “true” if you would like the content to be rendered in HTML format
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
 * Deregisters from a queue
 * @param  {String}   queueId  Queue ID
 * @param  {Function} [callback] Optional callback with (err, response)
 */
Client.prototype.deregisterQueue = function(queueId, callback) {
  var self = this;

  request.del(this.urls.events, {
    json: true,
    auth: {
      user: this.email,
      pass: this.apiKey
    },
    form: {
      queue_id: queueId
    }
  }, function(err, resp, json) {
    if (err) {
      if (callback) callback(err, null);
      return self.emit('error', err);
    }
    else if (resp.statusCode !== 200) {
      if (callback) callback(resp.body.msg, null);
      return self.emit('error', resp.body.msg);
    }

    if (callback)
      callback(null, json);
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
    if (err) {
      callback(err, null);
      return self.emit('error', err);
    }
    else if (resp.statusCode !== 200) {
      callback(resp.body.msg, null);
      return self.emit('error', resp.statusCode + ': ' + resp.body.msg);
    }

    callback(null, json);
  });
};

/**
 * List stream subscriptions
 * @param  {Function} callback Callback with (err, subscriptions)
 */
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

/**
 * Adds or removes stream subscriptions
 * @param  {Object}   opts     Object containing subscription additions and deletions
 * @param {Array} opts.additions Array of streams to subscribe to
 * @param {Array} opts.deletions Array of streams to unsubscribe from
 * @param  {Function} [callback] Optional callback with (err, response)
 */
Client.prototype.updateSubscriptions = function(opts, callback) {
  var self = this,
      form = {},
      additions = opts.additions,
      deletions = opts.deletions,
      qs;

  // We have to do some funky stuff here to transform the arrays into weird query strings

  if (additions) {
    if (!Array.isArray(additions))
      additions = [additions];

    additions = additions.map(function(addition) {
      return '{"name":"' + addition + '"}';
    });

    additions = 'add=[' + additions.join(',') + ']';
  }

  if (deletions) {
    if (!Array.isArray(deletions))
      deletions = [deletions];

    deletions = 'delete=["' + deletions.join(',') + '"]';
  }

  qs = [additions, deletions].join('&');

  request.patch(this.urls.subscriptions, {
    auth: {
      user: this.email,
      pass: this.apiKey
    },
    body: qs
  }, function(err, resp, json) {
    if (err) {
      if (callback) callback(err, null);
      return self.emit('error', err);
    }
    else if (resp.statusCode !== 200) {
      if (callback) callback(resp.body.msg, null);
      return self.emit('error', resp.statusCode + ': ' + resp.body.msg);
    }

    if (callback)
      callback(null, json);
  });
};

/**
 * Gets profile information such as max_message_id, pointer, and client_id
 * @param  {Function} callback Callback with (err, response)
 */
Client.prototype.me = function(callback) {
  var self = this;

  if (!callback)
    return self.emit('error', 'me requires a callback');

  request.get(this.urls.me, {
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

    callback(null, json);
  });
};

/**
 * Sets presence state
 * @param {String}   presence Valid values include 'idle' and 'active'. There may be more but they are missing from the API docs
 * @param {Function} [callback] Optional callback with (err, allPresences)
 */
Client.prototype.setPresence = function(presence, callback) {
  var self = this;

  request.post(this.urls.presence, {
    json: true,
    auth: {
      user: this.email,
      pass: this.apiKey
    },
    form: {
      status: presence
    }
  }, function(err, resp, json) {
    if (err) {
      if (callback) callback(err, null);
      return self.emit('error', err);
    }
    else if (resp.statusCode !== 200) {
      if (callback) callback(resp.body.msg, null);
      return self.emit('error', resp.statusCode + ': ' + resp.body.msg);
    }

    if (callback)
      callback(null, json.presences);
  });
};

/**
 * List members of a stream
 * @param  {String}   stream   Name of stream
 * @param  {Function} callback Callback with (err, members)
 */
Client.prototype.getStreamMembers = function(stream, callback) {
  var self = this,
      url = this.urls.streams + '/' + stream + '/members';

  if (!callback)
    return self.emit('error', 'getStreamMembers requires a callback');

  request.get(url, {
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

    callback(null, json);
  });
};

/**
 * Updates a message subject or content
 * @param  {Object}   opts     Object of update options
 * @param {String | Number} opts.message_id Zulip message ID
 * @param {String} [opts.subject] New message subject
 * @param {String} [opts.content] New message content
 * @param  {Function} [callback] Optional callback with (err, response)
 */
Client.prototype.updateMessage = function(opts, callback) {
  var self = this;

  request.patch(this.urls.messages, {
    json: true,
    auth: {
      user: this.email,
      pass: this.apiKey
    },
    form: opts
  }, function(err, resp, json) {
    if (err) {
      if (callback) callback(err, null);
      return self.emit('error', err);
    }
    else if (resp.statusCode !== 200) {
      if (callback) callback(resp.body.msg, null);
      return self.emit('error', resp.body.msg);
    }

    if (callback)
      callback(null, json);
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
