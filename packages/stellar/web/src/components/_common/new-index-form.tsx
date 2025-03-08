import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tooltip from '@mui/material/Tooltip';
import { Icon } from '@iconify/react';

import { useRouter } from 'src/routes/hooks';
import { fData } from 'src/utils/format-number';
import { toast } from 'src/components/snackbar';
import { Form, Field, schemaHelper } from 'src/components/hook-form';
import { IIndexItem } from '@/types/indexes';
import { NativeToken } from '@/types/native-token';

// ----------------------------------------------------------------------
// New schema for the form with character limits, description, weighting method,
// initial price slider/input, initial deposit input, and public/private switch.
export const NewIndexSchema = z.object({
  avatarUrl: schemaHelper.file({ message: 'Avatar is required!' }),
  indexName: z
    .string()
    .min(1, { message: 'Index name is required!' })
    .max(30, { message: 'Index name must be at most 30 characters' }),
  indexSymbol: z
    .string()
    .min(1, { message: 'Index symbol is required!' })
    .max(6, { message: 'Index symbol must be at most 6 characters' }),
  indexDescription: z
    .string()
    .min(1, { message: 'Description is required!' })
    .max(50, { message: 'Description must be at most 50 characters' }),
  weightingMethod: z.enum(['Constant', 'Custom', 'Market Cap'], {
    errorMap: () => ({ message: 'Please select a weighting method' }),
  }),
  initialPrice: z
    .number({ invalid_type_error: 'Initial Price must be a number' })
    .min(1, { message: 'Price must be at least $1.00' })
    .max(1000, { message: 'Price cannot exceed $1,000' }),
  initialDeposit: z
    .number({ invalid_type_error: 'Initial deposit must be a number' })
    .min(0, { message: 'Deposit must be 0 or more' }),
  isPublic: z.boolean(),
});

export type NewIndexSchemaType = z.infer<typeof NewIndexSchema>;

// ----------------------------------------------------------------------
// Component Props
type Props = {
  currentIndex?: IIndexItem;
  tokenSymbol: NativeToken;
};

// ----------------------------------------------------------------------
// NewIndexForm Component
export function NewIndexForm({ currentIndex, tokenSymbol }: Props) {
  const router = useRouter();
  const MAX_AVATAR_SIZE = 3145728;

  const defaultValues: NewIndexSchemaType = {
    avatarUrl: null,
    indexName: '',
    indexSymbol: '',
    indexDescription: '',
    weightingMethod: 'Constant',
    initialPrice: 1,
    initialDeposit: 0,
    isPublic: true,
  };

  const methods = useForm<NewIndexSchemaType>({
    mode: 'onSubmit',
    resolver: zodResolver(NewIndexSchema),
    defaultValues,
    values: currentIndex,
  });

  const {
    reset,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Simulate an API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      reset();
      toast.success(currentIndex ? 'Update success!' : 'Create success!');
      console.info('Submitted data', data);
      // Optionally redirect after submission
      // router.push('/your-target-route');
    } catch (error) {
      console.error(error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Card sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', gridColumn: 'span 2' },
            }}
          >
            <Field.Text name="indexName" label="Index Name" autoComplete="off" />
            <Field.Text name="indexSymbol" label="Index Symbol" autoComplete="off" />
          </Box>
          <Field.Text
            name="indexDescription"
            label="Description"
            multiline
            rows={4}
            sx={{ gridColumn: 'span 2' }}
          />
          <Field.Select
            name="weightingMethod"
            label="Weighting Method"
            sx={{ gridColumn: 'span 2' }}
          >
            <MenuItem value="Constant">
              Constant: Every asset is given the same weight within the index (1/x, where x is the
              number of assets).
            </MenuItem>
            <MenuItem value="Custom" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              Custom: The user sets totally custom weights for each asset. They must add up to 100%.
            </MenuItem>
            <MenuItem value="Market Cap" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              Market Cap: Each asset's weight is the proportion of its market cap to the total
              market cap of all assets combined.
            </MenuItem>
          </Field.Select>
        </Box>

        {/* Initial Price Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Initial Price
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            First price of the crypto index token once it's created.
          </Typography>
          <Controller
            name="initialPrice"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    value={field.value}
                    onChange={(e) => {
                      let newValue = Number(e.target.value);
                      if (newValue > 1000) newValue = 1000;
                      if (newValue < 1 || isNaN(newValue)) newValue = 1;
                      field.onChange(newValue);
                    }}
                    type="number"
                    slotProps={{
                      htmlInput: { min: 1, max: 1000 },
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                    sx={{ width: '100%' }}
                  />
                  <Slider
                    value={typeof field.value === 'number' ? field.value : 1}
                    onChange={(_, value) => field.onChange(value)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `$${value}`}
                    step={1}
                    marks
                    min={1}
                    max={1000}
                    sx={{ width: '100%' }}
                  />
                </Box>
                {error && (
                  <Typography variant="caption" color="error">
                    {error.message}
                  </Typography>
                )}
              </>
            )}
          />
        </Box>

        {/* Initial Deposit Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Initial Deposit
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            The token amount of the native token ({tokenSymbol}) the user must deposit into the
            crypto index to initialize it.
          </Typography>
          <Controller
            name="initialDeposit"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <>
                <TextField
                  value={field.value}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value);
                    field.onChange(isNaN(newValue) ? 0 : newValue);
                  }}
                  type="number"
                  slotProps={{
                    htmlInput: { step: 'any', min: 0 },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">{tokenSymbol}</InputAdornment>
                      ),
                    },
                  }}
                  fullWidth
                />
                {error && (
                  <Typography variant="caption" color="error">
                    {error.message}
                  </Typography>
                )}
              </>
            )}
          />
        </Box>

        {/* Public/Private Switch Section */}
        <Box sx={{ mt: 4 }}>
          <Controller
            name="isPublic"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {field.value ? 'Public' : 'Private'}
                    <Tooltip
                      title={
                        <>
                          <Typography variant="body2" mb={2}>
                            Public: Public indexes cannot be edited once created, but can be used by
                            anyone.
                          </Typography>
                          <Typography variant="body2">
                            Private: Private indexes can be edited, but can only be used by you (the
                            creator) and whitelisted accounts.
                          </Typography>
                        </>
                      }
                      enterTouchDelay={0}
                    >
                      <span
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        style={{
                          marginLeft: 4,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon icon="solar:info-circle-bold" />
                      </span>
                    </Tooltip>
                  </Box>
                }
              />
            )}
          />
        </Box>

        <Box sx={{ mt: 3, mb: 5 }}>
          <Field.UploadAvatar
            name="avatarUrl"
            maxSize={MAX_AVATAR_SIZE}
            helperText={
              <Typography
                variant="caption"
                sx={{
                  mt: 3,
                  mx: 'auto',
                  display: 'block',
                  textAlign: 'center',
                  color: 'text.disabled',
                }}
              >
                Allowed *.jpeg, *.jpg, *.png, *.gif
                <br /> max size of {fData(MAX_AVATAR_SIZE)}
              </Typography>
            }
          />
        </Box>

        <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            {currentIndex ? 'Save changes' : 'Create index'}
          </LoadingButton>
        </Stack>
      </Card>
    </Form>
  );
}
