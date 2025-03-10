import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useWatch } from 'react-hook-form';

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
import Button from '@mui/material/Button';
import { Icon } from '@iconify/react';

import { useRouter } from 'src/routes/hooks';
import { fData } from 'src/utils/format-number';
import { toast } from 'src/components/snackbar';
import { Form, Field, schemaHelper } from 'src/components/hook-form';
import { IIndexItem, IndexCoin } from '@/types/indexes';
import { NativeToken } from '@/types/native-token';
import IndexCoinList from './index-coin-list';
import IndexCoinPickerDialog from './index-coin-picker-dialog';
import { Snackbar, Alert } from '@mui/material';
import CustomCoinPercentageDialog from './custom-coin-percentage-dialog';

// Define a Zod schema for an individual coin (if not defined elsewhere)
const IndexCoinSchema = z.object({
  id: z.number(),
  url: z.string(),
  name: z.string(),
  shortName: z.string(),
  price: z.number(),
  marketCap: z.number(),
  indexPercentage: z.number().optional(),
});

// NewIndexSchema now includes the coin list
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
  indexCoinList: z.array(IndexCoinSchema),
});

export type NewIndexSchemaType = z.infer<typeof NewIndexSchema>;

// Component Props
type Props = {
  currentIndex?: IIndexItem;
  tokenSymbol: NativeToken;
  availableCoins: IndexCoin[];
};

export function NewIndexForm({ currentIndex, tokenSymbol, availableCoins }: Props) {
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
    indexCoinList: [], // default empty list of coins
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
    setValue,
    watch,
    formState: { isSubmitting },
  } = methods;
  const coinList = useWatch({ control, name: 'indexCoinList' });
  const weightingMethod = watch('weightingMethod');

  const [openCoinPicker, setOpenCoinPicker] = useState(false);

  const handleOpenCoinPicker = () => {
    setOpenCoinPicker(true);
  };

  const handleCloseCoinPicker = () => {
    setOpenCoinPicker(false);
  };

  // Dialog state for custom percentages
  const [openCustomPercentageDialog, setOpenCustomPercentageDialog] = useState(false);

  // Temporarily store newly added coins, so we can assign custom percentages
  const [tempCoins, setTempCoins] = useState<IndexCoin[]>([]);

  const [duplicateMessage, setDuplicateMessage] = useState('');

  const handleCloseSnackbar = () => {
    setDuplicateMessage('');
  };

  //Whenever weightingMethod changes, clear the coin list
  useEffect(() => {
    // Clear the coin list every time weightingMethod changes
    setValue('indexCoinList', []);
  }, [weightingMethod, setValue]);

  // ------------------ MAIN: handleSelectCoins ------------------ //
  const handleSelectCoins = (selectedCoins: IndexCoin[]) => {
    // If we are in "replace" mode (coinIdToReplace is not null):
    if (coinIdToReplace !== null && selectedCoins.length > 0) {
      const [newCoin] = selectedCoins; // we only pick one coin at a time

      // Replace the coin in coinList with newCoin
      const replacedList = replaceCoinInList(coinList, coinIdToReplace, newCoin);
      setValue('indexCoinList', replacedList);

      // Reset
      setCoinIdToReplace(null);
      setOpenCoinPicker(false);

      // Reapply weighting logic
      if (weightingMethod === 'Constant') {
        const each = replacedList.length > 0 ? 100 / replacedList.length : 0;
        const updated = replacedList.map((c) => ({ ...c, indexPercentage: each }));
        setValue('indexCoinList', updated);
      } else if (weightingMethod === 'Market Cap') {
        const totalCap = replacedList.reduce((acc, c) => acc + c.marketCap, 0);
        const updated = replacedList.map((c) => {
          if (totalCap === 0) return { ...c, indexPercentage: 0 };
          return { ...c, indexPercentage: (c.marketCap / totalCap) * 100 };
        });
        setValue('indexCoinList', updated);
      } else if (weightingMethod === 'Custom') {
        // 1) Optionally zero out the replaced coin or keep old value
        // 2) Re-open the custom percentage dialog for the replaced coin
        //    so the user can set it again
        const replacedCoin = replacedList.find((c) => c.id === newCoin.id);
        if (replacedCoin) {
          // If you want to zero out first, do it:
          replacedCoin.indexPercentage = 0;
          setValue('indexCoinList', replacedList);
        }

        // Now open your CustomCoinPercentageDialog with just this new coin
        setTempCoins([replacedCoin!]);
        setOpenCustomPercentageDialog(true);
      }

      return; // Done handling "replace" mode
    }

    // ----------------------
    // Else: "Add" mode (original code)
    // ----------------------
    const currentList = coinList || [];
    const newList = [...currentList];

    const duplicates: string[] = [];
    selectedCoins.forEach((coin) => {
      const alreadyInList = newList.some((existing) => existing.id === coin.id);
      if (alreadyInList) {
        duplicates.push(coin.name);
      } else {
        // Add coin with no pre-defined indexPercentage yet
        newList.push({ ...coin, indexPercentage: 0 });
      }
    });

    if (duplicates.length > 0) {
      setDuplicateMessage(`Coin(s) already in the list: ${duplicates.join(', ')}`);
    }

    // Update the form with all selected coins (minus duplicates)
    setValue('indexCoinList', newList);
    setOpenCoinPicker(false);

    // Next, handle weighting logic
    if (weightingMethod === 'Custom') {
      // Open a second dialog so the user can input percentages
      // We only care about the newly added coins => ones that were not duplicates
      const newlyAddedCoins = selectedCoins.filter((coin) => !duplicates.includes(coin.name));
      if (newlyAddedCoins.length > 0) {
        setTempCoins(newlyAddedCoins);
        setOpenCustomPercentageDialog(true);
      }
    } else if (weightingMethod === 'Constant') {
      // auto-calc each coin's percentage as 1 / totalCoins * 100
      const each = 100 / newList.length;
      const updated = newList.map((c) => ({ ...c, indexPercentage: each }));
      setValue('indexCoinList', updated);
    } else if (weightingMethod === 'Market Cap') {
      // auto-calc each coin's percentage by market cap fraction
      const totalCap = newList.reduce((acc, c) => acc + c.marketCap, 0);
      const updated = newList.map((c) => {
        if (totalCap === 0) return { ...c, indexPercentage: 0 };
        return { ...c, indexPercentage: (c.marketCap / totalCap) * 100 };
      });
      setValue('indexCoinList', updated);
    }
  };

  function replaceCoinInList(list: IndexCoin[], idToReplace: number, newCoin: IndexCoin) {
    // 1) If the new coin is already in the list (other than the replaced coin), skip
    const coinAlreadyInList = list.some((c) => c.id === newCoin.id && c.id !== idToReplace);
    if (coinAlreadyInList) {
      setDuplicateMessage(`Coin ${newCoin.name} is already in the list!`);
      return list; // No changes
    }

    // 2) Replace the coin
    return list.map((c) => {
      if (c.id === idToReplace) {
        // keep old coin’s indexPercentage or reset to 0
        return {
          ...newCoin,
          indexPercentage: c.indexPercentage,
        };
      }
      return c;
    });
  }

  // ------------------ AFTER user sets custom percentages ------------------ //
  const handleSaveCustomPercentages = (coinsWithPercentages: IndexCoin[]) => {
    // 1) Merge the newly updated coins into the entire list
    const finalList = (coinList || []).map((c) => {
      const updatedCoin = coinsWithPercentages.find((nc) => nc.id === c.id);
      return updatedCoin ? { ...updatedCoin } : c;
    });

    // 2) Calculate the sum of all percentages
    let totalPercentage = finalList.reduce((acc, coin) => acc + (coin.indexPercentage ?? 0), 0);

    // If it exceeds 100%, adjust the *last updated coin* so total = 100%
    if (totalPercentage > 100) {
      // 3) Figure out the difference we need to remove
      const difference = totalPercentage - 100;

      // For demonstration, let's adjust only the LAST coin in `coinsWithPercentages`
      const lastUpdatedCoin = coinsWithPercentages[coinsWithPercentages.length - 1];
      if (lastUpdatedCoin) {
        // Find it in finalList
        const indexOfLastUpdated = finalList.findIndex((c) => c.id === lastUpdatedCoin.id);
        if (indexOfLastUpdated !== -1) {
          const oldValue = finalList[indexOfLastUpdated].indexPercentage ?? 0;
          const newValue = Math.max(0, oldValue - difference);

          finalList[indexOfLastUpdated] = {
            ...finalList[indexOfLastUpdated],
            indexPercentage: newValue,
          };

          // Recompute total
          totalPercentage = finalList.reduce((acc, coin) => acc + (coin.indexPercentage ?? 0), 0);

          // 4) Show a warning snackbar
          setDuplicateMessage(
            `Total exceeded 100%. ${lastUpdatedCoin.name}'s percentage was adjusted to ${newValue.toFixed(
              2
            )}%`
          );
        }
      }
    }

    setValue('indexCoinList', finalList);
    setOpenCustomPercentageDialog(false);
  };

  // ------------------ REMOVE COIN ------------------ //

  const handleRemoveCoin = (id: number) => {
    // 1) Remove the coin
    const updatedList = coinList.filter((c) => c.id !== id);

    // 2) Recalculate if needed
    if (weightingMethod === 'Constant') {
      const each = updatedList.length > 0 ? 100 / updatedList.length : 0;
      const recalculated = updatedList.map((c) => ({
        ...c,
        indexPercentage: each,
      }));
      setValue('indexCoinList', recalculated);
    } else if (weightingMethod === 'Market Cap') {
      const totalCap = updatedList.reduce((acc, c) => acc + c.marketCap, 0);
      const recalculated = updatedList.map((c) => {
        if (totalCap === 0) return { ...c, indexPercentage: 0 };
        return { ...c, indexPercentage: (c.marketCap / totalCap) * 100 };
      });
      setValue('indexCoinList', recalculated);
    } else {
      // If Custom or anything else, just use the updated list
      setValue('indexCoinList', updatedList);
    }
  };

  // ------------------ REPLACE COIN ------------------ //

  const [coinIdToReplace, setCoinIdToReplace] = useState<number | null>(null);

  // Called when user clicks an existing coin in the list
  const handleReplaceCoin = (id: number) => {
    setCoinIdToReplace(id);
    setOpenCoinPicker(true);
  };

  // ------------------ SUBMIT FORM ------------------ //
  const onSubmit = handleSubmit(async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // mock API
      reset();
      toast.success(currentIndex ? 'Update success!' : 'Create success!');
      console.info('Submitted data', data);
    } catch (error) {
      console.error(error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Card sx={{ p: 3 }}>
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

        {/* Public/Private Switch Section */}
        <Box sx={{ my: 4 }}>
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

        <Box sx={{ display: 'grid', gap: 2 }}>
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

        {/* Index Coin List Section */}
        <Box
          sx={{
            mt: 4,
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Index Coin List
          </Typography>
          <IndexCoinList
            indexCoinList={coinList}
            onRemoveCoin={handleRemoveCoin}
            onReplaceCoin={handleReplaceCoin}
          />
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outlined" sx={{ mt: 0 }} onClick={handleOpenCoinPicker}>
              Add Coin
            </Button>
          </Box>
        </Box>

        {/* Render the Coin Picker Dialog */}
        {openCoinPicker && (
          <IndexCoinPickerDialog
            open={openCoinPicker}
            onClose={handleCloseCoinPicker}
            onSelectCoins={handleSelectCoins}
            availableCoins={availableCoins}
          />
        )}

        {/* Custom Percentage Dialog (only if weightingMethod === 'Custom') */}
        <CustomCoinPercentageDialog
          open={openCustomPercentageDialog}
          coins={tempCoins}
          onClose={() => setOpenCustomPercentageDialog(false)}
          onSave={handleSaveCustomPercentages}
        />

        <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
          <LoadingButton
            fullWidth
            type="submit"
            variant="soft"
            color="success"
            size="large"
            loading={isSubmitting}
          >
            {currentIndex ? 'Save changes' : 'Create index'}
          </LoadingButton>
        </Stack>
      </Card>

      <Snackbar
        open={Boolean(duplicateMessage)}
        onClose={handleCloseSnackbar}
        autoHideDuration={3000}
      >
        <Alert onClose={handleCloseSnackbar} severity="warning" sx={{ width: '100%' }}>
          {duplicateMessage}
        </Alert>
      </Snackbar>
    </Form>
  );
}
