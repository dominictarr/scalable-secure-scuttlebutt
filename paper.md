
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
are short due connections to hub. It's highly likely that
someone you know follows any given celebrity.

## comparison of replication algorithms.

starting with the simplest, develop models of data replication.
I basically just made up the O() notations...
maybe this should be based on simulations instead?
especially since some of my arguments depend on a certain factor
being limited somewhat (by the nature of networks)

## polled scan: (RSS) Really Simple Syndication

A user subscribes to a feed, and periodically requests
that from the peer (server). At each request, the entire
feed is downloaded. This is extremely simple to implement
at the server end (providing a xml file over http is sufficient)
and slightly more complex at the client end (clients would
need to diff new results with old results to decide
whether new content has arrived).

Since this design redownloads all the messages each time a feed
is polled, the amount of bandwidth needed scales badly.

bandwidth needed:

`O(poll_frequency * feeds_subscribed * messages_per_feed)`

To manage the bandwidth, clients reduce availability by polling
infrequently (making this system unsuitable for real time
communication) or not sending all messages on each poll ruining
eventually consistency (making this system more difficult to reason
about). If the number of feeds_subscribed is very large (hundreds
or thousands) then poll frequency needs to be diminished futher.

RSS also only serves feeds one at a time, necitating a network
connection for each poll.

connections needed:

`O(poll_frequency * feeds_subscribed)`

This also has the disadvantage that
popular publishers are not in control of how much bandwidth they
use. It's common for regular people to suddenly become very popular
("going viral") so if all subscribers poll a publisher that
could suddenly be very expensive for them.

## append-only poll

Instead of sending all messages per poll, the requester
gives the sequence number (or timestamp) of the latest message
they know, and the sender only sends messages in that feed
that are greater than that sequence. This adds a fixed overhead
to each poll, but means that each message is only sent once to each peer.

bandwidth needed:

`O(poll_frequency * feeds_subscribed + messages_per_feed)`

The connections needed are the same as polled scan.

## append-only gossip (scuttlebutt)

In a gossip protocol, messages are passed along from peer to peer,
without needing to go from publisher to subscriber directly.
Instead of requesting one feed at a time, and giving a sequence number,
instead request a "vector clock" - a map of `{feeds:sequences,...}`

This doesn't change the bandwidth complexity, but removes `feeds_subscribed`
from the connections complexity.

`O(poll_frequency)`

In amazon dynamo, this protocol design is used to replicate
membership information within a cluster of dynamo nodes.
The peers run inside a trusted enviroment, and all peers replicate
all other peers. To add a peer to the network, that peer just
needs to know any other peer. It's not necessary to inform
any master node, and the cluster is highly resilient.

Since peers pass on messages for other peers, it is not necessary
for a publisher to be online at all times. subscribers can receive
messages from any other peer that has them. Popular content
could be distributed by it's fans to each other, flattening the
bandwidth and connection complexity for publishers.

## append-only gossip with request skipping

In append-only gossip, a {id,sequence} pair is sent for every
subscription, on every connection. because of the power law assumption,
on most connections few of the feeds will have updated.
The probability of not seeing any new messages in a poll
increases with poll_frequency. In request skipping,
a peer remembers the maximum sequence for each feed requested
by a peer and stores it. When they reconnect with that peer,
if they do not know about a more recent message for that feed,
they do not request it. The remote peer also does this,
and if they do have a newer message, they will include it in their
vector clock, and the the local peer sends a partial clock,
with their sequence number and the remote sends the new messages.

On the first connection between two peers, each peers sends a
full vector clock, but on subsequent connections, they send
far smaller clocks, because of the power law assumption.

O(messages + peers*feeds_subscribed + poll_frequency/messages )

If peers connected to each other fully randomly across the entire
network, then peers*feed_subscribed would become a large factor.
But instead of connecting randomly, we follow the tendency for
local connections and only replicate with peers socially close,
thus `peers` can be sufficiently low that this design
scales very well for replicating social feeds.
`poll_frequency` is now divided my `messages` because on very
high poll_frequencies, a peer will send a {id:sequence} for each
additional message, but lower `poll_frequencies` will get many
messages for a single clock element.

because the local connections assumption keeps `peers` low,
and the power law assumption means most requests can be skipped,
this ends up no worse than fixed overhead per message.

> note, the remote clock is not updated when you _send_ a message,
> only when you _receive_ one, because only know a peer really
> received that message if they tell you (which is the purpose
> that the vector clock handshake serves)

## broadcast

It is obviously desirable that a communication network would
carry messages quickly. For human to human text communication,
latency within a few seconds is usually sufficient. However,
most of the above replication strategies would be unviable
with `poll_frequency` of a few seconds. Instead, instead of
simple polling we make connections - when a new connection
is formed we receive and old messages, via the above polling
algorithms, but then we "stay on the line", and if our peer
receives any additional messages they send those too.
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
peers) the chance that the network is fully connected rapidly
approaches 1 when K is greater than 2. For the network to broadcast a message,
when a peer receives a message, if it is a new message, they send it to all their connected peers except the peer they received the message from.
Consider a network with 3 peers and 2 connections each. A creates
a new message and transmits a message to B and C, and B and C then
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
but the average case decreases much quicker and the (bandwidth)
inefficiency increases fastest.
With K=2, nearly 3 times as many messages as necessary are sent.
and with K=5, nearly 9 times too many messages are sent!

If we prune the redundant connections, we could get low latency
without bandwidth overhead. However, since a pure spanning
tree has no redundency it's also very fragile.

## spanning trees

EBT + request skipping. EBT is optimization for long lived
connections.

# singleton hub

to this point, most social networks have been implemented
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




























































