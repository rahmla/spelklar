import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, CheckIn } from '../types'
import { getReadinessColor } from '../types'

interface Goal {
  id: string
  title: string
  type: string
  target_date?: string
  completed_at?: string
  created_at: string
}

interface Props {
  profile: Profile
}

const GOAL_TYPES = [
  { value: 'week',      label: 'Veckomål' },
  { value: 'month',     label: 'Månadsmål' },
  { value: 'term',      label: 'Terminsmål' },
  { value: 'technical', label: 'Tekniskt' },
  { value: 'physical',  label: 'Fysiskt' },
  { value: 'mental',    label: 'Mentalt' },
  { value: 'school',    label: 'Skolmål' },
]

export function ProfilePage({ profile }: Props) {
  const [checkins, setCheckins]       = useState<CheckIn[]>([])
  const [weekLoad, setWeekLoad]       = useState(0)
  const [weekSessions, setWeekSessions] = useState(0)
  const [goals, setGoals]             = useState<Goal[]>([])
  const [streak, setStreak]           = useState(0)
  const [loading, setLoading]         = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalTitle, setGoalTitle]     = useState('')
  const [goalType, setGoalType]       = useState('week')
  const [goalDate, setGoalDate]       = useState('')
  const [saving, setSaving]           = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const since = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
    const monday = (() => {
      const d = new Date(); const day = d.getDay()
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().split('T')[0]
    })()

    const [{ data: ci }, { data: g }, { data: lo }] = await Promise.all([
      supabase.from('checkins').select('*').eq('user_id', profile.id).gte('date', since).order('date', { ascending: false }),
      supabase.from('goals').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('training_load').select('rpe,duration_minutes').eq('user_id', profile.id).gte('date', monday),
    ])

    setWeekLoad((lo ?? []).reduce((s, l) => s + l.rpe * l.duration_minutes, 0))
    setWeekSessions((lo ?? []).length)
    const allCi = ci ?? []
    setCheckins(allCi)
    setGoals(g ?? [])

    // Streak
    const today = new Date().toISOString().split('T')[0]
    const dateSet = new Set(allCi.map(c => c.date))
    let s = 0
    const d = new Date()
    if (!dateSet.has(today)) d.setDate(d.getDate() - 1)
    while (true) {
      const ds = d.toISOString().split('T')[0]
      if (dateSet.has(ds)) { s++; d.setDate(d.getDate() - 1) } else break
    }
    setStreak(s)
    setLoading(false)
  }

  async function addGoal() {
    if (!goalTitle.trim()) return
    setSaving(true)
    await supabase.from('goals').insert({
      user_id: profile.id,
      school_id: profile.school_id,
      title: goalTitle.trim(),
      type: goalType,
      target_date: goalDate || null,
    })
    setGoalTitle(''); setGoalType('week'); setGoalDate('')
    setShowGoalForm(false); setSaving(false)
    load()
  }

  async function completeGoal(id: string) {
    await supabase.from('goals').update({ completed_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  async function deleteGoal(id: string) {
    await supabase.from('goals').delete().eq('id', id)
    load()
  }

  // 28-day grid: oldest top-left
  const grid = Array.from({ length: 28 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (27 - i))
    const ds = d.toISOString().split('T')[0]
    const ci = checkins.find(c => c.date === ds) ?? null
    return { date: ds, ci }
  })

  // 7-day averages
  const last7 = checkins.slice(0, 7)
  function avg(key: keyof CheckIn) {
    if (!last7.length) return null
    return (last7.reduce((s, c) => s + (c[key] as number), 0) / last7.length).toFixed(1)
  }

  const stats = [
    { key: 'sleep_quality' as const,  label: 'Sömn',       invert: false },
    { key: 'tiredness' as const,      label: 'Trötthet',   invert: true },
    { key: 'stress' as const,         label: 'Stress',     invert: true },
    { key: 'body_soreness' as const,  label: 'Kroppsvärk', invert: true },
    { key: 'motivation' as const,     label: 'Motivation', invert: false },
  ]

  const activeGoals    = goals.filter(g => !g.completed_at)
  const completedGoals = goals.filter(g =>  g.completed_at)

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-white font-bold text-xl">Min profil</h1>
        <p className="text-gray-500 text-sm">{profile.full_name}</p>
      </div>

      {loading ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4">

          {/* Weekly report */}
          {(() => {
            const today = new Date().toISOString().split('T')[0]
            const monday = (() => {
              const d = new Date(); const day = d.getDay()
              d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().split('T')[0]
            })()
            const weekCheckins = checkins.filter(c => c.date >= monday && c.date <= today)
            const daysElapsed  = Math.min(new Date().getDay() === 0 ? 7 : new Date().getDay(), 7)
            const compliance   = daysElapsed > 0 ? Math.round((weekCheckins.length / daysElapsed) * 100) : 0
            const avgSleep     = weekCheckins.length > 0
              ? (weekCheckins.reduce((s, c) => s + c.sleep_quality, 0) / weekCheckins.length).toFixed(1)
              : null
            const colors = weekCheckins.map(c => getReadinessColor(c))
            const dominant = ['green','yellow','red'].find(col => colors.filter(c => c === col).length >= colors.length / 2) ?? (weekCheckins.length > 0 ? colors[0] : null)
            const domColor = dominant === 'green' ? 'text-green-400' : dominant === 'yellow' ? 'text-yellow-400' : dominant === 'red' ? 'text-red-400' : 'text-gray-500'

            return (
              <div className="bg-gray-900 rounded-2xl p-4">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Veckans rapport</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className={`text-xl font-black ${compliance >= 70 ? 'text-green-400' : compliance >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{compliance}%</p>
                    <p className="text-gray-500 text-xs">Check-ins</p>
                    <p className="text-gray-600 text-[10px]">{weekCheckins.length}/{daysElapsed} dagar</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className={`text-xl font-black ${domColor}`}>
                      {dominant === 'green' ? 'Grön' : dominant === 'yellow' ? 'Gul' : dominant === 'red' ? 'Röd' : '–'}
                    </p>
                    <p className="text-gray-500 text-xs">Beredskap</p>
                    <p className="text-gray-600 text-[10px]">vanligast</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-orange-400">{weekLoad > 0 ? weekLoad : '–'}</p>
                    <p className="text-gray-500 text-xs">Belastn.</p>
                    <p className="text-gray-600 text-[10px]">{weekSessions} pass</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-blue-400">{avgSleep ?? '–'}</p>
                    <p className="text-gray-500 text-xs">Snitt sömn</p>
                    <p className="text-gray-600 text-[10px]">av 5</p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Streak */}
          <div className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-white font-bold">{streak > 0 ? `${streak} dagars streak` : 'Ingen aktiv streak'}</p>
              <p className="text-gray-500 text-xs">{checkins.length} check-ins de senaste 28 dagarna</p>
            </div>
          </div>

          {/* 7-day stat averages */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Snitt senaste 7 dagarna</p>
            {last7.length === 0 ? (
              <p className="text-gray-600 text-sm">Ingen data ännu</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {stats.map(s => {
                  const val = avg(s.key)
                  const n = val ? parseFloat(val) : null
                  const good = n !== null && (s.invert ? n <= 2.5 : n >= 3.5)
                  const bad  = n !== null && (s.invert ? n >= 4.0 : n <= 2.0)
                  return (
                    <div key={s.key} className="bg-gray-800 rounded-xl p-2 text-center">
                      <p className={`text-base font-bold ${good ? 'text-green-400' : bad ? 'text-red-400' : 'text-white'}`}>
                        {val ?? '–'}
                      </p>
                      <p className="text-gray-500 text-[10px] leading-tight mt-0.5">{s.label}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 28-day history grid */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Senaste 28 dagarna</p>
            <div className="grid grid-cols-7 gap-1.5">
              {grid.map(({ date, ci }) => {
                const color = ci ? getReadinessColor(ci) : null
                const bg = !color ? 'bg-gray-800'
                  : color === 'green'  ? 'bg-green-500'
                  : color === 'yellow' ? 'bg-yellow-400'
                  : 'bg-red-500'
                return <div key={date} className={`aspect-square rounded-md ${bg}`} title={date} />
              })}
            </div>
            <div className="flex gap-4 mt-3 text-[11px] text-gray-600">
              {[
                { bg: 'bg-green-500',  label: 'Redo' },
                { bg: 'bg-yellow-400', label: 'Sliten' },
                { bg: 'bg-red-500',    label: 'Risk' },
                { bg: 'bg-gray-800',   label: 'Saknas' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-sm ${l.bg} inline-block`} />{l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm">Mål</p>
              <button
                onClick={() => setShowGoalForm(v => !v)}
                className="text-xs text-green-400 font-semibold"
              >
                {showGoalForm ? 'Avbryt' : '+ Nytt mål'}
              </button>
            </div>

            {showGoalForm && (
              <div className="mb-4 flex flex-col gap-2 border-b border-gray-800 pb-4">
                <input
                  type="text"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  placeholder="Vad är målet?"
                  className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                />
                <div className="flex gap-2">
                  <select
                    value={goalType}
                    onChange={e => setGoalType(e.target.value)}
                    className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  >
                    {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={e => setGoalDate(e.target.value)}
                    className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <button
                  onClick={addGoal}
                  disabled={!goalTitle.trim() || saving}
                  className="w-full py-2.5 rounded-xl bg-green-500 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
                >
                  {saving ? 'Sparar…' : 'Spara mål'}
                </button>
              </div>
            )}

            {activeGoals.length === 0 && !showGoalForm && (
              <p className="text-gray-600 text-sm">Inga aktiva mål. Sätt ett mål!</p>
            )}

            <div className="flex flex-col divide-y divide-gray-800">
              {activeGoals.map(g => {
                const typeLabel = GOAL_TYPES.find(t => t.value === g.type)?.label ?? g.type
                return (
                  <div key={g.id} className="flex items-start gap-3 py-3">
                    <button
                      onClick={() => completeGoal(g.id)}
                      className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0 mt-0.5 hover:border-green-400 transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-snug">{g.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{typeLabel}</span>
                        {g.target_date && (
                          <span className="text-[11px] text-gray-600">
                            {new Date(g.target_date + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteGoal(g.id)} className="text-gray-700 hover:text-red-500 text-xl leading-none pb-1">×</button>
                  </div>
                )
              })}
            </div>

            {completedGoals.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-800">
                <p className="text-gray-600 text-xs mb-2">Uppnådda ({completedGoals.length})</p>
                {completedGoals.slice(0, 5).map(g => (
                  <p key={g.id} className="text-gray-700 text-xs line-through py-0.5">{g.title}</p>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
