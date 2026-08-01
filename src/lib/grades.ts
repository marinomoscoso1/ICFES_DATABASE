import type { Course, GradeItem } from '../types'

export type CourseStatus = 'empty' | 'secured' | 'reachable' | 'impossible' | 'finished'

export interface CourseStats {
  /** Sum of every item weight, in percent. Should add up to 100. */
  totalWeight: number
  gradedWeight: number
  pendingWeight: number
  /** Points already locked in, on the course scale. */
  earned: number
  /** Weighted average of the graded items only, on the course scale. */
  currentAverage: number | null
  /** Best final grade still attainable if every pending item is perfect. */
  maxAchievable: number
  /** Average needed across the pending weight to hit the target. */
  requiredOnPending: number | null
  status: CourseStatus
}

export const round = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

const isGraded = (item: GradeItem): boolean => item.score !== null && Number.isFinite(item.score)

const sumWeight = (items: GradeItem[]): number =>
  items.reduce((total, item) => total + (Number.isFinite(item.weight) ? item.weight : 0), 0)

export function calculateCourse(course: Course): CourseStats {
  const { items, maxScore, targetScore } = course
  const graded = items.filter(isGraded)

  const totalWeight = sumWeight(items)
  const gradedWeight = sumWeight(graded)
  const pendingWeight = round(totalWeight - gradedWeight, 4)

  const earned = graded.reduce((total, item) => total + (item.score as number) * (item.weight / 100), 0)
  const currentAverage = gradedWeight > 0 ? (earned / gradedWeight) * 100 : null
  const maxAchievable = earned + (pendingWeight / 100) * maxScore

  const requiredOnPending =
    pendingWeight > 0 ? ((targetScore - earned) / pendingWeight) * 100 : null

  const status: CourseStatus =
    items.length === 0
      ? 'empty'
      : pendingWeight <= 0
        ? 'finished'
        : requiredOnPending !== null && requiredOnPending <= 0
          ? 'secured'
          : maxAchievable + 1e-9 < targetScore
            ? 'impossible'
            : 'reachable'

  return {
    totalWeight: round(totalWeight),
    gradedWeight: round(gradedWeight),
    pendingWeight: round(pendingWeight),
    earned: round(earned),
    currentAverage: currentAverage === null ? null : round(currentAverage),
    maxAchievable: round(maxAchievable),
    requiredOnPending: requiredOnPending === null ? null : round(requiredOnPending),
    status,
  }
}

/** Distance from 100% of assigned weight; 0 means the course is fully described. */
export function weightGap(course: Course): number {
  return round(100 - sumWeight(course.items))
}

export function formatScore(value: number | null, decimals = 2): string {
  return value === null ? '—' : value.toFixed(decimals)
}
