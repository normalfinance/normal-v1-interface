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

// ---------- weight helpers (rounding + exact 100%) ----------
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// normalize an array of coins that already has indexPercentage set (or 0)
// makes sum exactly 100 by fixing the last item after rounding
function normalizeAndRound(list: IndexCoin[]): IndexCoin[] {
  if (list.length === 0) return list;

  const raw = list.map((c) => ({ ...c, indexPercentage: c.indexPercentage ?? 0 }));
  const sum = raw.reduce((a, c) => a + (c.indexPercentage ?? 0), 0);

  if (sum <= 0) {
    const each = 100 / raw.length;
    const out = raw.map((c) => ({ ...c, indexPercentage: each }));
    return finalizeTo100(out);
  }

  const scale = 100 / sum;
  const scaled = raw.map((c) => ({ ...c, indexPercentage: (c.indexPercentage ?? 0) * scale }));
  return finalizeTo100(scaled);
}

// equal split with rounding and exact 100 correction
function equalize(list: IndexCoin[]): IndexCoin[] {
  if (list.length === 0) return list;
  const each = 100 / list.length;
  const provisional = list.map((c) => ({ ...c, indexPercentage: each }));
  return finalizeTo100(provisional);
}

// after percentages have been computed, round to 2dp and force exact 100
function finalizeTo100(list: IndexCoin[]): IndexCoin[] {
  if (list.length === 0) return list;

  const roundedExceptLast: IndexCoin[] = list.slice(0, -1).map((c) => ({
    ...c,
    indexPercentage: round2(Math.max(0, Math.min(100, c.indexPercentage ?? 0))),
  }));

  const sumExceptLast = roundedExceptLast.reduce((a, c) => a + (c.indexPercentage ?? 0), 0);
  let last = 100 - sumExceptLast;

  // in case of tiny float drift like 100.0000000001 -> clamp after rounding
  last = round2(last);
  if (last < 0) last = 0;
  if (last > 100) last = 100;

  const final = [
    ...roundedExceptLast,
    {
      ...list[list.length - 1],
      indexPercentage: last,
    },
  ];

  // final tiny clamp to fix rare -0.01 or 100.01
  const total = round2(final.reduce((a, c) => a + (c.indexPercentage ?? 0), 0));
  if (Math.abs(total - 100) > 0.01) {
    // Adjust last coin by the delta
    const delta = round2(100 - total);
    final[final.length - 1].indexPercentage = round2(
      (final[final.length - 1].indexPercentage ?? 0) + delta
    );
  }

  return final;
}

// --- Market cap smart recalc (handles none/partial/all caps and preserves ratios) ---
function recalcMarketCapSmart(list: IndexCoin[]): IndexCoin[] {
  if (list.length === 0) return list;

  const caps = list.map((c) => c.marketCap ?? 0);
  const numWithCaps = caps.filter((v) => v > 0).length;

  if (numWithCaps === 0) {
    return equalize(list);
  }

  if (numWithCaps === list.length) {
    const totalCap = caps.reduce((a, b) => a + b, 0);
    if (totalCap <= 0) return equalize(list);
    const byCap = list.map((c) => ({
      ...c,
      indexPercentage: ((c.marketCap ?? 0) / totalCap) * 100,
    }));
    return normalizeAndRound(byCap);
  }

  // Partial caps: preserve whatever weights exist and normalize
  return normalizeAndRound(list);
}

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
  const [openCustomPercentageDialog, setOpenCustomPercentageDialog] = useState(false);
  const [tempCoins, setTempCoins] = useState<IndexCoin[]>([]);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const handleCloseSnackbar = () => setDuplicateMessage('');

  const didMountRef = useRef(false);

  // Recalculate when the method changes, but don't clobber edit-mode initial load
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const list = coinList ?? [];
    if (list.length === 0) return;

    if (weightingMethod === 'Constant') {
      setValue('indexCoinList', equalize(list));
    } else if (weightingMethod === 'Market Cap') {
      setValue('indexCoinList', recalcMarketCapSmart(list));
    } else {
      // Custom: keep as-is
      setValue('indexCoinList', normalizeAndRound(list));
    }
  }, [weightingMethod, coinList, setValue]);

  const handleOpenCoinPicker = () => setOpenCoinPicker(true);
  const handleCloseCoinPicker = () => setOpenCoinPicker(false);

  const [coinIdToReplace, setCoinIdToReplace] = useState<number | null>(null);
  const handleReplaceCoin = (id: number) => {
    setCoinIdToReplace(id);
    setOpenCoinPicker(true);
  };

  function replaceCoinInList(list: IndexCoin[], idToReplace: number, newCoin: IndexCoin) {
    const newShort = newCoin.shortName.toUpperCase();
    const coinAlreadyInList = list.some(
      (c) => c.id !== idToReplace && c.shortName.toUpperCase() === newShort
    );

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

  const handleSelectCoins = (selectedCoins: IndexCoin[]) => {
    // Replace flow
    if (coinIdToReplace !== null && selectedCoins.length > 0) {
      const [newCoin] = selectedCoins;
      const replacedList = replaceCoinInList(coinList, coinIdToReplace, newCoin);
      setCoinIdToReplace(null);
      setOpenCoinPicker(false);

      if (weightingMethod === 'Constant') {
        setValue('indexCoinList', equalize(replacedList));
      } else if (weightingMethod === 'Market Cap') {
        setValue('indexCoinList', recalcMarketCapSmart(replacedList));
      } else {
        // Custom: zero out the replaced coin and let user set value
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

    // Add flow
    const currentList = coinList || [];
    const newList = [...currentList];

    const duplicates: string[] = [];
    selectedCoins.forEach((coin) => {
      const alreadyInList = newList.some(
        (existing) => existing.shortName.toUpperCase() === coin.shortName.toUpperCase()
      );
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

    setOpenCoinPicker(false);

    if (weightingMethod === 'Custom') {
      setValue('indexCoinList', newList);
      const newlyAddedCoins = selectedCoins.filter((coin) => !duplicates.includes(coin.name));
      if (newlyAddedCoins.length > 0) {
        setTempCoins(newlyAddedCoins);
        setOpenCustomPercentageDialog(true);
      }
      return;
    }

    if (weightingMethod === 'Constant') {
      setValue('indexCoinList', equalize(newList));
      return;
    }

    // Market Cap smart handling
    if (weightingMethod === 'Market Cap') {
      // Preserve existing ratios for old coins; give new coins provisional avg, then normalize
      const newlyAddedSet = new Set(
        selectedCoins
          .filter((c) => !duplicates.includes(c.name))
          .map((c) => c.shortName.toUpperCase())
      );

      // If there was some prior distribution, keep it; otherwise equalize, then normalize
      const base =
        currentList.length > 0
          ? newList.map((c) => ({
              ...c,
              indexPercentage: currentList.find(
                (e) => e.shortName.toUpperCase() === c.shortName.toUpperCase()
              )
                ? (currentList.find((e) => e.shortName.toUpperCase() === c.shortName.toUpperCase())!
                    .indexPercentage ?? 0)
                : 0,
            }))
          : newList.map((c) => ({ ...c, indexPercentage: 0 }));

      const prevSum = base.reduce((a, c) => a + (c.indexPercentage ?? 0), 0);
      let withNew = base;

      if (newlyAddedSet.size > 0) {
        const remaining = Math.max(0, 100 - prevSum);
        const addEach = newlyAddedSet.size > 0 ? remaining / newlyAddedSet.size : 0;

        withNew = base.map((c) => {
          const isNew = newlyAddedSet.has(c.shortName.toUpperCase());
          return {
            ...c,
            indexPercentage: (c.indexPercentage ?? 0) + (isNew ? addEach : 0),
          };
        });
      }

      // If all caps known, prefer strict cap-based; else normalize preserved ratios
      const caps = newList.map((c) => c.marketCap ?? 0);
      const numWithCaps = caps.filter((v) => v > 0).length;

      if (numWithCaps === newList.length) {
        const totalCap = caps.reduce((a, b) => a + b, 0);
        const byCap =
          totalCap > 0
            ? newList.map((c) => ({ ...c, indexPercentage: ((c.marketCap ?? 0) / totalCap) * 100 }))
            : equalize(newList);
        setValue('indexCoinList', normalizeAndRound(byCap));
      } else if (numWithCaps === 0) {
        setValue('indexCoinList', equalize(newList));
      } else {
        setValue('indexCoinList', normalizeAndRound(withNew));
      }
      return;
    }
  };

  const handleSaveCustomPercentages = (coinsWithPercentages: IndexCoin[]) => {
    const finalList = (coinList || []).map((c) => {
      const updated = coinsWithPercentages.find(
        (nc) => nc.shortName.toUpperCase() === c.shortName.toUpperCase()
      );
      return updated ? { ...updated } : c;
    });

    const normalized = normalizeAndRound(finalList);
    setValue('indexCoinList', normalized);
    setOpenCustomPercentageDialog(false);
  };

  const handleRemoveCoin = (id: number) => {
    const updatedList = coinList.filter((c) => c.id !== id);

    if (updatedList.length === 0) {
      setValue('indexCoinList', []);
      return;
    }

    if (weightingMethod === 'Constant') {
      setValue('indexCoinList', equalize(updatedList));
    } else if (weightingMethod === 'Market Cap') {
      setValue('indexCoinList', recalcMarketCapSmart(updatedList));
    } else {
      setValue('indexCoinList', normalizeAndRound(updatedList));
    }
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
      const totalPct = (coinList ?? []).reduce((acc, c) => acc + (c.indexPercentage ?? 0), 0);
      // allow tiny float drift tolerance
      if (Math.abs(totalPct - 100) > 0.01) {
        setValidationError(
          t(
            'createIndex.validation.customMustBe100',
            'For Custom weighting, total must be 100%. Currently it is {{value}}%.',
            { value: round2(totalPct).toFixed(2) }
          )
        );
        return;
      }
    } else if ((coinList ?? []).length === 0) {
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
        { variant: 'success' }
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
                      let v = Number(e.target.value);
                      if (v > 1000) v = 1000;
                      if (v < 1 || isNaN(v)) v = 1;
                      field.onChange(v);
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
                    const v = parseFloat(e.target.value);
                    field.onChange(isNaN(v) ? 0 : v);
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
            <Button variant="outlined" sx={{ mt: 0 }} onClick={() => setOpenCoinPicker(true)}>
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
