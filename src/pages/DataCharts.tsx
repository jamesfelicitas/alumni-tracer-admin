import React from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Container,
  Grid,
  Paper,
  Typography
} from '@mui/material';

type RechartsRadarData = { subject: string; score: number };

const alumniLabels = [
  'Professional Success',
  'Institutional Loyalty',
  'Communication & Engagement',
  'Lifelong Learning',
  'Philanthropy & Support'
];

const alumniScores = [80, 70, 85, 75, 60];

const programLabels = [
  'Industry Relevance',
  'Skill Development',
  'Practical Application',
  'Career Preparation',
  'Linkages with Industry & Alumni'
];

const programScores = [75, 85, 70, 80, 65];

const formatRadarData = (labels: string[], data: number[]): RechartsRadarData[] =>
  labels.map((label, index) => ({
    subject: label,
    score: data[index]
  }));

const DataCharts: React.FC = () => {
  const alumniData = formatRadarData(alumniLabels, alumniScores);
  const programData = formatRadarData(programLabels, programScores);

  return (
    <Container sx={{ py: 5 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" align="center" gutterBottom>
              Alumni Characteristics Radar Chart
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={alumniData}>
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
              <RadarChart data={programData}>
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
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DataCharts;
