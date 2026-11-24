# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

The project will make several decisions that aren't obvious from the code alone. Examples: how to normalize dirty remito data, how to make loads into the carrier API idempotent, and how to retry. We want the reasoning behind each one to be easy to find for both people and coding agents.

## Decision

We record significant decisions as lightweight ADRs in `docs/adr/`, one Markdown file per decision, using `template.md`. We update the index in `docs/adr/README.md` with each new ADR. Accepted ADRs aren't rewritten; a newer ADR supersedes them.

## Consequences

- Each decision has one place that explains why it was made.
- Writing an ADR takes a little time, so we keep them short.
