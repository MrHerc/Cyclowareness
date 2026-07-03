"""Analyzer factory — swappable via SANDBOX_ANALYZER config (spec §6.2)."""
from ..config import get_settings
from .base import BaseAnalyzer
from .mock_analyzer import MockAnalyzer

_analyzer: BaseAnalyzer | None = None


def get_analyzer() -> BaseAnalyzer:
    global _analyzer
    if _analyzer is None:
        if get_settings().sandbox_analyzer == "real":
            from .real_analyzer import RealAnalyzer

            _analyzer = RealAnalyzer()
        else:
            _analyzer = MockAnalyzer()
    return _analyzer
