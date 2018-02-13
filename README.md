# Scalable Secure Scuttlebutt

* @dominictarr

* scuttlebutt.nz

---

# Scuttlebutt

"anti-entropy" gossip protocol, part of amazon dynamo

* "flow control for anti-entropy protocols"
* eventually consistent
* used by within a trusted system

---

# Secure Scuttlebutt

* peer id is public key
* data model signed hash chains
* peers can relay other's messages
* cannot insert, modify, or reorder messages
* large objects in optional "attachments"

---

* subscribe ("follow") model solves sybil attacks
* provides social discovery
* messages arrive in natural order - easy to build database on top of

---

# Scalable Secure Scuttlebutt

* optimized for bandwidth and latency
* overhead proportional to feeds updated

---

# part 1: network topology

---

# Star Network

naive design: connect to everyone

---

``` js_exe
return require('./demos').centralized()
```

---

# Random Network

* connect to N > 2 peers ~= fully connected
* tradeoff between bandwidth & latency

---

``` js_exe
return require('./demos').random()
```

---

# Rules for gossip flooding

send _new_ messages to everyone that didn't send it to you

(don't resend messages you already know!)

---

# message passing diagram

![message passing diagram](./message-passing2.jpg)

---

# bandwidth complexity

```
O(messages*(spanning+2*redundant))
```
---

# how many redundant connections

* 1: 0%
* 2: 66%
* 3: 80%
* 4: 86%
* 5: 89%
* 10: 95%

at 5 connections per peer, we use 9 times as much bandwidth
---

# Spanning Tree Network

remove duplicate connections

* when you receive an old message, disable that connection
* bandwidth complexity now approaches O(messages)

---

``` js_exe
return require('./demos').spanning()
```

---

# trees are fragile

``` js_exe
return require('./demos').fragile()
```


---

# spanning tree

* network partitions are really easy
* we just added many points of failure!

---

# Epidemic Broadcast Trees

* (from paper with the same name)

* best of flooding and spanning
* we run a separate tree per feed
---

# Eager and Lazy (aka push and pull)

* connections have two modes: **eager** and **lazy**
* switch redundant connections into **lazy**
* **eager** mode pushes message immediately
* **lazy** mode sends short _note_ that message exists

---

* if you receive a known message, ask them to be **lazy**
* (if in **lazy** mode, just send a short note)
* if you receive a note for a new message,
  switch connection back to **eager**

---

![switching back to eager](./repair-lazy.jpg)

---

# state per feed

* feed id (string)
* local sequence (integer)
* remote sequence (integer)
* local request (integer)
* remote request (integer)
* local mode (boolean)
* remote mode (boolean)

---

# part 2: handshakes

---

# basic vector clock

(as described in flow gossip paper)

```
Alice: {A: 1, B: 0, C: 3}

Bob:   {A: 0, B: 1, C: 3}
```
alice sends A1, Bob sends B1
handshake size is O(feeds)

---

# skipping vector clock

Alice stores Bob's last vector clock

```
Alice (local): {A: 2, B: 2, C: 3}

Bob (stored):  {A: 0, B: 1, C: 3}
```
drops elements which havn't changed
(Carol hasn't updated)

---

> Note: Alice stores Bob's A:0
  even though she sent A1.
  unless Bob acknowledges A1,
  Alice doesn't know for sure he has it.

---

# so Alice sends:

```
Alice: {A: 2, B: 2}

Bob: {A: 1, B: 3}
```
Alice sends A2, Bob sends B3

---
# if Bob then gossips with Carol

```
Alice: {}

Bob:   {C: 4}
```

Alice sends an empty clock,
because she thinks nothing has
changed
---
# but Bob has an update from Carol

``` js
Alice: {C: 3}
```
and Bob sends C4

so, it costs one more message pass,
but usually saves lots of requests.

> note, we also save tracking this in memory

---

# distribution of updates

* power law is typical
* a few active users
* some moderate users
* many occasional / infrequent users

---

* basic scuttlebutt

  O(messages + feeds)

* scalable scuttlebutt

  O(messages + updated_feeds)

  (updated_users is probably much smaller)

  reconnections are very cheap!

---


# complexity overview

bandwidth: O(messages + updated_feeds)

latency: replication in 1 or 2 round trips

---

# Part 3: Comparison to IPFS

---

* replicate data without global consistency
* secure scuttlebutt optimizes for chains
* this is worst case for ipfs

---

* ssb streams updates in order, per feed
* ipfs has pointer to latest message
  then works backwards, one message at a time

---

* ipfs better for arbitary partial datasets
* ssb better for social applications
* ssb: database vs ipfs: file system

---

# Thank you!

* learn more: https://scuttlebutt.nz
* frontend: https://github.com/ssbc/patchwork
* backend: https://github.com/ssbc/scuttlebot

---





