var querystring = require('querystring');
var request = require('request');


function Client(email, apiKey) {
  this.email = email;
  this.apiKey = apiKey;  
  this.urls = {
    sendMessage: 'https://api.zulip.com/v1/messages',
    register: 'https://api.zulip.com/v1/register',
    events: 'https://api.zulip.com/v1/events'
  }
};

Client.prototype.sendMessage = function(type, to, subject, content, callback, errback) {
  request.post(this.urls.sendMessage, {
    json:true,
    auth: { user:this.email, pass:this.apiKey },
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
      console.log(json);
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


Client.prototype.registerQueue = function(eventTypes, applyMarkdown, callback, errback) {
  var form = {};
  
  // apply optional keys if available
  if (eventTypes) {
    form.event_types = eventTypes
  }
  if (!!applyMarkdown) {
    form.apply_markdown = applyMarkdown
  }
  
  request.post(this.urls.register, {
    json: true,
    auth: { user: this.email, pass: this.apiKey },
    form: form
  }, function(err, resp, json) {
    if(!err && resp.statusCode == 200) {
      callback(json);
    }
    else {
      console.log(json);
      errback(err);
    }
  });
};

Client.prototype.getEvents = function(queueId, lastEventId, dontBlock, callback, errback) {
  var url, qs = '';
  var qsObj = {
    queue_id: queueId,
    last_event_id: lastEventId
  };
  
  if(!!dontBlock) {
    qsObj.dont_block = dontBlock;
  }
  
  qs = querystring.stringify(qsObj);
  url = [this.urls.events, qs].join('?')
  
  request.get(url, {
    json: true,
    auth: { user:this.email, pass:this.apiKey }
  }, function(err, resp, json) {
    if(!err && resp.statusCode == 200) {
      callback(json);
    }
    else {
      console.log(json);
      errback(err);
    }
  });
};


module.exports = Client;