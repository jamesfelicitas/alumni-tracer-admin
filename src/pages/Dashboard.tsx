import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, useTheme } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

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

  useEffect(() => {
    // Simulate API call
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
                <Typography variant="h3" fontWeight="bold">
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Line Chart Section */}
        <Grid item xs={12}>
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
      </Grid>
    </div>
  );
};

export default Dashboard;
