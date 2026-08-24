import { useEffect, useMemo, useState } from 'react'
import { CourseTabs } from './CourseTabs'
import { ItemList } from './ItemList'
import { NumberInput } from './NumberInput'
import { Summary } from './Summary'
import { calculateCourse, weightGap } from '../lib/grades'
import { createCourse, createItem, defaultState, loadState, saveState } from '../lib/storage'
import type { AppState, Course, GradeItem } from '../types'

export function GradeCalculator() {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const course = state.courses.find((candidate) => candidate.id === state.activeCourseId) ?? state.courses[0]
  const stats = useMemo(() => calculateCourse(course), [course])
  const gap = useMemo(() => weightGap(course), [course])

  const patchCourse = (patch: Partial<Course>) =>
    setState((current) => ({
      ...current,
      courses: current.courses.map((candidate) =>
        candidate.id === course.id ? { ...candidate, ...patch } : candidate,
      ),
    }))

  const patchItem = (id: string, patch: Partial<GradeItem>) =>
    patchCourse({
      items: course.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })

  const addCourse = () =>
    setState((current) => {
      const created = createCourse(`Materia ${current.courses.length + 1}`)
      return { courses: [...current.courses, created], activeCourseId: created.id }
    })

  const removeCourse = () =>
    setState((current) => {
      const remaining = current.courses.filter((candidate) => candidate.id !== course.id)
      if (remaining.length === 0) return defaultState()
      return { courses: remaining, activeCourseId: remaining[0].id }
    })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <CourseTabs
          activeCourseId={course.id}
          courses={state.courses}
          onAdd={addCourse}
          onSelect={(id) => setState((current) => ({ ...current, activeCourseId: id }))}
        />
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem]">
        <input
          aria-label="Nombre de la materia"
          className="field text-base"
          placeholder="Nombre de la materia"
          value={course.name}
          onChange={(event) => patchCourse({ name: event.target.value })}
        />
        <label className="grid gap-1">
          <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">Escala</span>
          <NumberInput
            className="text-right"
            invalid={course.maxScore <= 0}
            label="Nota máxima"
            value={course.maxScore}
            onChange={(maxScore) => patchCourse({ maxScore: maxScore ?? 0 })}
          />
        </label>
        <label className="grid gap-1">
          <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">Meta</span>
          <NumberInput
            className="text-right"
            invalid={course.targetScore > course.maxScore}
            label="Nota meta"
            value={course.targetScore}
            onChange={(targetScore) => patchCourse({ targetScore: targetScore ?? 0 })}
          />
        </label>
      </div>

      <Summary maxScore={course.maxScore} stats={stats} targetScore={course.targetScore} weightGap={gap} />

      <ItemList
        items={course.items}
        maxScore={course.maxScore}
        onAdd={() => patchCourse({ items: [...course.items, createItem()] })}
        onChange={patchItem}
        onRemove={(id) => patchCourse({ items: course.items.filter((item) => item.id !== id) })}
      />

      <footer className="mt-auto flex justify-between pt-6 text-xs text-zinc-600">
        <button className="transition-colors hover:text-rose-400" type="button" onClick={removeCourse}>
          Eliminar esta materia
        </button>
        <span>{stats.totalWeight}% de la nota definido</span>
      </footer>
    </div>
  )
}
