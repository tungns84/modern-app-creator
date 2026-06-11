// render-claude-md.mjs — zero-dependency token-replace renderer (D-14).
// Contract (PRESET-SPEC §4 / §4.5): token replacement ONLY — no other
// transforms — and ANY orphan "{{" left after render is a hard failure.
// This ~20-line core is the same contract the Giai đoạn 2 generator uses.

/**
 * Render a template by replacing {{token}} placeholders with values.
 * @param {string} templateText
 * @param {Record<string, string>} values
 * @returns {string} rendered text
 * @throws {Error} naming the placeholder when a used token has no value,
 *   or when any orphan "{{" remains after render (PRESET-SPEC §4.5).
 */
export function render(templateText, values) {
  const rendered = templateText.replace(/\{\{([A-Za-z0-9_.-]+)\}\}/g, (_match, token) => {
    if (!Object.hasOwn(values ?? {}, token)) {
      throw new Error(
        `render: no value provided for placeholder {{${token}}} — orphan tokens fail the render (PRESET-SPEC §4.5)`,
      );
    }
    return String(values[token]);
  });
  if (rendered.includes("{{")) {
    const at = rendered.indexOf("{{");
    const snippet = rendered.slice(at, at + 40).split("\n")[0];
    throw new Error(
      `render: orphan "{{" remains after render near "${snippet}" (PRESET-SPEC §4.5)`,
    );
  }
  return rendered;
}
