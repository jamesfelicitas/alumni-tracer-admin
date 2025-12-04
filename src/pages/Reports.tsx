import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../supabaseClient';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

type TimeFilter = 'day' | 'week' | 'month' | 'year';

interface RegistrationData {
  period: string;
  count: number;
}

interface FilterOptions {
  course: string;
  yearGraduated: string;
}

const Reports: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [filters, setFilters] = useState<FilterOptions>({
    course: 'all',
    yearGraduated: 'all',
  });
  const [registrationData, setRegistrationData] = useState<RegistrationData[]>([]);
  const [totalAlumni, setTotalAlumni] = useState(0);
  const [courses, setCourses] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    fetchYears();
  }, []);

  useEffect(() => {
    fetchRegistrationData();
  }, [timeFilter, filters]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('course')
        .not('course', 'is', null);

      if (error) throw error;

      const uniqueCourses = Array.from(
        new Set(data.map((item) => item.course).filter(Boolean))
      ) as string[];
      setCourses(uniqueCourses.sort());
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchYears = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('graduation_year')
        .not('graduation_year', 'is', null);

      if (error) throw error;

      const uniqueYears = Array.from(
        new Set(data.map((item) => String(item.graduation_year)).filter(Boolean))
      ) as string[];
      setYears(uniqueYears.sort((a, b) => parseInt(b) - parseInt(a)));
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchRegistrationData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('created_at, course, graduation_year, role');

      // Apply filters
      if (filters.course !== 'all') {
        query = query.eq('course', filters.course);
      }
      if (filters.yearGraduated !== 'all') {
        query = query.eq('graduation_year', Number(filters.yearGraduated));
      }

      // Only count alumni registrations
      query = query.eq('role', 'alumni');

      const { data, error } = await query;

      if (error) throw error;

      setTotalAlumni(data?.length || 0);

      // Group data by time period
      const groupedData = groupDataByTimePeriod(data || [], timeFilter);
      setRegistrationData(groupedData);
    } catch (error) {
      console.error('Error fetching registration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupDataByTimePeriod = (
    data: any[],
    period: TimeFilter
  ): RegistrationData[] => {
    const grouped: { [key: string]: number } = {};

    data.forEach((item) => {
      if (!item.created_at) return;

      const date = new Date(item.created_at);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  };

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'day':
        return 'Daily Registrations';
      case 'week':
        return 'Weekly Registrations';
      case 'month':
        return 'Monthly Registrations';
      case 'year':
        return 'Yearly Registrations';
    }
  };

  const formatPeriodLabel = (period: string) => {
    switch (timeFilter) {
      case 'day':
        return new Date(period).toLocaleDateString();
      case 'week':
        return `Week of ${new Date(period).toLocaleDateString()}`;
      case 'month':
        const [year, month] = period.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('default', {
          year: 'numeric',
          month: 'long',
        });
      case 'year':
        return period;
      default:
        return period;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Alumni Registration Reports
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Time Period</InputLabel>
              <Select
                value={timeFilter}
                label="Time Period"
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              >
                <MenuItem value="day">Daily</MenuItem>
                <MenuItem value="week">Weekly</MenuItem>
                <MenuItem value="month">Monthly</MenuItem>
                <MenuItem value="year">Yearly</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Course</InputLabel>
              <Select
                value={filters.course}
                label="Course"
                onChange={(e) => setFilters({ ...filters, course: e.target.value })}
              >
                <MenuItem value="all">All Courses</MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course} value={course}>
                    {course}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Year Graduated</InputLabel>
              <Select
                value={filters.yearGraduated}
                label="Year Graduated"
                onChange={(e) =>
                  setFilters({ ...filters, yearGraduated: e.target.value })
                }
              >
                <MenuItem value="all">All Years</MenuItem>
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                <PeopleIcon sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {totalAlumni}
                  </Typography>
                  <Typography variant="body2">Total Alumni</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                <CalendarTodayIcon sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {registrationData.length}
                  </Typography>
                  <Typography variant="body2">Time Periods</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                <TrendingUpIcon sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {registrationData.length > 0
                      ? Math.max(...registrationData.map((d) => d.count))
                      : 0}
                  </Typography>
                  <Typography variant="body2">Peak Registration</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {getTimeFilterLabel()} - Bar Chart
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={registrationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={formatPeriodLabel}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={formatPeriodLabel} />
                  <Legend />
                  <Bar dataKey="count" fill="#667eea" name="Registrations" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {getTimeFilterLabel()} - Line Chart
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={registrationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={formatPeriodLabel}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={formatPeriodLabel} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#f5576c"
                    strokeWidth={2}
                    name="Registrations"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Reports;
