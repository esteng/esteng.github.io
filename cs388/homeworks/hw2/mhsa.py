"""
CS 388: Natural Language Processing -- Homework 2, Question 4.

A single layer of multi-head self-attention, written in PyTorch.

The layer is meant to behave exactly like the multi-head attention from lecture,
and like the two-head model you designed by hand in Question 2: project the input
into per-head queries, keys and values; run scaled dot-product attention
independently inside each head; recombine the per-head outputs; and project the
result back to the model dimension with W_O.

This implementation contains exactly one mistake. Everything else -- the shapes,
the scaling, the softmax, and the four projections -- is correct.
"""

import math

import torch
import torch.nn as nn


class MultiHeadSelfAttention(nn.Module):
    """One layer of multi-head self-attention (no masking, no dropout)."""

    def __init__(self, d_model: int, n_heads: int):
        super().__init__()
        if d_model % n_heads != 0:
            raise ValueError("d_model must be divisible by n_heads")

        self.d_model = d_model
        self.n_heads = n_heads
        self.d_head = d_model // n_heads

        self.W_Q = nn.Linear(d_model, d_model, bias=False)
        self.W_K = nn.Linear(d_model, d_model, bias=False)
        self.W_V = nn.Linear(d_model, d_model, bias=False)
        self.W_O = nn.Linear(d_model, d_model, bias=False)

    def _split_heads(self, x: torch.Tensor) -> torch.Tensor:
        """(B, T, d_model) -> (B, n_heads, T, d_head)"""
        B, T, _ = x.shape
        return x.view(B, T, self.n_heads, self.d_head).transpose(1, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """(B, T, d_model) -> (B, T, d_model)"""
        B, T, _ = x.shape

        # One set of queries, keys and values per head.
        q = self._split_heads(self.W_Q(x))          # (B, n_heads, T, d_head)
        k = self._split_heads(self.W_K(x))          # (B, n_heads, T, d_head)
        v = self._split_heads(self.W_V(x))          # (B, n_heads, T, d_head)

        # Scaled dot-product attention, computed independently inside each head.
        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.d_head)
        attn = torch.softmax(scores, dim=-1)        # (B, n_heads, T, T)
        head_outputs = attn @ v                     # (B, n_heads, T, d_head)

        # Recombine the heads and project back to the model dimension.
        combined = head_outputs[:, 0]
        return self.W_O(combined)


if __name__ == "__main__":
    torch.manual_seed(0)

    batch, seq_len, d_model, n_heads = 1, 5, 8, 2

    layer = MultiHeadSelfAttention(d_model=d_model, n_heads=n_heads)
    x = torch.randn(batch, seq_len, d_model)
    out = layer(x)

    print("input shape: ", tuple(x.shape))
    print("output shape:", tuple(out.shape))
    assert out.shape == x.shape, "a self-attention layer must preserve its input shape"
