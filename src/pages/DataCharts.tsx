import React, { useEffect, useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  Container,
  Grid,
  Paper,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from '@mui/material';
import { supabase } from '../supabaseClient';

type RechartsRadarData = { subject: string; score: number };

const radarData: Record<string, {
  alumniChart: RechartsRadarData[];
  programChart: RechartsRadarData[];
}> = {
  Overall: {
    alumniChart: [
      { subject: 'Professional Success', score: 80 },
      { subject: 'Institutional Loyalty', score: 70 },
      { subject: 'Communication & Engagement', score: 85 },
      { subject: 'Lifelong Learning', score: 75 },
      { subject: 'Philanthropy & Support', score: 60 }
    ],
    programChart: [
      { subject: 'Industry Relevance', score: 75 },
      { subject: 'Skill Development', score: 85 },
      { subject: 'Practical Application', score: 70 },
      { subject: 'Career Preparation', score: 80 },
      { subject: 'Linkages with Industry & Alumni', score: 65 }
    ]
  },
  ICS: {
    alumniChart: [
      { subject: 'Professional Success', score: 82 },
      { subject: 'Institutional Loyalty', score: 68 },
      { subject: 'Communication & Engagement', score: 87 },
      { subject: 'Lifelong Learning', score: 72 },
      { subject: 'Philanthropy & Support', score: 58 }
    ],
    programChart: [
      { subject: 'Industry Relevance', score: 80 },
      { subject: 'Skill Development', score: 88 },
      { subject: 'Practical Application', score: 75 },
      { subject: 'Career Preparation', score: 78 },
      { subject: 'Linkages with Industry & Alumni', score: 70 }
    ]
  },
  IBM: {
    alumniChart: [
      { subject: 'Professional Success', score: 78 },
      { subject: 'Institutional Loyalty', score: 72 },
      { subject: 'Communication & Engagement', score: 83 },
      { subject: 'Lifelong Learning', score: 70 },
      { subject: 'Philanthropy & Support', score: 62 }
    ],
    programChart: [
      { subject: 'Industry Relevance', score: 72 },
      { subject: 'Skill Development', score: 80 },
      { subject: 'Practical Application', score: 68 },
      { subject: 'Career Preparation', score: 74 },
      { subject: 'Linkages with Industry & Alumni', score: 60 }
    ]
  },
  ITE: {
    alumniChart: [
      { subject: 'Professional Success', score: 79 },
      { subject: 'Institutional Loyalty', score: 65 },
      { subject: 'Communication & Engagement', score: 80 },
      { subject: 'Lifelong Learning', score: 74 },
      { subject: 'Philanthropy & Support', score: 61 }
    ],
    programChart: [
      { subject: 'Industry Relevance', score: 70 },
      { subject: 'Skill Development', score: 78 },
      { subject: 'Practical Application', score: 72 },
      { subject: 'Career Preparation', score: 77 },
      { subject: 'Linkages with Industry & Alumni', score: 66 }
    ]
  }
};

type ActivityPoint = { month: string; newAlumni: number; activeAlumni: number; inactiveAlumni: number };

const DataCharts: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState('Overall');
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedDept(event.target.value);
  };

  const { alumniChart, programChart } = radarData[selectedDept];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadError(null);
      try {
        // Aggregate monthly activity from profiles (last 12 months)
        const since = new Date();
        since.setMonth(since.getMonth() - 11);
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('created_at,status')
          .gte('created_at', since.toISOString());
        if (!mounted) return;
        if (error) {
          setLoadError(error.message);
          return;
        }

        const now = new Date();
        const months: Record<string, ActivityPoint> = {};
        // prepare 12 months bucket (oldest -> newest)
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
          months[key] = { month: key, newAlumni: 0, activeAlumni: 0, inactiveAlumni: 0 };
        }

        (profiles || []).forEach((p: any) => {
          const d = new Date(p.created_at);
          const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
          if (!months[key]) return; // outside range
          // count created in that month as "new" for that month
          months[key].newAlumni += 1;
          if (p.status === 'inactive') months[key].inactiveAlumni += 1;
          else months[key].activeAlumni += 1;
        });

        setActivity(Object.values(months));
      } catch (e: any) {
        setLoadError(e?.message || String(e));
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Container sx={{ py: 5 }}>
      <FormControl fullWidth sx={{ mb: 4 }}>
        <InputLabel>Department</InputLabel>
        <Select value={selectedDept} label="Department" onChange={handleChange}>
          {Object.keys(radarData).map(dept => (
            <MenuItem key={dept} value={dept}>
              {dept}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" align="center" gutterBottom>
              Alumni Characteristics Radar Chart
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={alumniChart}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Alumnus Profile Score"
                  dataKey="score"
                  stroke="#1976d2"
                  fill="#1976d2"
                  fillOpacity={0.6}
                />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" align="center" gutterBottom>
              Program & Curriculum Contribution
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={programChart}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Program Contribution Score"
                  dataKey="score"
                  stroke="#2e7d32"
                  fill="#2e7d32"
                  fillOpacity={0.6}
                />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Monthly Alumni Activity from Supabase */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" align="center" gutterBottom>
              Monthly Alumni Activity (from Supabase)
            </Typography>
            {loadError ? (
              <Typography color="error" align="center">{loadError}</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="newAlumni" name="New" stroke="#1976d2" />
                  <Line type="monotone" dataKey="activeAlumni" name="Active" stroke="#2e7d32" />
                  <Line type="monotone" dataKey="inactiveAlumni" name="Inactive" stroke="#ed6c02" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DataCharts;
