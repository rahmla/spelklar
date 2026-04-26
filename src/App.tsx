import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { CheckInPage } from './pages/CheckInPage'
import { CoachDashboard } from './pages/CoachDashboard'

export default function App() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile) return <LoginPage />

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
            <span className="text-xs font-black text-white">S</span>
          </div>
          <span className="text-white font-bold text-sm">Spelklar</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">{profile.full_name}</span>
          <button onClick={signOut} className="text-gray-600 hover:text-white text-xs transition-colors">Logga ut</button>
        </div>
      </div>

      {profile.role === 'student' && (
        <CheckInPage profile={profile} onDone={() => {}} />
      )}
      {(profile.role === 'coach' || profile.role === 'teacher' || profile.role === 'admin') && (
        <CoachDashboard profile={profile} />
      )}
    </div>
  )
}
