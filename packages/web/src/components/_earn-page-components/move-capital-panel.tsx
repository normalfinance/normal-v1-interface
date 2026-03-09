'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import {
    Box,
    Stack,
    Button,
    Select,
    MenuItem,
    TextField,
    Typography,
    IconButton,
    FormControl,
    InputAdornment,
} from '@mui/material';

import DonutChart from '../ui/donut-chart';

import type { EarnAssetKey, EarnAllocationRow } from './earn-overview';

export type MoveCapitalKey = EarnAssetKey | 'wallet';

export type EarnMoveCapitalPanelProps = {
    rows: EarnAllocationRow[];
    totalCapitalDeployedUsd: number;
    walletBalanceUsd?: number;
    moveCtaLabel?: string;
    cancelCtaLabel?: string;
    onClose?: () => void;
    onMove?: (payload: {
        from: MoveCapitalKey;
        to: MoveCapitalKey;
        amountUsd: number;
        previewRows: EarnAllocationRow[];
        previewTotalCapitalDeployedUsd: number;
    }) => void;
};

const ROW_COLOR_BY_LABEL: Record<string, string> = {
    Blend: '#20E3A2',
    Collateral: '#2775CA',
    Liquidity: '#BBD3FB',
};

const MOVE_OPTIONS: Array<{ value: MoveCapitalKey; label: string }> = [
    { value: 'wallet', label: 'Wallet' },
    { value: 'collateral', label: 'Collateral' },
    { value: 'liquidity', label: 'Liquidity' },
    { value: 'blend', label: 'Blend' },
];

const SOURCE_LABEL_BY_KEY: Record<MoveCapitalKey, string> = {
    wallet: 'Wallet Balance',
    collateral: 'Collateral Balance',
    liquidity: 'Liquidity Balance',
    blend: 'Blend Balance',
};

export function EarnMoveCapitalPanel({
    rows,
    totalCapitalDeployedUsd,
    walletBalanceUsd = 0,
    moveCtaLabel = 'Move Capital',
    cancelCtaLabel = 'Cancel',
    onClose,
    onMove,
}: EarnMoveCapitalPanelProps) {
    const { t } = useTranslate();

    const normalizedRows = React.useMemo(
        () =>
            rows.map((row) => ({
                ...row,
                balanceUsd: row.balanceUsd ?? 0,
            })),
        [rows]
    );

    const [from, setFrom] = React.useState<MoveCapitalKey | ''>('');
    const [to, setTo] = React.useState<MoveCapitalKey | ''>('');
    const [amountInput, setAmountInput] = React.useState('0.00');

    const availableDestinations = React.useMemo(() => {
        if (!from) return [];

        if (from === 'wallet') {
            return ['collateral', 'liquidity', 'blend'] as MoveCapitalKey[];
        }

        if (from === 'blend') {
            return ['wallet', 'collateral', 'liquidity'] as MoveCapitalKey[];
        }

        if (from === 'collateral') {
            return ['wallet', 'blend'] as MoveCapitalKey[];
        }

        if (from === 'liquidity') {
            return ['wallet', 'blend'] as MoveCapitalKey[];
        }

        return [];
    }, [from]);

    React.useEffect(() => {
        if (!to || !availableDestinations.includes(to)) {
            setTo('');
        }
    }, [availableDestinations, to]);

    const amountUsd = React.useMemo(() => {
        const cleaned = amountInput.replace(/,/g, '').replace(/[^\d.]/g, '');
        const parsed = Number(cleaned);
        return Number.isNaN(parsed) ? 0 : Math.max(parsed, 0);
    }, [amountInput]);

    const getRowBalance = React.useCallback(
        (key: EarnAssetKey) => normalizedRows.find((row) => row.key === key)?.balanceUsd ?? 0,
        [normalizedRows]
    );

    const fromAvailableUsd = React.useMemo(() => {
        if (!from) return 0;
        if (from === 'wallet') return walletBalanceUsd;
        return getRowBalance(from);
    }, [from, walletBalanceUsd, getRowBalance]);

    const clampedAmountUsd = Math.min(amountUsd, fromAvailableUsd);

    const previewRows = React.useMemo(() => {
        if (!from || !to || clampedAmountUsd <= 0) return normalizedRows;

        return normalizedRows.map((row) => {
            let nextBalance = row.balanceUsd ?? 0;

            if (from !== 'wallet' && row.key === from) {
                nextBalance -= clampedAmountUsd;
            }

            if (to !== 'wallet' && row.key === to) {
                nextBalance += clampedAmountUsd;
            }

            return {
                ...row,
                balanceUsd: Math.max(nextBalance, 0),
            };
        });
    }, [normalizedRows, from, to, clampedAmountUsd]);

    const previewTotalCapitalDeployedUsd = React.useMemo(() => {
        if (from === 'wallet' && to !== 'wallet') {
            return totalCapitalDeployedUsd + clampedAmountUsd;
        }

        if (from !== 'wallet' && to === 'wallet') {
            return Math.max(totalCapitalDeployedUsd - clampedAmountUsd, 0);
        }

        return previewRows.reduce((sum, row) => sum + (row.balanceUsd ?? 0), 0);
    }, [from, to, clampedAmountUsd, totalCapitalDeployedUsd, previewRows]);

    const computedDonutSeries = React.useMemo(
        () =>
            previewRows.map((row) => ({
                label: row.label,
                value: row.balanceUsd ?? 0,
            })),
        [previewRows]
    );

    const computedDonutColors = React.useMemo(
        () => computedDonutSeries.map((item) => ROW_COLOR_BY_LABEL[item.label] ?? '#CBD5E1'),
        [computedDonutSeries]
    );

    const helperLabel = from
        ? `${t(SOURCE_LABEL_BY_KEY[from])}: ${fCurrency(fromAvailableUsd)}`
        : `${t('Available Balance')}: ${fCurrency(0)}`;

    const canSubmit = Boolean(from && to && clampedAmountUsd > 0);

    const handleMax = () => {
        setAmountInput(fromAvailableUsd.toFixed(2));
    };

    const handleMove = () => {
        if (!from || !to || !canSubmit) return;

        onMove?.({
            from,
            to,
            amountUsd: clampedAmountUsd,
            previewRows,
            previewTotalCapitalDeployedUsd,
        });
    };

    return (
        <Box
            sx={{
                bgcolor: 'grey.100',
                borderRadius: 2,
                p: { xs: 2, md: 3 },
            }}
        >
            {/* Panel shell */}
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems="stretch" sx={{ width: '100%' }}>
                {/* Left side */}
                <Box
                    sx={{
                        flex: { xs: '1 1 auto', md: '0 0 40%' },
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        pr: { md: 4 },
                    }}
                >
                    <DonutChart
                        totalValueUsd={previewTotalCapitalDeployedUsd}
                        series={computedDonutSeries}
                        colors={computedDonutColors}
                    />
                </Box>

                {/* Middle divider */}
                <Box
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        width: '1px',
                        bgcolor: 'divider',
                        opacity: 0.8,
                    }}
                />

                {/* Right side */}
                <Box sx={{ flex: 1, pl: { md: 4 }, minWidth: 0 }}>
                    <Box
                        sx={{
                            bgcolor: 'grey.100',
                            borderRadius: 2,
                            p: { xs: 0, md: 3 },
                        }}
                    >
                        <Stack spacing={3}>
                            {/* Header */}
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {t('Move Capital')}
                                </Typography>

                                <IconButton onClick={onClose} sx={{ color: 'text.primary' }}>
                                    <CloseRoundedIcon />
                                </IconButton>
                            </Stack>

                            {/* From */}
                            <Stack spacing={1}>
                                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                    {t('From')}
                                </Typography>

                                <FormControl fullWidth>
                                    <Select
                                        displayEmpty
                                        value={from}
                                        onChange={(e) => {
  setFrom(e.target.value as MoveCapitalKey);
  setAmountInput('0.00');
}}
                                        IconComponent={KeyboardArrowDownRoundedIcon}
                                        renderValue={(selected) => {
                                            if (!selected) return t('Select');
                                            return t(
                                                MOVE_OPTIONS.find((item) => item.value === selected)?.label ?? 'Select'
                                            );
                                        }}
                                        sx={{
                                            bgcolor: 'background.paper',
                                            borderRadius: 1.5,
                                            height: 56,
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'divider',
                                            },
                                            '& .MuiSelect-select': {
                                                minHeight: 'unset !important',
                                                display: 'flex',
                                                alignItems: 'center',
                                                boxSizing: 'border-box',
                                                height: '100%',
                                                py: 0,
                                                fontSize: 22,
                                                fontWeight: 500,
                                            },
                                        }}
                                    >
                                        {MOVE_OPTIONS.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {t(option.label)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>

                            {/* Amount */}
                            <Stack spacing={1}>
                                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                    {t('Amount')}
                                </Typography>

                                <TextField
                                    fullWidth
                                    value={amountInput}
                                    onChange={(e) =>
                                        setAmountInput(e.target.value.replace(/,/g, '').replace(/[^\d.]/g, ''))
                                    }
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: 'background.paper',
                                            borderRadius: 1.5,
                                        },
                                        '& .MuiInputBase-input': {
                                            fontSize: 22,
                                            fontWeight: 500,
                                        },
                                    }}
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={handleMax}
                                                        sx={{
                                                            minWidth: 'auto',
                                                            px: 1.5,
                                                            borderRadius: 999,
                                                            color: 'text.primary',
                                                            borderColor: 'divider',
                                                            bgcolor: 'rgba(255,255,255,0.3)',
                                                        }}
                                                    >
                                                        {t('Max')}
                                                    </Button>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />

                                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                    {helperLabel}
                                </Typography>
                            </Stack>

                            {/* To */}
                            <Stack spacing={1}>
                                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                    {t('to')}
                                </Typography>

                                <FormControl fullWidth>
                                    <Select
                                        displayEmpty
                                        value={to}
                                        onChange={(e) => setTo(e.target.value as MoveCapitalKey)}
                                        IconComponent={KeyboardArrowDownRoundedIcon}
                                        renderValue={(selected) => {
                                            if (!selected) return t('Select');
                                            return t(
                                                MOVE_OPTIONS.find((item) => item.value === selected)?.label ?? 'Select'
                                            );
                                        }}
                                        sx={{
                                            bgcolor: 'background.paper',
                                            borderRadius: 1.5,
                                            height: 56,
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'divider',
                                            },
                                            '& .MuiSelect-select': {
                                                minHeight: 'unset !important',
                                                display: 'flex',
                                                alignItems: 'center',
                                                boxSizing: 'border-box',
                                                height: '100%',
                                                py: 0,
                                                fontSize: 22,
                                                fontWeight: 500,
                                            },
                                        }}
                                    >
                                        {availableDestinations.map((value) => (
                                            <MenuItem key={value} value={value}>
                                                {t(MOVE_OPTIONS.find((item) => item.value === value)?.label ?? value)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>

                            {/* Actions */}
                            <Stack direction="row" spacing={2}>
                                <Button
                                    onClick={onClose}
                                    fullWidth
                                    variant="soft"
                                    color="inherit"
                                    sx={{
                                        bgcolor: 'text.secondary',
                                        color: 'common.white',
                                        borderRadius: 999,
                                        '&:hover': {
                                            bgcolor: 'text.secondary',
                                        },
                                    }}
                                >
                                    {t(cancelCtaLabel)}
                                </Button>

                                <Button
                                    onClick={handleMove}
                                    fullWidth
                                    variant="darkSoft"
                                    disabled={!canSubmit}
                                    sx={{
                                        borderRadius: 999,
                                    }}
                                >
                                    {t(moveCtaLabel)}
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                </Box>
            </Stack>
        </Box>
    );
}
