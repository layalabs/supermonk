# Contributing

The remote lives on the Buzz relay. Channel membership of
`#cosmolocal-hackathon-team-1` (`da5ac59f-2150-484d-9966-a48be862bfc7`) is the only
access control — there is no separate git login. Auth is NIP-98: git signs each request
with your Buzz key via `git-credential-nostr`.

## One-time setup

```sh
git clone https://lotf.communities.buzz.xyz/git/21b3b4451fd4cf7d8c3ddfa8b5cdc7eb56b3f7a2887c8cd19af039533989b5b0/cosmolocal-hackathon-team-1
```

Requires **git >= 2.46** (Apple's `/usr/bin/git` 2.39 cannot run the credential helper).
If git asks for a username, you are on the wrong git or have no helper configured.

## The loop: local change -> remote

```sh
git switch -c <yourname>/<topic>        # never commit on main
# ...edit, test...
git add <specific files>                 # no 'git add .'
git commit -m "Short imperative subject"
git push -u origin <yourname>/<topic>    # branch push, main stays clean
```

Then open a pull request so the branch is reviewable in Buzz Desktop and in the channel:

```sh
buzz pr open \
  --repo-owner 21b3b4451fd4cf7d8c3ddfa8b5cdc7eb56b3f7a2887c8cd19af039533989b5b0 \
  --repo-id cosmolocal-hackathon-team-1 \
  --subject "What this changes" \
  --body-file - \
  --commit $(git rev-parse HEAD) \
  --merge-base $(git merge-base origin/main HEAD) \
  --branch-name <yourname>/<topic> \
  --clone https://lotf.communities.buzz.xyz/git/21b3b4451fd4cf7d8c3ddfa8b5cdc7eb56b3f7a2887c8cd19af039533989b5b0/cosmolocal-hackathon-team-1 \
  --channel da5ac59f-2150-484d-9966-a48be862bfc7
```

`buzz pr open` returns a `link` (`buzz://`). Post that link verbatim in the channel —
Buzz Desktop renders it as a card that opens the PR.

Push follow-up commits to the same branch, then record the new tip:

```sh
git push
buzz pr update --repo-owner 21b3b4451fd4cf7d8c3ddfa8b5cdc7eb56b3f7a2887c8cd19af039533989b5b0 --repo-id cosmolocal-hackathon-team-1 \
  --pr <pr-event-id> --pr-author <your-hex> --commit $(git rev-parse HEAD) --clone https://lotf.communities.buzz.xyz/git/21b3b4451fd4cf7d8c3ddfa8b5cdc7eb56b3f7a2887c8cd19af039533989b5b0/cosmolocal-hackathon-team-1
```

## Merging

Buzz has no server-side merge button. A reviewer (or the author, after approval in the
channel) merges locally and pushes `main`:

```sh
git switch main && git pull
git merge --no-ff <yourname>/<topic>
git push origin main
buzz pr status --pr <pr-event-id> --repo-owner 21b3b4451fd4cf7d8c3ddfa8b5cdc7eb56b3f7a2887c8cd19af039533989b5b0 \
  --repo-id cosmolocal-hackathon-team-1 --status merged
```

## What the relay enforces

| Action | Minimum role |
| --- | --- |
| Clone / fetch | channel member |
| Create a branch or tag | channel member |
| Fast-forward push to any branch (incl. `main`) | channel member |
| Force push (non-fast-forward) | channel admin |
| Delete a branch or tag | channel admin |

Bots added to the channel push as members. Nothing stops a member from pushing straight to
`main` by default — the PR flow above is the team's convention, not a relay lock. The repo
owner can make it a lock by adding `buzz-protect` rules to the repository announcement.
