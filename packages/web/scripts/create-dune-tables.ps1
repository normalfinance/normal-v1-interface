# Run from the packages/web directory:
#   .\scripts\create-dune-tables.ps1 -ApiKey "your_key_here" -Namespace "normalfinance"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,

    [Parameter(Mandatory=$false)]
    [string]$Namespace = "normalfinance"
)

$BaseUrl = "https://api.dune.com/api/v1/uploads"
$Headers = @{ "X-DUNE-API-KEY" = $ApiKey; "Content-Type" = "application/json" }

$Tables = @(
    @{
        table_name  = "normal_vault_snapshots"
        description = "Daily TVL and price-per-share snapshots from DeFindex vault"
        schema      = @(
            @{ name = "date";         type = "timestamp" }
            @{ name = "vault_address"; type = "varchar"  }
            @{ name = "network";      type = "varchar"   }
            @{ name = "tvl_usd";      type = "double"    }
            @{ name = "pps";          type = "double"    }
            @{ name = "total_supply"; type = "double"    }
        )
    },
    @{
        table_name  = "normal_volume_daily"
        description = "Daily volume by type: savings_deposit, savings_withdraw, swap, onramp"
        schema      = @(
            @{ name = "date";       type = "timestamp" }
            @{ name = "type";       type = "varchar"   }
            @{ name = "network";    type = "varchar"   }
            @{ name = "volume_usd"; type = "double"    }
            @{ name = "fee_usd";    type = "double"    }
            @{ name = "tx_count";   type = "integer"   }
        )
    },
    @{
        table_name  = "normal_wallet_activity"
        description = "Daily active wallet addresses per activity type"
        schema      = @(
            @{ name = "date";           type = "timestamp" }
            @{ name = "wallet_address"; type = "varchar"   }
            @{ name = "activity_type";  type = "varchar"   }
            @{ name = "network";        type = "varchar"   }
        )
    },
    @{
        table_name  = "normal_yield_snapshots"
        description = "Per-wallet yield earned from DeFindex savings vault"
        schema      = @(
            @{ name = "snapshot_date";         type = "timestamp" }
            @{ name = "wallet_address";        type = "varchar"   }
            @{ name = "vault_address";         type = "varchar"   }
            @{ name = "network";               type = "varchar"   }
            @{ name = "total_interest_earned"; type = "double"    }
            @{ name = "total_deposited";       type = "double"    }
            @{ name = "current_position";      type = "double"    }
            @{ name = "roi";                   type = "double"    }
        )
    },
    @{
        table_name  = "normal_referrals"
        description = "Referral code activations"
        schema      = @(
            @{ name = "date";           type = "timestamp" }
            @{ name = "referral_code";  type = "varchar"   }
            @{ name = "referee_wallet"; type = "varchar"   }
            @{ name = "action";         type = "varchar"   }
            @{ name = "network";        type = "varchar"   }
        )
    },
    @{
        table_name  = "normal_users"
        description = "Registered users from Supabase Auth"
        schema      = @(
            @{ name = "user_id";    type = "varchar"   }
            @{ name = "email";      type = "varchar"   }
            @{ name = "created_at"; type = "timestamp" }
            @{ name = "network";    type = "varchar"   }
        )
    },
    @{
        table_name  = "normal_linked_wallets"
        description = "Supabase user to Stellar wallet address mapping"
        schema      = @(
            @{ name = "supabase_uid";   type = "varchar"   }
            @{ name = "wallet_address"; type = "varchar"   }
            @{ name = "created_at";     type = "timestamp" }
            @{ name = "last_used_at";   type = "timestamp" }
            @{ name = "network";        type = "varchar"   }
        )
    },
    @{
        table_name  = "normal_transaction_log"
        description = "Every on-chain action performed through Normal Finance, one row per transaction"
        schema      = @(
            @{ name = "date";           type = "timestamp" }
            @{ name = "wallet_address"; type = "varchar"   }
            @{ name = "action_type";    type = "varchar"   }
            @{ name = "asset_in";       type = "varchar"   }
            @{ name = "asset_out";      type = "varchar"   }
            @{ name = "amount";         type = "double"    }
            @{ name = "fee_usd";        type = "double"    }
            @{ name = "tx_hash";        type = "varchar"   }
            @{ name = "network";        type = "varchar"   }
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
