export interface GradeItem {
  id: string
  name: string
  /** Share of the final grade, in percent. */
  weight: number
  /** Score obtained, or null while the item is still pending. */
  score: number | null
}

export interface Course {
  id: string
  name: string
  /** Highest score an item can get (5 in Colombia, 10 in Spain, 100 elsewhere). */
  maxScore: number
  /** Final grade the user wants to reach. */
  targetScore: number
  items: GradeItem[]
}

export interface AppState {
  courses: Course[]
  activeCourseId: string
}
