import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

const BODY_PARTS = [
  'Huvud/Ansikte', 'Nacke', 'Axel',
  'Arm/Armbåge', 'Handled/Hand', 'Rygg',
  'Mage/Höft', 'Lår/Ljumske', 'Knä',
  'Underben/Vad', 'Fot/Fotled', 'Annat',
]

interface Props {
  profile: Profile
  onDone: () => void
}

export function InjuryPage({ profile, onDone }: Props) {
  const [bodyPart, setBodyPart] = useState<string | null>(null)
  const [painLevel, setPainLevel] = useState(0)
  const [worsening, setWorsening] = useState<boolean | null>(null)
  const [affectsTraining, setAffectsTraining] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const canSubmit = bodyPart && painLevel > 0 && worsening !== null && affectsTraining !== null

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    await supabase.from('injuries').insert({
      user_id: profile.id,
      body_part: bodyPart,
      pain_level: painLevel,
      started_at: new Date().toISOString().split('T')[0],
      worsening,
      affects_training: affectsTraining,
      notes: notes || null,
    })
    setDone(true)
    setSubmitting(false)
    setTimeout(onDone, 1500)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-3xl">🩹</div>
        <p className="text-white font-semibold text-lg">Skada registrerad</p>
        <p className="text-gray-500 text-sm">Din tränare har fått information</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-white font-bold text-xl">Anmäl skada</h1>
        <p className="text-gray-500 text-sm">Berätta för din tränare vad som gör ont</p>
      </div>

      <div className="flex flex-col gap-4 px-4">

        {/* Body part */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-medium text-sm mb-3">Var gör det ont?</p>
          <div className="grid grid-cols-3 gap-2">
            {BODY_PARTS.map(part => (
              <button
                key={part}
                onClick={() => setBodyPart(part)}
                className={[
                  'py-2 px-1 rounded-xl text-xs font-medium transition-colors text-center',
                  bodyPart === part
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                ].join(' ')}
              >
                {part}
              </button>
            ))}
          </div>
        </div>

        {/* Pain level */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-medium text-sm mb-1">Hur ont gör det? <span className="text-gray-500 font-normal">(1–10)</span></p>
          <p className="text-gray-600 text-xs mb-3">1 = knappt märkbart · 10 = outhärdligt</p>
          <div className="grid grid-cols-5 gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
              const color = n <= 3 ? 'bg-green-500' : n <= 6 ? 'bg-yellow-500' : 'bg-red-500'
              return (
                <button
                  key={n}
                  onClick={() => setPainLevel(n)}
                  className={[
                    'h-11 rounded-xl text-sm font-bold transition-colors',
                    painLevel === n ? `${color} text-white` : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                  ].join(' ')}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        {/* Yes/No questions */}
        {[
          { label: 'Blir det värre?', value: worsening, set: setWorsening, yesLabel: 'Ja, det förvärras', noLabel: 'Nej, stabilt' },
          { label: 'Påverkar det din träning?', value: affectsTraining, set: setAffectsTraining, yesLabel: 'Ja', noLabel: 'Nej' },
        ].map(q => (
          <div key={q.label} className="bg-gray-900 rounded-2xl p-4">
            <p className="text-white font-medium text-sm mb-3">{q.label}</p>
            <div className="flex gap-3">
              <button
                onClick={() => q.set(true)}
                className={[
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  q.value === true ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400',
                ].join(' ')}
              >{q.yesLabel}</button>
              <button
                onClick={() => q.set(false)}
                className={[
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  q.value === false ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400',
                ].join(' ')}
              >{q.noLabel}</button>
            </div>
          </div>
        ))}

        {/* Notes */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-medium text-sm mb-2">Beskriv <span className="text-gray-500 font-normal">(valfritt)</span></p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="T.ex. ont vid löpning, hörde ett knäpp, svullet sedan igår..."
            rows={3}
            className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-600 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white font-bold text-base transition-colors"
        >
          {submitting ? 'Skickar…' : 'Anmäl skada'}
        </button>
      </div>
    </div>
  )
}
