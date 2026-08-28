import assert from 'node:assert/strict'
import test from 'node:test'

import { AFTER_DATE_CONTENTS } from './afterDateDemoData.js'
import { drawNextPrompt } from './afterDateDemoModels.js'

test('after date exposes four isolated conversation contents', () => {
  assert.deepEqual(Object.keys(AFTER_DATE_CONTENTS), [
    'prediction',
    'balance',
    'secret',
    'mission',
  ])

  assert.equal(AFTER_DATE_CONTENTS.prediction.items.length, 12)
  assert.equal(AFTER_DATE_CONTENTS.balance.items.length, 15)
  assert.equal(AFTER_DATE_CONTENTS.secret.items.length, 20)
  assert.equal(AFTER_DATE_CONTENTS.mission.items.length, 15)
})

test('choice contents keep their visible option contracts', () => {
  AFTER_DATE_CONTENTS.prediction.items.forEach((item) => {
    assert.equal(item.options.length, 4)
    assert.equal(new Set(item.options).size, 4)
  })

  AFTER_DATE_CONTENTS.balance.items.forEach((item) => {
    assert.equal(item.options.length, 2)
    assert.equal(new Set(item.options).size, 2)
  })

  AFTER_DATE_CONTENTS.secret.items.forEach((item) => {
    assert.equal('options' in item, false)
  })

  AFTER_DATE_CONTENTS.mission.items.forEach((item) => {
    assert.equal('options' in item, false)
  })
})

test('drawing prompts exhausts a shuffled deck before rebuilding it', () => {
  let session = { queue: [], currentIndex: null }
  const drawn = []

  for (let count = 0; count < 4; count += 1) {
    session = drawNextPrompt(session, 4, () => 0)
    drawn.push(session.currentIndex)
  }

  assert.equal(new Set(drawn).size, 4)
  assert.equal(session.queue.length, 0)
})

test('a rebuilt deck never repeats the immediately previous prompt', () => {
  const next = drawNextPrompt({ queue: [], currentIndex: 2 }, 4, () => 0)

  assert.notEqual(next.currentIndex, 2)
  assert.equal(next.queue.length, 3)
})

test('drawing from an existing queue does not mutate caller state', () => {
  const session = { queue: [3, 1], currentIndex: 0 }
  const next = drawNextPrompt(session, 4, () => 0.5)

  assert.deepEqual(session, { queue: [3, 1], currentIndex: 0 })
  assert.deepEqual(next, { queue: [1], currentIndex: 3 })
})
