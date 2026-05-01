import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

const QUESTIONS = [
  { key: 'sleep_quality',  label: 'Hur sov du?',               low: 'Dåligt', high: 'Superbra', type: 'scale' },
  { key: 'tiredness',      label: 'Hur trött är du?',          low: 'Inte alls', high: 'Utmattad', type: 'scale' },
  { key: 'stress',         label: 'Hur stressad är du?',       low: 'Lugn', high: 'Väldigt stressad', type: 'scale' },
  { key: 'body_soreness',  label: 'Hur ont har du i kroppen?', low: 'Inget alls', high: 'Mycket ont', type: 'scale' },
  { key: 'motivation',     label: 'Hur motiverad är du?',      low: 'Inte alls', high: 'Pumpat', type: 'scale' },
] as const

type ScaleKey = typeof QUESTIONS[number]['key']

interface Props {
  profile: Profile
  onDone: () => void
}

export function CheckInPage({ profile, onDone }: Props) {
  const [values, setValues] = useState<Record<ScaleKey, number>>({
    sleep_quality: 0,
    tiredness: 0,
    stress: 0,
    body_soreness: 0,
    motivation: 0,
  })
  const [hasInjury, setHasInjury] = useState<boolean | null>(null)
  const [ateBreakfast, setAteBreakfast] = useState<boolean | null>(null)
  const [readyToTrain, setReadyToTrain] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const allAnswered =
    Object.values(values).every(v => v > 0) &&
    hasInjury !== null &&
    ateBreakfast !== null &&
    readyToTrain !== null

  async function handleSubmit() {
    if (!allAnswered) return
    setSubmitting(true)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('checkins').upsert({
      user_id: profile.id,
      date: today,
      ...values,
      has_injury: hasInjury,
      ate_breakfast: ateBreakfast,
      ready_to_train: readyToTrain,
      notes: notes || null,
    })
    setDone(true)
    setSubmitting(false)
    setTimeout(onDone, 1500)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-3xl">✓</div>
        <p className="text-white font-semibold text-lg">Check-in klar!</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-28">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-white font-bold text-xl">Morgonkoll</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {QUESTIONS.map(q => (
          <div key={q.key} className="bg-gray-900 rounded-2xl p-4">
            <p className="text-white font-medium text-sm mb-3">{q.label}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setValues(v => ({ ...v, [q.key]: n }))}
                  className={[
                    'flex-1 h-11 rounded-xl text-sm font-bold transition-colors',
                    values[q.key] === n
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                  ].join(' ')}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-600">{q.low}</span>
              <span className="text-xs text-gray-600">{q.high}</span>
            </div>
          </div>
        ))}

        {/* Yes/No questions */}
        {[
          { label: 'Har du en skada eller känning?', value: hasInjury, set: setHasInjury, yesLabel: 'Ja', noLabel: 'Nej', yesRed: true },
          { label: 'Har du ätit frukost?', value: ateBreakfast, set: setAteBreakfast, yesLabel: 'Ja', noLabel: 'Nej', yesRed: false },
          { label: 'Känner du dig redo för träning?', value: readyToTrain, set: setReadyToTrain, yesLabel: 'Ja', noLabel: 'Inte riktigt', yesRed: false },
        ].map(q => (
          <div key={q.label} className="bg-gray-900 rounded-2xl p-4">
            <p className="text-white font-medium text-sm mb-3">{q.label}</p>
            <div className="flex gap-3">
              <button
                onClick={() => q.set(true)}
                className={[
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  q.value === true
                    ? q.yesRed ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                ].join(' ')}
              >
                {q.yesLabel}
              </button>
              <button
                onClick={() => q.set(false)}
                className={[
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  q.value === false
                    ? q.yesRed ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                ].join(' ')}
              >
                {q.noLabel}
              </button>
            </div>
          </div>
        ))}

        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-medium text-sm mb-2">Något du vill berätta? <span className="text-gray-600 font-normal">(valfritt)</span></p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="T.ex. sovde dåligt pga nervositet, ont i knät sedan igår..."
            rows={3}
            className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold text-base transition-colors"
        >
          {submitting ? 'Skickar…' : 'Skicka check-in'}
        </button>
      </div>
    </div>
  )
}
