'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const {
  buildHumanAnswerPatch,
  buildTaskReviewPatch,
  isSameLocalDay,
  summarizeTaskEffectiveness,
  taskWaitsOnHuman
} = loadTs('src/shared/taskEffectiveness.ts');

const NOW = new Date('2026-08-26T17:00:00.000Z');

test('effectiveness counts accepted outcomes and first-pass quality, not activity', () => {
  const summary = summarizeTaskEffectiveness([
    {
      status: 'done',
      createdAt: '2026-08-26T15:00:00.000Z',
      completedAt: '2026-08-26T16:00:00.000Z',
      reviewStatus: 'accepted',
      firstReviewStatus: 'accepted',
      reviewedAt: '2026-08-26T16:10:00.000Z',
      timeSavedMinutes: 60
    },
    {
      status: 'done',
      createdAt: '2026-08-26T15:00:00.000Z',
      completedAt: '2026-08-26T15:30:00.000Z',
      reviewStatus: 'accepted',
      firstReviewStatus: 'rework',
      reviewedAt: '2026-08-26T16:15:00.000Z',
      reworkCount: 1
    },
    {
      status: 'todo',
      createdAt: '2026-08-26T15:00:00.000Z',
      reviewStatus: 'rework',
      firstReviewStatus: 'rework',
      reviewedAt: '2026-08-26T16:20:00.000Z',
      reworkCount: 1
    },
    { status: 'doing', createdAt: '2026-08-26T16:00:00.000Z' },
    { status: 'done', createdAt: '2026-08-26T16:00:00.000Z' }
  ], NOW);

  assert.equal(summary.accepted, 2);
  assert.equal(summary.reviewed, 3);
  assert.equal(summary.acceptanceRate, 2 / 3);
  assert.equal(summary.firstPassRate, 1 / 3);
  assert.equal(summary.reworkRate, 2 / 3);
  assert.equal(summary.totalTimeSavedMinutes, 60);
  assert.equal(summary.readyForReview, 1);
  assert.equal(summary.active, 2);
  assert.equal(summary.reviewedToday, 3);
  assert.equal(summary.medianTurnaroundMinutes, 60);
});

test('waiting on the human requires an open question on a blocked task', () => {
  assert.equal(taskWaitsOnHuman({ status: 'blocked', humanQA: [{ q: 'Approve?' }] }), true);
  assert.equal(taskWaitsOnHuman({ status: 'blocked', humanQA: [{ q: 'Approve?', a: 'Yes' }] }), false);
  assert.equal(taskWaitsOnHuman({ status: 'doing', humanQA: [{ q: 'Approve?' }] }), false);
});

test('human answer patch updates only the latest open question', () => {
  const result = buildHumanAnswerPatch({
    humanQA: [
      { q: 'Old question?', a: 'Old answer' },
      { q: 'Dismissed question?', dismissedAt: '2026-08-26T15:00:00.000Z' },
      { q: 'Current question?', askedAt: '2026-08-26T16:00:00.000Z' }
    ]
  }, '  Option B  ', '2026-08-26T17:00:00.000Z');

  assert.equal(result.question, 'Current question?');
  assert.equal(result.humanQA[0].a, 'Old answer');
  assert.equal(result.humanQA[1].a, undefined);
  assert.equal(result.humanQA[2].a, 'Option B');
  assert.equal(result.humanQA[2].answeredAt, '2026-08-26T17:00:00.000Z');
});

test('review patch records first review, history, time saved, and rework', () => {
  const accepted = buildTaskReviewPatch(
    { status: 'done' },
    'accepted',
    { at: '2026-08-26T16:00:00.000Z', note: 'Useful', timeSavedMinutes: 29.6 }
  );
  assert.equal(accepted.status, 'done');
  assert.equal(accepted.firstReviewStatus, 'accepted');
  assert.equal(accepted.timeSavedMinutes, 30);
  assert.deepEqual(accepted.reviewHistory, [{
    decision: 'accepted',
    at: '2026-08-26T16:00:00.000Z',
    note: 'Useful',
    timeSavedMinutes: 30
  }]);

  const rework = buildTaskReviewPatch(
    { status: 'done', firstReviewStatus: 'accepted', reworkCount: 1, reviewHistory: accepted.reviewHistory },
    'rework',
    { at: '2026-08-26T16:30:00.000Z', note: 'Add source links' }
  );
  assert.equal(rework.status, 'todo');
  assert.equal(rework.firstReviewStatus, 'accepted', 'first review remains immutable');
  assert.equal(rework.reworkCount, 2);
  assert.equal(rework.reviewHistory.length, 2);
});

test('same-day comparison uses local calendar dates', () => {
  assert.equal(isSameLocalDay('2026-08-26T10:00:00.000Z', NOW), true);
  assert.equal(isSameLocalDay('not-a-date', NOW), false);
});
