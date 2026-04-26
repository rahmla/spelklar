import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, CheckIn, ReadinessColor } from '../types'
import { getReadinessColor } from '../types'

interface StudentStatus {
  profile: Profile
  checkin: CheckIn | null
  color: ReadinessColor | 'none'
  streak_missing: number
}

interface Props {
  profile: Profile
}

const COLOR_CONFIG: Record<ReadinessColor | 'none', { bg: string; dot: string; label: string }> = {
  green:  { bg: 'bg-green-900/30 border-green-700/40',  dot: 'bg-green-400',  label: 'Redo' },
  yellow: { bg: 'bg-yellow-900/30 border-yellow-700/40', dot: 'bg-yellow-400', label: 'Lite sliten' },
  red:    { bg: 'bg-red-900/30 border-red-700/40',       dot: 'bg-red-500',    label: 'Risk – följ upp' },
  none:   { bg: 'bg-gray-800/60 border-gray-700',        dot: 'bg-gray-600',   label: 'Ej checkat in' },
}

export function CoachDashboard({ profile }: Props) {
  const [students, setStudents] = useState<StudentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'red' | 'none'>('all')

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    const today = new Date().toISOString().split('T')[0]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', profile.school_id)
      .eq('role', 'student')

    if (!profiles) { setLoading(false); return }

    const { data: checkins } = await supabase
      .from('checkins')
      .select('*')
      .eq('date', today)
      .in('user_id', profiles.map(p => p.id))

    const checkinMap = new Map(checkins?.map(c => [c.user_id, c]) ?? [])

    const statuses: StudentStatus[] = profiles.map(p => {
      const ci = checkinMap.get(p.id) ?? null
      return {
        profile: p,
        checkin: ci,
        color: ci ? getReadinessColor(ci) : 'none',
        streak_missing: 0,
      }
    })

    // Sort: red first, then none, then yellow, then green
    const order: Record<string, number> = { red: 0, none: 1, yellow: 2, green: 3 }
    statuses.sort((a, b) => order[a.color] - order[b.color])

    setStudents(statuses)
    setLoading(false)
  }

  const filtered = students.filter(s => {
    if (filter === 'red') return s.color === 'red'
    if (filter === 'none') return s.color === 'none'
    return true
  })

  const counts = {
    green: students.filter(s => s.color === 'green').length,
    yellow: students.filter(s => s.color === 'yellow').length,
    red: students.filter(s => s.color === 'red').length,
    none: students.filter(s => s.color === 'none').length,
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-8">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-white font-bold text-xl">Tränarvy</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        {[
          { color: 'bg-green-400',  count: counts.green,  label: 'Redo' },
          { color: 'bg-yellow-400', count: counts.yellow, label: 'Sliten' },
          { color: 'bg-red-500',    count: counts.red,    label: 'Risk' },
          { color: 'bg-gray-600',   count: counts.none,   label: 'Saknas' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 text-center">
            <div className={`w-3 h-3 rounded-full ${s.color} mx-auto mb-1`} />
            <p className="text-white font-bold text-lg">{s.count}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 px-4 pb-3">
        {(['all', 'red', 'none'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              filter === f ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-500',
            ].join(' ')}
          >
            {f === 'all' ? 'Alla' : f === 'red' ? 'Risk' : 'Ej incheckade'}
          </button>
        ))}
      </div>

      {/* Student list */}
      {loading ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4">
          {filtered.map(s => {
            const cfg = COLOR_CONFIG[s.color]
            return (
              <div key={s.profile.id} className={`rounded-2xl border p-4 ${cfg.bg}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{s.profile.full_name}</p>
                    <p className="text-gray-500 text-xs">{cfg.label}</p>
                  </div>
                  {s.checkin && (
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span title="Sömn">😴 {s.checkin.sleep_quality}/5</span>
                      <span title="Trötthet">⚡ {s.checkin.tiredness}/5</span>
                      {s.checkin.has_injury && <span className="text-red-400 font-semibold">Skada</span>}
                    </div>
                  )}
                </div>
                {s.checkin?.notes && (
                  <p className="mt-2 text-gray-400 text-xs pl-6">"{s.checkin.notes}"</p>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-gray-600 text-sm text-center pt-8">Inga elever i denna kategori</p>
          )}
        </div>
      )}
    </div>
  )
}
