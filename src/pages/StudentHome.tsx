import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, CheckIn, ScheduleItem } from '../types'
import { getReadinessColor, SCHEDULE_CONFIG } from '../types'

interface Props {
  profile: Profile
  onCheckIn: () => void
  onInjury: () => void
  onLoad: () => void
}

function greeting() {
  const h = new Date().getHours()
  if (h < 10) return 'God morgon'
  if (h < 17) return 'Hej'
  return 'God kväll'
}

const READINESS = {
  green:  { bg: 'bg-green-900/40 border-green-700',  dot: 'bg-green-400',  text: 'text-green-400',  label: 'Redo att träna' },
  yellow: { bg: 'bg-yellow-900/40 border-yellow-700', dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Lite sliten' },
  red:    { bg: 'bg-red-900/40 border-red-700',       dot: 'bg-red-500',    text: 'text-red-400',    label: 'Risk – prata med tränare' },
}

export function StudentHome({ profile, onCheckIn, onInjury, onLoad }: Props) {
  const [checkin, setCheckin] = useState<CheckIn | null | undefined>(undefined)
  const [streak, setStreak] = useState(0)
  const [nextEvent, setNextEvent] = useState<ScheduleItem | null>(null)
  const [activeInjury, setActiveInjury] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const today = new Date().toISOString().split('T')[0]

    const [{ data: ci }, { data: checkins }, { data: events }, { data: injuries }] = await Promise.all([
      supabase.from('checkins').select('*').eq('user_id', profile.id).eq('date', today).maybeSingle(),
      supabase.from('checkins').select('date').eq('user_id', profile.id).order('date', { ascending: false }).limit(90),
      supabase.from('schedule_items').select('*').gte('date', today).order('date', { ascending: true }).order('start_time', { ascending: true }).limit(1),
      supabase.from('injuries').select('id').eq('user_id', profile.id).is('resolved_at', null).limit(1),
    ])

    setCheckin(ci ?? null)
    setNextEvent(events?.[0] ?? null)
    setActiveInjury((injuries?.length ?? 0) > 0)

    if (checkins) {
      const dateSet = new Set(checkins.map(c => c.date))
      let s = 0
      const d = new Date()
      if (!dateSet.has(today)) d.setDate(d.getDate() - 1)
      while (true) {
        const ds = d.toISOString().split('T')[0]
        if (dateSet.has(ds)) { s++; d.setDate(d.getDate() - 1) }
        else break
      }
      setStreak(s)
    }
  }

  const dateStr = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
  const color = checkin ? getReadinessColor(checkin) : null
  const firstName = profile.full_name.split(' ')[0]

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="px-4 pt-6 pb-4">
        <p className="text-gray-500 text-sm capitalize">{dateStr}</p>
        <h1 className="text-white font-bold text-xl">{greeting()}, {firstName}</h1>
      </div>

      {checkin === undefined ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">

          {/* Check-in card */}
          {checkin && color ? (
            <div className={`rounded-2xl border p-5 ${READINESS[color].bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full ${READINESS[color].dot}`} />
                <p className={`font-bold text-sm ${READINESS[color].text}`}>{READINESS[color].label}</p>
              </div>
              <p className="text-gray-500 text-xs mb-3">Check-in genomförd idag</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                <div className="bg-black/20 rounded-lg p-2 text-center">
                  <p className="text-base font-bold text-white">{checkin.sleep_quality}/5</p>
                  <p>Sömn</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2 text-center">
                  <p className="text-base font-bold text-white">{checkin.tiredness}/5</p>
                  <p>Trötthet</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2 text-center">
                  <p className="text-base font-bold text-white">{checkin.motivation}/5</p>
                  <p>Motivation</p>
                </div>
              </div>
              {checkin.notes && (
                <p className="mt-3 text-gray-400 text-xs">"{checkin.notes}"</p>
              )}
            </div>
          ) : (
            <button
              onClick={onCheckIn}
              className="rounded-2xl border border-green-700/50 bg-green-900/20 p-5 text-left w-full active:bg-green-900/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 font-bold text-base mb-1">Morgonkoll</p>
                  <p className="text-gray-400 text-sm">Du har inte checkat in idag</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">→</div>
              </div>
            </button>
          )}

          {/* Streak */}
          {streak > 1 && (
            <div className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-white font-bold">{streak} dagars streak</p>
                <p className="text-gray-500 text-xs">Håll igång — checka in varje dag</p>
              </div>
            </div>
          )}

          {/* Active injury warning */}
          {activeInjury && (
            <button
              onClick={onInjury}
              className="rounded-2xl border border-red-700/40 bg-red-900/20 p-4 text-left w-full"
            >
              <p className="text-red-400 font-semibold text-sm">Du har en aktiv skada/känning</p>
              <p className="text-gray-500 text-xs mt-0.5">Tryck för att uppdatera eller rapportera ny</p>
            </button>
          )}

          {/* Next event */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-2">Nästa pass</p>
            {nextEvent ? (
              <>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${SCHEDULE_CONFIG[nextEvent.type as keyof typeof SCHEDULE_CONFIG]?.dot ?? 'bg-gray-500'}`} />
                  <p className="text-white font-semibold text-sm">{nextEvent.title}</p>
                </div>
                <p className="text-gray-400 text-xs mt-1 pl-4">
                  {new Date(nextEvent.date + 'T00:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })}
                  {' · '}{nextEvent.start_time.slice(0, 5)}
                  {nextEvent.location && ` · ${nextEvent.location}`}
                </p>
              </>
            ) : (
              <p className="text-gray-600 text-sm">Inga kommande pass inlagda</p>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onLoad}
              className="bg-gray-900 rounded-2xl p-4 text-left active:bg-gray-800 transition-colors"
            >
              <p className="text-orange-400 text-lg mb-1">💪</p>
              <p className="text-white font-semibold text-sm">Logga pass</p>
              <p className="text-gray-500 text-xs">RPE + tid</p>
            </button>
            <button
              onClick={onInjury}
              className="bg-gray-900 rounded-2xl p-4 text-left active:bg-gray-800 transition-colors"
            >
              <p className="text-red-400 text-lg mb-1">🩹</p>
              <p className="text-white font-semibold text-sm">Anmäl skada</p>
              <p className="text-gray-500 text-xs">Känning eller skada</p>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
