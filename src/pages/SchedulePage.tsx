import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, ScheduleItem, ScheduleType } from '../types'
import { SCHEDULE_CONFIG } from '../types'

interface Props {
  profile: Profile
}

interface AttendanceRecord {
  schedule_item_id: string
  status: string
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

const ATTENDANCE_OPTIONS = [
  { value: 'present', label: 'Närv.',  active: 'bg-green-500 text-white' },
  { value: 'late',    label: 'Sen',    active: 'bg-yellow-500 text-white' },
  { value: 'sick',    label: 'Sjuk',   active: 'bg-orange-500 text-white' },
  { value: 'injured', label: 'Skadad', active: 'bg-red-500 text-white' },
  { value: 'absent',  label: 'Frånv.', active: 'bg-gray-600 text-white' },
]

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  present: { label: 'Närvarande', color: 'text-green-400' },
  late:    { label: 'Sen',        color: 'text-yellow-400' },
  sick:    { label: 'Sjuk',       color: 'text-orange-400' },
  injured: { label: 'Skadad',     color: 'text-red-400' },
  absent:  { label: 'Frånvaro',   color: 'text-gray-500' },
}

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
  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (dateStr === today)    return 'Idag'
  if (dateStr === tomorrow) return 'Imorgon'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
}

const isCoachRole = (role: string) => ['coach', 'teacher', 'admin'].includes(role)
const attendanceTypes = new Set(['training', 'match', 'gym', 'test'])

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function weeksBetween(from: string, to: string): number {
  const ms = new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()
  return Math.max(1, Math.ceil(ms / (7 * 86400000)) + 1)
}

function nextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export function SchedulePage({ profile }: Props) {
  const [items, setItems]               = useState<ScheduleItem[]>([])
  const [attendance, setAttendance]     = useState<AttendanceRecord[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [showHistory, setShowHistory]   = useState(false)
  const [savingAttend, setSavingAttend] = useState<string | null>(null)
  const [editingAttend, setEditingAttend] = useState<string | null>(null)

  // Add form
  const [formTitle, setFormTitle]         = useState('')
  const [formType, setFormType]           = useState<ScheduleType>('training')
  const [formDate, setFormDate]           = useState(new Date().toISOString().split('T')[0])
  const [formStart, setFormStart]         = useState('08:00')
  const [formEnd, setFormEnd]             = useState('')
  const [formLocation, setFormLocation]   = useState('')
  const [formNotes, setFormNotes]         = useState('')
  const [formRecurring, setFormRecurring] = useState(false)
  const [formUntil, setFormUntil]         = useState(nextMonday)
  const [saving, setSaving]               = useState(false)

  // Edit item
  const [editItem, setEditItem]       = useState<ScheduleItem | null>(null)
  const [editTitle, setEditTitle]     = useState('')
  const [editType, setEditType]       = useState<ScheduleType>('training')
  const [editDate, setEditDate]       = useState('')
  const [editStart, setEditStart]     = useState('')
  const [editEnd, setEditEnd]         = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editNotes, setEditNotes]     = useState('')
  const [savingEdit, setSavingEdit]   = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const farBack = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0]
    const [{ data: scheduleData }, { data: attendData }] = await Promise.all([
      supabase.from('schedule_items').select('*').gte('date', farBack)
        .order('date', { ascending: true }).order('start_time', { ascending: true }).limit(200),
      supabase.from('attendance').select('schedule_item_id,status').eq('user_id', profile.id),
    ])
    setItems(scheduleData ?? [])
    setAttendance(attendData ?? [])
    setLoading(false)
  }

  function startEdit(item: ScheduleItem) {
    setEditItem(item)
    setEditTitle(item.title)
    setEditType(item.type as ScheduleType)
    setEditDate(item.date)
    setEditStart(item.start_time?.slice(0, 5) ?? '')
    setEditEnd(item.end_time?.slice(0, 5) ?? '')
    setEditLocation(item.location ?? '')
    setEditNotes(item.notes ?? '')
  }

  function cancelEdit() {
    setEditItem(null)
  }

  async function handleSaveEdit() {
    if (!editItem || !editTitle || !editDate || !editStart) return
    setSavingEdit(true)
    await supabase.from('schedule_items').update({
      title: editTitle,
      type: editType,
      date: editDate,
      start_time: editStart,
      end_time: editEnd || null,
      location: editLocation || null,
      notes: editNotes || null,
    }).eq('id', editItem.id)
    setItems(prev => prev.map(i =>
      i.id === editItem.id
        ? { ...i, title: editTitle, type: editType, date: editDate, start_time: editStart, end_time: editEnd || null, location: editLocation || null, notes: editNotes || null }
        : i
    ))
    setEditItem(null)
    setSavingEdit(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('schedule_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setDeletingId(null)
  }

  async function markAttendance(scheduleItemId: string, status: string) {
    setSavingAttend(scheduleItemId)
    await supabase.from('attendance').upsert(
      { schedule_item_id: scheduleItemId, user_id: profile.id, status },
      { onConflict: 'schedule_item_id,user_id' }
    )
    setAttendance(prev => {
      const without = prev.filter(a => a.schedule_item_id !== scheduleItemId)
      return [...without, { schedule_item_id: scheduleItemId, status }]
    })
    setEditingAttend(null)
    setSavingAttend(null)
  }

  async function handleAddItem() {
    if (!formTitle || !formDate || !formStart) return
    setSaving(true)
    const base = {
      school_id: profile.school_id,
      title: formTitle,
      type: formType,
      start_time: formStart,
      end_time: formEnd || null,
      location: formLocation || null,
      notes: formNotes || null,
      created_by: profile.id,
    }
    if (formRecurring) {
      const weeks = weeksBetween(formDate, formUntil)
      const inserts = Array.from({ length: weeks }, (_, i) => ({
        ...base,
        date: addDays(formDate, i * 7),
      })).filter(row => row.date <= formUntil)
      await supabase.from('schedule_items').insert(inserts)
    } else {
      await supabase.from('schedule_items').insert({ ...base, date: formDate })
    }
    setFormTitle(''); setFormType('training')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormStart('08:00'); setFormEnd(''); setFormLocation(''); setFormNotes('')
    setFormRecurring(false)
    setShowForm(false); setSaving(false)
    load()
  }

  const today     = new Date().toISOString().split('T')[0]
  const cutoff    = addDays(today, -1)
  const attendMap = new Map(attendance.map(a => [a.schedule_item_id, a.status]))
  const isCoach   = isCoachRole(profile.role)

  const currentItems  = items.filter(i => i.date >= cutoff)
  const historicItems = items.filter(i => i.date <  cutoff)

  const currentGrouped  = groupByDate(currentItems)
  const historicGrouped = groupByDate(historicItems)
  const currentDates    = [...currentGrouped.keys()].sort()
  const historicDates   = [...historicGrouped.keys()].sort().reverse()

  function renderItem(item: ScheduleItem) {
    const cfg           = SCHEDULE_CONFIG[item.type as ScheduleType] ?? SCHEDULE_CONFIG.training
    const isPast        = item.date <= today
    const needAttend    = !isCoach && attendanceTypes.has(item.type) && isPast
    const currentStatus = attendMap.get(item.id)
    const isEditing     = editingAttend === item.id
    const isSavingAtt   = savingAttend === item.id
    const isDeleting    = deletingId === item.id

    // Inline edit form for coaches
    if (isCoach && editItem?.id === item.id) {
      return (
        <div key={item.id} className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3 border border-green-700/40">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold text-sm">Redigera pass</p>
            <button onClick={cancelEdit} className="text-gray-500 hover:text-white text-xs">Avbryt</button>
          </div>
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            placeholder="Titel"
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600" />
          <div className="grid grid-cols-2 gap-3">
            <select value={editType} onChange={e => setEditType(e.target.value as ScheduleType)}
              className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500 text-xs mb-1">Starttid</p>
              <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Sluttid (valfritt)</p>
              <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>
          <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)}
            placeholder="Plats (valfritt)"
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600" />
          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}
            placeholder="Anteckningar (valfritt)"
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600 resize-none" />
          <button onClick={handleSaveEdit} disabled={!editTitle || savingEdit}
            className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            {savingEdit ? 'Sparar…' : 'Spara ändringar'}
          </button>
        </div>
      )
    }

    return (
      <div key={item.id} className={`rounded-2xl border p-4 ${cfg.color} ${isDeleting ? 'opacity-40' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-white font-semibold text-sm">{item.title}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-gray-400 text-xs">
                  {item.start_time.slice(0, 5)}{item.end_time && `–${item.end_time.slice(0, 5)}`}
                </p>
                {isCoach && (
                  <>
                    <button
                      onClick={() => startEdit(item)}
                      className="text-gray-600 hover:text-green-400 transition-colors"
                      title="Redigera"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting}
                      className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Ta bort"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">{cfg.label}</span>
              {item.location && <span className="text-xs text-gray-500">· {item.location}</span>}
            </div>
            {item.notes && <p className="text-gray-400 text-xs mt-1.5">{item.notes}</p>}

            {/* Attendance */}
            {needAttend && (
              <div className="mt-3">
                {currentStatus && !isEditing ? (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${STATUS_LABEL[currentStatus]?.color}`}>
                      {STATUS_LABEL[currentStatus]?.label}
                    </span>
                    <button
                      onClick={() => setEditingAttend(item.id)}
                      className="text-gray-500 text-xs underline"
                    >
                      ändra
                    </button>
                  </div>
                ) : (
                  <>
                    {!currentStatus && <p className="text-gray-600 text-xs mb-2">Markera närvaro:</p>}
                    {isEditing && <p className="text-gray-500 text-xs mb-2">Välj ny status:</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {ATTENDANCE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => markAttendance(item.id, opt.value)}
                          disabled={isSavingAtt}
                          className={[
                            'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50',
                            currentStatus === opt.value && !isEditing ? opt.active : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                          ].join(' ')}
                        >
                          {isSavingAtt ? '…' : opt.label}
                        </button>
                      ))}
                      {isEditing && (
                        <button
                          onClick={() => setEditingAttend(null)}
                          className="px-2.5 py-1 rounded-lg text-xs text-gray-600"
                        >
                          Avbryt
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const recurringWeekCount = formRecurring ? weeksBetween(formDate, formUntil) : 0

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-xl">Schema</h1>
          <p className="text-gray-500 text-sm">Kommande pass och aktiviteter</p>
        </div>
        {isCoach && (
          <button
            onClick={() => { setShowForm(v => !v); setEditItem(null) }}
            className={['px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              showForm ? 'bg-gray-700 text-white' : 'bg-green-500 text-white'].join(' ')}
          >
            {showForm ? 'Avbryt' : '+ Lägg till'}
          </button>
        )}
      </div>

      {/* Coach add form */}
      {showForm && isCoach && (
        <div className="mx-4 mb-4 bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-white font-semibold text-sm">Nytt schema-inlägg</p>
          <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
            placeholder="Titel (t.ex. NIU-träning, Match vs Örebro)"
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600" />
          <div className="grid grid-cols-2 gap-3">
            <select value={formType} onChange={e => setFormType(e.target.value as ScheduleType)}
              className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500 text-xs mb-1">Starttid</p>
              <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Sluttid (valfritt)</p>
              <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>
          <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)}
            placeholder="Plats (valfritt)"
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600" />
          <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
            placeholder="Anteckningar (valfritt)"
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600 resize-none" />

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setFormRecurring(v => !v)}
              className={['relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
                formRecurring ? 'bg-green-500' : 'bg-gray-700'].join(' ')}
            >
              <span className={['absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                formRecurring ? 'translate-x-6' : 'translate-x-0'].join(' ')} />
            </div>
            <span className="text-white text-sm">Upprepa varje vecka</span>
          </label>

          {formRecurring && (
            <div className="bg-gray-800 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <p className="text-gray-400 text-sm flex-shrink-0">Upprepa till:</p>
                <input type="date" value={formUntil} min={addDays(formDate, 7)}
                  onChange={e => setFormUntil(e.target.value)}
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
              </div>
              <p className="text-gray-500 text-xs">
                Skapar {recurringWeekCount} tillfällen — {formDate} t.o.m. {formUntil}
              </p>
            </div>
          )}

          <button onClick={handleAddItem} disabled={!formTitle || saving}
            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            {saving ? 'Sparar…' : formRecurring ? `Spara (${recurringWeekCount} tillfällen)` : 'Spara'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-4">
          {currentDates.length === 0 ? (
            <p className="text-gray-600 text-sm text-center pt-8">Inga kommande aktiviteter</p>
          ) : (
            currentDates.map(date => (
              <div key={date}>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider pt-3 pb-2 capitalize">
                  {formatDateHeader(date)}
                </p>
                <div className="flex flex-col gap-2">
                  {currentGrouped.get(date)!.map(renderItem)}
                </div>
              </div>
            ))
          )}

          {historicItems.length > 0 && (
            <div className="mt-4 border-t border-gray-800 pt-2">
              <button
                onClick={() => setShowHistory(v => !v)}
                className="w-full flex items-center justify-between px-1 py-3 text-sm font-medium"
              >
                <span className="text-gray-400 font-semibold">
                  Historik
                  <span className="ml-2 text-gray-600 font-normal text-xs">({historicItems.length} pass)</span>
                </span>
                <svg viewBox="0 0 24 24" fill="currentColor"
                  className={['w-5 h-5 text-gray-500 transition-transform duration-200', showHistory ? 'rotate-180' : ''].join(' ')}>
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
              </button>
              {showHistory && (
                <div className="flex flex-col gap-1">
                  {historicDates.map(date => (
                    <div key={date}>
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider pt-2 pb-1 capitalize">
                        {formatDateHeader(date)}
                      </p>
                      <div className="flex flex-col gap-2">
                        {historicGrouped.get(date)!.map(renderItem)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
