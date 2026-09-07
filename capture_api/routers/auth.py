from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from models.schemas import SignupRequest, LoginRequest, AuthResponse, User
from dependencies import get_supabase_client

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest, supabase: Client = Depends(get_supabase_client)):
    try:
        res = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })
        
        if not res.user:
            raise HTTPException(status_code=400, detail="Signup failed")
            
        user = User(
            id=res.user.id,
            email=res.user.email,
            created_at=res.user.created_at
        )
        return AuthResponse(token=res.session.access_token if res.session else "", user=user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, supabase: Client = Depends(get_supabase_client)):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not res.user or not res.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        user = User(
            id=res.user.id,
            email=res.user.email,
            created_at=res.user.created_at
        )
        return AuthResponse(token=res.session.access_token, user=user)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
