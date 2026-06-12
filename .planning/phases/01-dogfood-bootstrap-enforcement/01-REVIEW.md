---
phase: 01-dogfood-bootstrap-enforcement
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 41
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 41
**Status:** issues_found

## Summary

Hệ thống enforcement (L1 hooks + L2 CI gate dùng chung `lib/tiers.mjs`) được viết cẩn thận, fail-closed đúng hướng, zero-dependency, và có test coverage tốt cho các đường chính. Tuy nhiên review đối kháng tìm ra **2 lỗi mức BLOCKER**: (1) init-core sinh ra Java package không hợp lệ khi `artifactId` chứa dấu gạch ngang (giá trị mà chính regex validation của nó cho phép), làm hỏng mọi project sinh ra với input dạng `my-app`; (2) workflow `plan-compliance.yml` — chính là tầng enforcement floor — có lỗ hổng GitHub Actions script-injection qua `head_ref` (tên branch do người gửi PR kiểm soát) nội suy thẳng vào shell `run:`.

Các WARNING tập trung vào điểm yếu robustness của matcher/scan (không chuẩn hóa `..`, không relativize/strip quote đường dẫn redirect tuyệt đối, substring match cho T4) — phần lớn thuộc lớp L1 best-effort (D-16) nhưng vẫn nên vá vì matcher được dùng chung với L2, và một lỗi fail-open ở waiver khi `--now` sai định dạng.

Các quy ước đã được nêu là chấp nhận (node --test glob form, allowlist 4 entry của meta-link-lint, `.claude/skills/**` chưa nằm trong t3.paths) đã KHÔNG được flag lại.

## Critical Issues

### CR-01: artifactId có dấu gạch ngang sinh ra Java package không hợp lệ

**File:** `scripts/init-core.mjs:51` và `scripts/init-core.mjs:234`

**Issue:** `ARTIFACT_ID_RE = /^[a-z][a-z0-9-]*$/` (dòng 51) cho phép dấu gạch ngang trong `artifactId` — đúng cho Maven artifactId và literal gốc `acme-app`. Nhưng cùng giá trị `artifactId` đó được dùng để dựng Java package root:

```js
const packageRoot = `${groupId}.${artifactId}`;          // dòng 234
packagePath: packageRoot.replaceAll('.', '/'),           // dòng 237
```

Với input hợp lệ `--group-id com.example --artifact-id my-app`, `packageRoot = "com.example.my-app"`. Literal `com.acme.app` trong code Java bị thay thành `com.example.my-app`, sinh ra khai báo `package com.example.my-app;` — dấu gạch ngang không phải ký tự hợp lệ trong định danh Java, **code không compile**. Thư mục package cũng bị đổi thành `com/example/my-app`. Test hiện chỉ dùng `artifactId="demo"` (không gạch ngang) nên đường này không được phủ. Theo plan 004, "A defect here corrupts every generated project at minute zero." — đây đúng là loại defect đó.

**Fix:** Tách Maven artifactId khỏi Java package leaf. Hoặc sanitize khi dựng packageRoot, hoặc validate riêng segment package:
```js
// Sanitize hyphen khi đưa vào package Java (giữ artifactId nguyên cho pom.xml)
const packageLeaf = artifactId.replace(/-/g, '');         // hoặc '_'
const packageRoot = `${groupId}.${packageLeaf}`;
// và bổ sung test với artifactId dạng "my-app" để khóa hành vi này
```
Nếu chủ ý là artifactId phải là segment package hợp lệ thì `ARTIFACT_ID_RE` phải cấm dấu gạch ngang — nhưng khi đó literal `acme-app` lại mâu thuẫn. Cần một quyết định rõ ràng.

### CR-02: GitHub Actions script-injection qua head_ref trong tầng enforcement floor

**File:** `.github/workflows/plan-compliance.yml:77-86`

**Issue:** Bước "GATE-10 verdict" nội suy trực tiếp giá trị do attacker kiểm soát vào thân `run:`:

```yaml
run: |
  node scripts/checks/plan-compliance.mjs \
    --author "${{ steps.meta.outputs.author }}" \
    --branch "${{ steps.meta.outputs.head_ref }}" \   # <-- head_ref = tên branch của PR
    --head-sha "${{ steps.meta.outputs.head_sha }}" \
```

Tên git ref được phép chứa `$`, `(`, `)` và backtick. Một PR từ branch tên `feat/001-$(<lệnh>)` khiến `--branch "feat/001-$(<lệnh>)"` bị command-substitution thực thi trong shell trước cả khi node chạy. [Inference — dựa trên quy tắc đặt tên git ref và cơ chế nội suy `${{ }}` của Actions; cần xác minh exploit trực tiếp] Đây là pattern script-injection kinh điển của GitHub Actions. Đặc biệt nghiêm trọng vì workflow này là L2 floor, chạy với `actions: write` (trigger `pull_request_review` chạy trong context repo base). `author`/`head_sha` an toàn (login chỉ alnum+hyphen, SHA là hex), chỉ `head_ref` là vector. Bước fetch ở trên đã dùng `env:` đúng cách, nhưng bước verdict lại nội suy thẳng.

**Fix:** Truyền qua biến môi trường, không nội suy `${{ }}` vào shell:
```yaml
- name: GATE-10 verdict
  env:
    AUTHOR: ${{ steps.meta.outputs.author }}
    HEAD_REF: ${{ steps.meta.outputs.head_ref }}
    HEAD_SHA: ${{ steps.meta.outputs.head_sha }}
  run: |
    node scripts/checks/plan-compliance.mjs \
      --files /tmp/pr-files.json \
      --reviews /tmp/pr-reviews.json \
      --author "$AUTHOR" \
      --branch "$HEAD_REF" \
      --head-sha "$HEAD_SHA" \
      --specs-dir specs \
      --waivers .cowork/waivers.json
```

## Warnings

### WR-01: Matcher không chuẩn hóa segment `.`/`..` → bypass T3 gate ở L1

**File:** `.claude/hooks/lib/tiers.mjs:14-16, 56-65`

**Issue:** `normalize()` chỉ đổi backslash và bỏ `./` đầu, không gập `..`. Glob của tiers là anchored (`^...$`), nên một đường dẫn tương đối có `..` như `foo/../.cowork/tiers.json` không khớp glob `.cowork/**` → `matchTier` trả `null` → `t3-plan-gate` cho qua im lặng (dòng 64). `t3-plan-gate` chỉ relativize/kiểm tra `..` cho đường dẫn tuyệt đối (dòng 57-60), không xử lý đường tương đối có `..`. L2 an toàn vì danh sách file từ GitHub API đã chuẩn hóa, nhưng matcher dùng chung nên nên vá phòng thủ.

**Fix:** Chuẩn hóa segment trước khi match:
```js
function normalize(p) {
  const fwd = String(p).replace(/\\/g, "/").replace(/^\.\//, "");
  return path.posix.normalize(fwd).replace(/^(\.\.\/)+/, "");
}
```

### WR-02: t4-command-guard không relativize đường dẫn redirect tuyệt đối

**File:** `.claude/hooks/t4-command-guard.mjs:84-86`

**Issue:** `extractWriteTargets` trả token thô và gọi `matchTier(t, tiers)` trực tiếp. Lệnh ghi vào đường tuyệt đối (vd `echo x > /abs/repo/.cowork/tiers.json`) không khớp glob anchored `.cowork/**` → bỏ qua. Ngược lại `t3-plan-gate.mjs:57-60` có chuyển absolute→relative. Hai hook xử lý không nhất quán, tạo lỗ bypass ở t4-guard (best-effort theo D-16, nhưng vẫn là khoảng hở).

**Fix:** Áp cùng logic absolute→relative (qua `CLAUDE_PROJECT_DIR`) trước khi `matchTier`, tái dùng cùng helper với t3-plan-gate.

### WR-03: Target redirect bọc trong quote không được strip → bypass scan

**File:** `.claude/hooks/t4-command-guard.mjs:49-50`

**Issue:** Nhánh redirect `/>{1,2}\s*([^\s;|&<>]+)/g` giữ nguyên dấu nháy: `> '.cowork/tiers.json'` được bắt thành `'.cowork/tiers.json'` (có nháy đầu) → không khớp glob. Trong khi nhánh `sed -i`/`git apply` (dòng 58-59) lại strip quote (`tok.replace(/^['"]|['"]$/g, "")`). Xử lý quote không nhất quán giữa hai nhánh → redirect có quote vượt qua scan.

**Fix:** Strip quote đầu/cuối cho mọi target trước khi tier-check:
```js
const clean = (t) => t.replace(/^['"]|['"]$/g, "");
while ((m = redirect.exec(command)) !== null) targets.push(clean(m[1]));
while ((m = tee.exec(command)) !== null) targets.push(clean(m[1]));
```

### WR-04: waiverExpired fail-OPEN khi nowMs là NaN

**File:** `scripts/checks/plan-compliance.mjs:56-60, 91`

**Issue:** `nowMs` = `Date.parse(now ?? ...)`. Nếu `--now` được truyền sai định dạng, `Date.parse` trả `NaN`. `waiverExpired` chỉ kiểm `Number.isNaN(end)`, không kiểm `nowMs`. Khi `nowMs` là NaN thì `nowMs > end` = `false` → waiver bị coi là CHƯA hết hạn → identity step pass qua waiver. Đây là fail-OPEN, ngược triết lý fail-closed của hệ thống. Đường production (`now` undefined → giờ hiện tại) an toàn, nhưng `--now` là tham số CLI công khai.

**Fix:** Fail-closed khi clock không hợp lệ:
```js
if (Number.isNaN(nowMs)) {
  reasons.push("FAIL [GATE-10]: invalid --now clock — failing closed.");
  return { verdict: "FAIL", reasons, warnings };
}
```

### WR-05: isT4Command dùng substring match dễ bị né bằng biến thể khoảng trắng/quote

**File:** `.claude/hooks/lib/tiers.mjs:67-71`

**Issue:** `c.includes(pat)` so khớp chuỗi con. `git push --force` viết thành `git  push   --force` (nhiều space), hay tách qua biến shell, sẽ không khớp. Là best-effort song song với `permissions.deny` glob trong settings.json, nhưng nên ghi nhận giới hạn rõ ràng để tránh ngộ nhận đây là biên an ninh. [Inference — dựa trên ngữ nghĩa `String.includes`]

**Fix:** Tối thiểu chuẩn hóa khoảng trắng trước khi match (`c.replace(/\s+/g, " ")`), và document rõ T4 guard là best-effort; floor thật là review + ruleset.

## Info

### IN-01: findBoundApprovedPlan trả về dir đầu tiên trùng tiền tố, bỏ qua trùng lặp

**File:** `.claude/hooks/lib/tiers.mjs:104-115`

**Issue:** Nếu tồn tại đồng thời `specs/007-foo/` và `specs/007-bar/` (cùng có plan.md), hàm trả dir đầu theo thứ tự `readdirSync` mà không cảnh báo trùng. Mơ hồ nhưng không sai về an toàn.

**Fix:** Cân nhắc fail/warn khi có >1 dir cùng NNN-tiền tố để tránh nhị nghĩa binding.

### IN-02: So sánh version dùng startsWith dễ khớp nhầm tiền tố

**File:** `.claude/hooks/session-version-warn.mjs:26`

**Issue:** `actual.startsWith(pinned)` — với `pinned="2.1.173"`, `actual="2.1.1730"` sẽ `startsWith` = true (không cảnh báo dù khác version). Là hook warn-not-block nên tác động thấp.

**Fix:** So khớp theo ranh giới: `actual === pinned || actual.startsWith(pinned + " ") || actual.startsWith(pinned + "\n")` hoặc parse semver.

### IN-03: Mâu thuẫn JDK trong constitution (ngoài scope chính, ghi nhận)

**File:** `backend/CLAUDE.md:54`, `.github/workflows/os-matrix.yml:81,114`

**Issue:** Các file trong scope nhất quán dùng **JDK 25** (backend/CLAUDE.md class-file 69, os-matrix setup-java 25). Root `CLAUDE.md` (không trong danh sách review) vẫn còn bảng "Recommended Stack" ghi JDK 26 ở nhiều chỗ trong khi dòng Constraints lại nói "JDK 25 LTS locked (supersedes JDK 26)". Không lỗi trong file đã review, nhưng đây là drift constitution nên được hòa giải để agent không bị nhiễu.

**Fix:** Cập nhật bảng stack trong root CLAUDE.md về JDK 25 cho khớp Constraints và workflows.

---

_Reviewed: 2026-06-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
