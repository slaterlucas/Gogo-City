import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { InstanceTask } from '../api/instances';
import { Navigation } from 'lucide-react';

// Fix default marker icons (Leaflet + bundlers strip the default asset paths)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const completedIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'completed-marker',
});

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (positions.length > 0 && !fitted.current) {
      fitted.current = true;
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions, map]);

  return null;
}

interface RouteMapProps {
  tasks: InstanceTask[];
  onTaskClick?: (taskId: string) => void;
}

export default function RouteMap({ tasks, onTaskClick }: RouteMapProps) {
  const geoTasks = tasks.filter((t) => t.lat != null && t.lng != null);

  if (geoTasks.length === 0) {
    return (
      <div className="card-retro p-6 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-widest">
        No location data available for this quest
      </div>
    );
  }

  const positions: [number, number][] = geoTasks.map((t) => [Number(t.lat), Number(t.lng)]);
  const center = positions[0];

  const openInGoogleMaps = () => {
    const origin = `${positions[0][0]},${positions[0][1]}`;
    const destination = `${positions[positions.length - 1][0]},${positions[positions.length - 1][1]}`;
    const waypoints = positions.slice(1, -1).map(([lat, lng]) => `${lat},${lng}`).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
    window.open(url, '_blank');
  };

  return (
    <div>
    <div className="card-retro overflow-hidden" style={{ height: '55vh', minHeight: 300 }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />

        <Polyline
          positions={positions}
          pathOptions={{ color: 'var(--color-primary)', weight: 3, opacity: 0.5, dashArray: '8 8' }}
        />

        {geoTasks.map((task, idx) => (
          <Marker
            key={task.id}
            position={[Number(task.lat), Number(task.lng)]}
            icon={task.is_completed ? completedIcon : new L.Icon.Default()}
            eventHandlers={onTaskClick ? { click: () => onTaskClick(task.id) } : {}}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                  {idx + 1}. {task.name}
                </p>
                {task.task_description && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>{task.task_description}</p>
                )}
                {task.address && (
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: '#999' }}>{task.address}</p>
                )}
                <p style={{ margin: '6px 0 0', fontSize: 10 }}>
                  {task.is_completed
                    ? '✅ Completed'
                    : `${task.xp || 0} XP · ${task.verification_type}`}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
    <button
      onClick={openInGoogleMaps}
      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-light)] text-[9px] uppercase tracking-widest btn-retro transition-colors"
    >
      <Navigation size={14} />
      Open Route in Google Maps
    </button>
    </div>
  );
}
