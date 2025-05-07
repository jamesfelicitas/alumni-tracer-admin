import { useEffect, useState } from 'react';
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
  SelectChangeEvent
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
  const mapCenter: [number, number] = [8.359724960609691, 124.86915063536755];
  const initialZoom = 5;

  useEffect(() => {
    // Simulate loading data from a JSON file
    const fetchData = async () => {
      const mockData: AlumniData = {
        stats: {
          newAlumni: 42,
          activeAlumni: 1280,
          inactiveAlumni: 312,
          totalAlumni: 1634
        },
        activity: [
          { month: 'Jan', newAlumni: 5, activeAlumni: 1200, inactiveAlumni: 300 },
          { month: 'Feb', newAlumni: 8, activeAlumni: 1220, inactiveAlumni: 290 },
          { month: 'Mar', newAlumni: 12, activeAlumni: 1250, inactiveAlumni: 280 },
          { month: 'Apr', newAlumni: 10, activeAlumni: 1260, inactiveAlumni: 295 },
          { month: 'May', newAlumni: 7, activeAlumni: 1280, inactiveAlumni: 312 }
        ],
        locations: [
          { id: 1, name: 'John Doe', position: [8.3597, 124.8691], college: 'IBM', status: 'active' },
          { id: 2, name: 'Jane Smith', position: [8.3600, 124.8700], college: 'ICS', status: 'active' },
          { id: 3, name: 'Bob Johnson', position: [8.3580, 124.8680], college: 'ITE', status: 'inactive' },
          { id: 4, name: 'Alice Brown', position: [8.3610, 124.8710], college: 'IBM', status: 'new' },
          { id: 5, name: 'Charlie Wilson', position: [8.3620, 124.8720], college: 'ICS', status: 'active' },
          { id: 6, name: 'Diana Miller', position: [8.3570, 124.8670], college: 'ITE', status: 'inactive' },
          { id: 7, name: 'Evan Davis', position: [8.3630, 124.8730], college: 'IBM', status: 'active' },
          { id: 8, name: 'Fiona Garcia', position: [8.3560, 124.8660], college: 'Other', status: 'new' },
          { id: 9, name: 'George Harris', position: [8.3595, 124.8695], college: 'IBM', status: 'active' },
          { id: 10, name: 'Hannah Lee', position: [8.3593, 124.8693], college: 'ICS', status: 'active' },
          { id: 11, name: 'Ian Clark', position: [8.3592, 124.8692], college: 'ITE', status: 'inactive' },
          { id: 12, name: 'Julia Adams', position: [8.3591, 124.8691], college: 'IBM', status: 'new' },
        ]
      };
      
      setAlumniData(mockData);
    };

    fetchData();
  }, []);

  const handleCollegeFilterChange = (event: SelectChangeEvent) => {
    setCollegeFilter(event.target.value as string);
  };

  const filteredLocations = alumniData?.locations.filter(location => 
    collegeFilter === 'all' || location.college === collegeFilter
  ) || [];

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