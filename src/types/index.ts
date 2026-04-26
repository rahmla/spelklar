export type Role = 'student' | 'coach' | 'teacher' | 'admin'

export type ReadinessColor = 'green' | 'yellow' | 'red'

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
  year?: number // school year 1-3
  created_at: string
}

export interface CheckIn {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  sleep_quality: number    // 1-5
  tiredness: number        // 1-5
  stress: number           // 1-5
  body_soreness: number    // 1-5
  has_injury: boolean
  motivation: number       // 1-5
  ate_breakfast: boolean
  ready_to_train: boolean
  notes?: string
  created_at: string
}

export interface InjuryReport {
  id: string
  user_id: string
  body_part: string
  pain_level: number // 1-10
  started_at: string
  worsening: boolean
  affects_training: boolean
  notes?: string
  created_at: string
}

export interface ScheduleItem {
  id: string
  school_id: string
  title: string
  type: 'training' | 'school' | 'match' | 'gym' | 'recovery' | 'travel' | 'test' | 'meeting'
  date: string
  start_time: string
  end_time?: string
  location?: string
  notes?: string
  reminder_minutes?: number
}

export interface TrainingPlan {
  id: string
  school_id: string
  coach_id: string
  week_start: string // Monday date YYYY-MM-DD
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

// Computed from check-in values
export function getReadinessColor(checkin: CheckIn): ReadinessColor {
  const score =
    checkin.sleep_quality +
    (6 - checkin.tiredness) +
    (6 - checkin.stress) +
    (6 - checkin.body_soreness) +
    checkin.motivation

  const max = 25
  const pct = score / max

  if (checkin.has_injury) return 'red'
  if (!checkin.ate_breakfast) return 'yellow'
  if (pct >= 0.72) return 'green'
  if (pct >= 0.48) return 'yellow'
  return 'red'
}
