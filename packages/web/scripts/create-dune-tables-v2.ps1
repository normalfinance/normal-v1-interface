# One-time bootstrap for the dashboard-v2 tables (doc 119 / doc 120).
# Dune's insert/clear endpoints 404 on a table that was never created, so the
# cron sync cannot upload until these exist. Run from the packages/web directory:
#   .\scripts\create-dune-tables-v2.ps1 -ApiKey "your_key_here" -Namespace "normalfinance"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,

    [Parameter(Mandatory=$false)]
    [string]$Namespace = "normalfinance"
)

$BaseUrl = "https://api.dune.com/api/v1/uploads"
$Headers = @{ "X-DUNE-API-KEY" = $ApiKey; "Content-Type" = "application/json" }

# Schemas mirror the row interfaces in src/lib/dune/activity-v2.ts — if a field
# is added there, it must be added here too (Dune rejects unknown NDJSON keys).
$Tables = @(
    @{
        table_name  = "normal_activity_v2"
        description = "Every completed/failed/refunded action across all products: Soroswap + LI.FI + CCTP swaps, savings, sends, on/off-ramps"
        schema      = @(
            @{ name = "date";           type = "timestamp" }
            @{ name = "wallet_address"; type = "varchar"   }
            @{ name = "product";        type = "varchar"   }
            @{ name = "action";         type = "varchar"   }
            @{ name = "provider";       type = "varchar"   }
            @{ name = "chain";          type = "varchar"   }
            @{ name = "asset_in";       type = "varchar"   }
            @{ name = "asset_out";      type = "varchar"   }
            @{ name = "amount_token";   type = "double"    }
            @{ name = "amount_usd";     type = "double"    }
            @{ name = "fee_usd";        type = "double"    }
            @{ name = "status";         type = "varchar"   }
            @{ name = "tx_hash";        type = "varchar"   }
            @{ name = "network";        type = "varchar"   }
        )
    },
    @{
        table_name  = "normal_cctp_ops"
        description = "CCTP transfer ops detail: direction, terminal status, duration, which bridge/DEX reverted"
        schema      = @(
            @{ name = "created_at";       type = "timestamp" }
            @{ name = "completed_at";     type = "timestamp" }
            @{ name = "direction";        type = "varchar"   }
            @{ name = "status";           type = "varchar"   }
            @{ name = "src_asset";        type = "varchar"   }
            @{ name = "dst_asset";        type = "varchar"   }
            @{ name = "amount_usd";       type = "double"    }
            @{ name = "duration_seconds"; type = "integer"   }
            @{ name = "revert_tool";      type = "varchar"   }
            @{ name = "revert_exchanges"; type = "varchar"   }
            @{ name = "network";          type = "varchar"   }
        )
    },
    @{
        table_name  = "normal_wallet_chains"
        description = "Per-chain wallet provisioning: how many Turnkey addresses were added per chain per day"
        schema      = @(
            @{ name = "date";          type = "timestamp" }
            @{ name = "chain";         type = "varchar"   }
            @{ name = "wallets_added"; type = "integer"   }
            @{ name = "network";       type = "varchar"   }
        )
    },
    @{
        table_name  = "normal_holdings_snapshots"
        description = "Append-only daily snapshot of what all user wallets hold right now (BTC/ETH/SOL/XLM/USDC + SAVINGS row); combined-TVL charts read this"
        schema      = @(
            @{ name = "snapshot_date";   type = "timestamp" }
            @{ name = "chain";           type = "varchar"   }
            @{ name = "asset";           type = "varchar"   }
            @{ name = "wallets_counted"; type = "integer"   }
            @{ name = "balance_total";   type = "double"    }
            @{ name = "usd_total";       type = "double"    }
            @{ name = "network";         type = "varchar"   }
        )
    }
)

foreach ($table in $Tables) {
    $body = @{
        namespace   = $Namespace
        table_name  = $table.table_name
        description = $table.description
        is_private  = $false
        schema      = $table.schema
    } | ConvertTo-Json -Depth 5

    Write-Host "Creating table: $($table.table_name) ..." -NoNewline

    try {
        $response = Invoke-RestMethod -Uri $BaseUrl -Method Post -Headers $Headers -Body $body
        Write-Host " OK" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody  = $_.ErrorDetails.Message
        Write-Host " FAILED ($statusCode)" -ForegroundColor Red
        Write-Host "  $errorBody"
    }
}

Write-Host ""
Write-Host "Done. Verify at: https://dune.com/$Namespace" -ForegroundColor Cyan
