
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography, TextField, LinearProgress, Alert, Stack, Tooltip, IconButton } from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import { supabase } from '../supabaseClient';

// Tables
const DELETION_TABLE = 'account_deletion_requests';
const PROFILES_TABLE = 'profiles';

type Status = 'pending' | 'approved' | 'denied' | null;

type DeletionRequestRow = {
  id: string;
  user_id: string | null;
  reason: string | null;
  status: Status;
  created_at: string | null;
  // merged from profiles
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
};

export default function DeletionRequestsAdmin() {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState<DeletionRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Track previous status for undo per row id
  const [prevStatus, setPrevStatus] = useState<Record<string, Status>>({});

  const columns: GridColDef[] = [
    { field: 'full_name', headerName: 'Full Name', width: 200 },
    { field: 'first_name', headerName: 'First Name', width: 140 },
    { field: 'last_name', headerName: 'Last Name', width: 140 },
    { field: 'reason', headerName: 'Reason', width: 260 },
    { field: 'status', headerName: 'Status', width: 120 },
    {
      field: 'created_at',
      headerName: 'Requested At',
      width: 180,
      valueFormatter: (v) => (v ? new Date(v as string).toLocaleString() : ''),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const row = p.row as DeletionRequestRow;
        if (row.status === 'pending') {
          return (
            <Stack direction="row" spacing={1}>
              <Tooltip title="Approve">
                <span>
                  <IconButton size="small" color="success" onClick={() => updateStatus(row, 'approved')}>
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Deny">
                <span>
                  <IconButton size="small" color="warning" onClick={() => updateStatus(row, 'denied')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          );
        }
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title={`Undo (revert to pending)`}>
              <span>
                <IconButton size="small" color="primary" onClick={() => undoStatus(row)}>
                  <UndoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      setInfo(null);

      const { data, error } = await supabase
        .from(DELETION_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const baseRows = (data ?? []) as DeletionRequestRow[];
      const userIds = Array.from(new Set(baseRows.map((r) => r.user_id).filter(Boolean))) as string[];
      let profilesById: Record<string, { first_name: string | null; last_name: string | null; full_name: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profs, error: pe } = await supabase
          .from(PROFILES_TABLE)
          .select('id, first_name, last_name, full_name')
          .in('id', userIds);
        if (pe) {
          setInfo(`Loaded requests, but failed to read profiles: ${pe.message}`);
        } else {
          profilesById = (profs ?? []).reduce((acc, p: any) => {
            acc[p.id] = { first_name: p.first_name ?? null, last_name: p.last_name ?? null, full_name: p.full_name ?? null };
            return acc;
          }, {} as Record<string, { first_name: string | null; last_name: string | null; full_name: string | null }>);
        }
      }

      const merged = baseRows.map((r) => {
        const prof = r.user_id ? profilesById[r.user_id] : undefined;
        const full = (prof?.full_name ?? [prof?.first_name, prof?.last_name].filter(Boolean).join(' ')) || null;
        return { ...r, first_name: prof?.first_name ?? null, last_name: prof?.last_name ?? null, full_name: full };
      });

      setRows(merged);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.full_name, r.first_name, r.last_name, r.reason, r.status, r.created_at]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  async function updateStatus(row: DeletionRequestRow, status: Exclude<Status, null>) {
    const before = row.status;
    const { error } = await supabase.from(DELETION_TABLE).update({ status }).eq('id', row.id);
    if (error) { setError(error.message); return; }
    setPrevStatus(prev => ({ ...prev, [row.id]: before }));
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status } : r));
  }

  async function undoStatus(row: DeletionRequestRow) {
    const previous = prevStatus[row.id] ?? 'pending';
    const { error } = await supabase.from(DELETION_TABLE).update({ status: previous }).eq('id', row.id);
    if (error) { setError(error.message); return; }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: previous } : r));
    // reset previous status to pending baseline
    setPrevStatus(prev => ({ ...prev, [row.id]: 'pending' }));
  }

  return (
    <Card sx={{ width: '100%' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>Account Deletion Requests</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2}>
          <TextField fullWidth variant="outlined" size="small" label="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </Stack>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {info && <Alert severity="info" sx={{ mb: 1 }}>{info}</Alert>}
        <div style={{ height: 540, width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(r) => r.id}
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
        
