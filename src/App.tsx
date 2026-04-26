import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { StudentHome } from './pages/StudentHome'
import { CheckInPage } from './pages/CheckInPage'
import { SchedulePage } from './pages/SchedulePage'
import { InjuryPage } from './pages/InjuryPage'
import { TrainingLoadPage } from './pages/TrainingLoadPage'
import { CoachDashboard } from './pages/CoachDashboard'
import { BottomNav } from './components/BottomNav'

type StudentTab = 'home' | 'checkin' | 'schedule' | 'load' | 'injury'
type CoachTab = 'students' | 'schedule'

export default function App() {
  const { user, profile, loading, signOut } = useAuth()
  const [studentTab, setStudentTab] = useState<StudentTab>('home')
  const [coachTab, setCoachTab] = useState<CoachTab>('students')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile) return <LoginPage />

  const isCoach = profile.role !== 'student'

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
            <span className="text-xs font-black text-white">S</span>
          </div>
          <span className="text-white font-bold text-sm">Spelklar</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">{profile.full_name}</span>
          <button
            onClick={signOut}
            className="text-gray-600 hover:text-white text-xs transition-colors"
          >
            Logga ut
          </button>
        </div>
      </div>

      {/* Content */}
      {isCoach ? (
        <>
          {coachTab === 'students' && <CoachDashboard profile={profile} />}
          {coachTab === 'schedule' && <SchedulePage profile={profile} />}
          <BottomNav role="coach" tab={coachTab} onTab={setCoachTab} />
        </>
      ) : (
        <>
          {studentTab === 'home' && (
            <StudentHome
              profile={profile}
              onCheckIn={() => setStudentTab('checkin')}
              onInjury={() => setStudentTab('injury')}
              onLoad={() => setStudentTab('load')}
            />
          )}
          {studentTab === 'checkin' && (
            <CheckInPage profile={profile} onDone={() => setStudentTab('home')} />
          )}
          {studentTab === 'schedule' && <SchedulePage profile={profile} />}
          {studentTab === 'load' && (
            <TrainingLoadPage profile={profile} onDone={() => setStudentTab('home')} />
          )}
          {studentTab === 'injury' && (
            <InjuryPage profile={profile} onDone={() => setStudentTab('home')} />
          )}
          <BottomNav role="student" tab={studentTab} onTab={setStudentTab} />
        </>
      )}
    </div>
  )
}
