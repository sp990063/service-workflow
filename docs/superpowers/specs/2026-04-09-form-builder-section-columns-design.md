# Form Builder - Section + Column Layout Mode

## Overview

Add a Section-based layout system to the Form Builder, allowing users to group form elements into sections with configurable column layouts. This follows the "Section + Column" pattern popularized by Notion.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Section Creation | Users manually add sections via "+ Add Section" button |
| Section Properties | Title + Description + Column Count (1-4) |
| Section Display | Plain text header (bold title + optional description) |

---

## Data Model Changes

### FormSection Interface

```typescript
interface FormSection {
  id: string;
  title: string;           // Required: "Basic Information"
  description?: string;    // Optional: "Employee and department details"
  columns: 1 | 2 | 3 | 4;  // Default: 1
  order: number;           // For ordering sections
}
```

### FormElement Changes

Elements need to know which section they belong to:

```typescript
interface FormElement {
  id: string;
  type: string;
  label: string;
  // ... existing fields ...
  sectionId?: string;       // Which section this element belongs to
}
```

### Form Interface Changes

```typescript
interface Form {
  id: string;
  name: string;
  elements: FormElement[];
  sections?: FormSection[];  // New: sections array
  // ... existing fields ...
}
```

---

## UI Components

### 1. Section Header (Display)

**Visual:**
```
📋 Basic Information
Employee and department details
```

**Styling:**
- Title: Bold, 1rem font size
- Description: Muted color, 0.875rem font size
- Margin-bottom between sections: 1.5rem

### 2. Section Card (Container)

Each section wraps its elements:

```html
<div class="form-section" [attr.data-section-id]="section.id">
  <div class="section-header">
    <h3>{{ section.title }}</h3>
    @if (section.description) {
      <p>{{ section.description }}</p>
    }
  </div>
  <div class="section-body" [class]="'cols-' + section.columns">
    <!-- Elements go here -->
  </div>
</div>
```

### 3. Add Section Button

**Location:** Top of canvas, above all sections

**Styling:**
```
┌─────────────────────────────────────────┐
│ [+ Add Section]              [+ Save]  │
└─────────────────────────────────────────┘
```

### 4. Section Editor Panel

When a section is selected (clicked on header), show properties in the right panel:

```
┌─────────────────────────────┐
│ Section Properties         │
├─────────────────────────────┤
│ Title: [Basic Information] │
│ Description: [...]         │
│ Columns: [ 2 ] ▼          │
│                             │
│ [Delete Section]            │
└─────────────────────────────┘
```

### 5. Column Layout Grid

Elements inside a section are laid out in a CSS grid:

```css
.section-body.cols-1 { grid-template-columns: 1fr; }
.section-body.cols-2 { grid-template-columns: 1fr 1fr; }
.section-body.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.section-body.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
```

---

## User Interactions

### Adding a Section

1. User clicks "+ Add Section" button
2. New section appears at bottom of form with default title "New Section"
3. Section is auto-selected for editing
4. User edits title, description, and columns in properties panel

### Moving Elements Between Sections

1. User drags an element
2. Drop zones appear between sections
3. User drops element onto desired section
4. Element moves to that section

### Changing Section Column Count

1. User clicks on section header to select it
2. Properties panel shows column selector
3. User changes from 2 to 3 columns
4. Elements automatically reflow within the section

### Deleting a Section

1. User selects section
2. Clicks "Delete Section" in properties
3. Confirmation dialog: "Delete section and all its elements?"
4. If confirmed, section and elements are removed

---

## Rendering in Form Fill

When rendering the form for users to fill:

```html
@for (section of form.sections; track section.id) {
  <div class="form-section">
    <div class="section-header">
      <h3>{{ section.title }}</h3>
      @if (section.description) {
        <p>{{ section.description }}</p>
      }
    </div>
    <div class="section-body" [class]="'cols-' + section.columns">
      @for (element of getElementsInSection(section.id); track element.id) {
        <!-- Render form element -->
      }
    </div>
  </div>
}
```

---

## Implementation Order

1. **Phase 1: Data Model**
   - Add FormSection interface
   - Update Form interface to include sections
   - Update FormElement to include sectionId

2. **Phase 2: Basic Section CRUD**
   - Add section service methods (create, update, delete)
   - Add "+ Add Section" button
   - Add section header display in builder
   - Add section selection and properties panel

3. **Phase 3: Column Layout**
   - Implement CSS grid for columns
   - Add column count selector
   - Elements reflow when column count changes

4. **Phase 4: Element-Section Association**
   - Assign new elements to current section
   - Drag-drop elements between sections
   - Delete elements with their section

5. **Phase 5: Form Fill Rendering**
   - Render sections with column layout
   - Maintain proper element ordering

---

## Technical Notes

- Sections are optional for backward compatibility
- Existing forms without sections work as before (single "implicit" section)
- Elements without a sectionId are rendered in the default single-column layout
- Order of elements within a section is determined by the `order` property or array index
