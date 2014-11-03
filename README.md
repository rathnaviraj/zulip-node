zulip-node
=====

Zulip API for node.js


## API Reference
<a name="Client"></a>
#class: Client
Client constructor

**Members**

* [class: Client](#Client)
  * [new Client(email, apiKey)](#new_Client)
  * [client.sendMessage(opts, [callback])](#Client#sendMessage)
  * [client.sendStreamMessage(opts, callback)](#Client#sendStreamMessage)
  * [client.sendPrivateMessage(opts, callback)](#Client#sendPrivateMessage)
  * [client.registerQueue(opts, event_types, [watch], [watchOpts])](#Client#registerQueue)
  * [client.getUsers(callback)](#Client#getUsers)
  * [client.getEvents([watchOpts])](#Client#getEvents)

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
##client.registerQueue(opts, event_types, [watch], [watchOpts])
Register to receive Zulip events

**Params**

- opts `Object` - Register options per https://zulip.com/api/endpoints/  
- event_types `Array` - A JSON-encoded array indicating which types of events you're interested in. Values include message, subscriptions, realm_user,  
- \[watch=false\] `Boolean` - If true, will automatically poll for events  
- \[watchOpts\] `Object` - Optional set of options to be passed to getEvents while polling  

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


