# ClusterAtlas

## Deployment and frontend status

The original zero-argument contract deployment, public source fixture and GitHub Pages site exist. The constructor is recorded as finalized with successful execution; the wallet business lifecycle has **not** been verified live. This application remains an AI-assisted experimental prototype with synthetic public inputs, no real-world decision or adoption claim.

| Recorded public fact | Value |
| --- | --- |
| Network | GenLayer Studio, chain 61999 |
| Contract | `0x3cB07E202CFA03F3174080c101a63b923fC79515` |
| Constructor arguments | `[]` |
| Constructor transaction | `0xcab161b68c9aa7f5fbe6a0e839016cd85783e75012c2384fa972d3ffafdcbe73` |
| Contract source SHA-256 | `f56d06d4803c636ff0b7c17f6e56c22813833086ee92670ebca1256df3d86a14` |
| Repository | [https://github.com/everyprovin/cluster-atlas](https://github.com/everyprovin/cluster-atlas) |
| Earlier published repository commit | `102996a33f43479b37594a5b9fe95bc8a2c9a849` |
| Website | [https://everyprovin.github.io/cluster-atlas/](https://everyprovin.github.io/cluster-atlas/) |
| Exact public synthetic fixture | [Immutable source](https://raw.githubusercontent.com/everyprovin/cluster-atlas/ee331c9e9b1ddfa0f5847ef38f793dc045bcb026/profile05/projects/cluster-atlas/fixtures/metric.json) |
| Exact fixture SHA-256 | `148da86a05d5abe5b229a43612e84a6dec174fab8bb29358b5fdb8450b46560a` |

The [constructor deployment record](evidence/constructor-deployment-record-001.json) preserves the original observed evidence and its field names. Constructor success and an existing hosted page do not establish lock → derive → confirm success, a current certificate, revocation, real users or an accepted contribution. No new constructor deployment is required by the frontend compatibility changes.

A metric validator and canonical minimum-spanning-tree explorer with interactive single-linkage thresholds.

This is one complete original GenLayer Project: contract, independent validator, interactive frontend, original MIT synthetic fixtures, tests and reproducible evidence. Do not count its bundled contract separately as an Intelligent Contract contribution.

## What the project does

The bundled five-point metric yields Dune-Elm 1, Amber-Birch 2, Birch-Coral 3, Coral-Dune 4, total MST weight 10. At threshold 2 the components are [Amber,Birch], [Coral], [Dune,Elm].

ClusterAtlas checks a complete integer metric, including every triangle inequality, then computes canonical Kruskal edges ordered by distance, left ID and right ID. The threshold slider groups points through tree edges no longer than the threshold. Ring positions are only a display layout; they are not embeddings of the supplied distances.

All feature names and point labels are fictional, non-PII and public. The application makes no real infrastructure changes and no claims about real people, similarity, roads or resource allocation. Source bytes and a deterministic derivation are the only certified facts.

## Contract API

The constructor takes **zero arguments**. Use GenVM **v0.2.12**, runner `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`. All writes require the original owner. Record identifiers are unique permanently.

| Method | Behavior |
| --- | --- |
| `lock_source(record_id, source_url, source_sha256)` | Fetch exact pinned bytes and validate full schema; store LOCKED revision 0. |
| `derive(record_id, expected_revision)` | Independently fetch and recompute; store DERIVED revision 1. |
| `confirm(record_id, expected_revision)` | Independently fetch and recompute again, compare complete source/result and bind a certificate to chain, contract, record, owner and source; store CONFIRMED revision 2. |
| `revoke(record_id, expected_revision, reason)` | Terminal revocation from any unrevoked stage, increments revision; does not need network access. |
| `get_record(record_id)` | Return an actual decoded dictionary containing stage, owner, revision, source, result and evidence. |
| `get_configuration()` | Return protocol and resource bounds. |
| `components(record_id, threshold)` | Require a derived tree and integer threshold 0..1000000; return canonical sorted components. |

Source schema and bounds are specified in DESIGN.md. Unknown fields, duplicate keys and IDs, invalid types and resource bounds are rejected. Downloaded responses must be HTTP 200 and 1..32768 bytes, and byte SHA-256 must match. The byte bound is checked after download; it is not a bandwidth or redirect control. Validators independently fetch, validate and recompute the entire bound packet. They reject forged binding, result and changed-byte proposals. No LLM is used.

## Current frontend and verification

Frontend revision 002 uses the unchanged official `genlayer-js@1.1.8`, the Stable Studio method-key ABI and actual dictionary views. Writes use zero transaction value, the intended account, exact target and chain 61999. The application performs no hosted worker or automatic real-world action.

Public SDK/provider/RPC failures use fixed UNVERIFIED diagnostics rather than exception text. Receipt data is projected only after the complete original SDK/raw proof succeeds. Every supplied SDK leader list must contain exactly one successful leader; missing SDK fields remain missing and never replace the independent raw proof. A final provider-identity check prevents a replaced provider from being adopted during connection. Record, address or wallet context changes clear receipt display, and late callbacks cannot leave an old receipt beside a different loaded record.

The exact local revision passed **137 frontend tests**, TypeScript and Vite. The recorded pinned contract SDK suite passed **34 tests**. [Fresh independent peer review](evidence/frontend-stable-revision-002/independent-review.json) separately reran this package’s full frontend suite and rebuilt matching assets; across its four-package scope it also executed 112 focused boundary checks. These checks use fictional DOM/provider/RPC I/O and real production modules with the installed official SDK. They are offline verification, not live wallet or network consensus evidence. No real credentials were used.

The application preserves one underlying wallet mutation per submission. An unknown result, including an error before a hash is available, blocks another send. Public observation metadata stays in session storage; reconnect the original account and observe the original transaction, or attach its exact wallet-activity hash if it was missing. Only a confirmed first actual wallet rejection clears an unsubmitted intent. Removing browser storage or using another tab cannot preserve a local replay guard.

Earlier verification files and revision notes describe local checks at their recorded time. The original bundled `fixtures/source.json` still contains its test locator and a null `public_url`; that unchanged test metadata is not a claim that the separately published fixture above is absent. The UI intentionally starts without a deployment address. Enter the recorded contract and the exact pinned fixture URL/digest to inspect that deployment. Local edits and JSON export do not publish source or mutate chain state.

An earlier wallet attempt on this hosted origin was canceled after a security warning. Compatibility fixes and local peer review do not prove a warning false or constitute approval to bypass it. No completed live business wallet flow, live certificate/revocation, independent human operation, adoption, payment, award or accepted Project submission is claimed.

## Reproduce locally

From this package directory, install the pinned Python dependencies and run `python tools/verify.py`. This exercises the direct GenVM SDK, validators and schema/semantic checks with controlled public inputs. Then:

```powershell
Set-Location frontend
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

The Vite SDK bundle emits a size notice above 500 kB before compression. The prototype certifies only the declared synthetic source and deterministic model. Public web hosting, direct SDK tests, constructor execution and business lifecycle verification are distinct evidence categories.
