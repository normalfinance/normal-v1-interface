'use client';

import type { NativeToken } from '@normalfinance/types';
import type { IndexCoin, IIndexItem } from '@/types/indexes';

import { z } from 'zod';
import { Icon } from '@iconify/react';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { useState, useEffect, useRef } from 'react';
import { fData } from '@/utils/format-number';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, Controller } from 'react-hook-form';

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

import IndexCoinList from './index-coin-list';
import IndexCoinPickerDialog from './index-coin-picker-dialog';
import { Form, Field, schemaHelper } from '../template/hook-form';
import NewIndexSubmissionDialog from './new-index-submission-dialog';
import CustomCoinPercentageDialog from './custom-coin-percentage-dialog';

const IndexCoinSchema = z.object({
  id: z.number(),
  url: z.string(),
  name: z.string(),
  shortName: z.string(),
  price: z.number(),
  marketCap: z.number(),
  indexPercentage: z.number().optional(),
});

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

type Props = {
  currentIndex?: IIndexItem;
  tokenSymbol: NativeToken;
  availableCoins: IndexCoin[];
};

export function NewIndexForm({ currentIndex, tokenSymbol, availableCoins }: Props) {
  const { t } = useTranslate();
  const MAX_AVATAR_SIZE = 3145728;

  const { enqueueSnackbar } = useSnackbar();

  const defaultValues: NewIndexSchemaType = {
    avatarUrl: null,
    indexName: '',
    indexSymbol: '',
    indexDescription: '',
    weightingMethod: 'Constant',
    initialPrice: 1,
    initialDeposit: 0,
    isPublic: true,
    indexCoinList: [],
  };

  const methods = useForm<NewIndexSchemaType>({
    mode: 'onSubmit',
    resolver: zodResolver(NewIndexSchema),
    defaultValues,
    values: currentIndex,
  });

  const { reset, handleSubmit, control, setValue, trigger, watch } = methods;

  const coinList = (useWatch({ control, name: 'indexCoinList' }) ?? []) as IndexCoin[];

  const weightingMethod = watch('weightingMethod');

  const [openCoinPicker, setOpenCoinPicker] = useState(false);

  const handleOpenCoinPicker = () => {
    setOpenCoinPicker(true);
  };

  const handleCloseCoinPicker = () => {
    setOpenCoinPicker(false);
  };

  const [openCustomPercentageDialog, setOpenCustomPercentageDialog] = useState(false);
  const [tempCoins, setTempCoins] = useState<IndexCoin[]>([]);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const handleCloseSnackbar = () => setDuplicateMessage('');

  const didMountRef = useRef(false);

  useEffect(() => {
    // Skip on first render so edit-mode prefill stays intact.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const list = coinList ?? [];
    if (list.length === 0) return;

    if (weightingMethod === 'Constant') {
      const each = 100 / list.length;
      setValue(
        'indexCoinList',
        list.map((c) => ({ ...c, indexPercentage: each }))
      );
    } else if (weightingMethod === 'Market Cap') {
      const totalCap = list.reduce((acc, c) => acc + (c.marketCap ?? 0), 0);
      setValue(
        'indexCoinList',
        list.map((c) => ({
          ...c,
          indexPercentage: totalCap ? ((c.marketCap ?? 0) / totalCap) * 100 : 0,
        }))
      );
    } else {
      // Custom: keep existing percentages as-is
      setValue('indexCoinList', list);
    }
  }, [weightingMethod, coinList, setValue]);

  const handleSelectCoins = (selectedCoins: IndexCoin[]) => {
    if (coinIdToReplace !== null && selectedCoins.length > 0) {
      const [newCoin] = selectedCoins;
      const replacedList = replaceCoinInList(coinList, coinIdToReplace, newCoin);
      setValue('indexCoinList', replacedList);
      setCoinIdToReplace(null);
      setOpenCoinPicker(false);

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
        const replacedCoin = replacedList.find((c) => c.id === newCoin.id);
        if (replacedCoin) {
          replacedCoin.indexPercentage = 0;
          setValue('indexCoinList', replacedList);
        }
        setTempCoins([replacedCoin!]);
        setOpenCustomPercentageDialog(true);
      }
      return;
    }

    const currentList = coinList || [];
    const newList = [...currentList];

    const duplicates: string[] = [];
    selectedCoins.forEach((coin) => {
      const alreadyInList = newList.some((existing) => existing.id === coin.id);
      if (alreadyInList) {
        duplicates.push(coin.name);
      } else {
        newList.push({ ...coin, indexPercentage: 0 });
      }
    });

    if (duplicates.length > 0) {
      setDuplicateMessage(
        t('createIndex.messages.duplicates', 'Coin(s) already in the list: {{names}}', {
          names: duplicates.join(', '),
        })
      );
    }

    setValue('indexCoinList', newList);
    setOpenCoinPicker(false);

    if (weightingMethod === 'Custom') {
      const newlyAddedCoins = selectedCoins.filter((coin) => !duplicates.includes(coin.name));
      if (newlyAddedCoins.length > 0) {
        setTempCoins(newlyAddedCoins);
        setOpenCustomPercentageDialog(true);
      }
    } else if (weightingMethod === 'Constant') {
      const each = 100 / newList.length;
      const updated = newList.map((c) => ({ ...c, indexPercentage: each }));
      setValue('indexCoinList', updated);
    } else if (weightingMethod === 'Market Cap') {
      const totalCap = newList.reduce((acc, c) => acc + c.marketCap, 0);
      const updated = newList.map((c) => {
        if (totalCap === 0) return { ...c, indexPercentage: 0 };
        return { ...c, indexPercentage: (c.marketCap / totalCap) * 100 };
      });
      setValue('indexCoinList', updated);
    }
  };

  function replaceCoinInList(list: IndexCoin[], idToReplace: number, newCoin: IndexCoin) {
    const coinAlreadyInList = list.some((c) => c.id === newCoin.id && c.id !== idToReplace);
    if (coinAlreadyInList) {
      setDuplicateMessage(
        t('createIndex.messages.coinAlreadyInList', 'Coin {{name}} is already in the list!', {
          name: newCoin.name,
        })
      );
      return list;
    }
    return list.map((c) => {
      if (c.id === idToReplace) {
        return {
          ...newCoin,
          indexPercentage: c.indexPercentage,
        };
      }
      return c;
    });
  }

  const handleSaveCustomPercentages = (coinsWithPercentages: IndexCoin[]) => {
    const finalList = (coinList || []).map((c) => {
      const updatedCoin = coinsWithPercentages.find((nc) => nc.id === c.id);
      return updatedCoin ? { ...updatedCoin } : c;
    });

    let totalPercentage = finalList.reduce((acc, coin) => acc + (coin.indexPercentage ?? 0), 0);

    if (totalPercentage > 100) {
      const difference = totalPercentage - 100;
      const lastUpdatedCoin = coinsWithPercentages[coinsWithPercentages.length - 1];
      if (lastUpdatedCoin) {
        const indexOfLastUpdated = finalList.findIndex((c) => c.id === lastUpdatedCoin.id);
        if (indexOfLastUpdated !== -1) {
          const oldValue = finalList[indexOfLastUpdated].indexPercentage ?? 0;
          const newValue = Math.max(0, oldValue - difference);
          finalList[indexOfLastUpdated] = {
            ...finalList[indexOfLastUpdated],
            indexPercentage: newValue,
          };
          totalPercentage = finalList.reduce((acc, coin) => acc + (coin.indexPercentage ?? 0), 0);
          setDuplicateMessage(
            t(
              'createIndex.messages.totalExceededAdjusted',
              "Total exceeded 100%. {{name}}'s percentage was adjusted to {{value}}%",
              { name: lastUpdatedCoin.name, value: newValue.toFixed(2) }
            )
          );
        }
      }
    }

    setValue('indexCoinList', finalList);
    setOpenCustomPercentageDialog(false);
  };

  const handleRemoveCoin = (id: number) => {
    const updatedList = coinList.filter((c) => c.id !== id);

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
      setValue('indexCoinList', updatedList);
    }
  };

  const [coinIdToReplace, setCoinIdToReplace] = useState<number | null>(null);

  const handleReplaceCoin = (id: number) => {
    setCoinIdToReplace(id);
    setOpenCoinPicker(true);
  };

  const [openSubmissionDialog, setOpenSubmissionDialog] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleOpenDialog = async () => {
    const formValid = await trigger();
    if (!formValid) {
      setValidationError(
        t('createIndex.validation.completeAll', 'Please complete all required fields.')
      );
      return;
    }

    if (weightingMethod === 'Custom') {
      const totalPct = coinList.reduce((acc, c) => acc + (c.indexPercentage ?? 0), 0);
      if (Math.round(totalPct) !== 100) {
        setValidationError(
          t(
            'createIndex.validation.customMustBe100',
            'For Custom weighting, total must be 100%. Currently it is {{value}}%.',
            { value: totalPct.toFixed(2) }
          )
        );
        return;
      }
    } else if (coinList.length === 0) {
      setValidationError(
        t('createIndex.validation.selectAtLeastOne', 'Please select at least one coin.')
      );
      return;
    }

    setValidationError('');
    setOpenSubmissionDialog(true);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      reset();
      enqueueSnackbar(
        currentIndex
          ? t('createIndex.toast.updateSuccess', 'Update success!')
          : t('createIndex.toast.createSuccess', 'Create success!'),
        {
          variant: 'success',
        }
      );

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
                {t(
                  'createIndex.avatar.helper',
                  'Allowed *.jpeg, *.jpg, *.png, *.gif\nmax size of {{size}}',
                  { size: fData(MAX_AVATAR_SIZE) }
                )}
              </Typography>
            }
          />
        </Box>

        <Box sx={{ my: 4 }}>
          <Controller
            name="isPublic"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {field.value
                      ? t('createIndex.visibility.public', 'Public')
                      : t('createIndex.visibility.private', 'Private')}
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="body2" mb={2}>
                            {t(
                              'createIndex.visibility.publicHelp',
                              'Public: Public indexes cannot be edited once created, but can be used by anyone.'
                            )}
                          </Typography>
                          <Typography variant="body2">
                            {t(
                              'createIndex.visibility.privateHelp',
                              'Private: Private indexes can be edited, but can only be used by you (the creator) and whitelisted accounts.'
                            )}
                          </Typography>
                        </Box>
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
            <Field.Text
              name="indexName"
              label={t('createIndex.fields.indexName', 'Index Name')}
              autoComplete="off"
            />
            <Field.Text
              name="indexSymbol"
              label={t('createIndex.fields.indexSymbol', 'Index Symbol')}
              autoComplete="off"
            />
          </Box>
          <Field.Text
            name="indexDescription"
            label={t('createIndex.fields.indexDescription', 'Description')}
            multiline
            rows={4}
            sx={{ gridColumn: 'span 2' }}
          />
          <Field.Select
            name="weightingMethod"
            label={t('createIndex.fields.weightingMethod', 'Weighting Method')}
            sx={{ gridColumn: 'span 2' }}
          >
            <MenuItem value="Constant">
              {t(
                'createIndex.weighting.constant',
                'Constant: Every asset is given the same weight within the index (1/x, where x is the number of assets).'
              )}
            </MenuItem>
            <MenuItem value="Custom" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {t(
                'createIndex.weighting.custom',
                'Custom: The user sets totally custom weights for each asset. They must add up to 100%.'
              )}
            </MenuItem>
            <MenuItem value="Market Cap" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {t(
                'createIndex.weighting.marketCap',
                "Market Cap: Each asset's weight is the proportion of its market cap to the total market cap of all assets combined."
              )}
            </MenuItem>
          </Field.Select>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('createIndex.initialPrice.title', 'Initial Price')}
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            {t(
              'createIndex.initialPrice.caption',
              "First price of the crypto index token once it's created."
            )}
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

        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('createIndex.initialDeposit.title', 'Initial Deposit')}
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            {t(
              'createIndex.initialDeposit.caption',
              'The token amount of the native token ({{symbol}}) the user must deposit into the crypto index to initialize it.',
              { symbol: tokenSymbol }
            )}
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

        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('createIndex.indexCoinList.title', 'Index Coin List')}
          </Typography>
          <IndexCoinList
            indexCoinList={coinList}
            onRemoveCoin={handleRemoveCoin}
            onReplaceCoin={handleReplaceCoin}
          />
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outlined" sx={{ mt: 0 }} onClick={handleOpenCoinPicker}>
              {t('createIndex.indexCoinList.addCoin', 'Add Coin')}
            </Button>
          </Box>
        </Box>

        {openCoinPicker && (
          <IndexCoinPickerDialog
            open={openCoinPicker}
            onClose={handleCloseCoinPicker}
            onSelectCoins={handleSelectCoins}
            availableCoins={availableCoins}
          />
        )}

        <CustomCoinPercentageDialog
          open={openCustomPercentageDialog}
          coins={tempCoins}
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
              {currentIndex
                ? t('createIndex.actions.saveChanges', 'Save changes')
                : t('createIndex.actions.createIndex', 'Create index')}
            </Button>
          </Box>
        </Stack>
      </Card>

      <NewIndexSubmissionDialog
        open={openSubmissionDialog}
        onClose={() => setOpenSubmissionDialog(false)}
        onSubmit={onSubmit}
        tokenSymbol={tokenSymbol}
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
