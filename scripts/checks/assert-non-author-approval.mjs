// assert-non-author-approval.mjs — reviews-API reduction verdict (GATE-10
// identity step, D-02: the reviews API is the source of truth for approver
// identity; the Approved-by: line in plan.md is audit trail only).
//
// Reduction rules (Q-002 spike, Pitfall 3):
//   1. chronological by submitted_at → group by user.login → keep LATEST per
//      user (an APPROVED superseded by CHANGES_REQUESTED never counts)
//   2. only state === "APPROVED" survives (DISMISSED/COMMENTED/PENDING never
//      count regardless of dismissal mechanics)
//   3. user.type !== "Bot" (T-01-26)
//   4. user.login !== author (defense-in-depth — GitHub itself 422s
//      self-approval, Q-002 Scenario 1)
//   5. STRICT commit binding (Q-002 spike decision, T-01-27): when headSha is
//      provided, commit_id must equal it — mirrors dismiss-stale semantics
//      and keeps the gate safe even if platform-side dismissal has gaps.
//
// Zero npm dependencies — node: builtins only.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Reduce a chronological reviews list to the approving non-author, non-bot
 * logins, latest review per user, optionally commit-bound.
 *
 * @param {Array<object>} reviews  GitHub pulls/N/reviews items
 *   ({ user: { login, type }, state, commit_id, submitted_at })
 * @param {string} author  PR author login
 * @param {{ headSha?: string }} [opts]  strict commit binding when provided
 * @returns {string[]} approving logins
 */
export function reduceReviews(reviews, author, opts = {}) {
  const { headSha } = opts;
  const list = Array.isArray(reviews) ? reviews : [];

  // Sort chronologically (PENDING reviews carry submitted_at: null — treat
  // as earliest so any submitted review supersedes them).
  const sorted = [...list].sort((a, b) => {
    const ta = a?.submitted_at ? Date.parse(a.submitted_at) : -Infinity;
    const tb = b?.submitted_at ? Date.parse(b.submitted_at) : -Infinity;
    return ta - tb;
  });

  // Latest review per login.
  const latest = new Map();
  for (const review of sorted) {
    const login = review?.user?.login;
    if (!login) continue;
    latest.set(login, review);
  }

  const approvers = [];
  for (const [login, review] of latest) {
    if (review.state !== "APPROVED") continue;
    if (review.user?.type === "Bot") continue;
    if (login === author) continue;
    if (headSha && review.commit_id !== headSha) continue;
    approvers.push(login);
  }
  return approvers;
}

// ---------------------------------------------------------------------------
// CLI mode: node assert-non-author-approval.mjs --reviews <json> --author <login>
//           [--head-sha <sha>]
// Reads the reviews JSON file, prints approving logins one per line,
// exits 0 when >=1 approver, 1 otherwise.
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith("--")) {
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.reviews || !args.author) {
    console.error(
      "usage: node assert-non-author-approval.mjs --reviews <reviews.json> " +
        "--author <login> [--head-sha <sha>]"
    );
    process.exit(2);
  }
  const reviews = JSON.parse(readFileSync(args.reviews, "utf8"));
  const approvers = reduceReviews(reviews, args.author, { headSha: args["head-sha"] });
  for (const login of approvers) console.log(login);
  process.exit(approvers.length > 0 ? 0 : 1);
}
