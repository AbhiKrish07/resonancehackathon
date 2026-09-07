from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, HTTPException
from services.mcp_service import MCPService

router = APIRouter(prefix="/mcp", tags=["MCP Server"])

@router.get("/tools")
async def list_mcp_tools():
    """Returns available MCP tools."""
    return {"tools": MCPService.get_tool_definitions()}


@router.post("")
async def handle_mcp_jsonrpc(request: Request):
    """
    Standard MCP JSON-RPC 2.0 Handler.
    Supports methods:
    - tools/list
    - tools/call
    - initialize
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    msg_id = body.get("id")
    method = body.get("method", "")
    params = body.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": False}
                },
                "serverInfo": {
                    "name": "capture-context-mcp",
                    "version": "2.0.0"
                }
            }
        }

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "tools": MCPService.get_tool_definitions()
            }
        }

    elif method == "tools/call":
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})
        result = await MCPService.execute_tool(tool_name, tool_args)
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": str(result)
                    }
                ],
                "isError": "error" in result
            }
        }

    else:
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {
                "code": -32601,
                "message": f"Method '{method}' not found"
            }
        }
