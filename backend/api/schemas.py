from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from uuid import UUID

class MusicBlockBase(BaseModel):
    block_type: str = Field(..., example="Rhythm")
    layer: int = Field(..., example=1)
    slug: str = Field(..., example="meta_122")
    name: Optional[str] = None
    content: Dict[str, Any] = Field(default_factory=dict)

class MusicBlockCreate(MusicBlockBase):
    pass

class MusicBlockResponse(MusicBlockBase):
    id: UUID
    class Config:
        from_attributes = True

class TreeNodeResponse(BaseModel):
    id: str
    slug: str
    block_type: Optional[str] = None
    layer: Optional[int] = None
    is_group: bool = False
    subRows: Optional[List['TreeNodeResponse']] = None

TreeNodeResponse.update_forward_refs()
