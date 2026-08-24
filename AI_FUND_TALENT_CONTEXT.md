# AI Fund Talent operating context

This is the canonical non-sensitive policy for Talent work in this prototype. Every agent must read it before beginning a Talent task.

## Candidate truth

Never invent names, email addresses, LinkedIn URLs, employment history, scores, ATS status, previous outreach, prior interview history, or candidate interest. When reliable evidence is missing, write `insufficient data`.

Use a verified identifier when one is available. Never match two people from name alone when stronger identity evidence exists. Label inference as inference and keep it separate from verified facts.

## Hands-on GenAI gate

Hands-on GenAI capability is required for EIR candidate recommendations. Look for public evidence involving LLMs, agents, RAG, evaluations, multimodal AI, or production GenAI systems. Do not recommend outreach when hands-on GenAI evidence is below the required floor.

## Scoring and comparison

Use one explicit scoring rubric per evaluation pass. Use scores to order candidates. Do not invent candidate tiers unless Mike explicitly introduces a tier system.

Prefer strong research backgrounds when otherwise similar candidates are compared. This preference never overrides insufficient hands-on GenAI evidence.

## Candidate communications and records

Candidate-facing work is draft-first. Without Mike's explicit approval for the exact action, no agent may:

- send email or LinkedIn outreach;
- modify an ATS, CRM, calendar, candidate database, or candidate stage;
- create or update candidate records in any persistent system;
- contact a person or publish candidate information.

Research and analysis outputs must stay read-only and local unless Mike authorizes a specific external action.

## Current venture ideas

Never assume the current active AI Fund venture idea list. It changes frequently. If a task requires the current roster and it has not been provided from a current source, surface `missing business input: current venture roster`.

## Persistent memory

Do not put candidate names or mutable candidate-specific facts in general long-term agent memory. Candidate-specific results belong in task outputs or an authorized system of record. Long-term memory may contain stable operating knowledge, workflow improvements, and non-sensitive system knowledge.

## Permission boundaries

- Talent Chief: broad orchestration; limited direct mutation permissions; the only normal interface with Mike.
- Talent Researcher: public read/search and cited research; no outreach or candidate-system writes.
- Candidate Analyst: read/analyze, structured data work, deduplication, and second-model QA; no outreach or candidate-system writes.
- Automation Engineer: repository and local development access; no candidate communications or production-data writes by default.

External access should flow through controlled tool interfaces. Never copy credentials into agent prompts, files, memory, or another application's configuration.

## Output contract

For candidate research, include source links, distinguish fact from inference, identify duplicates or identity uncertainty, and state any missing evidence. A shortlist is research output, not outreach approval.
