"""The live provider's response handling.

Nothing here needs an API key: the SDK client is replaced with a stub that
returns the block shapes the real API actually sends. These are the failures
that would have appeared on the first call after ANTHROPIC_API_KEY was set —
i.e. in front of a customer, never in the demo.
"""
import types

import pytest

from app.ai.providers import AnthropicProvider


class _Block:
    def __init__(self, type_: str, text: str | None = None):
        self.type = type_
        if text is not None:
            self.text = text


class _Response:
    def __init__(self, content, stop_reason="end_turn"):
        self.content = content
        self.stop_reason = stop_reason


def _provider(response: _Response) -> AnthropicProvider:
    """An AnthropicProvider whose SDK call is stubbed — no key, no network."""
    provider = AnthropicProvider.__new__(AnthropicProvider)
    provider.model = "claude-sonnet-5"

    async def create(**_kwargs):
        return response

    provider.client = types.SimpleNamespace(messages=types.SimpleNamespace(create=create))
    return provider


@pytest.mark.asyncio
async def test_text_is_read_past_a_leading_thinking_block():
    """Regression: the code took content[0].text.

    Current Claude models think adaptively by default, so content[0] is a
    thinking block with no `.text` attribute — every live call raised
    AttributeError, which the AI service reported as a provider failure.
    """
    response = _Response([_Block("thinking"), _Block("text", '{"ok": true}')])
    assert await _provider(response).complete("triage_assist", {}) == '{"ok": true}'


@pytest.mark.asyncio
async def test_truncation_is_reported_as_truncation():
    """Regression: a response cut off at max_tokens failed JSON parsing, and was
    reported as "no JSON object found" — pointing at the prompt instead of the
    token ceiling."""
    response = _Response([_Block("text", '{"title": "half a mod')], stop_reason="max_tokens")
    with pytest.raises(ValueError, match="token ceiling"):
        await _provider(response).complete("training_generation", {})


@pytest.mark.asyncio
async def test_a_response_with_no_text_block_is_an_error_not_a_crash():
    response = _Response([_Block("thinking")])
    with pytest.raises(ValueError, match="no text block"):
        await _provider(response).complete("threat_explanation", {})


@pytest.mark.asyncio
async def test_training_generation_gets_a_larger_token_ceiling():
    """A full module (sections + a 3-5 question quiz with explanations) does not
    fit in the 2000-token default that every task previously shared."""
    assert AnthropicProvider.MAX_TOKENS["training_generation"] > AnthropicProvider.DEFAULT_MAX_TOKENS
