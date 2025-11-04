import { useEffect, useRef, useState } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  useTheme, 
  IconButton, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  SelectChangeEvent,
  LinearProgress
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import './Dashboard.css';
import { supabase } from '../supabaseClient';
// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom colored icons for different colleges
const collegeIcons: Record<string, L.Icon> = {
  IBM: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  ICS: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  ITE: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  Other: new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
};

// Types
interface AlumniData {
  stats: {
    newAlumni: number;
    activeAlumni: number;
    inactiveAlumni: number;
    totalAlumni: number;
  };
  activity: Array<{
    month: string;
    newAlumni: number;
    activeAlumni: number;
    inactiveAlumni: number;
  }>;
  locations: Array<{
    id: number;
    name: string;
    position: [number, number];
    college: 'IBM' | 'ICS' | 'ITE' | 'Other';
    status: 'active' | 'inactive' | 'new';
  }>;
}

interface StatCardProps {
  title: string;
  value: number | string;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

// Reset View Component
function ResetViewControl({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  const handleClick = () => {
    map.setView(center, zoom);
    map.closePopup();
  };

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control leaflet-bar">
        <IconButton 
          onClick={handleClick}
          size="small"
          sx={{
            backgroundColor: 'white',
            '&:hover': { backgroundColor: 'white' },
            padding: '4px',
            margin: '2px'
          }}
        >
          <GpsFixedIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
}

// Stat Card Component
const StatCard = ({ title, value, color }: StatCardProps) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        minHeight: 120,
        backgroundColor: theme.palette[color].main,
        color: theme.palette[color].contrastText,
        boxShadow: 3,
      }}
    >
      <CardContent>
        <Typography variant="subtitle1">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight="bold">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const [alumniData, setAlumniData] = useState<AlumniData | null>(null);
  const [collegeFilter, setCollegeFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mapCenter: [number, number] = [12.988438,121.785126];
  const initialZoom = 5;
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const countProfiles = async (kind?: 'new' | 'active' | 'inactive') => {
      // Use count:'exact' so Content-Range is parsed reliably
      let q = supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'alumni');
      if (collegeFilter !== 'all') q = q.eq('college', collegeFilter);

      if (kind === 'new') {
        // Treat as recent signups OR explicit status='new'
        const since = new Date();
        since.setDate(since.getDate() - 30);
        q = q.or(`status.eq.new,created_at.gte.${since.toISOString()}`);
      } else if (kind === 'active') {
        // Treat null as active so legacy rows count
        q = q.or('status.eq.active,status.is.null');
      } else if (kind === 'inactive') {
        q = q.eq('status', 'inactive');
      }

      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    };

    const computeProfileStats = async () => {
      const [newCount, activeCount, inactiveCount, totalCount] = await Promise.all([
        countProfiles('new'),
        countProfiles('active'),
        countProfiles('inactive'),
        (async () => {
          let tq = supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'alumni');
          if (collegeFilter !== 'all') tq = tq.eq('college', collegeFilter);
          const { count, error } = await tq;
          if (error) throw error;
          return count ?? 0;
        })(),
      ]);
      return { newAlumni: newCount, activeAlumni: activeCount, inactiveAlumni: inactiveCount, totalAlumni: totalCount };
    };

    const loadViaProfiles = async () => {
      // Cards from profiles (role='alumni'), map markers also loaded from profiles
      const stats = await computeProfileStats();

      // Fetch locations from profiles (optionally filtered by college)
      // Assumption: `profiles` contains latitude/longitude columns named `lat` and `lng`,
      // and a display name in `full_name` (or first_name/last_name).
      let lq = supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, college, status, location')
        .order('id', { ascending: false })
        .limit(5000);
      if (collegeFilter !== 'all') lq = lq.eq('college', collegeFilter);
  const { error: locErr } = await lq;
      if (locErr) throw locErr;

      // profiles table doesn't have lat/lng; skip markers until coordinates are available
      const mappedLocations: AlumniData['locations'] = [];

      setAlumniData({
        stats,
        activity: [],
        locations: mappedLocations,
      });
    };

    const loadDashboard = async () => {
      // Skip RPC entirely (server-side function references deleted table).
      // Always load dashboard data from profiles to avoid server errors.
      setLoading(true);
      setLoadError(null);
      try {
        await loadViaProfiles();
      } catch (e: any) {
        console.error('Failed to load dashboard via profiles:', e);
        setLoadError(e?.message || String(e));
      }
      setLoading(false);
    };

    loadDashboard();

  // Realtime: subscribe to profiles (for counts and map updates)
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(loadDashboard, 400);
      })
      .subscribe();

    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [collegeFilter]);

  const handleCollegeFilterChange = (event: SelectChangeEvent) => {
    setCollegeFilter(event.target.value as string);
  };

  // locations are already filtered server-side by college_filter
  const filteredLocations = alumniData?.locations || [];

  const stats: StatCardProps[] = [
    { title: 'New Alumni', value: alumniData?.stats.newAlumni || 0, color: 'primary' },
    { title: 'Active Alumni', value: alumniData?.stats.activeAlumni || 0, color: 'success' },
    { title: 'Inactive Alumni', value: alumniData?.stats.inactiveAlumni || 0, color: 'warning' },
    { title: 'Total Alumni', value: alumniData?.stats.totalAlumni || 0, color: 'info' },
  ];

  // Custom cluster icon creation function
  const createClusterCustomIcon = (cluster: any) => {
    return L.divIcon({
      html: `<span>${cluster.getChildCount()}</span>`,
      className: 'custom-marker-cluster',
      iconSize: L.point(40, 40, true)
    });
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Alumni Dashboard
      </Typography>

      <Grid container spacing={3}>
        {loadError && (
          <Grid item xs={12}>
            <Typography color="error" variant="body2">{loadError}</Typography>
          </Grid>
        )}
        {loading && (
          <Grid item xs={12}>
            <LinearProgress />
          </Grid>
        )}
        {stats.map((stat) => (
          <Grid item key={stat.title} xs={12} sm={6} md={3}>
            <StatCard title={stat.title} value={stat.value} color={stat.color} />
          </Grid>
        ))}
        
        <Grid container spacing={3} style={{marginTop:'1rem'}}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: 500 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Alumni Activity Over Time
                </Typography>
                <ResponsiveContainer width="100%" height="80%">
                  <LineChart data={alumniData?.activity || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="newAlumni" 
                      stroke={theme.palette.primary.main} 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="activeAlumni" 
                      stroke={theme.palette.success.main} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="inactiveAlumni" 
                      stroke={theme.palette.warning.main} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ height: 800 }}>
              <CardContent sx={{ height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    Alumni Locations
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Filter by College</InputLabel>
                    <Select
                      value={collegeFilter}
                      label="Filter by College"
                      onChange={handleCollegeFilterChange}
                    >
                      <MenuItem value="all">All Colleges</MenuItem>
                      <MenuItem value="IBM">IBM</MenuItem>
                      <MenuItem value="ICS">ICS</MenuItem>
                      <MenuItem value="ITE">ITE</MenuItem>
                    </Select>
                  </FormControl>
                </div>
                <div style={{ height: '85%', width: '100%', position: 'relative' }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={initialZoom}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MarkerClusterGroup
                      iconCreateFunction={createClusterCustomIcon}
                      showCoverageOnHover={false}
                      spiderfyOnMaxZoom={true}
                    >
                      {filteredLocations.map((location) => (
                        <Marker 
                          key={location.id} 
                          position={location.position}
                          icon={collegeIcons[location.college]}
                        >
                          <Popup>
                            <div>
                              <strong>{location.name}</strong>
                              <div>College: {location.college}</div>
                              <div>Status: {location.status}</div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MarkerClusterGroup>
                    <ResetViewControl center={mapCenter} zoom={initialZoom} />
                  </MapContainer>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;