"""_bm25_score must agree with the reference BM25 formulation, not just on fixtures.

Regression for the memoized-count rewrite: the old code counted term frequencies
with a per-document Counter; the rewrite uses ``list.count`` per query token.
On adversarial corpora (duplicate query tokens, duplicated document tokens,
empty docs, zero-length corpora) both must produce identical scores — the
rewrite is a performance change, never a scoring change.
"""

import math
from collections import Counter

from tools.tool_search_catalog import _bm25_score


def _reference_score(query_tokens, doc_tokens, doc_lengths, avg_dl, doc_freq, n_docs, k1=1.5, b=0.75):
    """The pre-rewrite implementation, kept verbatim as the behavioral contract."""
    score = 0.0
    dl = len(doc_tokens)
    doc_tf = Counter(doc_tokens)
    for q in query_tokens:
        df, tf = doc_freq.get(q, 0), doc_tf.get(q, 0)
        if df and tf:
            idf = math.log(1 + (n_docs - df + 0.5) / (df + 0.5))
            score += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl / max(avg_dl, 1.0)))
    return score


def _corpus():
    return [
        (["send", "email", "gmail"], ["send", "email", "email", "gmail", "compose"]),
        (["send", "send", "email"], ["send", "send", "send", "email"]),  # duplicate query tokens
        (["run", "job"], ["run", "run", "job", "job", "pipeline", "job"]),  # duplicated doc tokens
        (["list"], []),  # empty document
        ([], ["send", "email"]),  # empty query
        (["issue", "linear", "linear"], ["create", "issue", "in", "linear", "board"]),
        (["x"], ["y"]),  # no overlap at all
    ]


def test_matches_reference_bm25_across_adversarial_corpus():
    doc_tokens_list = [doc for _, doc in _corpus()]
    doc_lengths = [len(doc) for doc in doc_tokens_list]
    doc_freq = Counter(tok for doc in doc_tokens_list for tok in set(doc))
    n_docs = len(doc_tokens_list)
    avg_dl = sum(doc_lengths) / n_docs
    for query_tokens, doc_tokens in _corpus():
        assert _bm25_score(query_tokens, doc_tokens, doc_lengths, avg_dl, dict(doc_freq), n_docs) == (
            _reference_score(query_tokens, doc_tokens, doc_lengths, avg_dl, doc_freq, n_docs)
        )


def test_matches_reference_bm25_with_default_and_custom_hyperparams():
    doc = ["deploy", "service", "deploy", "fast"]
    query = ["deploy", "service"]
    doc_lengths = [4, 2, 7]
    doc_freq = {"deploy": 2, "service": 1, "build": 3}
    for k1, b in ((1.5, 0.75), (0.0, 0.0), (2.0, 1.0), (1.2, 0.3)):
        assert _bm25_score(query, doc, doc_lengths, 4.3333333, doc_freq, 3, k1=k1, b=b) == (
            _reference_score(query, doc, doc_lengths, 4.3333333, doc_freq, 3, k1=k1, b=b)
        )


def test_zero_avgdl_guard_matches_reference():
    """avg_dl=0 must clamp to 1.0 in both implementations (empty-corpus guard)."""
    query = ["send"]
    doc = ["send", "send"]
    assert _bm25_score(query, doc, [2], 0.0, {"send": 1}, 1) == (
        _reference_score(query, doc, [2], 0.0, {"send": 1}, 1)
    )
