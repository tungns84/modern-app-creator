// skills-lint.mjs — AGENT-02 structure gate for the Claude Code skill pack.
// Zero npm dependencies (must run on fresh clone before any install).
//
// Asserts (D-21 depth split):
//   1. exactly the five skill dirs exist under .claude/skills/
//      (plan, verify, new-module, new-feature, design-implement)
//   2. every SKILL.md carries YAML frontmatter with non-empty `name` and
//      `description` (description = trigger surface)
//   3. `plan` and `verify` are FULL skills — body exceeds a minimal length
//   4. the three skeletons contain the literal "Skeleton" and a `tier:`
//      declaration (contract-only, implemented Phase 2/4)
//
// CLI: node scripts/checks/skills-lint.mjs [--root <repoRoot>]
// Exit 1 on any violation; every failure line names the violated rule.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const EXPECTED_SKILLS = [
  "plan",
  "verify",
  "new-module",
  "new-feature",
  "design-implement",
];
export const FULL_SKILLS = ["plan", "verify", "new-module"];
export const SKELETON_SKILLS = ["new-feature", "design-implement"];
const FULL_BODY_MIN_LINES = 30; // a "full" skill is substantive, not a stub

/**
 * Minimal YAML frontmatter parse: leading `---` block of `key: value` lines.
 * @param {string} text
 * @returns {{frontmatter: Record<string,string>|null, body: string}}
 */
export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontmatter: null, body: normalized };
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) frontmatter[kv[1]] = kv[2].trim();
  }
  return { frontmatter, body: normalized.slice(match[0].length) };
}

/**
 * Lint the skill tree under `<root>/.claude/skills/`.
 * @param {string} root repo root
 * @returns {string[]} rule-named problem lines (empty = pass)
 */
export function lintSkills(root) {
  const problems = [];
  const skillsDir = join(root, ".claude", "skills");

  if (!existsSync(skillsDir)) {
    return [
      `skills-lint/dir-set VIOLATION: ${skillsDir} does not exist — the five ` +
        `skills (${EXPECTED_SKILLS.join(", ")}) are required (AGENT-02, D-21)`,
    ];
  }

  const actual = readdirSync(skillsDir).filter((d) =>
    statSync(join(skillsDir, d)).isDirectory()
  );
  for (const name of EXPECTED_SKILLS) {
    if (!actual.includes(name)) {
      problems.push(
        `skills-lint/dir-set VIOLATION: missing skill dir .claude/skills/${name} ` +
          `— all five skills must ship (AGENT-02, D-21)`
      );
    }
  }
  for (const name of actual) {
    if (!EXPECTED_SKILLS.includes(name)) {
      problems.push(
        `skills-lint/dir-set VIOLATION: unexpected skill dir .claude/skills/${name} ` +
          `— the Phase-1 skill set is exactly: ${EXPECTED_SKILLS.join(", ")}`
      );
    }
  }

  for (const name of EXPECTED_SKILLS) {
    const file = join(skillsDir, name, "SKILL.md");
    if (!existsSync(file)) {
      if (actual.includes(name)) {
        problems.push(
          `skills-lint/frontmatter VIOLATION: .claude/skills/${name}/SKILL.md missing`
        );
      }
      continue;
    }
    const text = readFileSync(file, "utf8");
    const { frontmatter, body } = parseFrontmatter(text);
    if (!frontmatter) {
      problems.push(
        `skills-lint/frontmatter VIOLATION: .claude/skills/${name}/SKILL.md has no ` +
          `YAML frontmatter block (--- ... ---)`
      );
      continue;
    }
    for (const key of ["name", "description"]) {
      if (!frontmatter[key]) {
        problems.push(
          `skills-lint/frontmatter VIOLATION: .claude/skills/${name}/SKILL.md ` +
            `frontmatter is missing a non-empty "${key}"`
        );
      }
    }
    if (frontmatter.name && frontmatter.name !== name) {
      problems.push(
        `skills-lint/frontmatter VIOLATION: .claude/skills/${name}/SKILL.md ` +
          `frontmatter name "${frontmatter.name}" does not match its dir "${name}"`
      );
    }

    const bodyLines = body.split("\n").filter((l) => l.trim() !== "").length;
    if (FULL_SKILLS.includes(name) && bodyLines < FULL_BODY_MIN_LINES) {
      problems.push(
        `skills-lint/full-depth VIOLATION: .claude/skills/${name}/SKILL.md body has ` +
          `${bodyLines} non-empty lines, below the full-skill minimum of ` +
          `${FULL_BODY_MIN_LINES} (D-21: plan and verify ship fully implemented)`
      );
    }
    if (SKELETON_SKILLS.includes(name)) {
      if (!body.includes("Skeleton")) {
        problems.push(
          `skills-lint/skeleton-contract VIOLATION: .claude/skills/${name}/SKILL.md ` +
            `must contain the literal "Skeleton" (D-21: contract-only until implemented)`
        );
      }
      if (!/^\s*tier:\s*T[123]/m.test(body)) {
        problems.push(
          `skills-lint/skeleton-contract VIOLATION: .claude/skills/${name}/SKILL.md ` +
            `must declare its tier (a "tier: T1|T2|T3" line) in the contract`
        );
      }
    }
  }
  return problems;
}

function main() {
  const argv = process.argv.slice(2);
  let root = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root") {
      root = argv[++i];
      if (!root) throw new Error("skills-lint: missing value for --root");
    } else {
      throw new Error(`skills-lint: unknown argument "${argv[i]}"`);
    }
  }
  const problems = lintSkills(root);
  for (const p of problems) console.error(p);
  if (problems.length === 0) {
    console.log(
      `skills-lint OK: 5 skills present, frontmatter valid, D-21 depth split respected`
    );
  }
  process.exit(problems.length > 0 ? 1 : 0);
}

const isCliEntry =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) main();
