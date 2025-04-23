import { useEffect, useState, useRef } from 'react';
import { Grid, Card, CardContent, Typography, useTheme, IconButton } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

interface ChartDataItem {
  day: string;
  users: number;
  sales: number;
}

type StatColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

const stats: { title: string; value: number | string; color: StatColor }[] = [
  { title: 'Users', value: 1280, color: 'primary' },
  { title: 'Sales', value: '$32,400', color: 'success' },
  { title: 'Active Sessions', value: 312, color: 'warning' },
  { title: 'Bounce Rate', value: '48%', color: 'error' },
];

const Dashboard = () => {
  const theme = useTheme();
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const mapCenter: [number, number] = [8.359724960609691, 124.86915063536755];
  const initialZoom = 12;

  useEffect(() => {
    const fetchData = async () => {
      const data = [
        { day: 'Mon', users: 200, sales: 400 },
        { day: 'Tue', users: 300, sales: 460 },
        { day: 'Wed', users: 250, sales: 500 },
        { day: 'Thu', users: 400, sales: 600 },
        { day: 'Fri', users: 350, sales: 580 },
        { day: 'Sat', users: 500, sales: 620 },
        { day: 'Sun', users: 480, sales: 700 },
      ];
      setChartData(data);
    };

    fetchData();
  }, []);

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item key={stat.title} xs={12} sm={6} md={3}>
            <Card
              sx={{
                minHeight: 120,
                backgroundColor: theme.palette[stat.color].main,
                color: theme.palette[stat.color].contrastText,
                boxShadow: 3,
              }}
            >
              <CardContent>
                <Typography variant="subtitle1">
                  {stat.title}
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Weekly Users and Sales
              </Typography>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#8884d8" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="sales" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: 'calc(80vh - 150px)' }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                User Map
              </Typography>
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
                  <Marker position={mapCenter}>
                    <Popup>
                      Sample User Location <br /> Cagayan de Oro
                    </Popup>
                  </Marker>
                  <ResetViewControl center={mapCenter} zoom={initialZoom} />
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;