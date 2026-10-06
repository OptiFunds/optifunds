from pydantic import BaseModel, Field
from typing import List, Optional

# --- Esquemes de Cerca i Mestres ---
class FundSummary(BaseModel):
    isin: str
    fund_name: str
    ter: float

class FundDetail(FundSummary):
    category: Optional[str] = None
    sharpe_ratio: Optional[float] = None
    volatility: Optional[float] = None

# --- Esquemes de Closet Indexing ---
class ClosetIndexRequest(BaseModel):
    isin_fund: str = Field(..., json_schema_extra={"example": "ES0152745003"})
    isin_bmk: str = Field(..., json_schema_extra={"example": "IE00B03HD191"})

class ClosetIndexResponse(BaseModel):
    fund_name: str
    bmk_name: str
    overlap_pct: float
    active_share_pct: float
    official_ter: float
    active_ter: float
    is_closet_indexer: bool

# --- Esquemes de Portfolio Builder ---
class PortfolioItem(BaseModel):
    isin: str
    weight: float = Field(..., ge=0.0, le=100.0)

class PortfolioRequest(BaseModel):
    allocations: List[PortfolioItem]

class HoldingExposure(BaseModel):
    holding_name: str
    holding_ric: str
    portfolio_weight: float

class PortfolioResponse(BaseModel):
    top_holdings: List[HoldingExposure]
    top5_concentration: float
    top10_concentration: float