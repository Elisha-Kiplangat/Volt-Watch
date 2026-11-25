import { Activity } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { VoltagePoint } from '../../types/monitoring'

function formatTime(date: string) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

export function VoltageTrendChart({ points, loading, realtime }: { points: VoltagePoint[]; loading: boolean; realtime: boolean }) {
  return <section className="panel voltage-panel">
    <div className="panel-heading">
      <div><h2>Voltage trend</h2><p>Recent persisted sensor readings</p></div>
      <div className="chart-heading-actions"><span className={`realtime-status ${realtime ? 'connected' : ''}`}><i />{realtime ? 'LIVE' : 'POLLING'}</span><span className="legend"><i /> Voltage <small>V</small></span></div>
    </div>
    {points.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 10, right: 12, bottom: 0, left: -16 }}>
        <defs><linearGradient id="voltageFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60C1E5" stopOpacity={0.28} /><stop offset="96%" stopColor="#60C1E5" stopOpacity={0.015} /></linearGradient></defs>
        <CartesianGrid stroke="#E8EDF1" vertical={false} />
        <XAxis dataKey="recordedAt" tickFormatter={formatTime} tickLine={false} axisLine={false} tick={{ fill: '#778491', fontSize: 12 }} minTickGap={32} />
        <YAxis domain={[160, 280]} ticks={[180, 210, 240, 270]} tickLine={false} axisLine={false} tick={{ fill: '#778491', fontSize: 12 }} />
        <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} formatter={(entry: number, name: string) => [`${entry.toFixed(1)} V`, name]} />
        <Area type="monotone" dataKey="voltageDevice" name="REAL" stroke="#005A9C" strokeWidth={2} fill="url(#voltageFill)" dot={false} activeDot={{ r: 4, fill: '#005A9C' }} connectNulls />
        <Area type="monotone" dataKey="voltageSimulated" name="SIMULATED" stroke="#d9972f" strokeWidth={1.7} strokeDasharray="5 4" fill="none" dot={false} connectNulls />
      </AreaChart>
    </ResponsiveContainer></div> : <div className="empty-chart"><Activity size={21} /><strong>{loading ? 'Loading measurements' : 'No persisted readings'}</strong><span>Voltage history appears here when device telemetry is received.</span></div>}
    <div className="chart-footnote"><span><i className="threshold-dot warning" /> SIMULATED readings are dashed</span><span><i className="threshold-dot warning" /> Warning: 180-210 V / 250-270 V</span><span><i className="threshold-dot danger" /> Critical: below 180 V / above 270 V</span></div>
  </section>
}