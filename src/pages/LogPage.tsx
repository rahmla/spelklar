import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface TrainingLoadEntry {
  id: string
  date: string
  session_title?: string
  duration_minutes: number
  rpe: number
  notes?: string
}

interface InjuryEntry {
  id: string
  body_part: string
  pain_level: number
  started_at: string
  worsening: boolean
  affects_training: boolean
  notes?: string
  resolved_at?: string
}

interface Props {
  profile: Profile
  onGoToLoad: () => void
  onGoToInjury: () => void
}

const RPE_COLOR = (rpe: number) =>
  rpe <= 3 ? 'text-green-400' : rpe <= 6 ? 'text-yellow-400' : rpe <= 8 ? 'text-orange-400' : 'text-red-400'

export function LogPage({ profile, onGoToLoad, onGoToInjury }: Props) {
  const [loads, setLoads]       = useState<TrainingLoadEntry[]>([])
  const [injuries, setInjuries] = useState<InjuryEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const [{ data: l }, { data: i }] = await Promise.all([
      supabase.from('training_load').select('*').eq('user_id', profile.id).gte('date', since).order('date', { ascending: false }).limit(20),
      supabase.from('injuries').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
    ])
    setLoads(l ?? [])
    setInjuries(i ?? [])
    setLoading(false)
  }

  async function resolveInjury(id: string) {
    setResolving(id)
    await supabase.from('injuries').update({ resolved_at: new Date().toISOString().split('T')[0] }).eq('id', id)
    setResolving(null)
    load()
  }

  const activeInjuries   = injuries.filter(i => !i.resolved_at)
  const resolvedInjuries = injuries.filter(i =>  i.resolved_at)

  // Weekly load sum (this week)
  const monday = (() => {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return d.toISOString().split('T')[0]
  })()
  const weekLoads  = loads.filter(l => l.date >= monday)
  const weekPoints = weekLoads.reduce((s, l) => s + l.rpe * l.duration_minutes, 0)

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-white font-bold text-xl">Logg</h1>
        <p className="text-gray-500 text-sm">Pass och skador</p>
      </div>

      {loading ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4">

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onGoToLoad}
              className="bg-orange-900/20 border border-orange-700/40 rounded-2xl p-4 text-left active:opacity-80 transition-opacity"
            >
              <p className="text-2xl mb-1">💪</p>
              <p className="text-white font-semibold text-sm">Logga pass</p>
              <p className="text-gray-500 text-xs">RPE + tid</p>
            </button>
            <button
              onClick={onGoToInjury}
              className="bg-red-900/20 border border-red-700/40 rounded-2xl p-4 text-left active:opacity-80 transition-opacity"
            >
              <p className="text-2xl mb-1">🩹</p>
              <p className="text-white font-semibold text-sm">Anmäl skada</p>
              <p className="text-gray-500 text-xs">Eller känning</p>
            </button>
          </div>

          {/* This week's load */}
          {weekLoads.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Denna vecka</p>
              <div className="flex items-baseline gap-2">
                <p className="text-white font-bold text-2xl">{weekPoints}</p>
                <p className="text-gray-500 text-sm">belastningspoäng</p>
              </div>
              <p className="text-gray-600 text-xs mt-0.5">{weekLoads.length} pass · {weekLoads.reduce((s, l) => s + l.duration_minutes, 0)} min totalt</p>
            </div>
          )}

          {/* Active injuries */}
          {activeInjuries.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Aktiva skador / känningar</p>
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
                          {inj.affects_training && <span className="text-yellow-400">påverkar träning</span>}
                        </div>
                        {inj.notes && <p className="text-gray-500 text-xs mt-1">"{inj.notes}"</p>}
                      </div>
                      <button
                        onClick={() => resolveInjury(inj.id)}
                        disabled={resolving === inj.id}
                        className="text-xs text-green-400 font-semibold flex-shrink-0 disabled:opacity-50"
                      >
                        {resolving === inj.id ? '…' : 'Löst ✓'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Training load history */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Träningslogg — senaste 30 dagarna</p>
            {loads.length === 0 ? (
              <p className="text-gray-600 text-sm">Inga pass loggade ännu</p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-800">
                {loads.map(l => (
                  <div key={l.id} className="flex items-center gap-3 py-3">
                    <div className="w-10 text-center flex-shrink-0">
                      <p className={`text-lg font-black ${RPE_COLOR(l.rpe)}`}>{l.rpe}</p>
                      <p className="text-gray-600 text-[10px]">RPE</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{l.session_title ?? 'Träningspass'}</p>
                      <p className="text-gray-500 text-xs">
                        {l.duration_minutes} min · {l.rpe * l.duration_minutes} poäng
                      </p>
                      {l.notes && <p className="text-gray-600 text-xs mt-0.5 truncate">"{l.notes}"</p>}
                    </div>
                    <p className="text-gray-600 text-xs flex-shrink-0">
                      {new Date(l.date + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolved injuries */}
          {resolvedInjuries.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Tidigare skador ({resolvedInjuries.length})</p>
              <div className="flex flex-col gap-2">
                {resolvedInjuries.slice(0, 5).map(inj => (
                  <div key={inj.id} className="flex items-center gap-2 text-gray-600 text-sm">
                    <span className="text-green-600 text-xs">✓</span>
                    <span className="line-through">{inj.body_part}</span>
                    <span className="text-xs">löst {new Date(inj.resolved_at! + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
