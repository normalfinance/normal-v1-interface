'use client';

import * as React from 'react';
import {
    Box,
    Button,
    Card,
    Chip,
    Divider,
    Menu,
    MenuItem,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import DonutChart from '../ui/donut-chart';

// --------------------
// Types
// --------------------

export type EarnAssetKey = 'collateral' | 'liquidity' | 'blend';

export type EarnAllocationRow = {
    key: EarnAssetKey;
    label: string;
    icon?: React.ReactNode;
    balanceUsd?: number | null;
    apy?: number | null;
    showManage?: boolean;
};

export type EarnOverviewCardProps = {
    totalCapitalDeployedUsd: number;
    blendedYield: number;
    annualYieldUsd: number;
    totalEarningsUsd: number;
    earnedTodayUsd?: number;
    donutColors?: string[];
    bridgeButtonLabel?: string;
    bridgeHelperText?: string;
    rows: EarnAllocationRow[];
    onBridgeClick?: () => void;
    onCalculateClick?: () => void;
    onAllocateClick?: () => void;
    onRowAction?: (rowKey: EarnAssetKey, action: 'deposit' | 'withdraw' | 'info') => void;
    allocateCtaLabel?: string;
    currency?: string;
};

// --------------------
// Helpers
// --------------------

function formatUsd(value: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatPct(value: number) {
    return `${(value * 100).toFixed(1)}%`;
}

// --------------------
// Component
// --------------------

export function EarnOverviewCard(props: EarnOverviewCardProps) {
    const theme = useTheme();

    const {
        totalCapitalDeployedUsd,
        blendedYield,
        annualYieldUsd,
        totalEarningsUsd,
        earnedTodayUsd,
        rows,
        donutColors,

        bridgeButtonLabel = 'Bridge USDC',
        bridgeHelperText = 'From Ethereum, Arbitrum, Base + 4 more',
        onBridgeClick,

        onCalculateClick,
        onRowAction,

        allocateCtaLabel = 'Allocate Capital',
        onAllocateClick,

        currency = 'USD',
    } = props;

    const defaultColorByLabel: Record<string, string> = {
        Blend: '#20E3A2',
        Collateral: '#2775CA',
        Liquidity: '#BBD3FB',
    };

    const computedDonutSeries = React.useMemo(
        () =>
            rows.map((r) => ({
                label: r.label,
                value: r.balanceUsd ?? 0,
            })),
        [rows]
    );

    const computedDonutColors = React.useMemo(() => {
        // If you explicitly pass donutColors, we assume you manage ordering yourself.
        if (donutColors?.length) return donutColors;

        return computedDonutSeries.map((s) => defaultColorByLabel[s.label] ?? '#CBD5E1');
    }, [donutColors, computedDonutSeries]);

    // Manage menu state (one menu, anchored to whichever row was clicked)
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [activeRowKey, setActiveRowKey] = React.useState<EarnAssetKey | null>(null);

    const openMenu = (e: React.MouseEvent<HTMLElement>, rowKey: EarnAssetKey) => {
        setMenuAnchor(e.currentTarget);
        setActiveRowKey(rowKey);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
        setActiveRowKey(null);
    };

    const handleRowAction = (action: 'deposit' | 'withdraw' | 'info') => {
        if (activeRowKey) onRowAction?.(activeRowKey, action);
        closeMenu();
    };

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                bgcolor: 'background.paper',
                p:2,
            }}
        >
            {/* Top metrics bar */}
            <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={{ xs: 2, md: 0 }}
                    alignItems={{ xs: 'stretch', md: 'flex-start' }}
                    justifyContent="space-between"
                >
                    {/* Metrics */}
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={{ xs: 2, md: 6 }}
                        alignItems={{ xs: 'stretch', md: 'flex-start' }}
                        flexWrap="wrap"
                    >
                        <MetricBlock label="Total Capital Deployed" value={formatUsd(totalCapitalDeployedUsd, currency)} />

                        <MetricBlock label="Blended Yield" value={formatPct(blendedYield)} />

                        <MetricBlock
                            label="Annual Yield"
                            value={formatUsd(annualYieldUsd, currency)}
                            action={
                                <Button
                                    onClick={onCalculateClick}
                                    variant="text"
                                    size="small"
                                    sx={{
                                        minWidth: 'auto',
                                        px: 1,
                                        ml: 1,
                                        color: 'text.secondary',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                    }}
                                    endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />}
                                >
                                    Calculate
                                </Button>
                            }
                        />

                        <MetricBlock
                            label="Total Earnings"
                            value={formatUsd(totalEarningsUsd, currency)}
                            valueSx={{
                                background: 'linear-gradient(90deg, #3B82F6 0%, #A855F7 50%, #F97316 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                            action={
                                earnedTodayUsd != null ? (
                                    <Chip
                                        label={`${formatUsd(earnedTodayUsd, currency)} earned today`}
                                        size="small"
                                        sx={{
                                            ml: 1,
                                            bgcolor: 'rgba(0,0,0,0.04)',
                                            color: 'text.secondary',
                                            fontWeight: 600,
                                        }}
                                    />
                                ) : null
                            }
                        />
                    </Stack>

                    {/* Right-side bridge action */}
                    <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
                        <Button
                            onClick={onBridgeClick}
                            variant="gradientSoft"
                        >
                            {bridgeButtonLabel}
                        </Button>

                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {bridgeHelperText}
                        </Typography>
                    </Stack>
                </Stack>
            </Box>

            <Divider />

            {/* Body */}
            <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    alignItems="stretch"
                    sx={{ width: '100%' }}
                >
                    {/* Left: Donut */}
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
                            totalValueUsd={totalCapitalDeployedUsd}
                            series={computedDonutSeries}
                            colors={computedDonutColors}
                        />
                    </Box>

                    {/* Divider (1px) */}
                    <Box
                        sx={{
                            display: { xs: 'none', md: 'block' },
                            width: '1px',
                            bgcolor: 'divider',
                            opacity: 0.8,
                        }}
                    />

                    {/* Right: Allocation list (rest) */}
                    <Box
                        sx={{
                            flex: 1,
                            pl: { md: 4 },
                            minWidth: 0,
                        }}
                    >
                        <Stack spacing={3}>
                            {rows.map((row, idx) => (
                                <React.Fragment key={row.key}>
                                    <AllocationRow
                                        label={row.label}
                                        icon={
                                            row.icon ?? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {row.key === 'liquidity' ? (
                                                        <BarChartRoundedIcon sx={{ fontSize: 22, color: 'text.primary' }} />
                                                    ) : (
                                                        <InfoOutlinedIcon sx={{ fontSize: 22, color: 'text.primary', opacity: 0.75 }} />
                                                    )}
                                                </Box>
                                            )
                                        }
                                        balanceUsd={row.balanceUsd}
                                        apy={row.apy}
                                        showManage={row.showManage}
                                        onManageClick={(e) => openMenu(e, row.key)}
                                    />
                                    {idx !== rows.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}

                            <Button
                                onClick={onAllocateClick}
                                variant="darkSoft"
                                fullWidth
                               
                            >
                                {allocateCtaLabel}
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            </Box>


            {/* Shared Manage menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                PaperProps={{
                    sx: {
                        mt: 1,
                        borderRadius: 3,
                        minWidth: 200,
                        p: 0.5,
                        boxShadow: '0px 16px 40px rgba(0,0,0,0.12)',
                    },
                }}
            >
                <MenuItem onClick={() => handleRowAction('deposit')}>Deposit</MenuItem>
                <MenuItem onClick={() => handleRowAction('withdraw')}>Withdraw</MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => handleRowAction('info')}>Info</MenuItem>
            </Menu>
        </Card>
    );
}

// --------------------
// Subcomponents
// --------------------

function MetricBlock({
    label,
    value,
    action,
    valueSx,
}: {
    label: string;
    value: string;
    action?: React.ReactNode;
    valueSx?: any;
}) {
    return (
        <Stack spacing={0.5} sx={{ minWidth: 180 }}>
            <Stack direction="row" alignItems="center">
                <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.6, ...valueSx }}>
                    {value}
                </Typography>
                {action}
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {label}
            </Typography>
        </Stack>
    );
}

function AllocationRow({
    label,
    icon,
    balanceUsd,
    apy,
    showManage,
    onManageClick,
}: {
    label: string;
    icon: React.ReactNode;
    balanceUsd?: number | null;
    apy?: number | null;
    showManage?: boolean;
    onManageClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
    return (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box sx={{ mt: 0.2 }}>{icon}</Box>
                <Stack spacing={0.8}>
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>
                        {label}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Balance:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        APY
                    </Typography>
                </Stack>
            </Stack>

            <Stack spacing={1} alignItems="flex-end">
                {showManage ? (
                    <Button
                        onClick={onManageClick}
                        variant="text"
                        size="small"
                        sx={{ textTransform: 'none', fontWeight: 700, color: 'text.primary' }}
                        endIcon={<KeyboardArrowDownRoundedIcon />}
                    >
                        Manage
                    </Button>
                ) : (
                    <Box sx={{ height: 32 }} />
                )}

                <Stack spacing={0.4} alignItems="flex-end">
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {balanceUsd != null ? formatUsd(balanceUsd) : ''}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {apy != null ? formatPct(apy) : ''}
                    </Typography>
                </Stack>
            </Stack>
        </Stack>
    );
}
