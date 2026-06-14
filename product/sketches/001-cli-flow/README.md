---
sketch: 001
name: cli-flow
question: "Terminal UX của cowork-cli: phong cách output nào đúng cho flow generate?"
winner: null
tags: [cli, terminal, clack, onboarding]
---

# Sketch 001: cowork-cli Terminal Flow

## Design Question

Flow `npx cowork-cli` (PRD §7.8: identity → preset → options → generate → post-gen → next steps) nên nói chuyện với người dùng bằng giọng nào? Quyết định này định tone toàn bộ CLI và ảnh hưởng trực tiếp persona Developer (Claude Code beginner).

## How to View

open .planning/sketches/001-cli-flow/index.html

Mỗi variant tự chạy mô phỏng (autoplay). Click vào terminal để tua từng bước; ⏭ xem kết quả cuối; ↻ replay.

## Variants

- **A: Clack Minimal** — đúng ngôn ngữ @clack/prompts (│ ◇ ◆), tiết chế, quen mắt hệ create-t3-app
- **B: Rich** — banner ASCII, section ①–④, progress bars, box kết quả; nhiều "wow", ồn khi dùng thật
- **C: Quiet** — CI-log style, một dòng một fact; hợp non-interactive/agent, lạnh với người mới

## What to Look For

- Đọc flow có như được dẫn dắt không (persona beginner)?
- packageRoot computed hiển thị đủ rõ "tự suy ra, không hỏi"?
- Khối generate: mức chi tiết nào đủ tin tưởng mà không ồn?
- Next steps cuối: có biết ngay phải làm gì tiếp?
