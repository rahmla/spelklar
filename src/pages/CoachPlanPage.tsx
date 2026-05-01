import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface Plan {
  id: string
  week_start: string
  title: string
  focus?: string
}

interface PlanSession {
  id: string
  plan_id: string
  day_of_week: number
  title: string
  type: string
  start_time?: string
  duration_minutes?: number
  intensity: string
  description?: string
  focus_cue?: string
}

interface Props {
  profile: Profile
}

const DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

const SESSION_TYPES = [
  { value: 'training',  label: 'Träning' },
  { value: 'technique', label: 'Teknik' },
  { value: 'physical',  label: 'Fysträning' },
  { value: 'gym',       label: 'Gym' },
  { value: 'match',     label: 'Match' },
  { value: 'recovery',  label: 'Återhämtning' },
  { value: 'rehab',     label: 'Rehab' },
]

const INTENSITIES = [
  { value: 'low',    label: 'Låg',    color: 'text-green-400' },
  { value: 'medium', label: 'Medel',  color: 'text-yellow-400' },
  { value: 'high',   label: 'Hög',    color: 'text-red-400' },
]

function getMonday(offset = 0): Date {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function weekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const m = monday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  const s = sunday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  return `${m} – ${s}`
}

export function CoachPlanPage({ profile }: Props) {
  const [weekOffset, setWeekOffset]   = useState(0)
  const [plan, setPlan]               = useState<Plan | null>(null)
  const [sessions, setSessions]       = useState<PlanSession[]>([])
  const [loading, setLoading]         = useState(true)
  const [creating, setCreating]       = useState(false)
  const [planFocus, setPlanFocus]     = useState('')
  const [editingFocus, setEditingFocus] = useState(false)
  const [focusDraft, setFocusDraft]   = useState('')
  const [savingFocus, setSavingFocus] = useState(false)
  const [addingDay, setAddingDay]     = useState<number | null>(null)

  // Session form
  const [sfTitle, setSfTitle]         = useState('')
  const [sfType, setSfType]           = useState('training')
  const [sfTime, setSfTime]           = useState('08:00')
  const [sfDuration, setSfDuration]   = useState(90)
  const [sfIntensity, setSfIntensity] = useState('medium')
  const [sfDesc, setSfDesc]           = useState('')
  const [sfFocus, setSfFocus]         = useState('')
  const [saving, setSaving]           = useState(false)

  const monday = getMonday(weekOffset)
  const mondayStr = toDateStr(monday)

  useEffect(() => { loadPlan() }, [weekOffset])

  async function loadPlan() {
    setLoading(true)
    const { data: plans } = await supabase
      .from('training_plans')
      .select('*')
      .eq('school_id', profile.school_id)
      .eq('week_start', mondayStr)
      .single()

    if (plans) {
      setPlan(plans)
      const { data: s } = await supabase
        .from('plan_sessions')
        .select('*')
        .eq('plan_id', plans.id)
        .order('day_of_week')
        .order('start_time')
      setSessions(s ?? [])
    } else {
      setPlan(null)
      setSessions([])
    }
    setLoading(false)
  }

  async function createPlan() {
    setCreating(true)
    const { data } = await supabase.from('training_plans').insert({
      school_id: profile.school_id,
      coach_id: profile.id,
      week_start: mondayStr,
      title: `Träningsplan v. ${monday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}`,
      focus: planFocus || null,
    }).select().single()
    setPlanFocus('')
    setCreating(false)
    if (data) { setPlan(data); setSessions([]) }
  }

  async function addSession() {
    if (!plan || !sfTitle.trim() || addingDay === null) return
    setSaving(true)

    const { data: newSession } = await supabase.from('plan_sessions').insert({
      plan_id: plan.id,
      day_of_week: addingDay,
      title: sfTitle.trim(),
      type: sfType,
      start_time: sfTime,
      duration_minutes: sfDuration,
      intensity: sfIntensity,
      description: sfDesc || null,
      focus_cue: sfFocus || null,
    }).select().single()

    if (newSession) setSessions(s => [...s, newSession].sort((a, b) => a.day_of_week - b.day_of_week || (a.start_time ?? '').localeCompare(b.start_time ?? '')))

    // Also create a schedule_item so students see it
    const sessionDate = new Date(monday)
    sessionDate.setDate(monday.getDate() + addingDay - 1)
    await supabase.from('schedule_items').insert({
      school_id: profile.school_id,
      title: sfTitle.trim(),
      type: sfType === 'technique' || sfType === 'physical' || sfType === 'rehab' ? 'training' : sfType,
      date: toDateStr(sessionDate),
      start_time: sfTime,
      notes: sfDesc || null,
      created_by: profile.id,
    })

    setSfTitle(''); setSfType('training'); setSfTime('08:00'); setSfDuration(90)
    setSfIntensity('medium'); setSfDesc(''); setSfFocus('')
    setAddingDay(null); setSaving(false)
  }

  async function deleteSession(id: string) {
    await supabase.from('plan_sessions').delete().eq('id', id)
    setSessions(s => s.filter(x => x.id !== id))
  }

  async function saveFocus() {
    if (!plan) return
    setSavingFocus(true)
    await supabase.from('training_plans').update({ focus: focusDraft || null }).eq('id', plan.id)
    setPlan(p => p ? { ...p, focus: focusDraft || undefined } : p)
    setEditingFocus(false)
    setSavingFocus(false)
  }

  const intensityLabel = (val: string) => INTENSITIES.find(i => i.value === val) ?? INTENSITIES[1]

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header + week nav */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-white font-bold text-xl">Träningsplan</h1>
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setWeekOffset(v => v - 1)}
            className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-white"
          >‹</button>
          <p className="text-white font-medium text-sm">{weekLabel(monday)}</p>
          <button
            onClick={() => setWeekOffset(v => v + 1)}
            className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-white"
          >›</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !plan ? (
        /* No plan yet */
        <div className="px-4">
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-4">Ingen plan för denna vecka ännu</p>
            <input
              type="text"
              value={planFocus}
              onChange={e => setPlanFocus(e.target.value)}
              placeholder="Veckans fokus (valfritt, t.ex. explosivitet)"
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600 mb-3"
            />
            <button
              onClick={createPlan}
              disabled={creating}
              className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-bold text-sm transition-colors"
            >
              {creating ? 'Skapar…' : 'Skapa plan för veckan'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">

          {/* Plan header — Veckans fokus */}
          {editingFocus ? (
            <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-white font-medium text-sm">Veckans fokus</p>
              <input
                type="text"
                value={focusDraft}
                onChange={e => setFocusDraft(e.target.value)}
                placeholder="T.ex. explosivitet, taktik, återhämtning…"
                autoFocus
                className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveFocus}
                  disabled={savingFocus}
                  className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-semibold text-sm"
                >
                  {savingFocus ? 'Sparar…' : 'Spara'}
                </button>
                <button
                  onClick={() => setEditingFocus(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-400 text-sm"
                >
                  Avbryt
                </button>
              </div>
            </div>
          ) : plan.focus ? (
            <div className="bg-green-900/20 border border-green-700/30 rounded-2xl px-4 py-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-gray-500 text-xs">Veckans fokus</p>
                <p className="text-green-400 font-semibold text-sm mt-0.5">{plan.focus}</p>
              </div>
              <button
                onClick={() => { setFocusDraft(plan.focus ?? ''); setEditingFocus(true) }}
                className="text-gray-500 hover:text-white text-xs mt-0.5 flex-shrink-0"
              >
                Ändra
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setFocusDraft(''); setEditingFocus(true) }}
              className="w-full py-2.5 rounded-2xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              + Sätt veckans fokus
            </button>
          )}

          {/* Days */}
          {DAYS.map((day, idx) => {
            const dayNum = idx + 1
            const daySessions = sessions.filter(s => s.day_of_week === dayNum)
            const dayDate = new Date(monday)
            dayDate.setDate(monday.getDate() + idx)
            const isAddingThisDay = addingDay === dayNum

            return (
              <div key={dayNum} className="bg-gray-900 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{day}</p>
                    <p className="text-gray-600 text-xs">{dayDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <button
                    onClick={() => setAddingDay(isAddingThisDay ? null : dayNum)}
                    className="text-xs text-green-400 font-semibold"
                  >
                    {isAddingThisDay ? 'Avbryt' : '+ Pass'}
                  </button>
                </div>

                {daySessions.length === 0 && !isAddingThisDay && (
                  <p className="text-gray-700 text-xs">Vila / inget planerat</p>
                )}

                <div className="flex flex-col gap-2">
                  {daySessions.map(s => {
                    const intens = intensityLabel(s.intensity)
                    return (
                      <div key={s.id} className="bg-gray-800 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-medium text-sm">{s.title}</p>
                              <span className={`text-xs font-semibold ${intens.color}`}>{intens.label}</span>
                            </div>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {s.start_time?.slice(0, 5)} · {s.duration_minutes} min
                              · {SESSION_TYPES.find(t => t.value === s.type)?.label ?? s.type}
                            </p>
                            {s.focus_cue && <p className="text-blue-400 text-xs mt-1">Fokus: {s.focus_cue}</p>}
                            {s.description && <p className="text-gray-500 text-xs mt-1">{s.description}</p>}
                          </div>
                          <button
                            onClick={() => deleteSession(s.id)}
                            className="text-gray-700 hover:text-red-500 text-lg leading-none flex-shrink-0"
                          >×</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add session form */}
                {isAddingThisDay && (
                  <div className="mt-3 border-t border-gray-800 pt-3 flex flex-col gap-2">
                    <input
                      type="text"
                      value={sfTitle}
                      onChange={e => setSfTitle(e.target.value)}
                      placeholder="Passnamn (t.ex. NIU-träning, Gym)"
                      className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={sfType} onChange={e => setSfType(e.target.value)} className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                        {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <select value={sfIntensity} onChange={e => setSfIntensity(e.target.value)} className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                        {INTENSITIES.map(i => <option key={i.value} value={i.value}>{i.label} intensitet</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Starttid</p>
                        <input type="time" value={sfTime} onChange={e => setSfTime(e.target.value)} className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Minuter</p>
                        <input type="number" value={sfDuration} onChange={e => setSfDuration(Number(e.target.value))} min={15} step={15} className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none" />
                      </div>
                    </div>
                    <input type="text" value={sfFocus} onChange={e => setSfFocus(e.target.value)} placeholder="Fokus-cue (valfritt, t.ex. 'Snabb armsving')" className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600" />
                    <textarea value={sfDesc} onChange={e => setSfDesc(e.target.value)} placeholder="Beskrivning av passet (valfritt)" rows={2} className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600 resize-none" />
                    <button onClick={addSession} disabled={!sfTitle.trim() || saving} className="w-full py-2.5 rounded-xl bg-green-500 disabled:opacity-40 text-white font-bold text-sm transition-colors">
                      {saving ? 'Sparar…' : 'Lägg till pass'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
