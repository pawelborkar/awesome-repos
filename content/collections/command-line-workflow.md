---
{
  "title": "Command-line developer tools by workflow",
  "description": "Compare terminal tools for text search, finding files, reading output, directory navigation, Git, and command examples. Start with one repeated task.",
  "reviewed": true,
  "updated": "2026-11-02",
  "journey": "tools",
  "resources": [
    "burntsushi/ripgrep",
    "sharkdp/bat",
    "sharkdp/fd",
    "ajeetdsouza/zoxide",
    "jesseduffield/lazygit",
    "tldr-pages/tldr"
  ],
  "selection": "The collection groups existing command-line entries by everyday developer tasks. These tools have distinct purposes, so compare them with your current workflow instead of treating the list as a required installation bundle.",
  "sources": [
    "https://github.com/burntsushi/ripgrep",
    "https://github.com/sharkdp/bat",
    "https://github.com/sharkdp/fd",
    "https://github.com/ajeetdsouza/zoxide",
    "https://github.com/jesseduffield/lazygit",
    "https://github.com/tldr-pages/tldr"
  ],
  "comparison": [
    {
      "key": "burntsushi/ripgrep",
      "use": "Searching text inside files.",
      "prerequisites": "Choose a supported installation method for your environment.",
      "limitations": "Default ignore and hidden-file behavior affects which files are searched; read the options.",
      "sources": [
        "https://github.com/burntsushi/ripgrep"
      ]
    },
    {
      "key": "sharkdp/fd",
      "use": "Finding entries in a filesystem.",
      "prerequisites": "Check your operating system’s package and executable naming.",
      "limitations": "A file-name search and a file-content search answer different questions.",
      "sources": [
        "https://github.com/sharkdp/fd"
      ]
    },
    {
      "key": "sharkdp/bat",
      "use": "Reading file output with syntax highlighting and Git context.",
      "prerequisites": "Use the project’s installation and terminal guidance.",
      "limitations": "Check output and paging behavior before using it in an existing command pipeline.",
      "sources": [
        "https://github.com/sharkdp/bat"
      ]
    },
    {
      "key": "ajeetdsouza/zoxide",
      "use": "Revisiting directories through shell integration.",
      "prerequisites": "Follow the initialization instructions for your shell.",
      "limitations": "Shell configuration changes deserve a small test before adding them to your daily environment.",
      "sources": [
        "https://github.com/ajeetdsouza/zoxide"
      ]
    },
    {
      "key": "jesseduffield/lazygit",
      "use": "Working with Git through a terminal interface.",
      "prerequisites": "Understand the Git operation you want to perform.",
      "limitations": "A different interface does not remove the need to inspect changes before applying an operation.",
      "sources": [
        "https://github.com/jesseduffield/lazygit"
      ]
    },
    {
      "key": "tldr-pages/tldr",
      "use": "Looking up concise command examples.",
      "prerequisites": "Choose a client or supported reading interface.",
      "limitations": "Examples supplement command documentation; check options and paths before running them.",
      "sources": [
        "https://github.com/tldr-pages/tldr"
      ]
    }
  ],
  "questions": [
    {
      "question": "Do I need every tool in this collection?",
      "answer": "No. Start with a repeated task, compare one tool with your current approach, and keep it only if you can explain how it helps. Avoid changing several parts of your shell setup at once.",
      "sources": []
    },
    {
      "question": "Are these installation steps the same on every platform?",
      "answer": "Use the current project instructions for your operating system and shell. Package names, terminal behavior, and integration steps can differ.",
      "sources": []
    }
  ],
  "source_checked": "2026-11-02"
}
---

## Improve one repeated task

Choose by the job that slows you down. ripgrep searches file contents; fd finds filesystem entries. bat helps inspect file output, zoxide helps revisit directories, lazygit provides a terminal interface for Git, and tldr pages supplies command examples.

These are different responsibilities. You do not need to install the whole list to benefit from one tool.

## Try the tool before changing your shell

Use a small working directory or a disposable Git repository to test the command. Read its defaults and inspect the result before creating aliases, changing shell startup files, or applying commands to important work. Installation packages, executable names, and supported shells can differ by environment; use each project’s current instructions.
