import { useState, useMemo, useEffect } from 'react';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { Card, CardContent, Typography, TextField, Box, LinearProgress, Alert } from '@mui/material';
import { supabase } from '../supabaseClient';
type Profile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  graduation_year: number | null;
  course: string | null;
  current_job: string | null;
  company: string | null;
  location: string | null;
  phone_number: string | null;
  role: 'alumni' | 'admin';
  created_at: string;
};

type Row = Profile & { display_full_name: string };

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 240 },
  { field: 'display_full_name', headerName: 'Full Name', width: 180 },
  { field: 'course', headerName: 'Course', width: 140 },
  {
    field: 'graduation_year',
    headerName: 'Grad Year',
    width: 110,
    type: 'number',
    valueFormatter: (value: number | null | undefined) => (value == null ? '' : String(value)),
  },
  { field: 'current_job', headerName: 'Current Job', width: 160 },
  { field: 'company', headerName: 'Company', width: 160 },
  { field: 'location', headerName: 'Location', width: 160 },
  { field: 'phone_number', headerName: 'Phone', width: 140 },
  { field: 'role', headerName: 'Role', width: 110 },
  { field: 'created_at', headerName: 'Created At', width: 180 },
];

const DataTables = () => {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 5,
    page: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, graduation_year, course, current_job, company, location, phone_number, role, created_at')
        .order('created_at', { ascending: false });
      if (!mounted) return;
      if (error) setError(error.message);
      else {
        const mapped: Row[] = (data ?? []).map((p: any) => ({
          ...(p as Profile),
          display_full_name:
            (p.full_name && String(p.full_name).trim()) ||
            [p.first_name, p.last_name].filter(Boolean).join(' '),
        }));
        setRows(mapped);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      [
        row.id,
        row.full_name,
        row.first_name,
        row.last_name,
        row.course,
        row.current_job,
        row.company,
        row.location,
        row.phone_number,
        row.role,
        row.graduation_year?.toString(),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  return (
    <Card sx={{ width: '100%' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          User Records
        </Typography>

        <Box mb={2}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            label="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>

        <div style={{ height: 500, width: '100%' }}>
          {loading && <LinearProgress />}
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(r) => r.id}
            pagination
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10]}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DataTables;
