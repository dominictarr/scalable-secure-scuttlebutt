
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

## gossip broadcast with lazymode

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
