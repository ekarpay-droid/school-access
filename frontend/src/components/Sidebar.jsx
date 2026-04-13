import React from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Главная', icon: '🏠' },
  { to: '/events', label: 'Журнал событий', icon: '📋' },
  { to: '/students', label: 'Ученики', icon: '👤' },
  { to: '/schools', label: 'Школы', icon: '🏫' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-blue-900 text-white flex flex-col min-h-screen">
      <div className="px-5 py-6 border-b border-blue-700">
        <p className="text-xs text-blue-300 uppercase tracking-wider">Контроль доступа</p>
        <h1 className="text-lg font-bold leading-tight mt-1">Сеть школ</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-blue-700 text-xs text-blue-400">
        Турникеты · iVMS-4200
      </div>
    </aside>
  )
}
