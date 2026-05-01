import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { StudentHome } from './pages/StudentHome'
import { CheckInPage } from './pages/CheckInPage'
import { SchedulePage } from './pages/SchedulePage'
import { LogPage } from './pages/LogPage'
import { InjuryPage } from './pages/InjuryPage'
import { TrainingLoadPage } from './pages/TrainingLoadPage'
import { ProfilePage } from './pages/ProfilePage'
import { CoachDashboard } from './pages/CoachDashboard'
import { CoachPlanPage } from './pages/CoachPlanPage'
import { CoachWeeklyPage } from './pages/CoachWeeklyPage'
import { DiaryPage } from './pages/DiaryPage'
import { MatchLogPage } from './pages/MatchLogPage'
import { BottomNav } from './components/BottomNav'
import type { StudentTab, CoachTab } from './components/BottomNav'

// Students can also be in sub-views 'load' or 'injury' (no tab)
type StudentView = StudentTab | 'load' | 'injury' | 'diary' | 'matchlog'
type CoachView   = CoachTab

export default function App() {
  const { user, profile, loading, signOut } = useAuth()
  const [studentView, setStudentView] = useState<StudentView>('home')
  const [coachView,   setCoachView]   = useState<CoachView>('students')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile) return <LoginPage />

  const isCoach = profile.role !== 'student'

  function handleStudentTab(tab: StudentTab) {
    setStudentView(tab)
  }

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
          <span className="text-gray-500 text-xs truncate max-w-[120px]">{profile.full_name}</span>
          <button onClick={signOut} className="text-gray-600 hover:text-white text-xs transition-colors flex-shrink-0">
            Logga ut
          </button>
        </div>
      </div>

      {/* Content */}
      {isCoach ? (
        <>
          {coachView === 'students' && <CoachDashboard profile={profile} />}
          {coachView === 'schedule' && <SchedulePage profile={profile} />}
          {coachView === 'plan'     && <CoachPlanPage profile={profile} />}
          {coachView === 'weekly'   && <CoachWeeklyPage profile={profile} />}
          <BottomNav role="coach" tab={coachView} onTab={setCoachView} />
        </>
      ) : (
        <>
          {studentView === 'home' && (
            <StudentHome
              profile={profile}
              onCheckIn={() => setStudentView('checkin')}
              onInjury={()  => setStudentView('injury')}
              onLoad={()    => setStudentView('load')}
            />
          )}
          {studentView === 'checkin' && (
            <CheckInPage profile={profile} onDone={() => setStudentView('home')} />
          )}
          {studentView === 'schedule' && <SchedulePage profile={profile} />}
          {studentView === 'log' && (
            <LogPage
              profile={profile}
              onGoToLoad={()   => setStudentView('load')}
              onGoToInjury={() => setStudentView('injury')}
              onGoToDiary={()  => setStudentView('diary')}
              onGoToMatch={()  => setStudentView('matchlog')}
            />
          )}
          {studentView === 'diary'    && <DiaryPage    profile={profile} onBack={() => setStudentView('log')} />}
          {studentView === 'matchlog' && <MatchLogPage profile={profile} onBack={() => setStudentView('log')} />}
          {studentView === 'load' && (
            <TrainingLoadPage profile={profile} onDone={() => setStudentView('log')} />
          )}
          {studentView === 'injury' && (
            <InjuryPage profile={profile} onDone={() => setStudentView('log')} />
          )}
          {studentView === 'profile' && <ProfilePage profile={profile} />}

          <BottomNav
            role="student"
            tab={studentView}
            onTab={handleStudentTab}
          />
        </>
      )}
    </div>
  )
}
