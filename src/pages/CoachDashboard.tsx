import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, CheckIn, ReadinessColor } from '../types'
import { getReadinessColor } from '../types'

interface StudentStatus {
  profile: Profile
  todayCheckin: CheckIn | null
  color: ReadinessColor | 'none'
  recentCheckins: CheckIn[]
  missedDays: number
  hasActiveInjury: boolean
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

function TrendDots({ checkins, days = 7 }: { checkins: CheckIn[]; days?: number }) {
  const dateMap = new Map(checkins.map(c => [c.date, c]))
  const dots = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    const ci = dateMap.get(ds)
    if (!ci) {
      dots.push(<div key={ds} className="w-2 h-2 rounded-full bg-gray-700" />)
    } else {
      const color = getReadinessColor(ci)
      const dotColor = color === 'green' ? 'bg-green-400' : color === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
      dots.push(<div key={ds} className={`w-2 h-2 rounded-full ${dotColor}`} />)
    }
  }
  return <div className="flex gap-1 items-center">{dots}</div>
}

function trendWarning(checkins: CheckIn[]): string | null {
  if (checkins.length < 3) return null
  const last3 = checkins.slice(0, 3)
  const allRed = last3.every(c => getReadinessColor(c) === 'red')
  const allYellowOrRed = last3.every(c => getReadinessColor(c) !== 'green')
  const lowSleep = last3.filter(c => c.sleep_quality <= 2).length >= 3
  const highTiredness = last3.filter(c => c.tiredness >= 4).length >= 3
  if (allRed) return 'Röd 3 dagar i rad'
  if (lowSleep) return 'Dålig sömn 3 dagar i rad'
  if (highTiredness) return 'Hög trötthet 3 dagar i rad'
  if (allYellowOrRed) return 'Ingen grön dag senaste 3 dagarna'
  return null
}

export function CoachDashboard({ profile }: Props) {
  const [students, setStudents] = useState<StudentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'red' | 'none' | 'warning'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', profile.school_id)
      .eq('role', 'student')

    if (!profiles) { setLoading(false); return }

    const ids = profiles.map(p => p.id)

    const [{ data: checkins }, { data: injuries }] = await Promise.all([
      supabase.from('checkins').select('*').in('user_id', ids).gte('date', weekAgo).order('date', { ascending: false }),
      supabase.from('injuries').select('user_id').in('user_id', ids).is('resolved_at', null),
    ])

    const injurySet = new Set(injuries?.map(i => i.user_id) ?? [])

    const statuses: StudentStatus[] = profiles.map(p => {
      const userCheckins = checkins?.filter(c => c.user_id === p.id) ?? []
      const todayCheckin = userCheckins.find(c => c.date === today) ?? null

      // Count missed days in last 7
      let missed = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        if (!userCheckins.find(c => c.date === ds)) missed++
      }

      return {
        profile: p,
        todayCheckin,
        color: todayCheckin ? getReadinessColor(todayCheckin) : 'none',
        recentCheckins: userCheckins,
        missedDays: missed,
        hasActiveInjury: injurySet.has(p.id),
      }
    })

    const order: Record<string, number> = { red: 0, none: 1, yellow: 2, green: 3 }
    statuses.sort((a, b) => order[a.color] - order[b.color])

    setStudents(statuses)
    setLoading(false)
  }

  const withWarning = (s: StudentStatus) =>
    trendWarning(s.recentCheckins) !== null || s.missedDays >= 3 || s.hasActiveInjury

  const filtered = students.filter(s => {
    if (filter === 'red') return s.color === 'red'
    if (filter === 'none') return s.color === 'none'
    if (filter === 'warning') return withWarning(s)
    return true
  })

  const counts = {
    green:   students.filter(s => s.color === 'green').length,
    yellow:  students.filter(s => s.color === 'yellow').length,
    red:     students.filter(s => s.color === 'red').length,
    none:    students.filter(s => s.color === 'none').length,
    warning: students.filter(withWarning).length,
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-white font-bold text-xl">Tränarvy</h1>
        <p className="text-gray-500 text-sm capitalize">
          {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
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
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {([
          { id: 'all',     label: 'Alla' },
          { id: 'red',     label: 'Risk' },
          { id: 'none',    label: 'Ej incheckade' },
          { id: 'warning', label: `⚠️ Varning (${counts.warning})` },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
              filter === f.id ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-500',
            ].join(' ')}
          >
            {f.label}
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
            const warning = trendWarning(s.recentCheckins)
            const isExpanded = expanded === s.profile.id
            return (
              <div
                key={s.profile.id}
                className={`rounded-2xl border ${cfg.bg} transition-all`}
              >
                <button
                  className="w-full p-4 text-left"
                  onClick={() => setExpanded(isExpanded ? null : s.profile.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm">{s.profile.full_name}</p>
                        {s.hasActiveInjury && <span className="text-xs bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-md">Skada</span>}
                        {s.missedDays >= 3 && !s.todayCheckin && <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-md">{s.missedDays}d saknas</span>}
                      </div>
                      <p className="text-gray-500 text-xs">{cfg.label}</p>
                    </div>
                    <TrendDots checkins={s.recentCheckins} />
                  </div>

                  {warning && (
                    <p className="mt-2 text-yellow-400 text-xs pl-6">⚠️ {warning}</p>
                  )}
                </button>

                {isExpanded && s.todayCheckin && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3">
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      {[
                        { label: 'Sömn', val: s.todayCheckin.sleep_quality },
                        { label: 'Trötthet', val: s.todayCheckin.tiredness },
                        { label: 'Stress', val: s.todayCheckin.stress },
                        { label: 'Kroppsvärk', val: s.todayCheckin.body_soreness },
                        { label: 'Motivation', val: s.todayCheckin.motivation },
                      ].map(item => (
                        <div key={item.label} className="bg-black/20 rounded-lg p-2 text-center">
                          <p className="text-white font-bold">{item.val}/5</p>
                          <p className="text-gray-500">{item.label}</p>
                        </div>
                      ))}
                      <div className="bg-black/20 rounded-lg p-2 text-center">
                        <p className={`font-bold ${s.todayCheckin.ate_breakfast ? 'text-green-400' : 'text-red-400'}`}>
                          {s.todayCheckin.ate_breakfast ? 'Ja' : 'Nej'}
                        </p>
                        <p className="text-gray-500">Frukost</p>
                      </div>
                    </div>
                    {s.todayCheckin.notes && (
                      <p className="text-gray-400 text-xs mt-1">"{s.todayCheckin.notes}"</p>
                    )}
                  </div>
                )}

                {isExpanded && !s.todayCheckin && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/5">
                    <p className="text-gray-600 text-xs">Har inte checkat in idag</p>
                    {s.recentCheckins.length > 0 && (
                      <p className="text-gray-600 text-xs mt-0.5">
                        Senast: {new Date(s.recentCheckins[0].date + 'T00:00:00').toLocaleDateString('sv-SE')}
                      </p>
                    )}
                  </div>
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
