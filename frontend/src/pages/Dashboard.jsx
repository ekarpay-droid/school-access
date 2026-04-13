import React, { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { getStats, getEvents } from '../api'

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`rounded-xl p-5 text-white ${color}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-4xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  )
}

function DirectionBadge({ direction }) {
  if (direction === 'entry')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
        ↑ Вход
      </span>
    )
  if (direction === 'exit')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full px-2 py-0.5">
        ↓ Выход
      </span>
    )
  return (
    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">—</span>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([getStats(), getEvents({ limit: 20 })])
      setStats(s.data)
      setEvents(e.data)
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [refresh])

  if (loading)
    return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>

  if (!stats)
    return (
      <div className="text-red-500">
        Не удалось загрузить данные. Убедитесь, что бэкенд запущен.
      </div>
    )

  const dailyData = (stats.daily || []).map((d) => ({
    date: d.date.slice(5),
    Входы: d.entries,
    Выходы: d.exits,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Сводка за сегодня</h2>
        <span className="text-sm text-gray-400">
          Обновляется каждые 10 с ·{' '}
          {format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: ru })}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Школ в сети" value={stats.total_schools} color="bg-blue-600" />
        <StatCard label="Всего учеников" value={stats.total_students} color="bg-indigo-600" />
        <StatCard
          label="Входов сегодня"
          value={stats.today_entries}
          sub="проходов через турникет"
          color="bg-green-600"
        />
        <StatCard
          label="Выходов сегодня"
          value={stats.today_exits}
          sub="проходов через турникет"
          color="bg-orange-500"
        />
      </div>

      {/* Chart + school table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Посещаемость за 7 дней</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Входы" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Выходы" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Schools table */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">По школам сегодня</h3>
          {stats.schools.length === 0 ? (
            <p className="text-gray-400 text-sm">Нет данных. Добавьте школы в разделе «Школы».</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Школа</th>
                  <th className="pb-2 font-medium text-right">Присутствуют</th>
                  <th className="pb-2 font-medium text-right">Входов</th>
                </tr>
              </thead>
              <tbody>
                {stats.schools.map((s) => (
                  <tr key={s.school_id} className="border-b last:border-0">
                    <td className="py-2 text-gray-800">{s.school_name}</td>
                    <td className="py-2 text-right font-semibold text-blue-600">
                      {s.today_present} / {s.total_students}
                    </td>
                    <td className="py-2 text-right text-green-600">{s.today_entries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent events */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4">Последние события</h3>
        {events.length === 0 ? (
          <p className="text-gray-400 text-sm">
            Нет событий. Настройте турникеты на отправку данных (см. Инструкцию по интеграции).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Время</th>
                  <th className="pb-2 font-medium">Имя / Карта</th>
                  <th className="pb-2 font-medium">Направление</th>
                  <th className="pb-2 font-medium">Турникет</th>
                  <th className="pb-2 font-medium">Школа</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 text-gray-500 whitespace-nowrap">
                      {format(new Date(ev.event_time), 'dd.MM HH:mm:ss')}
                    </td>
                    <td className="py-2 font-medium">
                      {ev.person_name || ev.card_no || '—'}
                    </td>
                    <td className="py-2">
                      <DirectionBadge direction={ev.direction} />
                    </td>
                    <td className="py-2 text-gray-500">
                      {ev.turnstile?.name || '—'}
                    </td>
                    <td className="py-2 text-gray-500">
                      {ev.student?.school?.name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
