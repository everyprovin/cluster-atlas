# ClusterAtlas

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

## Reproduce locally

Run commands **inside this package directory**; gltest owns its current-working-directory `artifacts` folder. With Python 3.12, create a local environment and install `requirements.txt`, then run:

```powershell
python tools/verify.py
Set-Location frontend
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

`tools/verify.py` executes actual pinned SDK/storage/validator tests and official semantic/lint/schema checks. `tests/conftest.py` only works around upstream Windows fd0 file cleanup and warp metadata refresh; no contract logic is stubbed. HTTP responses are controlled test inputs. Direct tests do not prove network multi-validator consensus, gas cost or deployment. `python tools/verify_frontend.py` records frontend test, TypeScript and Vite exit codes and hashes.

## Public source and deployment setup

`fixtures/source.json` separates `test_url` from `public_url`. The test locator is explicitly synthetic; **public_url is null**. No contract address is preconfigured. To use an independent deployment, publish **exact original fixture bytes** at an immutable raw GitHub commit URL ending in `/profile05/projects/cluster-atlas/fixtures/metric.json`, verify SHA-256 `148da86a05d5abe5b229a43612e84a6dec174fab8bb29358b5fdb8450b46560a`, deploy `contract.py` with zero arguments on Stable Studio 61999, then enter its real address and the actual source URL in the UI.

The frontend offers local policy/metric edits and JSON export with exact UTF-8 LF byte digest. Exporting does not publish a file or change the chain. Edited previews need their own published bytes and digest. Chain reads validate source and recompute returned results before drawing them. Local previews and loaded chain results are labeled separately.

## Wallet evidence and recovery

The frontend uses actual `genlayer-js@2.0.0-rc.2`, injected MetaMask, actual network/account checks and zero-value writes. The SDK observation is requested at finalized full-transaction state. Studio can omit train execution fields, and the actual viem formatter turns numeric zero into undefined. Regression tests exercise the real SDK helper and formatter on a captured public constructor receipt; this is **not live business-write verification**. Missing fields remain missing.

Before reading updated state, an independent unformatted public `eth_getTransactionByHash` response must match the exact hash, sender, contract and zero value, and report FINALIZED / NORMAL / leader_only=false / MAJORITY_AGREE with exactly one current leader whose execution_result is SUCCESS. Every available SDK execution/binding/status field must agree. Validator IDLE or nonfatal quorum messages do not replace leader evidence. Missing, conflicting or failed evidence remains pending and blocks submission.

Pending address, original account, record ID, method and hash are saved in session storage; no keys or secrets are stored. Reloading the same tab restores observation metadata. Reconnect the original wallet and choose **Observe same transaction**. A network error before the hash is known also blocks replay; attach the exact hash from wallet activity and observe it. Explicit wallet rejection code 4001 clears an unsubmitted operation. The application never automatically retries a write. Browser storage removal or a separate browser session cannot preserve a local guard, so keep the transaction ID.

Busy operations disable all configuration inputs. Both the loaded record and each action are bound to the visible address/record ID; stale async responses are discarded even if a programmatic value change bypasses disabled inputs. Actual page-handler tests cover loading A while the visible ID changes to B.

## Status and limitations

The recorded local suite contains 34 actual SDK tests and 54 frontend tests. All current full-check results and exact source/frontend hashes are in evidence. The frontend builds with a Vite size notice for the real SDK bundle (>500 kB before compression). Browser visual QA, public fixture publication, contract deployment, hosting, live wallet business flow, actual users, financing and awards remain **null / unverified**. Independent peer review is recorded separately. This prototype is not a real-world service or authorization system.
