import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, ScaleControl, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../supabaseClient';

type AlumniRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  [k: string]: any;
};

// Fix Leaflet's default icon paths for Vite (keeps default blue marker)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

const DEFAULT_CENTER: [number, number] = [12.8797, 121.7740];
const DEFAULT_ZOOM = 6;

const containerStyle: React.CSSProperties = {
  height: '600px',
  borderRadius: 8,
  overflow: 'hidden',
};

const FitBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    try {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.15), { maxZoom: 12 });
    } catch (e) {
      // ignore
    }
  }, [map, points]);
  return null;
};

const AlumniMapView: React.FC = () => {
  const [rows, setRows] = useState<AlumniRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRows = async () => {
      setLoading(true);
      setError(null);
      try {
        // read from alumni_profiles table (id, full_name/name, latitude, longitude, address)
        const { data, error: err } = await supabase
          .from('alumni_profiles')
          .select('id, full_name, name, latitude, longitude, address, region, province, city')
          .limit(20000);
        if (err) throw err;
        setRows((data || []) as AlumniRow[]);
      } catch (e: any) {
        console.error('Failed to load alumni_profiles', e);
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchRows();
  }, []);

  const markers = useMemo(() => rows
    .map(r => ({
      id: r.id,
      name: r.full_name ?? r.name ?? '—',
      lat: r.latitude != null ? Number(r.latitude) : null,
      lng: r.longitude != null ? Number(r.longitude) : null,
  address: (r.address ?? [r.city, r.province, r.region].filter(Boolean).join(', ')) || null,
      raw: r,
    }))
    .filter(m => m.lat != null && m.lng != null) as { id: string; name: string; lat: number; lng: number; address?: string | null; raw: AlumniRow }[], [rows]);

  const points = markers.map(m => [m.lat, m.lng] as [number, number]);

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Alumni Locations</h3>
        <div style={{ marginLeft: 'auto', color: '#666' }}>{loading ? 'Loading…' : `${markers.length} markers`}</div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 8 }}>Error: {error}</div>}

      <div style={containerStyle}>
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <ZoomControl position="topleft" />
          <ScaleControl position="bottomleft" />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {markers.map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]}>
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontWeight: 700 }}>{m.name}</div>
                  {m.address && <div style={{ fontSize: 13, color: '#555' }}>{m.address}</div>}
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    Lat: {m.lat.toFixed(6)}, Lng: {m.lng.toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {points.length > 0 && <FitBounds points={points} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default AlumniMapView;
