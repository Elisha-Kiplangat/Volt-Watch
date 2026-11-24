import { Cpu, Shield, Wifi } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DeviceSummary } from '../../types/monitoring'

export function DeviceStatusList({ devices, loading, online, normal }: { devices: DeviceSummary[]; loading: boolean; online?: number; normal?: number }) {
  return <section className="panel device-panel">
    <div className="panel-heading"><div><h2>Device status</h2><p>{devices.length} active registered devices</p></div><Link className="text-link" to="/devices">All devices <span>→</span></Link></div>
    {loading && <div className="table-message">Loading devices...</div>}
    {!loading && devices.length === 0 && <div className="table-message">No registered devices returned by the API.</div>}
    {!!devices.length && <div className="device-list">{devices.map((device) => <div className="device-row" key={device.id}>
      <div className="device-glyph"><Cpu size={17} /></div>
      <div className="device-identity"><strong>{device.name}</strong><span>{device.deviceId}{device.location ? ` · ${device.location}` : ''}</span></div>
      <span className={`status-pill ${device.connectivityStatus === 'ONLINE' ? 'healthy' : 'offline'}`}><i />{device.connectivityStatus}</span>
    </div>)}</div>}
    <div className="device-panel-footer"><span><Wifi size={14} /> {online ?? '--'} online</span><span><Shield size={14} /> {normal ?? '--'} normal</span></div>
  </section>
}