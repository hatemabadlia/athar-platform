# Competitive advantage

**What judges will have seen 30 times:** a volunteer marketplace, a map of needs, a chatbot, a dashboard with charts.

**What they likely haven't seen:** a tool that **sits on top of the WhatsApp/Facebook chaos people already use** and tells them, with evidence, whether to share a post, plus a human, wilaya-level safety net and verified real-world outcomes.

## Ranked differentiators (1–5 each; higher is better, and for time, higher = faster)

| Idea | Status today | Innov. | Judge appeal | Impact | Feasible | Time | Demo | Total |
|---|---|---|---|---|---|---|---|---|
| **"Is this post real?" checker** (explainable, 5 verdicts) | ✅ built | 5 | 5 | 5 | 5 | 5 | 5 | **30** |
| **Transparent verification timeline per request** (received → AI → moderator → volunteers → confirmed → resolved, from `audit_log` + `alert_sources`) | data exists, no UI | 4 | 5 | 4 | 4 | 4 | 5 | **26** |
| **Three-level trust badge** (AI / moderator / confirmed on the ground) | partial labels | 4 | 5 | 4 | 5 | 5 | 4 | **27** |
| **QR-verified mission** (join a help request → QR check-in on site → certificate) | QR exists for clubs only | 4 | 4 | 4 | 4 | 4 | 5 | **25** |
| **Live compatible-donor alert on a second phone** | ✅ built | 3 | 5 | 5 | 5 | 5 | 5 | **28** |
| **Wilaya humanitarian intelligence** (needs vs available volunteers/donors per wilaya, gaps highlighted) | stats exist, no gap view | 4 | 4 | 4 | 4 | 3 | 4 | **23** |
| **"Update, not duplicate" detection** | ❌ | 4 | 3 | 3 | 4 | 4 | 3 | 21 |
| Semantic duplicate detection (embeddings) | code exists, inactive | 3 | 3 | 3 | 4 | 3 | 2 | 18 |
| Volunteer reputation / history | points exist | 2 | 3 | 3 | 4 | 3 | 2 | 17 |
| Recycled **image** detection | ❌ | 5 | 5 | 4 | 2 | 1 | 4 | 21 (too slow before the hackathon) |

## The five highest-value improvements (selected)
1. **Verification timeline + three-level trust badge** on every request and on `/check`. It turns the invisible depth (audit log, sources, moderation) into a visible "trust story".
2. **QR-verified mission for help requests.** Close the loop from post → verified request → volunteer on site → confirmed → certificate, in one coherent story. The backend already supports `activity.alert_id`.
3. **Fix the demo data so matching looks smart** (canonical skills), and pre-stage the demo story's data.
4. **Real-data evaluation** (60–100 real public posts, labelled by someone else), then put the measured number on one slide.
5. **Wilaya gap view on `/impact`**: "Oran: 12 open blood requests, 3 compatible donors registered". Turns the dashboard into decision support for the ministry (the buyer).

**Deliberately not now:** image fingerprinting, Telegram/WhatsApp live bots, SMS, full French. All are good roadmap slides, not pre-hackathon work.
