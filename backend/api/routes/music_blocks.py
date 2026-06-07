from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlmodel import Session, select, func
from typing import List, Optional
from uuid import UUID
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from database.connection import engine
from database.models import MusicBlock
from api.schemas import MusicBlockCreate, MusicBlockResponse, TreeNodeResponse

router = APIRouter(prefix="/api/music-blocks", tags=["Music Blocks"])

def get_db():
    with Session(engine) as session:
        yield session

@router.post("/", response_model=MusicBlockResponse, status_code=201)
def create_or_update_block(payload: MusicBlockCreate, db: Session = Depends(get_db)):
    """Idempotent upsert: if slug exists, overwrite content. Prevents unique violations."""
    existing = db.exec(select(MusicBlock).where(MusicBlock.slug == payload.slug)).first()
    if existing:
        for key, value in payload.dict().items():
            setattr(existing, key, value)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    new_block = MusicBlock(**payload.dict())
    db.add(new_block)
    db.commit()
    db.refresh(new_block)
    return new_block

@router.get("/", response_model=List[MusicBlockResponse])
def get_flat_blocks(
    response: Response,
    db: Session = Depends(get_db),
    block_type: Optional[str] = Query(None),
    layer: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500)
):
    """Flat paginated list compatible with Refine resource grid primitives."""
    statement = select(MusicBlock)
    if block_type:
        statement = statement.where(MusicBlock.block_type == block_type)
    if layer:
        statement = statement.where(MusicBlock.layer == layer)
        
    total_count = db.exec(select(func.count()).select_from(statement.subquery())).one()
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
    return db.exec(statement.offset(skip).limit(limit)).all()

@router.get("/tree", response_model=List[TreeNodeResponse])
def get_blocks_tree(db: Session = Depends(get_db)):
    """In-memory aggregator routing flat rows into a tree payload (subRows) for TanStack Table."""
    blocks = db.exec(select(MusicBlock)).all()
    tree_dict = {}
    
    for b in blocks:
        if b.block_type not in tree_dict:
            tree_dict[b.block_type] = {}
        if b.layer not in tree_dict[b.block_type]:
            tree_dict[b.block_type][b.layer] = []
            
        tree_dict[b.block_type][b.layer].append(
            TreeNodeResponse(id=str(b.id), slug=b.slug, block_type=b.block_type, layer=b.layer)
        )
        
    formatted_tree = []
    for b_type, layers in tree_dict.items():
        type_sub_rows = []
        for b_layer, leaf_blocks in layers.items():
            type_sub_rows.append(TreeNodeResponse(id=f"g-{b_type}-{b_layer}", slug=f"Layer {b_layer}", is_group=True, subRows=leaf_blocks))
        formatted_tree.append(TreeNodeResponse(id=f"g-{b_type}", slug=b_type, is_group=True, subRows=type_sub_rows))
        
    return formatted_tree
