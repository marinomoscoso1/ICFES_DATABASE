import { describe, expect, it } from 'vitest'
import { calculateCourse, formatScore, weightGap } from './grades'
import type { Course, GradeItem } from '../types'

const item = (weight: number, score: number | null, name = 'item'): GradeItem => ({
  id: `${name}-${weight}-${score}`,
  name,
  weight,
  score,
})

const course = (items: GradeItem[], overrides: Partial<Course> = {}): Course => ({
  id: 'c1',
  name: 'Course',
  maxScore: 5,
  targetScore: 3,
  items,
  ...overrides,
})

describe('calculateCourse', () => {
  it('reports an empty course', () => {
    const stats = calculateCourse(course([]))
    expect(stats.status).toBe('empty')
    expect(stats.currentAverage).toBeNull()
    expect(stats.earned).toBe(0)
  })

  it('weights every graded item by its share of the final grade', () => {
    const stats = calculateCourse(course([item(30, 4), item(20, 3), item(50, null)]))
    expect(stats.gradedWeight).toBe(50)
    expect(stats.pendingWeight).toBe(50)
    expect(stats.earned).toBe(1.8)
    expect(stats.currentAverage).toBe(3.6)
    expect(stats.maxAchievable).toBe(4.3)
  })

  it('computes the average needed on the pending weight', () => {
    const stats = calculateCourse(course([item(60, 2.5), item(40, null)]))
    expect(stats.requiredOnPending).toBe(3.75)
    expect(stats.status).toBe('reachable')
  })

  it('marks the target as secured when the pending items cannot take it away', () => {
    const stats = calculateCourse(course([item(70, 4.5), item(30, null)]))
    expect(stats.requiredOnPending).toBeLessThanOrEqual(0)
    expect(stats.status).toBe('secured')
  })

  it('marks the target as impossible when it exceeds what is still achievable', () => {
    const stats = calculateCourse(course([item(80, 1), item(20, null)], { targetScore: 4 }))
    expect(stats.maxAchievable).toBe(1.8)
    expect(stats.status).toBe('impossible')
  })

  it('marks the course as finished once every item is graded', () => {
    const stats = calculateCourse(course([item(50, 4), item(50, 3)]))
    expect(stats.status).toBe('finished')
    expect(stats.requiredOnPending).toBeNull()
    expect(stats.earned).toBe(3.5)
  })

  it('still works when the weights do not add up to 100', () => {
    const stats = calculateCourse(course([item(30, 5), item(30, null)]))
    expect(stats.totalWeight).toBe(60)
    expect(stats.earned).toBe(1.5)
    expect(stats.currentAverage).toBe(5)
  })

  it('ignores items whose score is not a number', () => {
    const stats = calculateCourse(course([item(50, Number.NaN), item(50, 4)]))
    expect(stats.gradedWeight).toBe(50)
    expect(stats.earned).toBe(2)
  })
})

describe('weightGap', () => {
  it('is zero for a fully described course', () => {
    expect(weightGap(course([item(40, null), item(60, null)]))).toBe(0)
  })

  it('is positive when weight is missing and negative when it overflows', () => {
    expect(weightGap(course([item(40, null)]))).toBe(60)
    expect(weightGap(course([item(80, null), item(40, null)]))).toBe(-20)
  })
})

describe('formatScore', () => {
  it('renders a dash for missing values', () => {
    expect(formatScore(null)).toBe('—')
    expect(formatScore(3.456)).toBe('3.46')
    expect(formatScore(3.456, 1)).toBe('3.5')
  })
})
