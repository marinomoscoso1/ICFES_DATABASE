import type { Course } from '../types'

interface CourseTabsProps {
  courses: Course[]
  activeCourseId: string
  onSelect: (id: string) => void
  onAdd: () => void
}

export function CourseTabs({ courses, activeCourseId, onSelect, onAdd }: CourseTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {courses.map((course) => (
        <button
          key={course.id}
          aria-current={course.id === activeCourseId}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            course.id === activeCourseId
              ? 'border-zinc-500 bg-ink-800 text-zinc-100'
              : 'border-ink-700 text-zinc-500 hover:text-zinc-300'
          }`}
          type="button"
          onClick={() => onSelect(course.id)}
        >
          {course.name || 'Sin nombre'}
        </button>
      ))}
      <button
        aria-label="Agregar materia"
        className="rounded-full border border-dashed border-ink-700 px-3 py-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        type="button"
        onClick={onAdd}
      >
        +
      </button>
    </div>
  )
}
