# English drill — content generation prompt

Copy everything below into a normal Claude chat to generate an importable batch.
Fill in the **Parameters** block each time. Output is a single JSON file you upload
in the app's **Import** screen.

---

## Role & goal

You generate B1→B2+ English learning content as JSON for import into my spaced-repetition
app. **Output only a single fenced `json` code block — no prose before or after.**

## Hard rules (the importer validates strictly and rejects extra keys)

- Top-level envelope exactly: `{ "schema_version": 1, "kind": <kind>, "source_batch": <label>, "generated_at": <ISO8601>, "items": [ ... ] }`.
- `kind` is one of `"exercises"`, `"words"`, `"grammar_topics"`. All `items` must match that kind.
- **No extra keys anywhere** (objects are strict). No `id`, no SM-2 fields — the app sets those.
- Respect the target **CEFR** level: vocabulary, sentence complexity, and distractors must fit it; don't exceed it.
- **No duplicates**: not within the batch, and none of the items listed in *Existing inventory* below.
- Open answers: give a natural `correct_answer` plus realistic `acceptable_answers` (synonyms / spelling variants).
- Multiple choice: 3–6 **distinct** `options`, exactly one correct, referenced by 0-based `correct_index`.
- Matching: 3–8 **distinct** `pairs` (`left` = EN, `right` = SK).
- Every `..._fill_blank` / `grammar_fill_form` `sentence` contains the token `___` **exactly once**.

## Parameters (edit each run)

- `kind`: exercises | words | grammar_topics
- `count`: e.g. 20
- `target CEFR`: A2 | B1 | B2 | C1  (B2 is my usual target)
- `theme / topic`: e.g. "business collocations", "phrasal verbs of communication", "third conditional"
- `source_batch` label: `YYYY-MM-DD_<theme>_<n>`  (must be unique)
- For `exercises`, a **type mix**, e.g. 30% vocab_en_sk, 20% vocab_fill_blank, 20% vocab_multiple_choice, 15% vocab_matching, 15% grammar.

## Existing inventory — DO NOT reproduce any of these

> Paste the lists from the app here so the chat avoids duplicates. (A later app version
> will offer a one-click copy of existing terms/topics.)

```
words (term | part_of_speech):
topics (name):
```

---

## Item shapes by kind

### kind = "words"

```json
{ "term": "leverage", "translation": "páka, vplyv", "part_of_speech": "noun",
  "cefr_level": "B2", "example_sentence": "They used their position as leverage." }
```
`part_of_speech` ∈ noun | verb | adjective | adverb | phrase | phrasal_verb | idiom | other.
`example_sentence` optional. Optional `note`.

### kind = "grammar_topics"

```json
{ "name": "Third conditional", "cefr_level": "B2",
  "notes": "Unreal past: if + past perfect, would have + past participle.",
  "examples": ["If I had known, I would have come earlier."] }
```

### kind = "exercises"

Every exercise item has: `type`, `cefr_level`, a `payload` (shape depends on `type`), and a
**target** — either `related_word_terms` (EN terms that must already exist as words) or
`related_topic_name` (a grammar topic that must already exist). Optional `note`.

| type | payload fields | target |
|---|---|---|
| `vocab_en_sk` | `prompt` (EN), `prompt_lang:"en"`, `answer_lang:"sk"`, `correct_answer` (SK), `acceptable_answers?` | `related_word_terms` |
| `vocab_sk_en` | `prompt` (SK), `prompt_lang:"sk"`, `answer_lang:"en"`, `correct_answer` (EN), `acceptable_answers?` | `related_word_terms` |
| `vocab_fill_blank` | `sentence` (one `___`), `correct_answer`, `acceptable_answers?`, `hint?` | `related_word_terms` |
| `vocab_multiple_choice` | `prompt`, `options[3..6]`, `correct_index` | `related_word_terms` |
| `vocab_matching` | `pairs[3..8]` `{left,right}` | `related_word_terms` |
| `grammar_fill_form` | `sentence` (one `___`), `correct_answer`, `hint?`, `acceptable_answers?` | `related_topic_name` |
| `grammar_choose_option` | `prompt`, `options[3..6]`, `correct_index` | `related_topic_name` |
| `grammar_fix_error` | `sentence` (one error), `correct_answer` (full corrected sentence), `error_tag?`, `acceptable_answers?` | `related_topic_name` |

One worked example per type:

```json
{ "type": "vocab_en_sk", "cefr_level": "B2", "related_word_terms": ["put off"],
  "payload": { "prompt": "put off", "prompt_lang": "en", "answer_lang": "sk",
               "correct_answer": "odložiť", "acceptable_answers": ["posunúť"] } }
{ "type": "vocab_sk_en", "cefr_level": "B1", "related_word_terms": ["cautious"],
  "payload": { "prompt": "opatrný", "prompt_lang": "sk", "answer_lang": "en", "correct_answer": "cautious" } }
{ "type": "vocab_fill_blank", "cefr_level": "B2", "related_word_terms": ["leverage"],
  "payload": { "sentence": "They used their position as ___ .", "correct_answer": "leverage" } }
{ "type": "vocab_multiple_choice", "cefr_level": "B1", "related_word_terms": ["reluctant"],
  "payload": { "prompt": "She was ___ to admit her mistake.",
               "options": ["reluctant", "eager", "keen", "delighted"], "correct_index": 0 } }
{ "type": "vocab_matching", "cefr_level": "B1", "related_word_terms": ["reluctant", "cautious", "thorough"],
  "payload": { "pairs": [ { "left": "reluctant", "right": "zdráhavý" },
                          { "left": "cautious", "right": "opatrný" },
                          { "left": "thorough", "right": "dôkladný" } ] } }
{ "type": "grammar_fill_form", "cefr_level": "B2", "related_topic_name": "Third conditional",
  "payload": { "sentence": "If I had known, I ___ (come) earlier.", "correct_answer": "would have come", "hint": "come" } }
{ "type": "grammar_choose_option", "cefr_level": "B2", "related_topic_name": "Third conditional",
  "payload": { "prompt": "If she ___ harder, she would have passed.",
               "options": ["had studied", "studied", "would study", "has studied"], "correct_index": 0 } }
{ "type": "grammar_fix_error", "cefr_level": "B2", "related_topic_name": "Articles",
  "payload": { "sentence": "I saw a elephant at the zoo.",
               "correct_answer": "I saw an elephant at the zoo.", "error_tag": "article" } }
```

## Output skeleton (fill and return only this)

```json
{ "schema_version": 1, "kind": "exercises", "source_batch": "2026-07-02_b2_phrasal_verbs_01",
  "generated_at": "2026-07-02T10:00:00Z", "items": [ /* count items */ ] }
```

## Self-check before you output

- items length == `count`; valid JSON; **no extra keys**.
- every MC `correct_index` in range; every blank has exactly one `___`.
- vocab has SK translations; exercises reference existing terms/topics only.
- no duplicates within the batch or against *Existing inventory*.

---

## Companion: error-analysis prompt

> I'll paste an `attempts_export` JSON from my app. Identify my top recurring error
> patterns (by `eval_reason`, `error_tag`, target word/topic, and CEFR). Then produce
> the next `exercises` batch **as importable JSON** (obeying every rule above) that
> targets those specific weaknesses.
