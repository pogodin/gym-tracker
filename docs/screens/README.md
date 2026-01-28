# Screen Documentation

This directory contains UI/UX documentation for each screen in the gym-tracker app.

## Screens

| Screen | Route | Status |
|--------|-------|--------|
| [Workout Session](./workout-page.md) | `/workout/:templateId` | Documented |
| Home Page | `/` | TODO |
| Template Editor | `/template/:id` | TODO |
| History | `/history` | TODO |
| Session History | `/history/:sessionId` | TODO |
| Settings | `/settings` | TODO |

## How to Use

### Creating New Documentation
1. Copy `_TEMPLATE.md` to a new file named after the screen (e.g., `home-page.md`)
2. Fill in each section based on the actual implementation
3. Update this README's table

### Template Sections
- **Overview** - Purpose and when users see the screen
- **Route** - URL pattern
- **Layout** - ASCII diagram of visual structure
- **Components** - Table of UI elements
- **User Actions** - Detailed interaction specifications
- **Inputs** - Form fields and validation
- **State** - Data flow and state management
- **Navigation** - Entry and exit points
- **Edge Cases** - Empty, loading, error states
- **Related Screens** - Links to connected screens

### Conventions
- Use ASCII diagrams for layouts (works in terminal and renders in GitHub)
- Document every interactive element
- Include confirmation dialogs in action specs
- Note auto-populated or computed values
