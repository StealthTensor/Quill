"""Prompt construction for worksheet answering.

PROMPT_VERSION is part of the cache key: bump it whenever the wording below
changes, so cached answers from an older prompt are not silently reused.
"""

from __future__ import annotations

from .config import AnswerConfig, Student
from .slots import KIND_CELL, KIND_PARA, KIND_STUB, Slot

PROMPT_VERSION = "3"

SYSTEM_PROMPT = (
    "You complete academic worksheets on behalf of a named student. "
    "Your entire reply is one JSON object: it begins with { and ends with }. "
    "Never explain your reasoning, never write a preamble, never use markdown fences. "
    "Do all your thinking silently and output only the JSON."
)

# Appended when a reply came back as prose instead of JSON.
STRICT_JSON_SUFFIX = """

FORMAT REMINDER: the previous reply was rejected because it was not JSON.
Output the JSON object only. The first character of your reply must be { and the
last must be }. No reasoning, no preamble, no code fences, no trailing commentary.
"""

_RULES = """\
Rules:
1. Reply with ONE JSON object. Every key is a slot id from the list. Every value is a plain-text string.
2. Include a key for every slot id listed. If a blank genuinely needs no text (pure layout spacing), use an empty string "".
3. Plain text only. No markdown, no bullet characters, no numbering unless the worksheet line already lacks one.
4. Answer in {language}.
5. Write as {student_name} would: {tone}. First person where the question is personal.
6. Table cells: at most {max_cell_chars} characters, usually one short sentence or phrase.
   - If the column asks a Yes/No question, answer exactly "Yes" or "No".
   - If the column asks for a priority or rank, answer only the digit, e.g. "1".
   - If the column asks "increasing or decreasing", answer with just that word.
7. Long-answer questions (Q1, Q2, Q3 and similar): {min_words} to {max_words} words each, in continuous prose.
8. Short reflective prompts and numbered list items: one or two sentences each, concrete and specific.
9. Ground every answer in the course content shown in the worksheet, using its exact terminology
   (right understanding, relationship, physical facility, natural acceptance, and so on).
10. Personal questions must sound like this specific student's own life: name plausible everyday
    details from their background. Do not invent tragedy, illness, or extreme claims.
11. Vary sentence structure and examples. Do not reuse stock phrasing across answers.
"""


def _slot_line(slot: Slot) -> str:
    if slot.kind == KIND_CELL:
        where = []
        if slot.label:
            where.append(f'row "{slot.label}"')
        if slot.column:
            where.append(f'column "{slot.column}"')
        location = f" ({', '.join(where)})" if where else ""
        return f"- {slot.id}: table cell{location}, max {slot.max_chars} characters"
    if slot.kind == KIND_STUB:
        return f"- {slot.id}: text for a numbered list item, one or two sentences"
    if slot.kind == KIND_PARA:
        lines = len(slot.paragraphs)
        scale = "long answer" if lines >= 3 else "short answer"
        return f"- {slot.id}: {scale} in the blank space ({lines} blank line(s) reserved)"
    return f"- {slot.id}: free text"


def build_user_prompt(
    document_text: str,
    slots: tuple[Slot, ...],
    student: Student,
    answers_config: AnswerConfig,
    filename: str,
) -> str:
    """Assemble the full worksheet prompt for one student."""
    rules = _RULES.format(
        language=answers_config.language,
        tone=answers_config.tone,
        student_name=student.name,
        max_cell_chars=answers_config.max_cell_chars,
        min_words=answers_config.long_answer_min_words,
        max_words=answers_config.long_answer_max_words,
    )
    slot_lines = "\n".join(_slot_line(slot) for slot in slots)
    ids = ", ".join(slot.id for slot in slots)

    return f"""\
Below is the worksheet "{filename}". Blanks the student must fill are shown as markers like <<S1>>.

--- WORKSHEET START ---
{document_text}
--- WORKSHEET END ---

Student writing these answers:
{student.profile_text()}

Fill ONLY the blanks listed below. Other markers may appear in the worksheet above;
they are there for context and must not appear in your reply.

Blanks to fill:
{slot_lines}

{rules}
Return JSON with exactly these keys: {ids}
"""


def build_repair_prompt(
    base_prompt: str, missing_ids: tuple[str, ...], slots: tuple[Slot, ...]
) -> str:
    """Re-ask for only the slot ids the model left out, with full context retained."""
    wanted = set(missing_ids)
    lines = "\n".join(_slot_line(slot) for slot in slots if slot.id in wanted)
    return f"""{base_prompt}

IMPORTANT CORRECTION: an earlier attempt left some blanks out. This time reply with ONE
JSON object containing ONLY these keys, still following every rule above:

{lines}

Return JSON with exactly these keys: {", ".join(missing_ids)}
"""
