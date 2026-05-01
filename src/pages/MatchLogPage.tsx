import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface MatchEntry {
  id: string
  date: string
  opponent?: string
  result?: string
  score?: string
  play_time_minutes?: number
  feeling?: number
  went_well?: string
  to_improve?: string
  notes?: string
}

interface Props {
  profile: Profile
  onBack: () => void
}

const RESULTS = [
  { value: 'win',       label: 'Vinst',       color: 'bg-green-500' },
  { value: 'loss',      label: 'Förlust',     color: 'bg-red-500' },
  { value: 'draw',      label: 'Oavgjort',    color: 'bg-yellow-500' },
  { value: 'no_result', label: 'Inget res.',  color: 'bg-gray-600' },
]

const RESULT_COLORS: Record<string, string> = {
  win:       'text-green-400',
  loss:      'text-red-400',
  draw:      'text-yellow-400',
  no_result: 'text-gray-500',
}

const RESULT_LABELS: Record<string, string> = {
  win: 'Vinst', loss: 'Förlust', draw: 'Oavgjort', no_result: 'Inget resultat',
}

export function MatchLogPage({ profile, onBack }: Props) {
  const [entries, setEntries]   = useState<MatchEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [date, setDate]           = useState(new Date().toISOString().split('T')[0])
  const [opponent, setOpponent]   = useState('')
  const [result, setResult]       = useState('')
  const [score, setScore]         = useState('')
  const [playTime, setPlayTime]   = useState(0)
  const [feeling, setFeeling]     = useState(0)
  const [wentWell, setWentWell]   = useState('')
  const [toImprove, setToImprove] = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('match_log')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .limit(30)
    setEntries(data ?? [])
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    await supabase.from('match_log').insert({
      user_id: profile.id,
      date,
      opponent: opponent || null,
      result: result || null,
      score: score || null,
      play_time_minutes: playTime || null,
      feeling: feeling || null,
      went_well: wentWell || null,
      to_improve: toImprove || null,
      notes: notes || null,
    })
    setDate(new Date().toISOString().split('T')[0])
    setOpponent(''); setResult(''); setScore(''); setPlayTime(0)
    setFeeling(0); setWentWell(''); setToImprove(''); setNotes('')
    setShowForm(false); setSaving(false)
    load()
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div>
          <h1 className="text-white font-bold text-xl">Match- och tävlingslogg</h1>
          <p className="text-gray-500 text-sm">{entries.length} matcher loggade</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        <button
          onClick={() => setShowForm(v => !v)}
          className={['w-full py-3 rounded-2xl font-semibold text-sm transition-colors',
            showForm ? 'bg-gray-800 text-gray-400' : 'bg-orange-500 text-white'].join(' ')}
        >
          {showForm ? 'Avbryt' : '+ Ny match / tävling'}
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
                <p className="text-gray-500 text-xs mb-1">Motståndare</p>
                <input type="text" value={opponent} onChange={e => setOpponent(e.target.value)}
                  placeholder="T.ex. IFK Göteborg"
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600" />
              </div>
            </div>

            <div>
              <p className="text-white font-medium text-xs mb-2">Resultat</p>
              <div className="grid grid-cols-4 gap-2">
                {RESULTS.map(r => (
                  <button key={r.value} onClick={() => setResult(r.value)}
                    className={['py-2 rounded-xl text-xs font-bold transition-colors',
                      result === r.value ? `${r.color} text-white` : 'bg-gray-800 text-gray-400'].join(' ')}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-500 text-xs mb-1">Ställning</p>
                <input type="text" value={score} onChange={e => setScore(e.target.value)}
                  placeholder="T.ex. 3–1"
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Speltid (min)</p>
                <input type="number" value={playTime || ''} onChange={e => setPlayTime(Number(e.target.value))}
                  placeholder="T.ex. 75"
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600" />
              </div>
            </div>

            <div>
              <p className="text-white font-medium text-xs mb-2">Känsla under matchen</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setFeeling(n)}
                    className={['flex-1 h-10 rounded-xl text-sm font-bold transition-colors',
                      feeling === n ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'].join(' ')}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-600">
                <span>Dålig</span><span>Topp</span>
              </div>
            </div>

            {[
              { label: '✅ Vad gick bra?',     val: wentWell,  set: setWentWell,  ph: 'T.ex. bra serve, vann de flesta duellerna…' },
              { label: '📈 Vad ska förbättras?', val: toImprove, set: setToImprove, ph: 'T.ex. positionering, snabbare reaktion…' },
            ].map(q => (
              <div key={q.label}>
                <p className="text-white font-medium text-xs mb-1.5">{q.label}</p>
                <textarea value={q.val} onChange={e => q.set(e.target.value)} placeholder={q.ph} rows={2}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-600 resize-none" />
              </div>
            ))}

            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Övrigt (valfritt)" rows={2}
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600 resize-none" />

            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-xl bg-orange-500 disabled:opacity-40 text-white font-bold text-sm transition-colors">
              {saving ? 'Sparar…' : 'Spara match'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center pt-8">
            <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-gray-600 text-sm text-center pt-8">Inga matcher loggade ännu</p>
        ) : (
          entries.map(e => (
            <div key={e.id} className="bg-gray-900 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    {e.result && (
                      <span className={`font-bold text-sm ${RESULT_COLORS[e.result]}`}>
                        {RESULT_LABELS[e.result]}
                      </span>
                    )}
                    {e.score && <span className="text-white font-bold text-sm">{e.score}</span>}
                  </div>
                  {e.opponent && <p className="text-gray-400 text-xs mt-0.5">vs {e.opponent}</p>}
                  <p className="text-gray-600 text-xs capitalize">
                    {new Date(e.date + 'T00:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="text-right">
                  {e.feeling && (
                    <div className="flex gap-1 justify-end mb-1">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={['w-2 h-2 rounded-full', n <= e.feeling! ? 'bg-orange-400' : 'bg-gray-700'].join(' ')} />
                      ))}
                    </div>
                  )}
                  {e.play_time_minutes && (
                    <p className="text-gray-500 text-xs">{e.play_time_minutes} min</p>
                  )}
                </div>
              </div>
              {(e.went_well || e.to_improve) && (
                <div className="flex flex-col gap-1.5 mt-2 border-t border-gray-800 pt-2">
                  {e.went_well && <p className="text-gray-400 text-xs">✅ {e.went_well}</p>}
                  {e.to_improve && <p className="text-gray-400 text-xs">📈 {e.to_improve}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
