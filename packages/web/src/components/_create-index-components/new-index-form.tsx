import type { IndexParams } from '@normalfinance/contracts/build/index_fund';
import type { IIndexFundItem, IndexFundComponent } from '@normalfinance/types';

import { z } from 'zod';
import { Icon } from '@iconify/react';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePersistStore } from '@normalfinance/state';
import { serializeAssetCode } from '@normalfinance/utils';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useIndexFundFactory } from '@/hooks/stellar/use-index-fund-factory';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { Alert, Snackbar } from '@mui/material';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Form, Field } from '@/components/template/hook-form';

import IndexComponentList from './index-component-list';
import NewIndexSubmissionDialog from './new-index-submission-dialog';
import IndexComponentPickerDialog from './index-component-picker-dialog';
import CustomComponentPercentageDialog from './custom-component-percentage-dialog';

// Define a Zod schema for an individual coin (if not defined elsewhere)
const IndexFundComponentSchema = z.object({
  contract: z.string(),
  indexPercentage: z.number().optional(),
});

// NewIndexSchema now includes the coin list
export const NewIndexSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Index name is required!' })
    .max(30, { message: 'Index name must be at most 30 characters' }),
  symbol: z
    .string()
    .min(1, { message: 'Index symbol is required!' })
    .max(6, { message: 'Index symbol must be at most 6 characters' }),
  description: z
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
  components: z.array(IndexFundComponentSchema),
});

export type NewIndexSchemaType = z.infer<typeof NewIndexSchema>;

// Component Props
type Props = {
  currentIndex?: IIndexFundItem;
};

export function NewIndexForm({ currentIndex }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslate('auto');

  const {
    tokenState: { tokens, tokensByAddress },
    wallet,
  } = usePersistStore();

  const { loading: creatingFund, createIndexFund } = useIndexFundFactory();

  const defaultValues: NewIndexSchemaType = {
    name: '',
    symbol: '',
    description: '',
    weightingMethod: 'Constant',
    initialPrice: 1,
    initialDeposit: 0,
    isPublic: true,
    components: [], // default empty list of coins
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
    trigger,
    watch,
    formState: { isSubmitting },
  } = methods;
  const componentList = useWatch({ control, name: 'components' });
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

  // Temporarily store newly added components, so we can assign custom percentages
  const [tempComponents, setTempComponents] = useState<IndexFundComponent[]>([]);

  const [duplicateMessage, setDuplicateMessage] = useState('');

  const handleCloseSnackbar = () => {
    setDuplicateMessage('');
  };

  //Whenever weightingMethod changes, clear the coin list
  useEffect(() => {
    // Clear the coin list every time weightingMethod changes
    setValue('components', []);
  }, [weightingMethod, setValue]);

  // ------------------ MAIN: handleSelectCoins ------------------ //
  const handleSelectCoins = (selectedComponents: IndexFundComponent[]) => {
    // If we are in "replace" mode (componentIdToReplace is not null):
    if (componentIdToReplace !== null && selectedComponents.length > 0) {
      const [newComponent] = selectedComponents; // we only pick one coin at a time

      // Replace the coin in componentList with newComponent
      const replacedList = replaceCoinInList(componentList, componentIdToReplace, newComponent);
      setValue('components', replacedList);

      // Reset
      setComponentIdToReplace(null);
      setOpenCoinPicker(false);

      // Reapply weighting logic
      if (weightingMethod === 'Constant') {
        const each = replacedList.length > 0 ? 100 / replacedList.length : 0;
        const updated = replacedList.map((c) => ({ ...c, indexPercentage: each }));
        setValue('components', updated);
      }
      // else if (weightingMethod === 'Market Cap') {
      //   const totalCap = replacedList.reduce((acc, c) => acc + c.marketCap, 0);
      //   const updated = replacedList.map((c) => {
      //     if (totalCap === 0) return { ...c, indexPercentage: 0 };
      //     return { ...c, indexPercentage: (c.marketCap / totalCap) * 100 };
      //   });
      //   setValue('components', updated);
      // }
      else if (weightingMethod === 'Custom') {
        // 1) Optionally zero out the replaced coin or keep old value
        // 2) Re-open the custom percentage dialog for the replaced coin
        //    so the user can set it again
        const replacedComponent = replacedList.find((c) => c.contract === newComponent.contract);
        if (replacedComponent) {
          // If you want to zero out first, do it:
          replacedComponent.indexPercentage = 0;
          setValue('components', replacedList);
        }

        // Now open your CustomComponentPercentageDialog with just this new coin
        setTempComponents([replacedComponent!]);
        setOpenCustomPercentageDialog(true);
      }

      return; // Done handling "replace" mode
    }

    // ----------------------
    // Else: "Add" mode (original code)
    // ----------------------
    const currentList = componentList || [];
    const newList = [...currentList];

    const duplicates: string[] = [];
    selectedComponents.forEach((component) => {
      const componentToken = tokensByAddress[component.contract];
      const alreadyInList = newList.some((existing) => existing.contract === component.contract);
      if (alreadyInList) {
        duplicates.push(componentToken.name);
      } else {
        // Add component with no pre-defined indexPercentage yet
        newList.push({ ...component, indexPercentage: 0 });
      }
    });

    if (duplicates.length > 0) {
      setDuplicateMessage(`Asset(s) already in the list: ${duplicates.join(', ')}`);
    }

    // Update the form with all selected coins (minus duplicates)
    setValue('components', newList);
    setOpenCoinPicker(false);

    // Next, handle weighting logic
    if (weightingMethod === 'Custom') {
      // Open a second dialog so the user can input percentages
      // We only care about the newly added coins => ones that were not duplicates
      const newlyAddedCoins = selectedComponents.filter((component) => {
        const componentToken = tokensByAddress[component.contract];
        return !duplicates.includes(componentToken.name);
      });
      if (newlyAddedCoins.length > 0) {
        setTempComponents(newlyAddedCoins);
        setOpenCustomPercentageDialog(true);
      }
    } else if (weightingMethod === 'Constant') {
      // auto-calc each coin's percentage as 1 / totalCoins * 100
      const each = 100 / newList.length;
      const updated = newList.map((c) => ({ ...c, indexPercentage: each }));
      setValue('components', updated);
    }
    // else if (weightingMethod === 'Market Cap') {
    //   // auto-calc each coin's percentage by market cap fraction
    //   const totalCap = newList.reduce((acc, c) => acc + c.marketCap, 0);
    //   const updated = newList.map((c) => {
    //     if (totalCap === 0) return { ...c, indexPercentage: 0 };
    //     return { ...c, indexPercentage: (c.marketCap / totalCap) * 100 };
    //   });
    //   setValue('components', updated);
    // }
  };

  function replaceCoinInList(
    list: IndexFundComponent[],
    idToReplace: string,
    newComponent: IndexFundComponent
  ) {
    // 1) If the new coin is already in the list (other than the replaced coin), skip
    const coinAlreadyInList = list.some(
      (c) => c.contract === newComponent.contract && c.contract !== idToReplace
    );
    if (coinAlreadyInList) {
      const newComponentToken = tokensByAddress[newComponent.contract];
      setDuplicateMessage(`${newComponentToken.name} is already in the list!`);
      return list; // No changes
    }

    // 2) Replace the coin
    return list.map((c) => {
      if (c.contract === idToReplace) {
        // keep old coin’s indexPercentage or reset to 0
        return {
          ...newComponent,
          indexPercentage: c.indexPercentage,
        };
      }
      return c;
    });
  }

  // ------------------ AFTER user sets custom percentages ------------------ //
  const handleSaveCustomPercentages = (componentsWithPercentages: IndexFundComponent[]) => {
    // 1) Merge the newly updated coins into the entire list
    const finalList = (componentList || []).map((c) => {
      const updatedCoin = componentsWithPercentages.find((nc) => nc.contract === c.contract);
      return updatedCoin ? { ...updatedCoin } : c;
    });

    // 2) Calculate the sum of all percentages
    let totalPercentage = finalList.reduce((acc, coin) => acc + (coin.indexPercentage ?? 0), 0);

    // If it exceeds 100%, adjust the *last updated coin* so total = 100%
    if (totalPercentage > 100) {
      // 3) Figure out the difference we need to remove
      const difference = totalPercentage - 100;

      // For demonstration, let's adjust only the LAST coin in `componentsWithPercentages`
      const lastUpdatedComponent = componentsWithPercentages[componentsWithPercentages.length - 1];
      const lastUpdatedComponentToken = tokensByAddress[lastUpdatedComponent.contract];
      if (lastUpdatedComponent) {
        // Find it in finalList
        const indexOfLastUpdated = finalList.findIndex(
          (c) => c.contract === lastUpdatedComponent.contract
        );
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
            `Total exceeded 100%. ${lastUpdatedComponentToken.name}'s percentage was adjusted to ${newValue.toFixed(
              2
            )}%`
          );
        }
      }
    }

    setValue('components', finalList);
    setOpenCustomPercentageDialog(false);
  };

  // ------------------ REMOVE COIN ------------------ //

  const handleRemoveComponent = (id: string) => {
    // 1) Remove the coin
    const updatedList = componentList.filter((component) => component.contract !== id);

    // 2) Recalculate if needed
    if (weightingMethod === 'Constant') {
      const each = updatedList.length > 0 ? 100 / updatedList.length : 0;
      const recalculated = updatedList.map((c) => ({
        ...c,
        indexPercentage: each,
      }));
      setValue('components', recalculated);
    }
    // else if (weightingMethod === 'Market Cap') {
    //   const totalCap = updatedList.reduce((acc, c) => acc + c.marketCap, 0);
    //   const recalculated = updatedList.map((c) => {
    //     if (totalCap === 0) return { ...c, indexPercentage: 0 };
    //     return { ...c, indexPercentage: (c.marketCap / totalCap) * 100 };
    //   });
    //   setValue('components', recalculated);
    // }
    else {
      // If Custom or anything else, just use the updated list
      setValue('components', updatedList);
    }
  };

  // ------------------ REPLACE COIN ------------------ //

  const [componentIdToReplace, setComponentIdToReplace] = useState<string | null>(null);

  // Called when user clicks an existing coin in the list
  const handleReplaceComponent = (id: string) => {
    setComponentIdToReplace(id);
    setOpenCoinPicker(true);
  };

  // ------------------ SUBMIT FORM ------------------ //
  const [openSubmissionDialog, setOpenSubmissionDialog] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleOpenDialog = async () => {
    // Re-validate the entire form
    const formValid = await trigger(); // returns boolean
    if (!formValid) {
      // If form has field errors, display a generic error or handle them individually
      setValidationError('Please complete all required fields.');
      return;
    }

    // If weightingMethod = Custom, check sum = 100
    if (weightingMethod === 'Custom') {
      const totalPct = componentList.reduce((acc, c) => acc + (c.indexPercentage ?? 0), 0);
      // rounding check if you want to account for decimals
      if (Math.round(totalPct) !== 100) {
        setValidationError(
          `For Custom weighting, total must be 100%. Currently it's ${totalPct.toFixed(2)}%.`
        );
        return;
      }
    } else {
      // 3) If NOT Custom, ensure at least one coin was selected
      if (componentList.length === 0) {
        setValidationError('Please select at least one asset.');
        return;
      }
    }

    // Everything is good => clear error, open the dialog
    setValidationError('');
    setOpenSubmissionDialog(true);
  };

  // The actual function we call to finalize submission:
  const onSubmit = handleSubmit(async (data) => {
    try {
      if (!wallet.address) return;

      // The index fund token
      const serializedAsset = serializeAssetCode(data.symbol, '');

      const params: IndexParams = {
        admin: wallet.address,
        name: data.name,
        symbol: data.symbol,
        description: data.description,
        is_public: data.isPublic ?? false,
        components: data.components.map((component) => ({
          action: { tag: 'Add' as const, values: undefined },
          new_weight: BigInt(Math.round((component.indexPercentage ?? 0) * 100)),
          token: component.contract,
        })),
        base_nav: BigInt((1 * 10 ** 7).toFixed(0)),
        initial_price: BigInt((data.initialPrice * 10 ** 7).toFixed(0)),
        initial_deposit: BigInt((data.initialDeposit * 10 ** 7).toFixed(0)),
      };

      await createIndexFund({ serialized_asset: serializedAsset, params });
      reset();
      enqueueSnackbar(currentIndex ? 'Update success!' : 'Create success!', {
        variant: 'success',
      });
      console.info('Submitted data', data);
    } catch (error) {
      console.error(error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Card sx={{ p: 3 }}>
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
                    {field.value ? t('Public') : t('Private')}
                    <Tooltip
                      title={
                        <>
                          <Typography variant="body2" mb={2}>
                            {t(
                              'Public: Public indexes cannot be edited once created, but can be used by anyone.'
                            )}
                          </Typography>
                          <Typography variant="body2">
                            {t(
                              'Private: Private indexes can be edited, but can only be used by you (the creator) and whitelisted accounts.'
                            )}
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
            <Field.Text name="name" label={t('Index Name')} autoComplete="off" />
            <Field.Text name="symbol" label={t('Index Symbol')} autoComplete="off" />
          </Box>
          <Field.Text
            name="description"
            label={t('Description')}
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
              {t(
                'Constant: Every asset is given the same weight within the index (1/x, where x is the number of assets).'
              )}
            </MenuItem>
            <MenuItem value="Custom" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {t(
                'Custom: The user sets totally custom weights for each asset. They must add up to 100%.'
              )}
            </MenuItem>
            {/* <MenuItem value="Market Cap" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {t(
                "Market Cap: Each asset's weight is the proportion of its market cap to the total market cap of all assets combined."
              )}
            </MenuItem> */}
          </Field.Select>
        </Box>

        {/* Initial Price Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('Initial Price')}
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            {t("First price of the index fund once it's created.")}
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
                        startAdornment: <InputAdornment position="start">{t('$')}</InputAdornment>,
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
            {t('Initial Deposit')}
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            {t('The amount of USD you must deposit into the fund to initialize it.')}
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
                      startAdornment: <InputAdornment position="start">USD</InputAdornment>,
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
            {t('Asset List')}
          </Typography>
          <IndexComponentList
            components={componentList}
            onRemoveComponent={handleRemoveComponent}
            onReplaceComponent={handleReplaceComponent}
          />
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outlined" sx={{ mt: 0 }} onClick={handleOpenCoinPicker}>
              {t('Add Asset')}
            </Button>
          </Box>
        </Box>

        {/* Render the Coin Picker Dialog */}
        {openCoinPicker && (
          <IndexComponentPickerDialog
            open={openCoinPicker}
            onClose={handleCloseCoinPicker}
            onSelectTokens={handleSelectCoins}
            tokens={tokens}
          />
        )}

        {/* Custom Percentage Dialog (only if weightingMethod === 'Custom') */}
        <CustomComponentPercentageDialog
          open={openCustomPercentageDialog}
          components={tempComponents}
          onClose={() => setOpenCustomPercentageDialog(false)}
          onSave={handleSaveCustomPercentages}
        />

        <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
          <Box sx={{ width: '100%' }}>
            {validationError && (
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                {validationError}
              </Typography>
            )}
            <Button
              fullWidth
              variant="soft"
              color="success"
              size="large"
              onClick={handleOpenDialog}
            >
              {currentIndex ? 'Save changes' : 'Create fund'}
            </Button>
          </Box>
        </Stack>
      </Card>
      <NewIndexSubmissionDialog
        open={openSubmissionDialog}
        onClose={() => setOpenSubmissionDialog(false)}
        onSubmit={onSubmit} // calls the handleSubmit flow
      />
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
