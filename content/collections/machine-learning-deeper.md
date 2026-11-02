---
{
  "title": "Machine learning resources beyond the first tutorial",
  "description": "Compare neural-network lectures, an interactive deep-learning book, practical ML material, and LLM implementations. Check prerequisites and compute first.",
  "reviewed": true,
  "updated": "2026-11-02",
  "journey": "learn",
  "resources": [
    "karpathy/nn-zero-to-hero",
    "d2l-ai/d2l-en",
    "ageron/handson-ml3",
    "gokumohandas/made-with-ml",
    "rasbt/llms-from-scratch",
    "mlabonne/llm-course"
  ],
  "selection": "These catalog entries teach ML through code, notebooks, or extended explanations. They cover different depths and prerequisites; public repository access does not imply that companion books or compute are free.",
  "sources": [
    "https://github.com/karpathy/nn-zero-to-hero",
    "https://github.com/d2l-ai/d2l-en",
    "https://github.com/ageron/handson-ml3",
    "https://github.com/gokumohandas/made-with-ml",
    "https://github.com/rasbt/llms-from-scratch",
    "https://github.com/mlabonne/llm-course"
  ],
  "comparison": [
    {
      "key": "karpathy/nn-zero-to-hero",
      "use": "Following neural-network implementation lectures and notebooks.",
      "prerequisites": "The first lecture assumes basic Python and some calculus recollection.",
      "limitations": "Later examples build on earlier material and may need different compute resources.",
      "sources": [
        "https://github.com/karpathy/nn-zero-to-hero"
      ]
    },
    {
      "key": "d2l-ai/d2l-en",
      "use": "Connecting deep-learning explanations, mathematics, and code.",
      "prerequisites": "Check the chosen chapter and framework setup.",
      "limitations": "Select a consistent framework and environment rather than mixing setup from different examples.",
      "sources": [
        "https://github.com/d2l-ai/d2l-en"
      ]
    },
    {
      "key": "ageron/handson-ml3",
      "use": "Studying notebooks for the third-edition companion book.",
      "prerequisites": "Read the selected notebook and repository setup.",
      "limitations": "Confirm the book edition and software versions; repository code and a printed book are separate.",
      "sources": [
        "https://github.com/ageron/handson-ml3"
      ]
    },
    {
      "key": "gokumohandas/made-with-ml",
      "use": "Connecting ML with software engineering and application delivery.",
      "prerequisites": "Inspect the learning path and selected project setup.",
      "limitations": "Check dependencies and any infrastructure requirements before attempting the complete workflow.",
      "sources": [
        "https://github.com/gokumohandas/made-with-ml"
      ]
    },
    {
      "key": "rasbt/llms-from-scratch",
      "use": "Studying code that builds a GPT-like language model step by step.",
      "prerequisites": "Read the setup and chapter-specific guidance.",
      "limitations": "The repository is companion code for a book; larger experiments require a separate compute assessment.",
      "sources": [
        "https://github.com/rasbt/llms-from-scratch"
      ]
    },
    {
      "key": "mlabonne/llm-course",
      "use": "Choosing LLM learning paths and focused notebooks.",
      "prerequisites": "Review the fundamentals path if mathematics or Python is a gap.",
      "limitations": "Linked notebooks and services have separate dependencies, quotas, and possible costs.",
      "sources": [
        "https://github.com/mlabonne/llm-course"
      ]
    }
  ],
  "questions": [
    {
      "question": "Does a public ML repository include everything I need?",
      "answer": "Not necessarily. Check the chosen resource for book access, package versions, data or model downloads, and compute or provider requirements. Decide on one small experiment before paying for infrastructure.",
      "sources": []
    },
    {
      "question": "Should I start with the largest model example?",
      "answer": "Start with the smallest example that answers your question. Explain its inputs, outputs, and assumptions before increasing the dataset or model size.",
      "sources": []
    }
  ],
  "source_checked": "2026-11-02"
}
---

## Choose the kind of depth you need

For an implementation-led explanation of neural networks, inspect Neural Networks: Zero to Hero. Dive into Deep Learning combines an online book with code and mathematical explanations. Hands-On Machine Learning offers notebooks associated with a particular book edition, while Made With ML focuses on building and operating ML applications.

If your question is specifically about language models, compare LLMs from Scratch with LLM Course. One provides the companion implementation for a book; the other organizes learning paths, linked material, and notebooks.

## Inspect one working example before provisioning compute

Read prerequisites and dependency versions, then choose a small example you can explain. Identify whether a book, hosted notebook, GPU, model download, or API is involved. Public repository access does not make every companion publication or compute environment free.
