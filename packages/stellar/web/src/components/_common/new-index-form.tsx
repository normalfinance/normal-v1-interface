import type { IIndexItem } from '@/types/indexes';

import { z as zod } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { isValidPhoneNumber } from 'react-phone-number-input/input';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fData } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Form, Field, schemaHelper } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type NewIndexSchemaType = zod.infer<typeof NewUserSchema>;

export const NewUserSchema = zod.object({
  avatarUrl: schemaHelper.file({ message: 'Avatar is required!' }),
  indexName: zod.string().min(1, { message: 'Name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  phoneNumber: schemaHelper.phoneNumber({ isValid: isValidPhoneNumber }),
  address: zod.string().min(1, { message: 'Address is required!' }),
  company: zod.string().min(1, { message: 'Company is required!' }),
  state: zod.string().min(1, { message: 'State is required!' }),
  city: zod.string().min(1, { message: 'City is required!' }),
  role: zod.string().min(1, { message: 'Role is required!' }),
  zipCode: zod.string().min(1, { message: 'Zip code is required!' }),
  // Not required
  status: zod.string(),
  isVerified: zod.boolean(),
});

// ----------------------------------------------------------------------

type Props = {
  currentUser?: IIndexItem;
};

export function NewIndexForm({ currentUser }: Props) {
  const router = useRouter();

  const defaultValues: NewIndexSchemaType = {
    status: '',
    avatarUrl: null,
    isVerified: true,
    indexName: '',
    email: '',
    phoneNumber: '',
    state: '',
    city: '',
    address: '',
    zipCode: '',
    company: '',
    role: '',
  };

  const methods = useForm<NewIndexSchemaType>({
    mode: 'onSubmit',
    resolver: zodResolver(NewUserSchema),
    defaultValues,
    values: currentUser,
  });

  const {
    reset,
    watch,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  const onSubmit = handleSubmit(async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      reset();
      toast.success(currentUser ? 'Update success!' : 'Create success!');
      //router.push(paths.dashboard.user.list);
      console.info('DATA', data);
    } catch (error) {
      console.error(error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Card sx={{ p: 3 }}>
        <Box
          sx={{
            rowGap: 3,
            columnGap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
          }}
        >
          <Field.Text name="indexName" label="Index name" autoComplete="off" />
          <Field.Text name="email" label="Email address" />

          <Field.Text name="state" label="State/region" />
          <Field.Text name="city" label="City" />
          <Field.Text name="address" label="Address" />
          <Field.Text name="zipCode" label="Zip/code" />
          <Field.Text name="company" label="Company" />
          <Field.Text name="role" label="Role" />
        </Box>

        <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            {!currentUser ? 'Create user' : 'Save changes'}
          </LoadingButton>
        </Stack>
      </Card>
    </Form>
  );
}
