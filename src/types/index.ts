export type Role = 'student' | 'coach' | 'teacher' | 'admin'
export type ReadinessColor = 'green' | 'yellow' | 'red'
export type ScheduleType = 'training' | 'school' | 'match' | 'gym' | 'recovery' | 'travel' | 'test' | 'meeting'

export interface School {
  id: string
  name: string
  type: 'NIU' | 'RIG'
  sport: string
  city: string
}

export interface Profile {
  id: string
  school_id: string
  full_name: string
  role: Role
  sport?: string
  year?: number
  created_at: string
}

export interface CheckIn {
  id: string
  user_id: string
  date: string
  sleep_quality: number
  tiredness: number
  stress: number
  body_soreness: number
  has_injury: boolean
  motivation: number
  ate_breakfast: boolean
  ready_to_train: boolean
  notes?: string
  created_at: string
}

export interface Injury {
  id: string
  user_id: string
  body_part: string
  pain_level: number
  started_at: string
  worsening: boolean
  affects_training: boolean
  notes?: string
  resolved_at?: string
  created_at: string
}

export interface ScheduleItem {
  id: string
  school_id: string
  title: string
  type: ScheduleType
  date: string
  start_time: string
  end_time?: string
  location?: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface TrainingLoad {
  id: string
  user_id: string
  date: string
  session_title?: string
  duration_minutes: number
  rpe: number
  notes?: string
  created_at: string
}

export interface TrainingPlan {
  id: string
  school_id: string
  coach_id: string
  week_start: string
  title: string
  focus: string
  sessions: TrainingSession[]
  created_at: string
}

export interface TrainingSession {
  id: string
  plan_id: string
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  type: 'technique' | 'physical' | 'gym' | 'recovery' | 'match' | 'rehab'
  title: string
  description?: string
  duration_minutes: number
  intensity: 'low' | 'medium' | 'high'
}

export function getReadinessColor(checkin: CheckIn): ReadinessColor {
  const score =
    checkin.sleep_quality +
    (6 - checkin.tiredness) +
    (6 - checkin.stress) +
    (6 - checkin.body_soreness) +
    checkin.motivation
  const pct = score / 25
  if (checkin.has_injury) return 'red'
  if (!checkin.ate_breakfast) return 'yellow'
  if (pct >= 0.72) return 'green'
  if (pct >= 0.48) return 'yellow'
  return 'red'
}

export const SCHEDULE_CONFIG: Record<ScheduleType, { label: string; color: string; dot: string }> = {
  training:  { label: 'Träning',       color: 'bg-blue-900/30 border-blue-700/40',    dot: 'bg-blue-400' },
  school:    { label: 'Skola',         color: 'bg-gray-800/60 border-gray-700',        dot: 'bg-gray-400' },
  match:     { label: 'Match',         color: 'bg-orange-900/30 border-orange-700/40', dot: 'bg-orange-400' },
  gym:       { label: 'Gym',           color: 'bg-purple-900/30 border-purple-700/40', dot: 'bg-purple-400' },
  recovery:  { label: 'Återhämtning', color: 'bg-teal-900/30 border-teal-700/40',     dot: 'bg-teal-400' },
  travel:    { label: 'Resa',          color: 'bg-amber-900/30 border-amber-700/40',   dot: 'bg-amber-400' },
  test:      { label: 'Test',          color: 'bg-yellow-900/30 border-yellow-700/40', dot: 'bg-yellow-400' },
  meeting:   { label: 'Möte',          color: 'bg-sky-900/30 border-sky-700/40',       dot: 'bg-sky-400' },
}
