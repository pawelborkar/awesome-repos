---
{
  "title": "Learn Rust with books, examples and exercises",
  "description": "Combine Rust explanations with runnable examples and exercises. Compare books, a course, design guidance, and a focused procedural-macro workshop.",
  "reviewed": true,
  "updated": "2026-11-02",
  "journey": "learn",
  "resources": [
    "rust-lang/book",
    "rust-lang/rust-by-example",
    "rust-lang/rustlings",
    "google/comprehensive-rust",
    "rust-unofficial/patterns",
    "dtolnay/proc-macro-workshop"
  ],
  "selection": "These catalog entries are books, courses, exercises, or instructional references about Rust. Application frameworks are excluded to keep the collection focused on learning the language.",
  "sources": [
    "https://github.com/rust-lang/book",
    "https://github.com/rust-lang/rust-by-example",
    "https://github.com/rust-lang/rustlings",
    "https://github.com/google/comprehensive-rust",
    "https://github.com/rust-unofficial/patterns",
    "https://github.com/dtolnay/proc-macro-workshop"
  ],
  "comparison": [
    {
      "key": "rust-lang/book",
      "use": "A book-length explanation of the Rust language.",
      "prerequisites": "Follow the book’s installation and getting-started chapters.",
      "limitations": "Reading is only part of the work; compile and modify examples to check understanding.",
      "sources": [
        "https://github.com/rust-lang/book"
      ]
    },
    {
      "key": "rust-lang/rust-by-example",
      "use": "Learning through annotated runnable examples.",
      "prerequisites": "Read the selected example and use its documented environment.",
      "limitations": "An example may need more explanation than a short page supplies; use a fuller reference when needed.",
      "sources": [
        "https://github.com/rust-lang/rust-by-example"
      ]
    },
    {
      "key": "rust-lang/rustlings",
      "use": "Practising Rust through small exercises.",
      "prerequisites": "Follow the current Rustlings setup.",
      "limitations": "The project recommends using exercises alongside the Rust book rather than replacing explanations.",
      "sources": [
        "https://github.com/rust-lang/rustlings"
      ]
    },
    {
      "key": "google/comprehensive-rust",
      "use": "A classroom-shaped course for experienced programmers.",
      "prerequisites": "Bring prior programming experience and read the course-format notes.",
      "limitations": "The README notes that independent study misses classroom questions and discussion.",
      "sources": [
        "https://github.com/google/comprehensive-rust"
      ]
    },
    {
      "key": "rust-unofficial/patterns",
      "use": "Investigating Rust design patterns and idioms.",
      "prerequisites": "Be able to read the relevant Rust examples.",
      "limitations": "A reference on patterns is not a sequential introduction to all language features.",
      "sources": [
        "https://github.com/rust-unofficial/patterns"
      ]
    },
    {
      "key": "dtolnay/proc-macro-workshop",
      "use": "Implementing focused procedural-macro projects.",
      "prerequisites": "Read the workshop’s suggested prerequisites.",
      "limitations": "This is specialized practice; inspect its project recommendations and test harness before starting.",
      "sources": [
        "https://github.com/dtolnay/proc-macro-workshop"
      ]
    }
  ],
  "questions": [
    {
      "question": "Should I read the book before doing exercises?",
      "answer": "You can combine the two: read a concept, attempt a related exercise, and return to the explanation when a compiler error reveals a gap. Rustlings explicitly recommends accompanying the Rust book.",
      "sources": [
        "https://github.com/rust-lang/rustlings"
      ]
    },
    {
      "question": "Is Comprehensive Rust a first programming course?",
      "answer": "Its README describes an audience of experienced software engineers. Use that audience statement when deciding whether the course matches your background.",
      "sources": [
        "https://github.com/google/comprehensive-rust"
      ]
    }
  ],
  "source_checked": "2026-11-02"
}
---

## Pair an explanation with a small program

Use The Rust Programming Language for an extended explanation, Rust By Example for annotated examples, and Rustlings for exercises. Read one concept, write or change a small program, and explain a compiler error before moving on.

Comprehensive Rust is a course developed for experienced programmers. Its README describes a classroom setting and notes the limits of self-study without the surrounding discussion. Check that format against your background before choosing it.

## Choose specialized references for a specific problem

Rust Design Patterns helps you investigate design choices. The Procedural Macros Workshop focuses on macro projects and a test-driven workflow. Read the workshop prerequisites before attempting it; use the language book or examples when the missing knowledge is more general.
