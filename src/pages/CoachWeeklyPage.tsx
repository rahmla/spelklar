import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, CheckIn } from '../types'
import { getReadinessColor } from '../types'

interface StudentWeek {
  profile: Profile
  checkins: CheckIn[]
  loadPoints: number
  sessions: number
}

interface Props {
  profile: Profile
}

function getMonday(offset = 0): Date {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function toStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function weekLabel(monday: Date) {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return `${monday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}`
}

const DAY_SHORT = ['M', 'T', 'O', 'T', 'F', 'L', 'S']

export function CoachWeeklyPage({ profile }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [students, setStudents]     = useState<StudentWeek[]>([])
  const [injuryCount, setInjuryCount] = useState(0)
  const [loading, setLoading]       = useState(true)

  const monday  = getMonday(weekOffset)
  const sunday  = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const monStr  = toStr(monday)
  const sunStr  = toStr(sunday)

  useEffect(() => { load() }, [weekOffset])

  async function load() {
    setLoading(true)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', profile.school_id)
      .eq('role', 'student')

    if (!profiles || profiles.length === 0) { setLoading(false); return }
    const ids = profiles.map(p => p.id)

    const [{ data: checkins }, { data: loads }, { data: injuries }] = await Promise.all([
      supabase.from('checkins').select('*').in('user_id', ids).gte('date', monStr).lte('date', sunStr),
      supabase.from('training_load').select('*').in('user_id', ids).gte('date', monStr).lte('date', sunStr),
      supabase.from('injuries').select('user_id').in('user_id', ids).is('resolved_at', null),
    ])

    setInjuryCount(new Set(injuries?.map(i => i.user_id) ?? []).size)

    const result: StudentWeek[] = profiles.map(p => {
      const ci = checkins?.filter(c => c.user_id === p.id) ?? []
      const lo = loads?.filter(l => l.user_id === p.id) ?? []
      return {
        profile: p,
        checkins: ci,
        loadPoints: lo.reduce((s, l) => s + l.rpe * l.duration_minutes, 0),
        sessions: lo.length,
      }
    })

    result.sort((a, b) => b.loadPoints - a.loadPoints)
    setStudents(result)
    setLoading(false)
  }

  const totalCheckins  = students.reduce((s, st) => s + st.checkins.length, 0)
  const maxPossible    = students.length * 7
  const compliance     = maxPossible > 0 ? Math.round((totalCheckins / maxPossible) * 100) : 0
  const totalLoad      = students.reduce((s, st) => s + st.loadPoints, 0)
  const maxLoad        = Math.max(...students.map(s => s.loadPoints), 1)

  // Days of the week as date strings
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return toStr(d)
  })

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-white font-bold text-xl">Veckans överblick</h1>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setWeekOffset(v => v - 1)}
          className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-white">‹</button>
        <p className="text-white font-medium text-sm">{weekLabel(monday)}</p>
        <button onClick={() => setWeekOffset(v => v + 1)}
          className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-white">›</button>
      </div>

      {loading ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 rounded-2xl p-3 text-center">
              <p className={`text-xl font-black ${compliance >= 70 ? 'text-green-400' : compliance >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {compliance}%
              </p>
              <p className="text-gray-500 text-xs mt-0.5">Incheckn.</p>
              <p className="text-gray-600 text-[10px]">{totalCheckins}/{maxPossible} dagar</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-orange-400">{totalLoad}</p>
              <p className="text-gray-500 text-xs mt-0.5">Gruppbelastn.</p>
              <p className="text-gray-600 text-[10px]">poäng totalt</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-3 text-center">
              <p className={`text-xl font-black ${injuryCount === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {injuryCount}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">Skador</p>
              <p className="text-gray-600 text-[10px]">aktiva</p>
            </div>
          </div>

          {/* Check-in compliance per student */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Incheckning per elev</p>

            {/* Day headers */}
            <div className="flex items-center gap-2 mb-2 pl-[120px]">
              {DAY_SHORT.map((d, i) => {
                const isToday = weekDays[i] === toStr(new Date())
                return (
                  <div key={i} className={['w-6 text-center text-[10px] font-semibold',
                    isToday ? 'text-green-400' : 'text-gray-600'].join(' ')}>
                    {d}
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-2">
              {students.map(s => {
                const ciMap = new Map(s.checkins.map(c => [c.date, c]))
                const checkedIn = s.checkins.length
                return (
                  <div key={s.profile.id} className="flex items-center gap-2">
                    <div className="w-[120px] flex-shrink-0">
                      <p className="text-white text-xs font-medium truncate">{s.profile.full_name.split(' ')[0]}</p>
                      <p className="text-gray-600 text-[10px]">{checkedIn}/7</p>
                    </div>
                    {weekDays.map(ds => {
                      const ci = ciMap.get(ds)
                      const today = toStr(new Date())
                      const isFuture = ds > today
                      const color = ci ? getReadinessColor(ci) : null
                      const bg = isFuture ? 'bg-gray-800/40'
                        : !color ? 'bg-gray-700'
                        : color === 'green' ? 'bg-green-500'
                        : color === 'yellow' ? 'bg-yellow-400'
                        : 'bg-red-500'
                      return <div key={ds} className={`w-6 h-6 rounded-md flex-shrink-0 ${bg}`} />
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Load per student */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Träningsbelastning</p>
            {students.every(s => s.loadPoints === 0) ? (
              <p className="text-gray-600 text-sm">Inga pass loggade denna vecka</p>
            ) : (
              <div className="flex flex-col gap-3">
                {students.map(s => {
                  const pct = maxLoad > 0 ? (s.loadPoints / maxLoad) * 100 : 0
                  const barColor = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-orange-400' : 'bg-green-500'
                  return (
                    <div key={s.profile.id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white text-xs font-medium">{s.profile.full_name.split(' ')[0]}</p>
                        <p className="text-gray-500 text-xs">
                          {s.loadPoints > 0 ? `${s.loadPoints} p · ${s.sessions} pass` : 'Inget loggat'}
                        </p>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Readiness distribution this week */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Beredskap denna vecka</p>
            {(() => {
              const allCi = students.flatMap(s => s.checkins)
              if (allCi.length === 0) return <p className="text-gray-600 text-sm">Ingen data</p>
              const green  = allCi.filter(c => getReadinessColor(c) === 'green').length
              const yellow = allCi.filter(c => getReadinessColor(c) === 'yellow').length
              const red    = allCi.filter(c => getReadinessColor(c) === 'red').length
              const total  = allCi.length
              return (
                <div className="flex gap-2">
                  {[
                    { label: 'Redo',   count: green,  pct: Math.round(green/total*100),  bg: 'bg-green-500' },
                    { label: 'Sliten', count: yellow, pct: Math.round(yellow/total*100), bg: 'bg-yellow-400' },
                    { label: 'Risk',   count: red,    pct: Math.round(red/total*100),    bg: 'bg-red-500' },
                  ].map(s => (
                    <div key={s.label} className="flex-1 bg-gray-800 rounded-xl p-3 text-center">
                      <div className={`w-3 h-3 rounded-full ${s.bg} mx-auto mb-1`} />
                      <p className="text-white font-bold text-lg">{s.count}</p>
                      <p className="text-gray-500 text-xs">{s.label}</p>
                      <p className="text-gray-600 text-[10px]">{s.pct}%</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

        </div>
      )}
    </div>
  )
}
