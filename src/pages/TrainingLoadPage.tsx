import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface Props {
  profile: Profile
  onDone: () => void
  onBack: () => void
}

const RPE_LABELS: Record<number, string> = {
  1: 'Extremt lätt', 2: 'Mycket lätt', 3: 'Lätt', 4: 'Ganska lätt', 5: 'Måttligt',
  6: 'Ganska tungt', 7: 'Tungt', 8: 'Mycket tungt', 9: 'Extremt tungt', 10: 'Max ansträngning',
}

const DURATIONS = [30, 45, 60, 75, 90, 105, 120]

export function TrainingLoadPage({ profile, onDone, onBack }: Props) {
  const [rpe, setRpe]               = useState(0)
  const [duration, setDuration]     = useState(0)
  const [sessionTitle, setSessionTitle] = useState('')
  const [notes, setNotes]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)
  const [prevSessions, setPrevSessions] = useState<string[]>([])

  useEffect(() => { loadPrevSessions() }, [])

  async function loadPrevSessions() {
    const { data } = await supabase
      .from('training_load')
      .select('session_title, created_at')
      .eq('user_id', profile.id)
      .not('session_title', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
    const seen = new Set<string>()
    const unique: string[] = []
    for (const row of data ?? []) {
      if (row.session_title && !seen.has(row.session_title)) {
        seen.add(row.session_title)
        unique.push(row.session_title)
      }
    }
    setPrevSessions(unique.slice(0, 8))
  }

  const loadPoints = rpe > 0 && duration > 0 ? rpe * duration : null
  const canSubmit  = rpe > 0 && duration > 0

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    await supabase.from('training_load').insert({
      user_id: profile.id,
      date: new Date().toISOString().split('T')[0],
      session_title: sessionTitle || null,
      duration_minutes: duration,
      rpe,
      notes: notes || null,
    })
    setDone(true)
    setSubmitting(false)
    setTimeout(onDone, 1800)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-3xl">💪</div>
        <p className="text-white font-semibold text-lg">Pass loggat!</p>
        {loadPoints && <p className="text-gray-400 text-sm">Belastning: {loadPoints} poäng</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-28">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div>
          <h1 className="text-white font-bold text-xl">Logga pass</h1>
          <p className="text-gray-500 text-sm">Hur gick det?</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">

        {/* Session title + previous sessions */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-medium text-sm mb-2">Typ av pass <span className="text-gray-500 font-normal">(valfritt)</span></p>
          <input
            type="text"
            value={sessionTitle}
            onChange={e => setSessionTitle(e.target.value)}
            placeholder="T.ex. NIU-träning, Gym, Match…"
            className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-600"
          />
          {prevSessions.length > 0 && (
            <div className="mt-2">
              <p className="text-gray-600 text-xs mb-1.5">Tidigare pass:</p>
              <div className="flex flex-wrap gap-1.5">
                {prevSessions.map(s => (
                  <button
                    key={s}
                    onClick={() => setSessionTitle(s)}
                    className={[
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                      sessionTitle === s
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                    ].join(' ')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RPE */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-medium text-sm mb-1">Hur jobbigt var passet?</p>
          <p className="text-gray-500 text-xs mb-3">{rpe > 0 ? RPE_LABELS[rpe] : 'Välj en siffra (1–10)'}</p>
          <div className="grid grid-cols-5 gap-2">
            {[1,2,3,4,5,6,7,8,9,10].map(n => {
              const color = n <= 3 ? 'bg-green-500' : n <= 6 ? 'bg-yellow-500' : n <= 8 ? 'bg-orange-500' : 'bg-red-500'
              return (
                <button key={n} onClick={() => setRpe(n)}
                  className={['h-12 rounded-xl text-sm font-bold transition-colors',
                    rpe === n ? `${color} text-white` : 'bg-gray-800 text-gray-400 hover:bg-gray-700'].join(' ')}>
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        {/* Duration */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-medium text-sm mb-3">Hur länge tränade du?</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={['px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                  duration === d ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'].join(' ')}>
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* Load */}
        {loadPoints !== null && (
          <div className="bg-orange-900/20 border border-orange-700/40 rounded-2xl p-4">
            <p className="text-orange-400 text-xs mb-1">Beräknad träningsbelastning</p>
            <p className="text-white font-bold text-2xl">{loadPoints} <span className="text-gray-500 font-normal text-sm">poäng</span></p>
            <p className="text-gray-500 text-xs mt-1">{duration} min × RPE {rpe} = {loadPoints}</p>
          </div>
        )}

        {/* Notes */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-medium text-sm mb-2">Kommentar <span className="text-gray-500 font-normal">(valfritt)</span></p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Vad gick bra? Vad var svårt? Hur kändes kroppen?"
            className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-600 resize-none" />
        </div>

        <button onClick={handleSubmit} disabled={!canSubmit || submitting}
          className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold text-base transition-colors">
          {submitting ? 'Sparar…' : 'Spara pass'}
        </button>
      </div>
    </div>
  )
}
