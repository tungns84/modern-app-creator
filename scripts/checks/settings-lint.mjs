// settings-lint.mjs — AGENT-04 allowlist presence + D-22 deny↔tiers lockstep.
// Zero npm dependencies (must run on fresh clone before any install).
//
// Asserts against .claude/settings.json and .cowork/tiers.json:
//   1. permissions.allow contains the three T1 rules
//      (Bash(task *), Bash(./mvnw *), Bash(npm run *)) — AGENT-04
//   2. permissions.deny is in LOCKSTEP with tiers.json t4.commandPatterns:
//      every t4 pattern has a matching deny rule, and every Bash deny rule is
//      backed by a t4 pattern (D-22: tiers.json is the single tier source —
//      the settings mirror may never drift in either direction)
//   3. both PreToolUse hooks (t3-plan-gate on Write|Edit, t4-command-guard on
//      Bash) and the SessionStart version-warn hook are wired
//
// CLI: node scripts/checks/settings-lint.mjs [--settings <p>] [--tiers <p>]
// Exit 1 on any violation; every failure line names the violated rule.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const REQUIRED_ALLOW = ["Bash(task *)", "Bash(./mvnw *)", "Bash(npm run *)"];

/**
 * Lockstep mapping: t4 pattern "git push --force" is mirrored by the deny
 * rule "Bash(git push --force*)" (or the exact "Bash(git push --force)").
 * @param {string} pattern
 * @param {string} denyRule
 */
export function denyMirrors(pattern, denyRule) {
  const m = denyRule.match(/^Bash\((.*)\)$/);
  if (!m) return false;
  const inner = m[1];
  return inner === pattern || inner === `${pattern}*`;
}

/**
 * @param {object} settings parsed .claude/settings.json
 * @param {object} tiers parsed .cowork/tiers.json
 * @returns {string[]} rule-named problem lines (empty = pass)
 */
export function lintSettings(settings, tiers) {
  const problems = [];
  const allow = settings?.permissions?.allow ?? [];
  const deny = settings?.permissions?.deny ?? [];
  const t4 = tiers?.t4?.commandPatterns ?? [];

  // 1. T1 allowlist presence (AGENT-04)
  for (const rule of REQUIRED_ALLOW) {
    if (!allow.includes(rule)) {
      problems.push(
        `settings-lint/t1-allowlist VIOLATION: permissions.allow is missing ` +
          `"${rule}" — the T1 zero-ceremony allowlist must pre-approve it ` +
          `(AGENT-04). Fix: add it to .claude/settings.json permissions.allow.`
      );
    }
  }

  // 2a. every tiers t4 pattern → a deny rule (lockstep, source → mirror)
  for (const pattern of t4) {
    if (!deny.some((rule) => denyMirrors(pattern, rule))) {
      problems.push(
        `settings-lint/t4-lockstep VIOLATION: tiers.json t4 pattern ` +
          `"${pattern}" has no matching permissions.deny rule — the deny ` +
          `mirror drifted from the tier source (D-22). Fix: add ` +
          `"Bash(${pattern}*)" to .claude/settings.json permissions.deny.`
      );
    }
  }

  // 2b. every Bash deny rule → backed by a tiers t4 pattern (mirror → source)
  for (const rule of deny) {
    if (!/^Bash\(/.test(rule)) continue; // only the T4 command mirror is governed
    if (!t4.some((pattern) => denyMirrors(pattern, rule))) {
      problems.push(
        `settings-lint/t4-lockstep VIOLATION: permissions.deny rule "${rule}" ` +
          `is not backed by any tiers.json t4.commandPatterns entry — ` +
          `tiers.json is the single tier source (D-22). Fix: add the pattern ` +
          `to .cowork/tiers.json t4.commandPatterns or remove the deny rule.`
      );
    }
  }

  // 3. hook wiring
  const hookCommands = (event, matcherRe) => {
    const groups = settings?.hooks?.[event] ?? [];
    const cmds = [];
    for (const group of groups) {
      if (matcherRe && !(group.matcher && matcherRe.test(group.matcher))) continue;
      for (const h of group.hooks ?? []) if (h.command) cmds.push(h.command);
    }
    return cmds;
  };
  const wired = [
    {
      rule: "t3-plan-gate",
      ok: hookCommands("PreToolUse", /Write/).some(
        (c) => c.includes("t3-plan-gate.mjs")
      ) && hookCommands("PreToolUse", /Edit/).some(
        (c) => c.includes("t3-plan-gate.mjs")
      ),
      fix: `wire t3-plan-gate.mjs under hooks.PreToolUse with matcher "Write|Edit"`,
    },
    {
      rule: "t4-command-guard",
      ok: hookCommands("PreToolUse", /Bash/).some((c) =>
        c.includes("t4-command-guard.mjs")
      ),
      fix: `wire t4-command-guard.mjs under hooks.PreToolUse with matcher "Bash"`,
    },
    {
      rule: "session-version-warn",
      ok: hookCommands("SessionStart", null).some((c) =>
        c.includes("session-version-warn.mjs")
      ),
      fix: "wire session-version-warn.mjs under hooks.SessionStart",
    },
  ];
  for (const { rule, ok, fix } of wired) {
    if (!ok) {
      problems.push(
        `settings-lint/hook-wiring VIOLATION: ${rule} hook is not wired in ` +
          `.claude/settings.json — L1 enforcement is incomplete. Fix: ${fix}.`
      );
    }
  }

  return problems;
}

function main() {
  const argv = process.argv.slice(2);
  let settingsPath = ".claude/settings.json";
  let tiersPath = ".cowork/tiers.json";
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--settings": settingsPath = argv[++i]; break;
      case "--tiers": tiersPath = argv[++i]; break;
      default: throw new Error(`settings-lint: unknown argument "${argv[i]}"`);
    }
  }
  const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  const tiers = JSON.parse(readFileSync(tiersPath, "utf8"));
  const problems = lintSettings(settings, tiers);
  for (const p of problems) console.error(p);
  if (problems.length === 0) {
    console.log(
      `settings-lint OK: T1 allowlist present, deny↔tiers t4 lockstep holds, ` +
        `all 3 hooks wired`
    );
  }
  process.exit(problems.length > 0 ? 1 : 0);
}

const isCliEntry =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) main();
