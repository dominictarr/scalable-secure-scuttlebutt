
# scalable secure scuttlebutt

This is notes on a paper for ssb.

## assumptions about social networks

TODO: find refrences to justify this assumption.

* _power law assumption_: we expect activity to follow a power law.
(a small proportion of users are update very frequently,
a large number, only infrequently)

* _tendency for local connections_: if you are "friends" with a peer
it's likely that another friend is also a friend.

* _hub connections assumption_: short paths to hubs: some users are "hubs", being connected
with a large number of other peers. Paths to even distant users
are short due connections via hubs. It's highly likely that
someone you know follows any given celebrity.

## comparison of replication algorithms.

Starting with the simplest, develop models of data replication.
>I basically just made up the O() notations... maybe this should be based on simulations instead?
especially since some of my arguments depend on a certain factor
being limited somewhat (by the nature of networks)

## polled scan: (RSS) Really Simple Syndication

A publisher creates a feed F, containing N messages `F[0...N]`
Subscribers poll the publishers to which they are subscribed at a a frequency (f)
of their choosing. At each request, the publisher sends the entire feed.
This is extremely simple to implement at the server end (RSS provides an xml file over http)
and slightly more complex at the client end (clients would
need to diff new results with old results to decide
whether new content has arrived). If posts are fairly
infrequent and smallish, text - images are referenced, not included in the response.

Since this design redownloads all the messages each time a feed
is polled, the amount of bandwidth needed scales badly.

bandwith needed for a subscriber,

`O(poll_frequency*subscriptions*average_messages_per_feed)`

and for the publisher,

`O(subscribers*poll_frequency*messages_per_feed)`

Clients may manage their bandwidth costs by reducing poll frequency,
but this also reduces availability, so this design is not suitable for realtime communication.

Since the publisher does not have control over how many subscribers there are,
or what poll frequency they choose, the popular publishers may have significant
bandwidth costs.

In practice, RSS truncates the feed and may not send older messages,
so isn't provably eventually consistent.

Also, this model uses network connection per poll, which is be a
limiting factor for subscribers with large numbers of subscriptions.

the total number of network connections over some time period
is for the subscriber:

`O(poll_frequency * subscribers)`

and the publisher

`O(poll_frequency * subscriptions)`

This also has the disadvantage that
popular publishers are not in control of how much bandwidth they
use. It's common for regular people to suddenly become very popular
("going viral") which if excedes available resources leads to outages,
and thus suddenly popular content can have availability problems.

## append-only poll

Messages in a feed have a total order defined by an always increasing
value such as a sequence number or timestamp.
Instead of sending all messages per poll, the subscriber requests all messages greater
than the sequence number (or timestamp) of the latest message
they currently have. This requires sending on a tiny header (the sequence number)
and the publisher only sends each message to each subscriber once.

Although we can resonably assume that the sequence number is significantly smaller
than a message, `subscribers*poll_frequency` is high enough this can still be significant.

`O(poll_frequency * feeds_subscribed + messages_per_feed)`

The connections needed are the same as polled scan.

For a suddenly popular publisher, many incoming requests can still lead to availability problems,
as the simple number of requests becomes overwhelming.

## append-only gossip (scuttlebutt)

In a gossip protocol, instead of subscribers polling publishers,
"peers" which can be both publisher and subscriber, connect to each other randomly.
On each connection, peers send a map of their subscriptions -> latest sequence for that feed,
and then if either peer has a more recent messages for any given feed, they send them to the other peer.

Since a connection now sends the list of subscriptions,
but only needs to connect to a single peer each poll interval,
more bandwidth is used per connection, but less connections are used.
the overall bandwidth used by a peer is the same as with append-only poll,
but the number of connections is now only `O(poll_frequency)`

Describing the time needed to disseminate a new message to all subscribers
is now more complicated. In the first poll interval, it gets passed to only
a single peer, but in the second poll interval, there are two peers able
to disseminate the message. If they do not connect again, in the 3rd interval
there will be 4 peers, and so on in powers of 2. However, as the number of peers
with a given message increases the chance that two peers already both having the
message increases too, and the rate of disemination decreases. Thus overall rate
of disemination resembles a bell curve. Since calculating the actual rate of disemination
is more complicated, and is affected by practical matters such as the probability that
more that multiple peers connect a particular peer at once, instead of calculating
the time, we take measurements from a simple simulation.

The question of disemination of a single message is the same as flooding gossip.
for a random network with 10,000 peers and each peer creating a connection to one
other peer randomly each interval (so a given peer may receive zero or more incoming connections,
but makes only one out going connection), the total number of intervals needed
to diseminate a single message is very small compared to the number of peers.

```
round, dR, dT
1, 9, 10
2, 51, 61
3, 293, 354
4, 1195, 1549
5, 3903, 5452
6, 3875, 9327
7, 666, 9993
8, 7, 10000
```

In amazon dynamo, this protocol design is used to replicate
membership information within a cluster of dynamo nodes.
The peers run inside a trusted enviroment, and all peers replicate
all other peers. To add a peer to the network, that peer just
needs to know any other peer. It's not necessary to inform
any master node, and the cluster is highly resilient.

This design has a significant advantage with availability.
If a peer that originated a message goes offline, if they
have diseminated a message to at least one other peer that message
will continue to flood the network. If a publisher suddenly
becomes very popular, it will not cost them extra resources,
because it's the other peers which will provide the disemination.

However, this does have the drawback that this design is only
usable in applications were the set of subscribers to any one publisher
are reasonably known. However, I agrue that the probability of sharing
mutual interests and mutual friends is high, this is a reasonable assumption
for social network applications.

## append-only gossip with request skipping

In practice, activity in most datasets follows a power law.
some authors are highly prolific, but most only publish rarely.
Thus, it is likely that when two peers exchange a vector clock in
append-only gossip, the majority of feeds mentioned have not changed.
The chance that no new messages are sent during a connection increases
with poll_frequency.

In request-skipping we introduce an optimization to avoid unnecessary requests.
On each connection & exchange, each peer remembers the maximum sequence number for each feed a
peer requested. The second time any two peers connect and after, each peer compares
their current vector clock with the stored clock for their peer, and only sends the fields
that have changed since the last connection. If of two peers A and B, if A has a new message and
B does not, B will not mention that in their feed, but A will. On receiving A's partial clock,
B will respond with a partial clock containing their current sequence, and A will then know they are ahead.

In the worst case, between two given peers exchanging a single feed,
the first time they connect they both exchange a full vector clock,
and between each subsequent connection one peer receives a new message,
sends an additional vector clock element for that feed, and receives the old
vector clock element in response and then sends the message. Since involves sending
2 vector clock elements per message. However, this can only happen when the poll frequency
is smaller or equal to the message frequency. Since the exchange is two sided,
the maximum number of vector clock elements a peer will send is one per message.
This is a significant improvement over append-only gossip, as the factor becomes message frequency
not poll frequency. poll frequency can be set as high as desired to maximize availability.

It is expected that in practice, message frequency differs greatly by feed.
request skipping saves sending vector clocks elements for infrequently updating
feeds, so a great deal less vector clock elements need be sent than in append-only gossip,
especially when using high poll frequencies.

`O(messages + peers_connected_to*feeds_subscribed + poll_frequency/messages )`

There is now only one multiplicative factor in the bandwidth complexity.
We must send the entire vector clock to each peer that we will connect to,
the first time we connect to them. However, luckily, to get provable eventual
consistency, we do not actually need to connect to every peer. As messages
are relayed, we only need the eventual connections to form a connected graph, not for each peer to eventually connect.
consequently, a value for `peers_connected_to` can be smaller than the whole swarm.

Simulating random networks with varying numbers of random connections, the measured probability that
the graph is fully connected rapidly approaches 1 as the average number of connected peers passes 2.
As the number of edges continues to rise, the distance across the graph (and thus disemination rate)
drops.

```
edges, P(connected), average, stdev
1, 0.05, 57.26, 19.385365614297818
1.1, 0.46, 23.33, 2.549725475418886
1.2, 0.69, 18.1, 1.6763054614240047
1.3, 0.7, 15.08, 1.188949115816149
1.4, 0.8, 13.52, 1.2765578717786399
1.5, 0.91, 12.33, 0.8130805618141443
1.6, 0.9, 11.45, 0.82915619758885
1.7, 0.96, 10.59, 0.8011866199581761
1.8, 0.97, 9.83, 0.6333245613427602
1.9, 0.99, 9.29, 0.4958830507287036
2, 1, 8.72, 0.5306599664568481
3, 1, 6.91, 0.2861817604250792
5, 1, 5.39, 0.48774993593029137
10, 1, 4.59, 0.4918333050943186
20, 1, 4, 0
```

I would suggest using a fixed number of connections per peer in the range 5-10,
this effectively gaurantees a fully connected network, and smaller disemination rate,
without scaling the number of full vector clocks to be sent by very much.

Also note, this design requires storage of vector clocks, so reducing the number
of peers connected to also keeps that within acceptable bounds.

> note, the remote clock is not updated when you _send_ a message,
> only when you _receive_ one, because only know a peer really
> received that message if they tell you (which is the purpose
> that the vector clock handshake serves)

## realtime broadcast

It is obviously desirable that a communication network would
carry messages quickly. For human to human text communication,
latency within a few seconds is usually sufficient. However,
most of the above replication strategies would be unviable
with `poll_frequency` of a few seconds. Instead, of
simple polling we make connections with a longer lifespan -
when a new connection is formed we receive and old messages,
via the above polling algorithms, but then we "stay on the line",
and if our peer receives any additional messages they send those too.
Thus, we our model becomes _sync then broadcast_.

In the non-gossip models, we must eventually connect to every
peer we subscribe to. It would be unviable to hold long term
connections to every peer, as they may number in the thousands,
and the overhead of a each connection would be too much for
most user devices. But with gossip, we can connect to just a small
number of peers at a time and still receive messages from many peers.

## random spanned network

N peers are randomly connected with K out going connections per peer.
(outgoing, because each peer randomly chooses to connect to K other
peers) as discussed in the previous section, the chance that the network
is fully connected rapidly approaches 1 when K is greater than 2.
For the network to broadcast a message,
when a peer receives a message, if they have not already seen this message
 they send it to all their connected peers except the peer they received
the message from. Consider a network with 3 peers and 2 connections each.
A creates a new message and transmits a message to B and C, and B and C then
transmit the message to each other. Thus the message is sent twice
by A and once each by B and C. The total bandwidth used by the
network is 4. Since A creates the message and there are only
two other peers, only the transmissions to B and C are necessary,
but B and C don't know that the other already has the message.

simulating a broadcast in a random network with up to 20 connections
per peer, and measuring hops, average hops, messages transferred

|K|peers|hops|avg|msgs|inefficiency|
|1|1000|14|6.657|999|1|
|2|1000|7|3.657|2981|2.984|
|3|1000|6|2.944|4947|4.952|
|4|1000|5|2.842|6913|6.92|
|5|1000|5|2.605|8861|8.87|
|6|1000|5|2.515|10803|10.814|
|7|1000|4|2.388|12731|12.744|
|8|1000|4|2.361|14671|14.686|
|9|1000|4|2.306|16605|16.622|
|10|1000|4|2.193|18487|18.506|
|11|1000|4|2.201|20357|20.377|
|12|1000|4|2.136|22237|22.259|
|13|1000|4|2.118|24163|24.187|
|14|1000|4|2.118|25993|26.019|
|15|1000|4|2.027|27877|27.905|
|16|1000|4|2.008|29709|29.739|
|17|1000|4|2.046|31567|31.599|
|18|1000|4|1.994|33393|33.426|
|19|1000|4|1.94|35281|35.316|
|20|1000|4|1.933|37135|37.172|

> note, with 1000 peers and one connection we only need to send
999 messages because the first peer is the author of the message
and did not need to send it.

Note, with more than one connection, number of hops (which is
the time taken for the last message to arrive) decreases slowly,
but the average case, time for 50% of the network to receive the message,
decreases much quicker and the (bandwidth)
inefficiency increases fastest.
With K=2, nearly 3 times as many messages as necessary are sent.
and with K=5, nearly 9 times too many messages are sent!

So with a simple flooding design, we pay a lot in bandwidth for reducing latency.

If we were to prune the redundant connections, we could get low latency
without bandwidth overhead. However, since a pure spanning
tree has no redundency it's also very fragile. If one connection close
to the root of the tree (the originator of a message) fails, all downstream
peers will be cut off.

## spanning trees

Epidemic broadcast trees is an algorithim to form a spanning tree from
a random network, but instead of completely removing redundant connections,
they are just moved into a _lazy_ or _pull_ state. When in the lazy state,
only headers (equivalent to vector clock elements) are sent. Which connections
are redundant can be detected by each peer observing the order in which they
first receive a message. And thereafter observing latency. For example, in the
3 node network discussed in the previous section, A transmits a message to B and C,
neither of them have received this message before, so they know that their connection
to A is not redundant. Then, they each receive a second copy of the message from B,C
so they both know that for messages from A, the connection between B-C is redundant.
So, B sends a short message to C asking to disable that connection (for messages from A)
(C also sends a similar request to A). When A broadcasts another message, B and C receive
it directly from A again, but since the redundant connections are disabled, they do not
transmit it again. Instead, they only send a short message, equivalent to a vector clock
element, to indicate they know this message exists. If later, the connection between
A and C breaks, and A broadcasts another message. It will only be received by B.
B then sends the short lazy check to C, who then realizes that this is the first they
have heard about this message - theirfore, B must now be closer to the source than they are.
C then sends a message to rerequest active transmission of messages from A, and B sends
the message to C. (note, reestablishing an active connection takes just one roundtrip)

![redundant messages](./images/redundant.svg)

EBT still sends redundant data, but the notes sent along the redundant connections
are significantly smaller than the messages. Also, if a delay is introduced,
it is not necessary to send a note for every message, but just the latest message.
If several are received in quick succession, only one note needs to be sent.
Also, if a random factor, somewhat greater than round trip time is added,
then 50% of the time the same note is received before it is sent.

For example, B and C receive the message from A at approximately the same time,
if B decides to wait one second, and C waits two seconds, and the note from B to C arrives in
0.1 seconds, C knows that B already knows about that message, and now does not need to send a note back.

# singleton hub

To this point, most social networks have been implemented
along a star shaped network. Essentially one peer that distributes
all messages to all peers. If this was designed around a replication
protocol, a client would use something like the append-only poll,
except they would request the sequence number representing
their own read feed, on each connection they'd request any messages
that have occured since the last connection, but the central server
still has to send the messages.

`O(poll_frequency + messages)`

the central server of course, must pay for a lot of resources

bandwidth:
`O(network_clients*poll_frequency + peers*messages)`
and connections:

`O(network_peers*poll_frequency)`

If a network is successful, network_clients can easily get very very
large. millions or billions of clients.

An ideal centralized network is only slightly more efficient,
but has the problem that a single entity is burdened with the
vast majority of the costs for running the network.

In the optimized decentralized protocol, all peers pay a cost in
proportion to their use (which they did anyway, as clients to a
centralized network), but they also get very significant
reliability gains.

In practice the small difference in overall cost is likely
to be overwhelmed by practical details such as sending updates
to the code or social/political factors such as the feelings
of the users towards the singleton's owners.

It's relative rare that a well implemented centralized system
fails (since they use distributed systems designs, with a wall around it)
but it's very frequent that the parts of the whole system fails in
the last mile. The central hub may still be running, but you cannot
connect to it. Other peers of the network could be in the same room,
all unable to connect because the network has failed, but in a
decentralized gossip network they can still connect to each other.

> move this bit to another section? adapt models for to show




