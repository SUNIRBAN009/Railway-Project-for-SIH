# 02-ui-ux-design-system.md

> **File Order:** 42/45  
> **Previous File:** `08-standards/01-git-workflow.md`  
> **Next File:** `09-project-tracker/00-master-checklist.md`  

---

## Design System & Theme

To ensure the app looks professional and modern without writing hundreds of lines of custom CSS, we use **Material UI (MUI) v5** with a predefined theme.

### 1. Color Palette

The colors map to the operational states of the railway system.

| Color | Hex | Usage |
|-------|-----|-------|
| **Primary (Blue)** | `#1976d2` | General UI borders, submit buttons, headers. |
| **Success (Green)**| `#2e7d32` | 'Approved' status, safe indicators. |
| **Warning (Yellow)**| `#ed6c02` | 'Pending' blocks, active maintenance zones on map. |
| **Error (Red)** | `#d32f2f` | 'Rejected', AI Conflicts, EMERGENCY state. |
| **Dark (Grey)** | `#121212` | Main background for the Dark Mode theme (preferred for dashboards). |

### 2. Typography

- **Font Family:** `Roboto`, fallback to `Helvetica, Arial, sans-serif` (MUI default).
- Use `Variant="h4"` for Dashboard titles.
- Use `Variant="body2"` for data tables to maximize screen real estate.

### 3. Component Standards

1. **Tables:** Use `MUI DataGrid` for all tables (Pending Blocks). It provides built-in pagination and sorting without extra code.
2. **Forms:** Use `MUI TextField` and `Select` components. Wrap them in a `Grid` container for responsive layouts.
3. **Alerts (Toasts):** Use `MUI Snackbar` combined with `MUI Alert` for success/error messages after form submissions.
4. **Modals:** Use `MUI Dialog` for the AI Resolution view and the Emergency confirmation.

### 4. Implementation Example (MUI Theme)

```javascript
// src/theme.js
import { createTheme } from '@mui/material/styles';

export const railwayTheme = createTheme({
  palette: {
    mode: 'dark', // Dark mode looks more "control room" like
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#ed6c02',
    },
    error: {
      main: '#d32f2f',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  }
});
```
