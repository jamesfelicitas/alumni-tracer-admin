import React from 'react';
import { Grid, Card, CardContent, Typography, useTheme } from '@mui/material';

const stats = [
  { title: 'Users', value: 1280 },
  { title: 'Sales', value: '$32,400' },
  { title: 'Active Sessions', value: 312 },
  { title: 'Bounce Rate', value: '48%' },
];

const Dashboard = () => {
  const theme = useTheme();

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item key={stat.title} xs={12} sm={6} md={3}>
            <Card sx={{ minHeight: 120, backgroundColor: theme.palette.background.paper, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" color="text.secondary">
                  {stat.title}
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default Dashboard;
