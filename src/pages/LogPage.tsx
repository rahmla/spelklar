import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface LoadEntry    { id: string; date: string; session_title?: string; duration_minutes: number; rpe: number }
interface DiaryPreview { id: string; date: string; session_title?: string; went_well?: string; focus_next?: string }
interface MatchPreview { id: string; date: string; opponent?: string; result?: string; score?: string }
interface InjuryEntry  { id: string; body_part: string; pain_level: number; started_at: string; worsening: boolean; affects_training: boolean; resolved_at?: string }
interface RehabProgram { id: string; title: string; description?: string; active: boolean; created_at: string }
interface RehabCompletion { program_id: string; date: string }

interface Props {
  profile: Profile
  onGoToLoad:   () => void
  onGoToInjury: () => void
  onGoToDiary:  () => void
  onGoToMatch:  () => void
}

type Tab = 'load' | 'diary' | 'match' | 'injury'

const RPE_COLOR = (rpe: number) =>
  rpe <= 3 ? 'text-green-400' : rpe <= 6 ? 'text-yellow-400' : rpe <= 8 ? 'text-orange-400' : 'text-red-400'

const RESULT_LABELS: Record<string, string> = { win: 'Vinst', loss: 'Förlust', draw: 'Oavgjort', no_result: '–' }
const RESULT_COLORS: Record<string, string> = { win: 'text-green-400', loss: 'text-red-400', draw: 'text-yellow-400', no_result: 'text-gray-500' }

export function LogPage({ profile, onGoToLoad, onGoToInjury, onGoToDiary, onGoToMatch }: Props) {
  const [tab, setTab]                 = useState<Tab>('load')
  const [loads, setLoads]             = useState<LoadEntry[]>([])
  const [diary, setDiary]             = useState<DiaryPreview[]>([])
  const [matches, setMatches]         = useState<MatchPreview[]>([])
  const [injuries, setInjuries]       = useState<InjuryEntry[]>([])
  const [rehabs, setRehabs]           = useState<RehabProgram[]>([])
  const [completions, setCompletions] = useState<RehabCompletion[]>([])
  const [loading, setLoading]         = useState(true)
  const [resolving, setResolving]     = useState<string | null>(null)
  const [completing, setCompleting]   = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const today   = new Date().toISOString().split('T')[0]

    const [l, d, m, i, r, c] = await Promise.all([
      supabase.from('training_load').select('*').eq('user_id', profile.id).gte('date', since30).order('date', { ascending: false }).limit(15),
      supabase.from('training_diary').select('id,date,session_title,went_well,focus_next').eq('user_id', profile.id).order('date', { ascending: false }).limit(5),
      supabase.from('match_log').select('id,date,opponent,result,score').eq('user_id', profile.id).order('date', { ascending: false }).limit(5),
      supabase.from('injuries').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('rehab_programs').select('*').eq('user_id', profile.id).eq('active', true),
      supabase.from('rehab_completions').select('program_id,date').eq('user_id', profile.id).gte('date', today),
    ])

    setLoads(l.data ?? [])
    setDiary(d.data ?? [])
    setMatches(m.data ?? [])
    setInjuries(i.data ?? [])
    setRehabs(r.data ?? [])
    setCompletions(c.data ?? [])
    setLoading(false)
  }

  async function resolveInjury(id: string) {
    setResolving(id)
    await supabase.from('injuries').update({ resolved_at: new Date().toISOString().split('T')[0] }).eq('id', id)
    setResolving(null)
    load()
  }

  async function markRehabDone(programId: string) {
    setCompleting(programId)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('rehab_completions').upsert({ program_id: programId, user_id: profile.id, date: today })
    setCompleting(null)
    load()
  }

  const activeInjuries   = injuries.filter(i => !i.resolved_at)
  const resolvedInjuries = injuries.filter(i =>  i.resolved_at)

  const monday = (() => {
    const d = new Date(); const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().split('T')[0]
  })()
  const weekLoads  = loads.filter(l => l.date >= monday)
  const weekPoints = weekLoads.reduce((s, l) => s + l.rpe * l.duration_minutes, 0)

  const today = new Date().toISOString().split('T')[0]
  const completedToday = new Set(completions.filter(c => c.date === today).map(c => c.program_id))

  const TABS: { id: Tab; label: string }[] = [
    { id: 'load',   label: 'Passlogg' },
    { id: 'diary',  label: 'Dagbok' },
    { id: 'match',  label: 'Matcher' },
    { id: 'injury', label: 'Skador' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-white font-bold text-xl">Logg</h1>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-4 pb-4 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={['px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
              tab === t.id ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-500'].join(' ')}>
            {t.label}
            {t.id === 'injury' && activeInjuries.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1">{activeInjuries.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">

          {/* PASSLOGG */}
          {tab === 'load' && (
            <>
              {weekPoints > 0 && (
                <div className="bg-gray-900 rounded-2xl p-4">
                  <p className="text-gray-500 text-xs mb-1">Denna vecka</p>
                  <p className="text-white font-bold text-xl">{weekPoints} <span className="text-gray-500 font-normal text-sm">belastningspoäng</span></p>
                  <p className="text-gray-600 text-xs">{weekLoads.length} pass · {weekLoads.reduce((s, l) => s + l.duration_minutes, 0)} min</p>
                </div>
              )}
              <button onClick={onGoToLoad}
                className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors">
                + Logga pass
              </button>
              {loads.length === 0 ? (
                <p className="text-gray-600 text-sm text-center pt-6">Inga pass loggade ännu</p>
              ) : (
                <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800">
                  {loads.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-4">
                      <div className="w-10 text-center flex-shrink-0">
                        <p className={`text-lg font-black ${RPE_COLOR(l.rpe)}`}>{l.rpe}</p>
                        <p className="text-gray-600 text-[10px]">RPE</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{l.session_title ?? 'Träningspass'}</p>
                        <p className="text-gray-500 text-xs">{l.duration_minutes} min · {l.rpe * l.duration_minutes} p</p>
                      </div>
                      <p className="text-gray-600 text-xs flex-shrink-0">
                        {new Date(l.date + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* DAGBOK */}
          {tab === 'diary' && (
            <>
              <button onClick={onGoToDiary}
                className="w-full py-3 rounded-2xl bg-green-500 hover:bg-green-400 text-white font-bold text-sm transition-colors">
                + Ny reflektion
              </button>
              {diary.length === 0 ? (
                <p className="text-gray-600 text-sm text-center pt-6">Inga reflektioner ännu</p>
              ) : (
                <>
                  <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800">
                    {diary.map(e => (
                      <div key={e.id} className="p-4">
                        <p className="text-white font-medium text-sm">{e.session_title ?? 'Träningspass'}</p>
                        <p className="text-gray-600 text-xs capitalize mb-1">
                          {new Date(e.date + 'T00:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </p>
                        {e.went_well && <p className="text-gray-400 text-xs">✅ {e.went_well}</p>}
                        {e.focus_next && <p className="text-gray-400 text-xs">🎯 {e.focus_next}</p>}
                      </div>
                    ))}
                  </div>
                  <button onClick={onGoToDiary} className="text-green-400 text-xs font-semibold text-center">
                    Visa alla →
                  </button>
                </>
              )}
            </>
          )}

          {/* MATCHER */}
          {tab === 'match' && (
            <>
              <button onClick={onGoToMatch}
                className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors">
                + Ny match / tävling
              </button>
              {matches.length === 0 ? (
                <p className="text-gray-600 text-sm text-center pt-6">Inga matcher loggade ännu</p>
              ) : (
                <>
                  <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800">
                    {matches.map(e => (
                      <div key={e.id} className="p-4 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {e.result && <span className={`font-bold text-sm ${RESULT_COLORS[e.result]}`}>{RESULT_LABELS[e.result]}</span>}
                            {e.score && <span className="text-white text-sm">{e.score}</span>}
                          </div>
                          {e.opponent && <p className="text-gray-500 text-xs">vs {e.opponent}</p>}
                        </div>
                        <p className="text-gray-600 text-xs">
                          {new Date(e.date + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button onClick={onGoToMatch} className="text-orange-400 text-xs font-semibold text-center">
                    Visa alla →
                  </button>
                </>
              )}
            </>
          )}

          {/* SKADOR & REHAB */}
          {tab === 'injury' && (
            <>
              <button onClick={onGoToInjury}
                className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-colors">
                + Anmäl skada / känning
              </button>

              {/* Active injuries */}
              {activeInjuries.length > 0 && (
                <div className="bg-gray-900 rounded-2xl p-4">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Aktiva skador</p>
                  <div className="flex flex-col gap-3">
                    {activeInjuries.map(inj => (
                      <div key={inj.id} className="border-b border-gray-800 last:border-0 pb-3 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-semibold text-sm">{inj.body_part}</p>
                              <span className={`text-xs font-bold ${inj.pain_level >= 7 ? 'text-red-400' : inj.pain_level >= 4 ? 'text-yellow-400' : 'text-green-400'}`}>
                                {inj.pain_level}/10
                              </span>
                            </div>
                            <div className="flex gap-3 mt-0.5 text-xs text-gray-600">
                              <span>Sedan {new Date(inj.started_at + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}</span>
                              {inj.worsening && <span className="text-red-400">↑ förvärras</span>}
                            </div>
                          </div>
                          <button onClick={() => resolveInjury(inj.id)} disabled={resolving === inj.id}
                            className="text-xs text-green-400 font-semibold flex-shrink-0 disabled:opacity-50">
                            {resolving === inj.id ? '…' : 'Löst ✓'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rehab programs */}
              {rehabs.length > 0 && (
                <div className="bg-gray-900 rounded-2xl p-4">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Rehab-program</p>
                  <div className="flex flex-col gap-3">
                    {rehabs.map(r => {
                      const doneToday = completedToday.has(r.id)
                      return (
                        <div key={r.id} className={['rounded-xl p-3 border',
                          doneToday ? 'bg-green-900/20 border-green-700/30' : 'bg-gray-800 border-gray-700'].join(' ')}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-semibold text-sm">{r.title}</p>
                              {r.description && <p className="text-gray-400 text-xs mt-0.5">{r.description}</p>}
                            </div>
                            {doneToday ? (
                              <span className="text-green-400 text-xs font-semibold">✓ Klart idag</span>
                            ) : (
                              <button onClick={() => markRehabDone(r.id)} disabled={completing === r.id}
                                className="text-xs bg-green-500 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
                                {completing === r.id ? '…' : 'Gjort idag'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeInjuries.length === 0 && rehabs.length === 0 && (
                <p className="text-gray-600 text-sm text-center pt-6">Inga aktiva skador eller rehab-program</p>
              )}

              {/* Resolved injuries */}
              {resolvedInjuries.length > 0 && (
                <div className="bg-gray-900 rounded-2xl p-4">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Tidigare skador</p>
                  {resolvedInjuries.slice(0, 5).map(inj => (
                    <p key={inj.id} className="text-gray-600 text-xs py-0.5 flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="line-through">{inj.body_part}</span>
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}
