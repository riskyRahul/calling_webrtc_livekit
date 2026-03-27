# Meet-Class Webinar Platform Starter (Next.js + Flutter + Node + LiveKit)

This repository is a **production-oriented starter architecture** for building a Google-Meet-class webinar stack with:

- **Media plane**: LiveKit SFU + TURN
- **Control plane**: Node.js token + policy service
- **Data plane**: Socket.IO presence/chat/reactions with rate limits
- **State**: Redis + MongoDB
- **Infra**: Docker Compose for dev, Kubernetes manifests for production baseline
- **Ops**: Prometheus + Grafana scaffolding

## What is implemented now

- Control plane API with capability-based token issuing.
- Room lifecycle + moderation APIs (lock/unlock, waiting room toggle, promote/demote).
- Data plane socket gateway for chat, reactions, raise-hand, moderation fanout.
- Built-in abuse controls (message rate limiting / temporary mute).
- Local stack orchestration via Docker Compose.
- Baseline K8s manifests for control/data plane and Redis.
- Production roadmap and implementation checklist.

## Project layout

```text
services/
  control-plane/        # Token + policy + room governance API
  data-plane/           # Socket gateway, presence, chat, reactions
infra/
  docker-compose.yml    # Local full stack
  livekit.yaml          # LiveKit config
  coturn/turnserver.conf
  k8s/                  # Baseline deployment manifests

docs/
  PRODUCTION_ROADMAP.md
```

## Quick start

1. (Optional) Copy env files if you want to override defaults:

```bash
cp services/control-plane/.env.example services/control-plane/.env
cp services/data-plane/.env.example services/data-plane/.env
```

2. Start local stack:

```bash
docker compose -f infra/docker-compose.yml up --build
```

3. Endpoints:

- Control plane: `http://localhost:4000`
- Data plane: `http://localhost:5000`
- LiveKit: `ws://localhost:7880`
- Grafana: `http://localhost:3001`

## Immediate next sprint

- Add Next.js web client with LiveKit SDK and dynamic subscription logic.
- Add Flutter client with active-speaker stage UX and adaptive stream controls.
- Wire Mongo persistence for room/member moderation audit logs.
- Add CI/CD (lint, tests, image build, security scan, deploy).
- Add egress pipeline for HLS/CDN broadcast.

See [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) for phased execution.
