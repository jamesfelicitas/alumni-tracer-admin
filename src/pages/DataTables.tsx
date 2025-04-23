import { useState, useMemo } from 'react';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { Card, CardContent, Typography, TextField, Box } from '@mui/material';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 90 },
  { field: 'name', headerName: 'Name', width: 150 },
  { field: 'age', headerName: 'Age', type: 'number', width: 110 },
  { field: 'email', headerName: 'Email', width: 200 },
  { field: 'status', headerName: 'Status', width: 130 },
];

const initialRows = [
  { id: 1, name: 'Alice Johnson', age: 25, email: 'alice@example.com', status: 'Active' },
  { id: 2, name: 'Bob Smith', age: 32, email: 'bob@example.com', status: 'Pending' },
  { id: 3, name: 'Charlie Brown', age: 28, email: 'charlie@example.com', status: 'Inactive' },
  { id: 4, name: 'Diana Prince', age: 35, email: 'diana@example.com', status: 'Active' },
  { id: 5, name: 'Ethan Hunt', age: 40, email: 'ethan@example.com', status: 'Pending' },
];

const DataTables = () => {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 5,
    page: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = useMemo(() => {
    return initialRows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery]);

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

        <div style={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
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
