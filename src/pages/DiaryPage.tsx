import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface DiaryEntry {
  id: string
  date: string
  session_title?: string
  went_well?: string
  was_difficult?: string
  focus_next?: string
  body_feeling?: number
  notes?: string
}

interface Props {
  profile: Profile
  onBack: () => void
}

export function DiaryPage({ profile, onBack }: Props) {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0])
  const [sessionTitle, setSessionTitle] = useState('')
  const [wentWell, setWentWell]       = useState('')
  const [wasDifficult, setWasDifficult] = useState('')
  const [focusNext, setFocusNext]     = useState('')
  const [bodyFeeling, setBodyFeeling] = useState(0)
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const since = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
    const { data } = await supabase
      .from('training_diary')
      .select('*')
      .eq('user_id', profile.id)
      .gte('date', since)
      .order('date', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }

  async function save() {
    if (!wentWell.trim() && !wasDifficult.trim() && !focusNext.trim()) return
    setSaving(true)
    await supabase.from('training_diary').insert({
      user_id: profile.id,
      date,
      session_title: sessionTitle || null,
      went_well: wentWell || null,
      was_difficult: wasDifficult || null,
      focus_next: focusNext || null,
      body_feeling: bodyFeeling || null,
      notes: notes || null,
    })
    setDate(new Date().toISOString().split('T')[0])
    setSessionTitle(''); setWentWell(''); setWasDifficult('')
    setFocusNext(''); setBodyFeeling(0); setNotes('')
    setShowForm(false); setSaving(false)
    load()
  }

  const canSave = wentWell.trim() || wasDifficult.trim() || focusNext.trim()

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div>
          <h1 className="text-white font-bold text-xl">Träningsdagbok</h1>
          <p className="text-gray-500 text-sm">Reflektioner efter pass</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        <button
          onClick={() => setShowForm(v => !v)}
          className={['w-full py-3 rounded-2xl font-semibold text-sm transition-colors',
            showForm ? 'bg-gray-800 text-gray-400' : 'bg-green-500 text-white'].join(' ')}
        >
          {showForm ? 'Avbryt' : '+ Ny reflektion'}
        </button>

        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-500 text-xs mb-1">Datum</p>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Typ av pass</p>
                <input type="text" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)}
                  placeholder="T.ex. NIU, Gym…"
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600" />
              </div>
            </div>

            {[
              { label: '✅ Vad gick bra?',        val: wentWell,      set: setWentWell,      ph: 'T.ex. bra tajming, hög energi…' },
              { label: '🔧 Vad var svårt?',        val: wasDifficult,  set: setWasDifficult,  ph: 'T.ex. koncentrationen föll…' },
              { label: '🎯 Fokus nästa gång',      val: focusNext,     set: setFocusNext,     ph: 'T.ex. komma till bollen tidigare…' },
            ].map(q => (
              <div key={q.label}>
                <p className="text-white font-medium text-xs mb-1.5">{q.label}</p>
                <textarea value={q.val} onChange={e => q.set(e.target.value)} placeholder={q.ph} rows={2}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600 resize-none" />
              </div>
            ))}

            <div>
              <p className="text-white font-medium text-xs mb-2">Kroppskänsla</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setBodyFeeling(n)}
                    className={['flex-1 h-10 rounded-xl text-sm font-bold transition-colors',
                      bodyFeeling === n ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400'].join(' ')}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-600">
                <span>Tungt</span><span>Energisk</span>
              </div>
            </div>

            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Övrigt (valfritt)" rows={2}
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600 resize-none" />

            <button onClick={save} disabled={!canSave || saving}
              className="w-full py-3 rounded-xl bg-green-500 disabled:opacity-40 text-white font-bold text-sm transition-colors">
              {saving ? 'Sparar…' : 'Spara reflektion'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center pt-8">
            <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-gray-600 text-sm text-center pt-8">Inga reflektioner ännu. Skriv efter nästa pass!</p>
        ) : (
          entries.map(e => (
            <div key={e.id} className="bg-gray-900 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-sm">{e.session_title ?? 'Träningspass'}</p>
                  <p className="text-gray-500 text-xs capitalize">
                    {new Date(e.date + 'T00:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                {e.body_feeling && (
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={['w-2 h-2 rounded-full', n <= e.body_feeling! ? 'bg-green-400' : 'bg-gray-700'].join(' ')} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {e.went_well && (
                  <div><p className="text-gray-500 text-xs mb-0.5">✅ Gick bra</p><p className="text-gray-300 text-sm">{e.went_well}</p></div>
                )}
                {e.was_difficult && (
                  <div><p className="text-gray-500 text-xs mb-0.5">🔧 Var svårt</p><p className="text-gray-300 text-sm">{e.was_difficult}</p></div>
                )}
                {e.focus_next && (
                  <div><p className="text-gray-500 text-xs mb-0.5">🎯 Fokus nästa</p><p className="text-gray-300 text-sm">{e.focus_next}</p></div>
                )}
                {e.notes && <p className="text-gray-600 text-xs">{e.notes}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
