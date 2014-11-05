# zulip-node

Zulip API bindings for node.js. Includes most of the available API calls, though the API docs from Zulip are quite sparse.

Available API docs are [here](https://gist.github.com/vitosamson/6c596975c68122f95f38)

## Example

Here's an example of registering a queue and polling for messages:

```js
var zulip = require('zulip-node'),
    client = new zulip(process.env.ZULIP_EMAIL, process.env.ZULIP_API_KEY);

client.registerQueue({
  event_types: ['message']
}, true);

client.on('registered', function() {
  console.log('registered');
})
.on('message', function(msg) {
  // only message events will be received here
})
.on('event', function(evt) {
  // all queue events will be received here
})
.on('error', function(err) {
  console.error(err);
});
```

## Credit

This project was forked from [paulvstheworld/zulip-node](https://github.com/paulvstheworld/zulip-node).

---

<a name="Client"></a>
#class: Client
Client constructor

**Members**

* [class: Client](#Client)
  * [new Client(email, apiKey)](#new_Client)
  * [client.sendMessage(opts, [callback])](#Client#sendMessage)
  * [client.sendStreamMessage(opts, callback)](#Client#sendStreamMessage)
  * [client.sendPrivateMessage(opts, callback)](#Client#sendPrivateMessage)
  * [client.registerQueue(opts, [watch], [watchOpts])](#Client#registerQueue)
  * [client.deregisterQueue(queueId, [callback])](#Client#deregisterQueue)
  * [client.getUsers(callback)](#Client#getUsers)
  * [client.getEvents([watchOpts])](#Client#getEvents)
  * [client.getStreams(callback)](#Client#getStreams)
  * [client.getSubscriptions(callback)](#Client#getSubscriptions)
  * [client.updateSubscriptions(opts, [callback])](#Client#updateSubscriptions)
  * [client.me(callback)](#Client#me)
  * [client.setPresence(presence, [callback])](#Client#setPresence)
  * [client.getStreamMembers(stream, callback)](#Client#getStreamMembers)
  * [client.updateMessage(opts, [callback])](#Client#updateMessage)
  * [event: "registered"](#Client#event_registered)
  * [event: "error"](#Client#event_error)
  * [event: "event"](#Client#event_event)
  * [event: "message"](#Client#event_message)
  * [event: "presence"](#Client#event_presence)

<a name="new_Client"></a>
##new Client(email, apiKey)
**Params**

- email `string` - Zulip account address  
- apiKey `string` - Zulip API key  

<a name="Client#sendMessage"></a>
##client.sendMessage(opts, [callback])
Send a message

**Params**

- opts `Object` - Message options per https://zulip.com/api/endpoints/  
  - type `String` - One of {private, stream}  
  - content `String` - The content of the message. Maximum message size of 10000 bytes.  
  - to `String` - In the case of a stream message, a string identifying the stream. In the case of a private message, a JSON-encoded list containing the usernames of the recipients.  
  - subject `String` - The topic for the message (Only required if type is “stream”). Maximum length of 60 characters.  
- \[callback\] `function` - Optional callback function with (err, results) params  

<a name="Client#sendStreamMessage"></a>
##client.sendStreamMessage(opts, callback)
Send a stream message

**Params**

- opts `Object` - Message options per https://zulip.com/api/endpoints/  
  - content `String` - The content of the message. Maximum message size of 10000 bytes  
  - to `String` - A string identifying the stream.  
  - subject `String` - The topic for the message. Maximum length of 60 characters.  
- callback `function` - Optional callback function with (err, results) params  

<a name="Client#sendPrivateMessage"></a>
##client.sendPrivateMessage(opts, callback)
Send a private message

**Params**

- opts `Object` - Message options per https://zulip.com/api/endpoints/  
  - content `String` - The content of the mssage. Maximum message size of 10000 bytes.  
  - to `String` - A JSON-encoded list containing the usernames of the recipients.  
- callback `function` - Optional callback function with (err, results) params  

<a name="Client#registerQueue"></a>
##client.registerQueue(opts, [watch], [watchOpts])
Register to receive Zulip events

**Params**

- opts `Object` - Register options per https://zulip.com/api/endpoints/  
  - \[event_types=all\] `Array` - A JSON-encoded array indicating which types of events you're interested in. Values include message, subscriptions, realm_user, pointer  
  - \[apply_markdown=false\] `Boolean` - Set to “true” if you would like the content to be rendered in HTML format  
- \[watch=false\] `Boolean` - If true, will automatically poll for events  
- \[watchOpts\] `Object` - Optional set of options to be passed to getEvents while polling  

<a name="Client#deregisterQueue"></a>
##client.deregisterQueue(queueId, [callback])
Deregisters from a queue

**Params**

- queueId `String` - Queue ID  
- \[callback\] `function` - Optional callback with (err, response)  

<a name="Client#getUsers"></a>
##client.getUsers(callback)
Gets a list of all Zulip users in the realm

**Params**

- callback `function` - Callback function with (err, users) params  

<a name="Client#getEvents"></a>
##client.getEvents([watchOpts])
Gets events from the subscribed queue

**Params**

- \[watchOpts\] `Object` - Optional set of options to override defaults  
  - \[queueId=this.queueId\] `String` - The ID of a queue that you registered via registerQueue().  
  - \[lastEventId=this.lastEventId\] `String` - The highest event ID in this queue that you've received and wish to acknowledge.  
  - \[dontBlock=false\] `String` - set to “true” if the client is requesting a nonblocking reply. If not specified, the request will block until either a new event is available or a few minutes have passed, in which case the server will send the client a heartbeat event.  

<a name="Client#getStreams"></a>
##client.getStreams(callback)
Gets a list of all public streams

**Params**

- callback `function` - Callback function with (err, streams) properties  

<a name="Client#getSubscriptions"></a>
##client.getSubscriptions(callback)
List stream subscriptions

**Params**

- callback `function` - Callback with (err, subscriptions)  

<a name="Client#updateSubscriptions"></a>
##client.updateSubscriptions(opts, [callback])
Adds or removes stream subscriptions

**Params**

- opts `Object` - Object containing subscription additions and deletions  
  - additions `Array` - Array of streams to subscribe to  
  - deletions `Array` - Array of streams to unsubscribe from  
- \[callback\] `function` - Optional callback with (err, response)  

<a name="Client#me"></a>
##client.me(callback)
Gets profile information such as max_message_id, pointer, and client_id

**Params**

- callback `function` - Callback with (err, response)  

<a name="Client#setPresence"></a>
##client.setPresence(presence, [callback])
Sets presence state

**Params**

- presence `String` - Valid values include 'idle' and 'active'. There may be more but they are missing from the API docs  
- \[callback\] `function` - Optional callback with (err, allPresences)  

<a name="Client#getStreamMembers"></a>
##client.getStreamMembers(stream, callback)
List members of a stream

**Params**

- stream `String` - Name of stream  
- callback `function` - Callback with (err, members)  

<a name="Client#updateMessage"></a>
##client.updateMessage(opts, [callback])
Updates a message subject or content

**Params**

- opts `Object` - Object of update options  
  - message_id `String` | `Number` - Zulip message ID  
  - \[subject\] `String` - New message subject  
  - \[content\] `String` - New message content  
- \[callback\] `function` - Optional callback with (err, response)  

<a name="Client#event_registered"></a>
##event: "registered"
**Properties**

- response `Object` - Contains the response from the Zulip API  

<a name="Client#event_error"></a>
##event: "error"
**Properties**

- err `Object` | `String` - Either an object returned from another call or a description of the error  

<a name="Client#event_event"></a>
##event: "event"
**Properties**

- event `Object` - Contains all details of an event received from Zulip  

<a name="Client#event_message"></a>
##event: "message"
**Properties**

- message `Object` - Contains message details  

<a name="Client#event_presence"></a>
##event: "presence"
**Properties**

- event `Object` - Contains presence event details  


