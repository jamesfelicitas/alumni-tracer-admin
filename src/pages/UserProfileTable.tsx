import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography, TextField, LinearProgress, Alert, Button, Stack } from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { supabase } from '../supabaseClient';

// Table name constant (adjusted to actual table name)
const TABLE_NAME = 'user_profile_questions';

export type UserProfileRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  region: string | null;
  province: string | null;
  skills: string | null;
  employment_status: string | null;
  employment_type: string | null;
  contract_type: string | null;
  job_related_course: boolean | null;
  received_award: boolean | null;
  award_details: string | null;
  created_at: string | null;
};

function escapeCsvCell(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  const needsQuotes = /[",\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function buildCsv<RowT>(rows: RowT[], cols: GridColDef[]): string {
  const headers = cols.map((c) => c.headerName ?? c.field).join(',');
  const lines = (rows as any[]).map((r) =>
    cols.map((c) => {
      const raw = r[c.field as keyof typeof r];
      return escapeCsvCell(raw);
    }).join(',')
  );
  return '\uFEFF' + [headers, ...lines].join('\n');
}

const columns: GridColDef[] = [
  { field: 'first_name', headerName: 'First Name', width: 140 },
  { field: 'last_name', headerName: 'Last Name', width: 140 },
  { field: 'name', headerName: 'Full Name', width: 180 },
  { field: 'country', headerName: 'Country', width: 140 },
  { field: 'region', headerName: 'Region', width: 140 },
  { field: 'province', headerName: 'Province', width: 140 },
  { field: 'skills', headerName: 'Skills', width: 200 },
  { field: 'employment_status', headerName: 'Employment Status', width: 170 },
  { field: 'employment_type', headerName: 'Employment Type', width: 160 },
  { field: 'contract_type', headerName: 'Contract Type', width: 150 },
  {
    field: 'job_related_course',
    headerName: 'Job Related to Course',
    width: 180,
    valueFormatter: (params) => (params == null ? '' : params ? 'Yes' : 'No'),
  },
  {
    field: 'received_award',
    headerName: 'Received Award',
    width: 150,
    valueFormatter: (params) => (params == null ? '' : params ? 'Yes' : 'No'),
  },
  { field: 'award_details', headerName: 'Award Details', width: 220 },
  {
    field: 'created_at',
    headerName: 'Created At',
    width: 180,
    valueFormatter: (v) => (v ? new Date(v as string).toLocaleString() : ''),
  },
];

export default function UserProfileTable() {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState<UserProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from(TABLE_NAME)
        // Select base columns plus related profile names via foreign key (assumes FK user_profile_questions.user_id -> profiles.id)
        .select('id,user_id,country,region,province,skills,employment_status,employment_type,contract_type,job_related_course,received_award,award_details,created_at,profiles(full_name,first_name,last_name)')
        .order('created_at', { ascending: false });
      if (!mounted) return;
      if (error) {
        console.warn('Join select failed; will try two-step fetch. Error:', error.message);
        // Fallback path: fetch questions, then fetch profiles and merge
        const { data: base, error: e1 } = await supabase
          .from(TABLE_NAME)
          .select('id,user_id,country,region,province,skills,employment_status,employment_type,contract_type,job_related_course,received_award,award_details,created_at')
          .order('created_at', { ascending: false });
        if (e1) {
          console.error('Fallback base fetch error:', e1);
          setError(e1.message);
        } else {
          const userIds = Array.from(new Set((base ?? []).map((b: any) => b.user_id).filter(Boolean)));
          let profilesMap = new Map<string, { full_name: string | null; first_name: string | null; last_name: string | null }>();
          if (userIds.length > 0) {
            const { data: profs, error: e2 } = await supabase
              .from('profiles')
              .select('id, full_name, first_name, last_name')
              .in('id', userIds);
            if (e2) {
              console.error('Fallback profile fetch error:', e2);
              // don't hard fail; continue with empty names
            } else {
              (profs ?? []).forEach((p: any) => {
                profilesMap.set(p.id, { full_name: p.full_name ?? null, first_name: p.first_name ?? null, last_name: p.last_name ?? null });
              });
            }
          }
          const normalized: UserProfileRow[] = (base ?? []).map((r: any) => {
            const prof = profilesMap.get(r.user_id) || { full_name: null, first_name: null, last_name: null };
            const first_name = prof.first_name;
            const last_name = prof.last_name;
            const full_name = prof.full_name || [first_name, last_name].filter(Boolean).join(' ') || null;
            return { ...r, first_name, last_name, name: full_name } as UserProfileRow;
          });
          setRows(normalized);
        }
      } else {
        const rowsFetched = (data ?? []) as any[];
        console.info('UserProfileTable rows fetched (join):', rowsFetched.length);
        const normalized: UserProfileRow[] = rowsFetched.map((r) => {
          const profile = (r as any).profiles || {};
          const first_name: string | null = profile.first_name ?? null;
          const last_name: string | null = profile.last_name ?? null;
          const full_name: string | null = profile.full_name || [first_name, last_name].filter(Boolean).join(' ') || null;
          return {
            ...r,
            first_name,
            last_name,
            name: full_name,
          } as UserProfileRow;
        });
        setRows(normalized);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rows.filter((r) =>
      [
  r.first_name,
  r.last_name,
  r.name,
        r.country,
        r.region,
        r.province,
        r.skills,
        r.employment_status,
        r.employment_type,
        r.contract_type,
        r.job_related_course != null ? (r.job_related_course ? 'yes' : 'no') : '',
        r.received_award != null ? (r.received_award ? 'yes' : 'no') : '',
        r.award_details,
        r.created_at,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const handleExportCsv = () => {
    const csv = buildCsv(filteredRows, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `user-profile-data-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card sx={{ width: '100%' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          User Profile Data
        </Typography>

        {/* Show total who answered */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Total Who Answered: {filteredRows.length}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            label="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="contained" color="primary" startIcon={<FileDownloadIcon />} onClick={handleExportCsv}>
            download CSV
          </Button>
        </Stack>

        <div style={{ height: 520, width: '100%' }}>
          {loading && <LinearProgress />}
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {!loading && !error && filteredRows.length === 0 && (
            <Alert severity="info" sx={{ mb: 1 }}>
              No rows to display. If you expect data, check Row Level Security (RLS) policies for
              the table <strong>{TABLE_NAME}</strong>. The current user may not be permitted to read
              other users' rows.
            </Alert>
          )}
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(r) => (r as UserProfileRow).id ?? (r as any).user_id}
            pagination
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
