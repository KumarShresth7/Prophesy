"""LangGraph oracle: web search → analyze → verify → deterministic JSON verdict."""

from __future__ import annotations

import json
import re
from typing import TypedDict

from langgraph.graph import END, StateGraph

from config import load_system_prompt, settings

SYSTEM_PROMPT = load_system_prompt()


class OracleState(TypedDict, total=False):
    market_id: int
    title: str
    description: str
    search_results: str
    draft_outcome: str
    draft_evidence: str
    confidence: float
    outcome: str
    evidence: str


def _search_web(state: OracleState) -> OracleState:
    """Fetch live web snippets for the market question."""
    query = f"{state['title']} {state.get('description', '')}".strip()
    snippets: list[str] = []

    try:
        from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            for hit in ddgs.text(query, max_results=settings.search_max_results):
                title = hit.get("title", "")
                body = hit.get("body", "")
                href = hit.get("href", "")
                snippets.append(f"- [{title}]({href}): {body}")
    except Exception as exc:
        snippets.append(f"(Web search unavailable: {exc})")

    return {**state, "search_results": "\n".join(snippets) if snippets else "(No search results)"}


def _parse_llm_json(content: str) -> dict:
    """Extract JSON object from model output (handles markdown fences)."""
    text = content.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


def _analyze_llm(state: OracleState) -> OracleState:
    """Primary reasoning step using GPT-4o and search context."""
    if not settings.openai_api_key:
        return _analyze_heuristic(state)

    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_openai import ChatOpenAI

    llm = ChatOpenAI(
        model=settings.openai_model,
        temperature=0,
        api_key=settings.openai_api_key,
    )
    user_prompt = (
        f"Market ID: {state['market_id']}\n"
        f"Question: {state['title']}\n"
        f"Resolution criteria: {state.get('description') or 'N/A'}\n\n"
        f"Web search snippets:\n{state.get('search_results', '(none)')}\n\n"
        "Return the JSON verdict now."
    )
    resp = llm.invoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
    )
    data = _parse_llm_json(str(resp.content))
    outcome = str(data.get("outcome", "NO")).upper()
    if outcome not in ("YES", "NO"):
        outcome = "NO"
    return {
        **state,
        "draft_outcome": outcome,
        "draft_evidence": str(data.get("evidence", resp.content)),
        "confidence": float(data.get("confidence", 0.8)),
    }


def _analyze_heuristic(state: OracleState) -> OracleState:
    """Deterministic fallback when OPENAI_API_KEY is not set."""
    corpus = " ".join(
        [
            state.get("title", ""),
            state.get("description", ""),
            state.get("search_results", ""),
        ]
    ).lower()
    positive = ("launch", "approved", "released", "success", "confirmed", "completed", "yes")
    negative = ("delayed", "cancelled", "denied", "failed", "no ", "not ")
    score = sum(1 for w in positive if w in corpus) - sum(1 for w in negative if w in corpus)
    outcome = "YES" if score >= 2 else "NO"
    return {
        **state,
        "draft_outcome": outcome,
        "draft_evidence": (
            f"Heuristic resolution for market #{state['market_id']}. "
            f"Keyword score={score}. Set OPENAI_API_KEY for GPT-4o analysis. "
            f"Search context length: {len(state.get('search_results', ''))} chars."
        ),
        "confidence": 0.55 if settings.openai_api_key else 0.45,
    }


def _verify(state: OracleState) -> OracleState:
    """Second pass: normalize outcome and ensure evidence is present."""
    outcome = (state.get("draft_outcome") or "NO").upper()
    if outcome not in ("YES", "NO"):
        outcome = "NO"

    evidence = (state.get("draft_evidence") or "").strip()
    if not evidence:
        evidence = f"Market #{state['market_id']} resolved to {outcome} with no detailed evidence."

    if settings.openai_api_key:
        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(
                model=settings.openai_model,
                temperature=0,
                api_key=settings.openai_api_key,
            )
            prompt = (
                f"Verify this draft resolution for '{state['title']}'.\n"
                f"Draft: outcome={outcome}, evidence={evidence}\n"
                f"Search context:\n{state.get('search_results', '')}\n\n"
                "If the draft is consistent with facts, repeat it. Otherwise correct it. "
                "Return JSON only: {\"outcome\":\"YES\"|\"NO\",\"evidence\":\"...\",\"confidence\":0.0-1.0}"
            )
            resp = llm.invoke(
                [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=prompt)]
            )
            data = _parse_llm_json(str(resp.content))
            outcome = str(data.get("outcome", outcome)).upper()
            if outcome not in ("YES", "NO"):
                outcome = "NO"
            evidence = str(data.get("evidence", evidence))
        except Exception:
            pass  # keep draft on verify failure

    return {
        **state,
        "outcome": outcome,
        "evidence": evidence,
    }


def build_graph():
    graph = StateGraph(OracleState)
    graph.add_node("search_web", _search_web)
    graph.add_node("analyze", _analyze_llm)
    graph.add_node("verify", _verify)
    graph.set_entry_point("search_web")
    graph.add_edge("search_web", "analyze")
    graph.add_edge("analyze", "verify")
    graph.add_edge("verify", END)
    return graph.compile()


_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def resolve_market(market_id: int, title: str, description: str = "") -> dict:
    """Run the full LangGraph pipeline and return a deterministic verdict."""
    result = get_graph().invoke(
        {
            "market_id": market_id,
            "title": title,
            "description": description or "",
            "search_results": "",
            "draft_outcome": "",
            "draft_evidence": "",
            "confidence": 0.0,
            "outcome": "",
            "evidence": "",
        }
    )
    outcome = (result.get("outcome") or "NO").upper()
    if outcome not in ("YES", "NO"):
        outcome = "NO"
    return {
        "market_id": market_id,
        "outcome": outcome,
        "evidence": result.get("evidence", ""),
        "confidence": result.get("confidence", 0.0),
    }
