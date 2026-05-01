const Icon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d={path} />
  </svg>
)

const Icons = {
  home:     'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  check:    'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  calendar: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
  log:      'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z',
  profile:  'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  users:    'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  plan:     'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z',
  chart:    'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
}

export type StudentTab = 'home' | 'checkin' | 'schedule' | 'log' | 'profile'
export type CoachTab   = 'students' | 'schedule' | 'plan' | 'weekly'

const STUDENT_TABS: { id: StudentTab; label: string; icon: keyof typeof Icons }[] = [
  { id: 'home',     label: 'Hem',      icon: 'home' },
  { id: 'checkin',  label: 'Check-in', icon: 'check' },
  { id: 'schedule', label: 'Schema',   icon: 'calendar' },
  { id: 'log',      label: 'Logg',     icon: 'log' },
  { id: 'profile',  label: 'Profil',   icon: 'profile' },
]

const COACH_TABS: { id: CoachTab; label: string; icon: keyof typeof Icons }[] = [
  { id: 'students', label: 'Elever',  icon: 'users' },
  { id: 'schedule', label: 'Schema',  icon: 'calendar' },
  { id: 'plan',     label: 'Plan',    icon: 'plan' },
  { id: 'weekly',   label: 'Vecka',   icon: 'chart' },
]

interface StudentProps { role: 'student'; tab: StudentTab | 'load' | 'injury' | 'diary' | 'matchlog'; onTab: (t: StudentTab) => void }
interface CoachProps   { role: 'coach';   tab: CoachTab;                         onTab: (t: CoachTab) => void }
type Props = StudentProps | CoachProps

export function BottomNav(props: Props) {
  const tabs = props.role === 'student' ? STUDENT_TABS : COACH_TABS

  function activeTab(tabId: string) {
    if (props.role === 'student') {
      const cur: string = props.tab
      if (cur === 'load' || cur === 'injury' || cur === 'diary' || cur === 'matchlog') return tabId === 'log'
      return tabId === cur
    }
    return tabId === props.tab
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex safe-area-bottom">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => (props.onTab as (t: string) => void)(t.id)}
          className={[
            'flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors',
            activeTab(t.id) ? 'text-green-400' : 'text-gray-600',
          ].join(' ')}
        >
          <Icon path={Icons[t.icon]} />
          <span className="text-[10px] font-medium">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
