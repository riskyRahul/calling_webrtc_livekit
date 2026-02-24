# Production Roadmap (Fastest Path to Meet-Class Architecture)

## Phase 1 (Week 1-2): MVP Webinar
- LiveKit single node + TURN relay.
- Control plane token service with capabilities:
  - `canPublishAudio`, `canPublishVideo`, `canPublishScreen`, `canModerate`, `canRecord`, `canStreamToCDN`
- Data plane socket events:
  - presence, chat, reactions, raise hand, moderation broadcasts
- Roles: host, speaker, audience

## Phase 2 (Week 3-4): Stability + Moderation
- Dynamic subscriptions in clients (only visible participants + speaker).
- Active speaker smoothing logic.
- Room controls: waiting room, room lock, mute/kick/ban.
- Recording worker baseline.

## Phase 3 (Week 5-6): Scale Foundation
- Redis adapter for socket horizontal scale.
- Multi-node LiveKit.
- QoE telemetry pipeline + dashboards.
- Load + chaos tests (packet loss, node restart, TURN failover).

## Phase 4 (Week 7-10): 10K-100K Delivery
- Program feed composition + egress to HLS.
- CDN distribution for viewers.
- Hybrid mode:
  - RTC speakers/moderators
  - CDN viewers
- Moderated Q&A and event operations tooling.

## Definition of done checklist

### Media plane
- [x] Capability-gated publishing model
- [ ] Dynamic subscription in clients
- [ ] Simulcast/dynacast client wiring
- [ ] Screen share priority policies

### Control plane
- [x] Token endpoint with capabilities
- [x] Role promotion/demotion
- [x] Waiting room + lock room toggles
- [x] Moderation endpoints

### Data plane
- [x] Chat + reactions + raise hand events
- [x] Basic spam/rate limit controls
- [x] Presence broadcast

### Infrastructure
- [x] Docker Compose dev stack
- [x] K8s baseline manifests
- [x] TURN configuration scaffold
- [x] Monitoring stack scaffold
- [ ] CI/CD pipeline
- [ ] Mongo backup + recording retention policy
