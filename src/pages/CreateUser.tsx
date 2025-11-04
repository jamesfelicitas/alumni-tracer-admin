import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { supabase } from '../supabaseClient';

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  graduationYear: number | '';
  course: string;
  phoneNumber: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const coursesList = [
  'BSIT',
  'TEP BSEd - English',
  'TEP BSEd - Math',
  'TEP - BEEd',
  'TEP - BECEd',
  'BSBA - Financial Management',
  'BSBA - Marketing Management',
  'BSBA - Operations Management',
];

const currentYear = new Date().getFullYear();

const CreateUser: React.FC = () => {
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    graduationYear: currentYear,
    course: '',
    phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValidEmail = (e: string) => /\S+@\S+\.\S+/.test(e);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.firstName) e.firstName = 'First name is required';
    if (!form.lastName) e.lastName = 'Last name is required';

    if (!form.email) e.email = 'Email is required';
    else if (!isValidEmail(form.email)) e.email = 'Invalid email address';

    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters';

    if (!form.confirmPassword) e.confirmPassword = 'Please confirm password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';

    if (!form.course) e.course = 'Course is required';

    if (form.graduationYear === '' || Number.isNaN(Number(form.graduationYear))) {
      e.graduationYear = 'Graduation year is required';
    } else if (Number(form.graduationYear) < 1980 || Number(form.graduationYear) > currentYear + 5) {
      e.graduationYear = `Year must be between 1980 and ${currentYear + 5}`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (name: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const fullName = useMemo(
    () => [form.firstName, form.lastName].filter(Boolean).join(' '),
    [form.firstName, form.lastName]
  );

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSuccessMsg(null); setErrorMsg(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      // 1) Create the auth user using the primary supabase client
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (signUpError || !signUpData.user) {
        throw new Error(signUpError?.message || 'Failed to create auth user');
      }
      const newUser = signUpData.user;

      // 2) Insert/update the profile row (avoid duplicate key)
      const profile = {
        id: newUser.id,
        first_name: form.firstName,
        last_name: form.lastName,
        full_name: fullName || null,
        graduation_year: Number(form.graduationYear),
        course: form.course,
        phone_number: form.phoneNumber || null,
        role: 'alumni' as const,
        email: form.email.toLowerCase(),
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' }); // will update if it already exists

      if (upsertError) {
        // Gracefully handle "duplicate" just in case, and still show success
        if (/duplicate key/i.test(upsertError.message) || (upsertError as any)?.code === '23505') {
          setSuccessMsg(`User ${fullName || form.email} already exists. Profile kept/updated.`);
        } else {
          throw new Error(upsertError.message);
        }
      } else {
        setSuccessMsg(`User ${fullName || form.email} was created successfully.`);
      }

      setForm({
        email: '', password: '', confirmPassword: '', firstName: '', lastName: '',
        graduationYear: currentYear, course: '', phoneNumber: '',
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to create user';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <PersonAddAlt1Icon />
            <Typography variant="h5">Create User Account</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Create an alumni account. This will create an authentication record and a profile entry.
          </Typography>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
              {errorMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="First Name"
                value={form.firstName}
                onChange={(e) => onChange('firstName', e.target.value)}
                error={Boolean(errors.firstName)}
                helperText={errors.firstName}
                required
              />
              <TextField
                label="Last Name"
                value={form.lastName}
                onChange={(e) => onChange('lastName', e.target.value)}
                error={Boolean(errors.lastName)}
                helperText={errors.lastName}
                required
              />
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => onChange('email', e.target.value)}
                error={Boolean(errors.email)}
                helperText={errors.email}
                required
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => onChange('password', e.target.value)}
                  error={Boolean(errors.password)}
                  helperText={errors.password}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                          {showPassword ? <VisibilityOff/> : <Visibility/>}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <TextField
                  label="Confirm Password"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => onChange('confirmPassword', e.target.value)}
                  error={Boolean(errors.confirmPassword)}
                  helperText={errors.confirmPassword}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirm((s) => !s)} edge="end">
                          {showConfirm ? <VisibilityOff/> : <Visibility/>}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth error={Boolean(errors.course)}>
                  <InputLabel id="course-label">Course/Program</InputLabel>
                  <Select
                    labelId="course-label"
                    label="Course/Program"
                    value={form.course}
                    onChange={(e) => onChange('course', e.target.value)}
                    required
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {coursesList.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                  {errors.course && <FormHelperText>{errors.course}</FormHelperText>}
                </FormControl>

                <TextField
                  label="Year Graduated"
                  type="number"
                  value={form.graduationYear}
                  onChange={(e) => onChange('graduationYear', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  inputProps={{ min: 1980, max: currentYear + 5 }}
                  error={Boolean(errors.graduationYear)}
                  helperText={errors.graduationYear as any}
                  required
                  fullWidth
                />
              </Stack>

              <TextField
                label="Phone Number (optional)"
                value={form.phoneNumber}
                onChange={(e) => onChange('phoneNumber', e.target.value)}
              />

              {/* Role selection removed; new users default to 'alumni' */}

              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Account'}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  disabled={submitting}
                  onClick={() => setForm({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '', graduationYear: currentYear, course: '', phoneNumber: '' })}
                >
                  Reset
                </Button>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={Boolean(successMsg)} onClose={() => setSuccessMsg(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Account Created</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {successMsg || `User ${fullName || form.email} was created successfully.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessMsg(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateUser;
