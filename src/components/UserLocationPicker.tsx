import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../supabaseClient';

// Fix Leaflet's default icon paths for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

const DEFAULT_CENTER: [number, number] = [12.8797, 121.7740];

type Props = {
  userId: string;
  initial?: { lat: number; lng: number; address?: string } | null;
  onSaved?: () => void;
};

const reverseGeocode = async (lat: number, lon: number) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const j = await res.json();
    if (j && j.display_name) return { address: j.display_name, raw: j };
  } catch (e) {
    console.warn('reverse geocode failed', e);
  }
  return null;
};

const DraggableMarker: React.FC<{ position: { lat: number; lng: number }; onDragEnd: (lat: number, lng: number) => void }> = ({ position, onDragEnd }) => {
  const markerRef = useRef<any>(null);
  useMapEvents({});
  useEffect(() => {
    const marker: any = markerRef.current;
    if (!marker) return;
    const handler = () => {
      const latlng = marker.getLatLng();
      onDragEnd(latlng.lat, latlng.lng);
    };
    marker.on('dragend', handler);
    return () => { marker.off('dragend', handler); };
  }, [onDragEnd]);
  return (
    <Marker draggable ref={markerRef} position={[position.lat, position.lng]} />
  );
};

const UserLocationPicker: React.FC<Props> = ({ userId, initial = null, onSaved }) => {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [address, setAddress] = useState<string | null>(initial?.address ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // try to get GPS position
  const useMyLocation = () => {
    setError(null);
    if (!navigator.geolocation) { setError('Geolocation not supported in this browser'); return; }
    navigator.geolocation.getCurrentPosition(async (p) => {
      const lat = p.coords.latitude; const lng = p.coords.longitude;
      setPos({ lat, lng });
      const rev = await reverseGeocode(lat, lng);
      if (rev) setAddress(rev.address);
    }, (err) => setError(err.message || 'Failed to get location'), { enableHighAccuracy: true });
  };

  const onMarkerDrag = async (lat: number, lng: number) => {
    setPos({ lat, lng });
    const rev = await reverseGeocode(lat, lng);
    if (rev) setAddress(rev.address);
  };

  const save = async () => {
    if (!pos) { setError('No position selected'); return; }
    setSaving(true); setError(null);
    try {
      // reverse geocode if we don't have address
      let addr = address;
      if (!addr) {
        const rev = await reverseGeocode(pos.lat, pos.lng);
        if (rev) addr = rev.address;
      }
      const updates: any = { latitude: pos.lat, longitude: pos.lng };
      if (addr) updates.address = addr;
      // update the logged-in user's row in alumni_profiles
      const { error: upErr } = await supabase.from('alumni_profiles').update(updates).eq('id', userId);
      if (upErr) throw upErr;
      if (onSaved) onSaved();
    } catch (e: any) {
      console.error('save location failed', e);
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button onClick={useMyLocation} style={{ marginRight: 8 }}>Use my location (GPS)</button>
        <button onClick={save} disabled={saving || !pos}>{saving ? 'Saving…' : 'Save location'}</button>
        {error && <div style={{ color: 'red', marginTop: 6 }}>{error}</div>}
      </div>

      <div style={{ height: 420, borderRadius: 8, overflow: 'hidden' }}>
        <MapContainer center={pos ? [pos.lat, pos.lng] : DEFAULT_CENTER} zoom={pos ? 16 : 6} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {pos ? <DraggableMarker position={pos} onDragEnd={onMarkerDrag} /> : null}
        </MapContainer>
      </div>

      <div style={{ marginTop: 8 }}>
        <div><strong>Selected:</strong> {pos ? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` : '—'}</div>
        <div><strong>Address:</strong> {address ?? '—'}</div>
      </div>
    </div>
  );
};

export default UserLocationPicker;
