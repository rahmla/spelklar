import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, ScheduleItem, ScheduleType } from '../types'
import { SCHEDULE_CONFIG } from '../types'

interface Props {
  profile: Profile
}

const TYPE_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: 'training',  label: 'Träning' },
  { value: 'school',    label: 'Skola' },
  { value: 'match',     label: 'Match' },
  { value: 'gym',       label: 'Gym' },
  { value: 'recovery',  label: 'Återhämtning' },
  { value: 'travel',    label: 'Resa' },
  { value: 'test',      label: 'Test' },
  { value: 'meeting',   label: 'Möte' },
]

function groupByDate(items: ScheduleItem[]) {
  const map = new Map<string, ScheduleItem[]>()
  for (const item of items) {
    const existing = map.get(item.date) ?? []
    existing.push(item)
    map.set(item.date, existing)
  }
  return map
}

function formatDateHeader(dateStr: string) {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Idag'
  if (dateStr === tomorrow) return 'Imorgon'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
}

const isCoach = (role: string) => ['coach', 'teacher', 'admin'].includes(role)

export function SchedulePage({ profile }: Props) {
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<ScheduleType>('training')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formStart, setFormStart] = useState('08:00')
  const [formEnd, setFormEnd] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('schedule_items')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(60)
    setItems(data ?? [])
    setLoading(false)
  }

  async function handleAddItem() {
    if (!formTitle || !formDate || !formStart) return
    setSaving(true)
    await supabase.from('schedule_items').insert({
      school_id: profile.school_id,
      title: formTitle,
      type: formType,
      date: formDate,
      start_time: formStart,
      end_time: formEnd || null,
      location: formLocation || null,
      notes: formNotes || null,
      created_by: profile.id,
    })
    setFormTitle('')
    setFormType('training')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormStart('08:00')
    setFormEnd('')
    setFormLocation('')
    setFormNotes('')
    setShowForm(false)
    setSaving(false)
    load()
  }

  const grouped = groupByDate(items)
  const dates = [...grouped.keys()].sort()

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-xl">Schema</h1>
          <p className="text-gray-500 text-sm">Kommande pass och aktiviteter</p>
        </div>
        {isCoach(profile.role) && (
          <button
            onClick={() => setShowForm(v => !v)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              showForm ? 'bg-gray-700 text-white' : 'bg-green-500 text-white',
            ].join(' ')}
          >
            {showForm ? 'Avbryt' : '+ Lägg till'}
          </button>
        )}
      </div>

      {/* Add form (coaches only) */}
      {showForm && isCoach(profile.role) && (
        <div className="mx-4 mb-4 bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-white font-semibold text-sm">Nytt schema-inlägg</p>

          <input
            type="text"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            placeholder="Titel (t.ex. NIU-träning, Match vs Örebro)"
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={formType}
              onChange={e => setFormType(e.target.value as ScheduleType)}
              className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500 text-xs mb-1">Starttid</p>
              <input
                type="time"
                value={formStart}
                onChange={e => setFormStart(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Sluttid (valfritt)</p>
              <input
                type="time"
                value={formEnd}
                onChange={e => setFormEnd(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>

          <input
            type="text"
            value={formLocation}
            onChange={e => setFormLocation(e.target.value)}
            placeholder="Plats (valfritt)"
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600"
          />

          <textarea
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            placeholder="Anteckningar (valfritt)"
            rows={2}
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600 resize-none"
          />

          <button
            onClick={handleAddItem}
            disabled={!formTitle || saving}
            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold text-sm transition-colors"
          >
            {saving ? 'Sparar…' : 'Spara'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : dates.length === 0 ? (
        <div className="px-4 pt-8 text-center">
          <p className="text-gray-600 text-sm">Inga kommande aktiviteter</p>
          {isCoach(profile.role) && (
            <p className="text-gray-700 text-xs mt-1">Tryck på "+ Lägg till" för att lägga till ett pass</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-4">
          {dates.map(date => (
            <div key={date}>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider pt-3 pb-2 capitalize">
                {formatDateHeader(date)}
              </p>
              <div className="flex flex-col gap-2">
                {grouped.get(date)!.map(item => {
                  const cfg = SCHEDULE_CONFIG[item.type as ScheduleType] ?? SCHEDULE_CONFIG.training
                  return (
                    <div key={item.id} className={`rounded-2xl border p-4 ${cfg.color}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-white font-semibold text-sm">{item.title}</p>
                            <p className="text-gray-400 text-xs flex-shrink-0">
                              {item.start_time.slice(0, 5)}
                              {item.end_time && `–${item.end_time.slice(0, 5)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{cfg.label}</span>
                            {item.location && <span className="text-xs text-gray-500">· {item.location}</span>}
                          </div>
                          {item.notes && (
                            <p className="text-gray-400 text-xs mt-1.5">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
