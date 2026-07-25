# API Coverage — Vercel, Convex and Cloudflare launch integrations

> Full coverage by default. Opt-outs are explicit, reasoned decisions. This
> matrix covers the external service capabilities exercised by Phase 7; it
> does not expose account identifiers, keys, passwords or guest data.

| capability | decision | reason |
|---|---|---|
| Vercel project create/link to the GitHub repository | INTEGRATE | |
| Vercel production branch selection (`main`) | INTEGRATE | |
| Vercel repository-owned build/output/rewrite settings | INTEGRATE | |
| Vercel Preview environment variable scope | INTEGRATE | |
| Vercel Production environment variable scope | INTEGRATE | |
| Vercel Preview deployment and public URL | INTEGRATE | |
| Vercel Production deployment and public `.vercel.app` URL | INTEGRATE | |
| Vercel custom-domain add/verify for apex and `www` | INTEGRATE | |
| Vercel primary-domain and apex redirect configuration | INTEGRATE | |
| Vercel TLS/domain-health status | INTEGRATE | |
| Vercel promotion/instant rollback | INTEGRATE | |
| Vercel runtime/build logs needed for sanitized smoke diagnosis | INTEGRATE | |
| Compare live DNS to sanitized Vercel-displayed apex/www targets | INTEGRATE | Plan 07-04 creates a failing verifier; no historical target is hardcoded |
| Vercel Analytics, Speed Insights and monitoring add-ons | OPT-OUT | not required to launch or verify the v1 |
| Vercel team/member/billing administration | OPT-OUT | outside the repository deployment scope |
| Convex Preview deploy key and isolated Preview deployments | INTEGRATE | |
| Convex Production deploy key and Production deployment | INTEGRATE | |
| Convex chained deploy with injected `VITE_CONVEX_URL` | INTEGRATE | |
| Convex Production environment variable names/set operations | INTEGRATE | |
| Convex Production function/schema deployment | INTEGRATE | |
| Convex Production logs/usage needed for sanitized smoke diagnosis | INTEGRATE | |
| Convex manual Production backup including file storage | INTEGRATE | |
| Convex backup download and checksum verification | INTEGRATE | |
| Convex restore into Production during launch | OPT-OUT | restore is last-resort incident recovery, not a launch test |
| Convex raw table import for the guest CSV | OPT-OUT | it would bypass protected domain validation and reporting |
| Convex project/team/billing administration | OPT-OUT | unrelated to deployment and launch verification |
| Cloudflare DNS record inventory | INTEGRATE | |
| Cloudflare apex A record create/update | INTEGRATE | |
| Cloudflare `www` CNAME create/update | INTEGRATE | |
| Cloudflare DNS-only proxy state | INTEGRATE | |
| Cloudflare unrelated NS/MX/TXT/CAA record mutation | OPT-OUT | explicitly outside scope and must be preserved |
| Cloudflare nameserver change | OPT-OUT | existing authoritative nameservers are locked |
| Cloudflare proxy/CDN/WAF enablement for the website | OPT-OUT | Vercel terminates TLS and serves traffic in the chosen design |
| Cloudflare Redirect Rules | OPT-OUT | Vercel is the single redirect engine |
| Cloudflare Workers, Pages, R2, email and account administration | OPT-OUT | unrelated to this Vercel-hosted v1 launch |

## Plan ownership after revision

- **07-03 — Vercel/Convex link, isolated environments, production deploy and
  backup:** prerequisite for domain publication.
- **07-04 — Cloudflare/Vercel domains, executable DNS/TLS/HTTP gate and rollback
  drill:** publication core.
- **07-05 — Protected real-list import/review and Gate E:** resumes independently
  when the CSV exists; blocks invitation disclosure only.
- **07-06 — Physical iOS/Android/WebView/HEIC/timezone/admin matrix:** resumes
  independently when hardware exists; does not block publication or 07-05.
