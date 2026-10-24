# Learning progress implementation plan

> **Status:** completed in MVP 1.85 (commit bf64044, 2026-10-12). Kept as an archive.

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline, with TDD and a final independent review.

**Goal:** Distinguish completed lessons from mastered lessons and preserve unfinished level checks.

**Architecture:** Keep all application code and data in the existing HTML. Derive lesson status from current answers and checked results; persist separate unfinished checks for each level through the existing storage wrapper. Reuse the same normalizer at startup and backup export.

**Tech Stack:** Standalone HTML, CSS and JavaScript; Node.js validator.

**Spec:** User-approved items 2–4 from the MVP 1.83 analysis; item 2 already shipped in MVP 1.84. The approved behavior is detailed below.

## Approved requirements

- Completed exercises must not imply mastery when answers are wrong. Show completed/review/mastered status while allowing advancement.
- Preserve unfinished level-check questions and answers across reloads and level changes; offer Continue and Start again.
- Exported progress must remain importable, including new saved check data.
- Implementation choice: a lesson is mastered when every answer is filled, checked and correct. A completed lesson with any wrong answers needs review.
- Implementation choice: pause unfinished checks when leaving them; submission clears only that level's draft and keeps its result.

## Global Constraints

- Keep the project single-file; no new dependencies or builder.
- Update the HTML footer version and Madrid timestamp when committing HTML.
- Run `node validate-conjugations.js`; require `RESULT: PASS`.
- Commit and push only task-related files to `origin/main`, as authorized in AGENTS.md; leave the untracked textbook PDF untouched.
- Use isolated browser fixtures and stop the test server afterward.

## Review Focus

- Fully checked lessons with one mistake must stay visibly reviewable; mastery counts must not count them.
- Advancing to another lesson remains available even when a completed lesson needs review.
- Invalid saved question references must discard a draft without shifting answers onto different questions.
- Switching levels and restarting a check must preserve drafts belonging to other levels.
- Submitted checks must not reappear as unfinished after reload or backup restoration.

### Task 1: Lesson mastery and resumable level checks

**Files:** Modify `spanish-grammar.html` and `validate-conjugations.js`.

**Interfaces:**
- Consumes: `textbookExerciseProgress`, `appStorage`, `persist`, `learningCheckPool`, `learningCheckEntry`, backup JSON normalizers.
- Produces: derived `completed`, `mastered`, `needsReview` lesson flags; saved checks keyed by level in `msg:learningCheckSessions`; resume/pause functions and delegated answer/submit handlers.

- [x] Add tests for all-wrong and partially wrong completed lessons, mastery after correcting all answers, and editing invalidating mastery.
- [x] Run the validator. Expected: these new cases fail because completion currently implies mastery.
- [x] Implement derived lesson states and consistent catalog, lesson, favourites and plan labels/counts; keep forward navigation available.
- [x] Run the validator. Expected: `RESULT: PASS`.
- [x] Add tests for draft round-trip, both input and choice answers, level switching, independent restart, submission cleanup, malformed references and backup recovery.
- [x] Run the validator. Expected: new persistence cases fail because drafts are not saved.
- [x] Implement normalized per-level sessions, delegated UI actions, resume/restart buttons, and backup support.
- [x] Run the validator and `git diff --check`. Expected: `RESULT: PASS` and no whitespace errors.
- [x] Verify lesson statuses and draft resumption in an isolated browser fixture; save a screenshot.
- [x] Obtain independent code review, resolve important findings through failing regression tests.
- [x] Update footer to MVP 1.85 and current Madrid time; commit and push the task. Expected: `main` matches `origin/main`.
