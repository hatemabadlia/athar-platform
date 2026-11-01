# Privacy design (in the spirit of Law 18-07)

> This document describes engineering measures. It does **not** certify legal compliance. The operating organisation has to (1) get a legal review and (2) complete the declaration or authorisation with the national personal-data protection authority (ANPDP) before processing real personal data.

## Personal data inventory

| Data | Table | Sensitive? | Purpose | Who can read it | Retention |
|---|---|---|---|---|---|
| Email | `auth.users` | no | login | the person; staff only through `find_user_by_email` when granting roles | until account deletion |
| Display name, wilaya, skills, availability | `profiles` | no | matching, certificates | the person; moderators of their wilaya | until deletion |
| Phone | `profile_private` | personal | crisis SMS (opt-in), in-kind contact after acceptance | the person; system jobs (service role) | until deletion or removal |
| Blood type | `profile_private` | **health data** | compatible blood alerts (separate consent) | the person only; system matching counts | until removed, consent revoked, or account deleted |
| Donor registry, donations | `blood_donors`, `blood_donations` | health | donor notifications | the person only | until they leave the registry or delete the account |
| Alert text and contact phone | `alerts`, `alert_contacts`, `intake_*` | may contain personal data | coordinating help | text: public after approval (no phone); phone: owner, moderators of the wilaya (audited), volunteers who joined | resolved alerts stay as history; owner link removed on account deletion |
| Participation / attendance | `alert_volunteers`, `attendance` | no | hours, points, certificates | the person, the alert owner or club lead, moderators | until deletion |
| Tree photos | Storage `tree-photos` | location (stripped) | verification | owner and moderators; public after approval | until deletion |
| Association documents | Storage `association-docs` | organisational | verification | applicant and moderators of the wilaya | until deletion |
| Beneficiary identifier | **not stored** | yes | dedupe | — | only an HMAC is stored, deleted 90 days after the campaign ends |
| AI logs | `ai_runs` | masked | audit of automated decisions | ministry only | input stored only as a hash; phone numbers and normalised text masked |
| Audit log | `audit_log` | actor IDs | accountability | ministry; DJSL for their wilaya | keep (accountability) |

## Consent

`consents` records purpose, version and timestamp, plus revocation:
- `public_submission`: the checkbox on `/submit`, stored against the intake item.
- `terms`: on profile save.
- `blood_data`: a separate explicit checkbox before blood type is stored. Revoked automatically when the value is removed.
- `sms_alerts`: opt-in on the profile.
- `donor_registry`: on joining the donor network.
- `contact_share`: implicit in the "I can help" confirmation, where the checkbox explains that the owner and moderators will see the participation.

## Minimisation and access

- Public map points are wilaya centroids (`location_precision = 'wilaya'`). People's precise locations are never published. Tree locations are rounded to about 100 m.
- Phone numbers are never part of public alert queries. They live in `alert_contacts` behind RLS and the `get_alert_contact` RPC, which audits staff reads.
- Phone numbers used for matching are compared as keyed HMACs (`ATHAR_HMAC_SECRET`), never as plain hashes.
- EXIF metadata is removed from photos by re-encoding in the browser before upload. GPS and date are sent separately as moderation signals.
- Beneficiary dedupe stores `HMAC(secret, "beneficiary:" + normalised ID)` per season. It reveals only "already served this season", never which organisation served the family.

## Rights

- **Access**: `/profile → تنزيل بياناتي` (`export_my_data()`, JSON).
- **Rectification**: profile editing. For alerts, moderators correct the extracted fields.
- **Erasure**: `request_account_deletion()` starts a 14-day grace period, then `private.purge_due_accounts()` runs daily. Deleting the auth user cascades to personal rows. Alerts remain, unlinked (needed for other people's history). Aggregates stay anonymous.
- **Withdraw consent**: remove the blood type, disable SMS, or leave the donor registry.

## Security measures

TLS (deployment), RLS on every table, column-level grants, security-definer RPCs with explicit authorisation, private storage buckets with signed URLs, a webhook signature check on every inbound channel, a Postgres-backed rate limiter, Turnstile for anonymous forms, CSP and security headers, and an audit log.

## Known gaps (to fix before processing real data)

- The legal review and ANPDP declaration aren't done (organisational).
- `intake_items.raw_text` for unlocated messages is visible to all staff nationally until the pipeline sets a wilaya.
- No automatic retention limit yet for `intake_items` raw text after processing (proposal: purge raw text 12 months after the linked alert closes).
- The offline outbox stores unsent submissions in the device's `localStorage` until sync.
