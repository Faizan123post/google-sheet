# Google Sheets Clone

A web application that closely mimics the user interface and core functionalities of Google Sheets, built with React.js.

## Features

1. **Spreadsheet Interface**
   - Google Sheets-like UI with toolbar, formula bar, and cell structure
   - Drag functionality for cell selections
   - Cell dependencies with formula recalculation
   - Cell formatting (bold, italic)
   - Adding, deleting, and resizing rows and columns

2. **Mathematical Functions**
   - SUM: Calculates the sum of a range of cells
   - AVERAGE: Calculates the average of a range of cells
   - MAX: Returns the maximum value from a range of cells
   - MIN: Returns the minimum value from a range of cells
   - COUNT: Counts the number of cells containing numerical values in a range

3. **Data Quality Functions**
   - TRIM: Removes leading and trailing whitespace from a cell
   - UPPER: Converts the text in a cell to uppercase
   - LOWER: Converts the text in a cell to lowercase
   - REMOVE_DUPLICATES: Removes duplicate rows from a selected range
   - FIND_AND_REPLACE: Allows users to find and replace specific text within a range of cells

4. **Data Entry and Validation**
   - Input of various data types (numbers, text)
   - Cell editing via double-click or formula bar

5. **Additional Features**
   - Multiple sheets support
   - Copy and paste functionality
   - Save and load spreadsheets to/from localStorage
   - Keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+B, Ctrl+I)

## Data Structures and Tech Stack

### Tech Stack
- **React.js**: Used for building the user interface with a component-based architecture
- **JavaScript (ES6+)**: Core programming language
- **CSS3**: For styling the application to mimic Google Sheets' appearance
- **HTML5**: Structure of the application
- **LocalStorage API**: For saving and loading spreadsheets

### Data Structures

#### Spreadsheet Data Model
The application uses a nested array structure to represent the spreadsheet:

```javascript
sheets = [
  {
    id: Number,
    name: String,
    data: [
      [
        {
          value: Any,  // The actual value
          formula: String,  // The formula if present
          display: String,  // What is shown to the user
          style: {  // Cell styling
            fontWeight: String,
            fontStyle: String,
            fontSize: String,
            color: String,
            backgroundColor: String,
          }
        },
        // More cells in the row
      ],
      // More rows
    ],
    selectedCell: { row: Number, col: Number },
    selectedRange: { startRow: Number, startCol: Number, endRow: Number, endCol: Number } | null,
    columnWidths: [Number, Number, ...],
    rowHeights: [Number, Number, ...],
  },
  // More sheets
]
```

This structure was chosen for several reasons:
1. **Direct indexing**: Accessing cells by row and column indices is O(1)
2. **Mutable structure**: Allows for efficient updates to specific cells
3. **Separation of concerns**: Keeps formula, display value, and styling separate
4. **Intuitive representation**: Mimics the 2D structure of a spreadsheet

#### Formula Evaluation
For formula evaluation, the application uses a custom parser that:
1. Identifies function calls (SUM, AVERAGE, etc.)
2. Parses cell references (A1, B2) and range references (A1:B3)
3. Evaluates the formula based on the referenced cell values

This approach allows for efficient formula calculation without requiring a full expression parser.

## How to Run

1. Clone the repository
```
git clone https://github.com/yourusername/google-sheets-clone.git
cd google-sheets-clone
```

2. Install dependencies
```
npm install
```

3. Start the development server
```
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

- Double-click a cell to edit its contents,After hit Enter to save the content in the cell otherwise it will disappear.
- Use the formula bar to enter formulas (start with =)
- Use mathematical functions like =SUM(A1:A5)
- Use data quality functions like =TRIM(B3)
- Select multiple cells by dragging or Shift+click
- Format cells using the toolbar buttons or keyboard shortcuts
- Add/delete rows and columns using the toolbar buttons
- Use the Find & Replace feature from the toolbar
- Save your work using the save button, and load it later
