import os
import warnings
from contextlib import asynccontextmanager
from typing import Optional

import pronto
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

HPO_OBO_PATH = os.environ.get("HPO_OBO_PATH", "/data/hp.obo")
HPO_OWL_PATH = os.environ.get("HPO_OWL_PATH", "/data/hp.owl")

ontology: Optional[pronto.Ontology] = None


def load_ontology() -> pronto.Ontology:
    for path in [HPO_OBO_PATH, HPO_OWL_PATH]:
        if os.path.isfile(path):
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UnicodeWarning)
                return pronto.Ontology(path)
    raise FileNotFoundError(
        f"No ontology file found at {HPO_OBO_PATH} or {HPO_OWL_PATH}. "
        "Mount your .obo or .owl file into the container."
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ontology
    ontology = load_ontology()
    yield


app = FastAPI(
    title="HPO API",
    description="REST API for querying the Human Phenotype Ontology",
    version="1.0.0",
    lifespan=lifespan,
)


class TermSummary(BaseModel):
    id: str
    name: Optional[str] = None


class TermDetail(BaseModel):
    id: str
    name: Optional[str] = None
    definition: Optional[str] = None
    comment: Optional[str] = None
    synonyms: list[dict] = []
    xrefs: list[str] = []
    is_obsolete: bool = False
    parents: list[TermSummary] = []
    children: list[TermSummary] = []


class SearchResult(BaseModel):
    query: str
    count: int
    terms: list[TermSummary]


class OntologyInfo(BaseModel):
    name: str
    data_version: Optional[str] = None
    term_count: int


def _term_summary(term: pronto.Term) -> TermSummary:
    return TermSummary(id=str(term.id), name=term.name)


def _term_detail(term: pronto.Term) -> TermDetail:
    synonyms = [
        {"text": str(s.description), "scope": str(s.scope)}
        for s in term.synonyms
    ]
    xrefs = [str(x) for x in term.xrefs]
    parents = [_term_summary(p) for p in term.superclasses(distance=1) if p.id != term.id]
    children = [_term_summary(c) for c in term.subclasses(distance=1) if c.id != term.id]
    return TermDetail(
        id=str(term.id),
        name=term.name,
        definition=str(term.definition) if term.definition else None,
        comment=term.comment,
        synonyms=synonyms,
        xrefs=xrefs,
        is_obsolete=term.obsolete,
        parents=parents,
        children=children,
    )


@app.get("/api/ontology", response_model=OntologyInfo)
def get_ontology_info():
    """Return metadata about the loaded ontology."""
    metadata = ontology.metadata
    version = None
    if metadata.data_version:
        version = metadata.data_version
    return OntologyInfo(
        name="Human Phenotype Ontology",
        data_version=version,
        term_count=len(list(ontology.terms())),
    )


@app.get("/api/terms/{term_id}", response_model=TermDetail)
def get_term(term_id: str):
    """Get a term by its HPO ID (e.g. HP:0000001)."""
    try:
        term = ontology[term_id]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Term {term_id} not found")
    if not isinstance(term, pronto.Term):
        raise HTTPException(status_code=404, detail=f"{term_id} is not a term")
    return _term_detail(term)


@app.get("/api/terms/{term_id}/parents", response_model=list[TermSummary])
def get_parents(term_id: str, distance: int = Query(1, ge=1, le=50)):
    """Get parent terms up to a given distance."""
    try:
        term = ontology[term_id]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Term {term_id} not found")
    if not isinstance(term, pronto.Term):
        raise HTTPException(status_code=404, detail=f"{term_id} is not a term")
    return [
        _term_summary(p)
        for p in term.superclasses(distance=distance)
        if p.id != term.id
    ]


@app.get("/api/terms/{term_id}/children", response_model=list[TermSummary])
def get_children(term_id: str, distance: int = Query(1, ge=1, le=50)):
    """Get child terms up to a given distance."""
    try:
        term = ontology[term_id]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Term {term_id} not found")
    if not isinstance(term, pronto.Term):
        raise HTTPException(status_code=404, detail=f"{term_id} is not a term")
    return [
        _term_summary(c)
        for c in term.subclasses(distance=distance)
        if c.id != term.id
    ]


@app.get("/api/search", response_model=SearchResult)
def search_terms(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search terms by name or synonym text."""
    query_lower = q.lower()
    results: list[TermSummary] = []
    for term in ontology.terms():
        if term.obsolete:
            continue
        if term.name and query_lower in term.name.lower():
            results.append(_term_summary(term))
            if len(results) >= limit:
                break
            continue
        for syn in term.synonyms:
            if query_lower in str(syn.description).lower():
                results.append(_term_summary(term))
                break
        if len(results) >= limit:
            break
    return SearchResult(query=q, count=len(results), terms=results)


@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "ontology_loaded": ontology is not None,
        "term_count": len(list(ontology.terms())) if ontology else 0,
    }
