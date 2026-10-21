---
{
  "title": "React tools for common application needs",
  "description": "Compare React routing, server state, client state, forms, and UI components by the job each tool performs.",
  "reviewed": true,
  "updated": "2026-10-20",
  "journey": "tools",
  "resources": [
    "remix-run/react-router",
    "tanstack/query",
    "pmndrs/zustand",
    "reduxjs/redux-toolkit",
    "react-hook-form/react-hook-form",
    "shadcn-ui/ui"
  ],
  "selection": "The selected catalog entries address distinct, common React application responsibilities. Selection does not imply that every tool is needed together or that all versions are mutually compatible."
}
---

## Start with a specific application problem

Routing, server-data fetching, local application state, and forms are different concerns. React Router addresses navigation, TanStack Query focuses on asynchronous state and data fetching, and Zustand and Redux Toolkit provide approaches to state management. React Hook Form targets forms.

## Add one dependency with a clear purpose

shadcn/ui offers components that you can copy into an application. Check the current documentation for setup, styling, and framework compatibility. This collection is a map of responsibilities, not a ready-made stack: avoid adding every tool simply because it appears here, and test the smallest integration that solves your problem.
