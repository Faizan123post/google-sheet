import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Main App component
function App() {
  const [activeSheet, setActiveSheet] = useState(0);
  const [sheets, setSheets] = useState([
    {
      id: 0,
      name: 'Sheet1',
      data: initializeGrid(50, 26),
      selectedCell: { row: 0, col: 0 },
      selectedRange: null,
      columnWidths: Array(26).fill(100),
      rowHeights: Array(50).fill(25),
    },
  ]);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findValue, setFindValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [isResizingColumn, setIsResizingColumn] = useState(false);
  const [resizingColIndex, setResizingColIndex] = useState(null);
  const [startX, setStartX] = useState(null);
  const [isResizingRow, setIsResizingRow] = useState(false);
  const [resizingRowIndex, setResizingRowIndex] = useState(null);
  const [startY, setStartY] = useState(null);
  
  const gridRef = useRef(null);
  const activeSheetData = sheets[activeSheet];

  // Initialize grid with empty cells
  function initializeGrid(rows, cols) {
    const grid = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        row.push({
          value: '',
          formula: '',
          display: '',
          style: {
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontSize: '14px',
            color: '#000000',
            backgroundColor: '#ffffff',
          },
        });
      }
      grid.push(row);
    }
    return grid;
  }

  // Update cell value and recalculate dependencies
  const updateCell = (row, col, value, isFormula = false) => {
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    const newData = [...currentSheet.data];
    
    // If it's not a formula, update both value and display
    if (!isFormula) {
      newData[row][col] = {
        ...newData[row][col],
        value: value,
        display: value,
        formula: ''
      };
    } else {
      // Store the formula and calculate the result
      newData[row][col] = {
        ...newData[row][col],
        formula: value,
        value: evaluateFormula(value, newData),
        display: evaluateFormula(value, newData)
      };
    }
    
    // Recalculate cells that depend on this one
    recalculateDependentCells(newData);
    
    currentSheet.data = newData;
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
  };
  
  // Recalculate cells with formulas
  const recalculateDependentCells = (data) => {
    // For simplicity, we'll just recalculate all formulas
    // In a real app, you'd track dependencies and only update affected cells
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        if (data[i][j].formula) {
          data[i][j].value = evaluateFormula(data[i][j].formula, data);
          data[i][j].display = data[i][j].value;
        }
      }
    }
  };

  // Parse cell references (A1, B2, etc.) to row and column indices
  const parseCellReference = (ref) => {
    const colStr = ref.match(/[A-Z]+/)[0];
    const rowStr = ref.match(/\d+/)[0];
    
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    
    return { row: parseInt(rowStr) - 1, col: col - 1 };
  };

  // Parse range references (A1:B3, etc.)
  const parseRangeReference = (range) => {
    const [start, end] = range.split(':');
    return {
      start: parseCellReference(start),
      end: parseCellReference(end)
    };
  };

  // Get cell value from a reference
  const getCellValue = (ref, data) => {
    const { row, col } = parseCellReference(ref);
    // Check if the reference is valid
    if (row >= 0 && row < data.length && col >= 0 && col < data[0].length) {
      const cellValue = data[row][col].value;
      return cellValue === '' ? 0 : isNaN(cellValue) ? 0 : parseFloat(cellValue);
    }
    return 0;
  };

  // Get values from a range
  const getRangeValues = (range, data) => {
    const { start, end } = parseRangeReference(range);
    const values = [];
    
    for (let i = start.row; i <= end.row; i++) {
      for (let j = start.col; j <= end.col; j++) {
        if (i >= 0 && i < data.length && j >= 0 && j < data[0].length) {
          const cellValue = data[i][j].value;
          if (cellValue !== '' && !isNaN(cellValue)) {
            values.push(parseFloat(cellValue));
          }
        }
      }
    }
    
    return values;
  };

  // Evaluate a formula and return the result
  const evaluateFormula = (formula, data) => {
    if (!formula.startsWith('=')) return formula;
    
    try {
      // Remove the equals sign
      const expression = formula.substring(1).toUpperCase();
      
      // Handle SUM function
      if (expression.startsWith('SUM(') && expression.endsWith(')')) {
        const range = expression.substring(4, expression.length - 1);
        const values = getRangeValues(range, data);
        return values.reduce((sum, val) => sum + val, 0);
      }
      
      // Handle AVERAGE function
      if (expression.startsWith('AVERAGE(') && expression.endsWith(')')) {
        const range = expression.substring(8, expression.length - 1);
        const values = getRangeValues(range, data);
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      }
      
      // Handle MAX function
      if (expression.startsWith('MAX(') && expression.endsWith(')')) {
        const range = expression.substring(4, expression.length - 1);
        const values = getRangeValues(range, data);
        return values.length > 0 ? Math.max(...values) : 0;
      }
      
      // Handle MIN function
      if (expression.startsWith('MIN(') && expression.endsWith(')')) {
        const range = expression.substring(4, expression.length - 1);
        const values = getRangeValues(range, data);
        return values.length > 0 ? Math.min(...values) : 0;
      }
      
      // Handle COUNT function
      if (expression.startsWith('COUNT(') && expression.endsWith(')')) {
        const range = expression.substring(6, expression.length - 1);
        const values = getRangeValues(range, data);
        return values.length;
      }
      
      // Handle TRIM function
      if (expression.startsWith('TRIM(') && expression.endsWith(')')) {
        const cellRef = expression.substring(5, expression.length - 1);
        const { row, col } = parseCellReference(cellRef);
        return String(data[row][col].value).trim();
      }
      
      // Handle UPPER function
      if (expression.startsWith('UPPER(') && expression.endsWith(')')) {
        const cellRef = expression.substring(6, expression.length - 1);
        const { row, col } = parseCellReference(cellRef);
        return String(data[row][col].value).toUpperCase();
      }
      
      // Handle LOWER function
      if (expression.startsWith('LOWER(') && expression.endsWith(')')) {
        const cellRef = expression.substring(6, expression.length - 1);
        const { row, col } = parseCellReference(cellRef);
        return String(data[row][col].value).toLowerCase();
      }
      
      // Simple arithmetic expressions with cell references
      // Replace cell references with their values
      const cellRefPattern = /[A-Z]+\d+/g;
      let evalStr = expression.replace(cellRefPattern, (match) => {
        return getCellValue(match, data);
      });
      
      // Evaluate the resulting expression
      // eslint-disable-next-line no-eval
      return eval(evalStr);
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '#ERROR!';
    }
  };

  // Select a cell
  const selectCell = (row, col) => {
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    
    currentSheet.selectedCell = { row, col };
    currentSheet.selectedRange = null;
    
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
    
    // Update formula bar
    const cell = currentSheet.data[row][col];
    setFormulaBarValue(cell.formula || cell.value);
  };

  // Select a range of cells
  const selectRange = (startRow, startCol, endRow, endCol) => {
    // Ensure start is before end
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    
    currentSheet.selectedRange = {
      startRow: minRow,
      startCol: minCol,
      endRow: maxRow,
      endCol: maxCol
    };
    
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
  };

  // Handle mouse down on a cell
  const handleCellMouseDown = (e, row, col) => {
    selectCell(row, col);
    
    if (e.shiftKey) {
      // Extend selection from the current selected cell
      const { selectedCell } = activeSheetData;
      selectRange(selectedCell.row, selectedCell.col, row, col);
    } else {
      setIsDragging(true);
      setDragStart({ row, col });
      setDragEnd({ row, col });
    }
  };

  // Handle mouse move during drag
  const handleMouseMove = (e, row, col) => {
    if (isDragging) {
      setDragEnd({ row, col });
      selectRange(dragStart.row, dragStart.col, row, col);
    }
  };

  // Handle mouse up after drag
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Format selected cells
  const formatCells = (styleProperty, value) => {
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    const newData = [...currentSheet.data];
    
    if (currentSheet.selectedRange) {
      const { startRow, startCol, endRow, endCol } = currentSheet.selectedRange;
      
      for (let i = startRow; i <= endRow; i++) {
        for (let j = startCol; j <= endCol; j++) {
          newData[i][j] = {
            ...newData[i][j],
            style: {
              ...newData[i][j].style,
              [styleProperty]: value
            }
          };
        }
      }
    } else {
      const { row, col } = currentSheet.selectedCell;
      newData[row][col] = {
        ...newData[row][col],
        style: {
          ...newData[row][col].style,
          [styleProperty]: value
        }
      };
    }
    
    currentSheet.data = newData;
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
  };

  // Add a new row
  const addRow = () => {
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    const newData = [...currentSheet.data];
    
    const rowIndex = currentSheet.selectedCell.row + 1;
    const newRow = Array(currentSheet.data[0].length).fill().map(() => ({
      value: '',
      formula: '',
      display: '',
      style: {
        fontWeight: 'normal',
        fontStyle: 'normal',
        fontSize: '14px',
        color: '#000000',
        backgroundColor: '#ffffff',
      },
    }));
    
    newData.splice(rowIndex, 0, newRow);
    
    currentSheet.data = newData;
    currentSheet.rowHeights = [...currentSheet.rowHeights.slice(0, rowIndex), 25, ...currentSheet.rowHeights.slice(rowIndex)];
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
    
    // Update selected cell to be in the new row
    selectCell(rowIndex, currentSheet.selectedCell.col);
  };

  // Delete a row
  const deleteRow = () => {
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    const newData = [...currentSheet.data];
    
    const rowIndex = currentSheet.selectedCell.row;
    newData.splice(rowIndex, 1);
    
    // Add a new row at the end to maintain grid size
    const newRow = Array(currentSheet.data[0].length).fill().map(() => ({
      value: '',
      formula: '',
      display: '',
      style: {
        fontWeight: 'normal',
        fontStyle: 'normal',
        fontSize: '14px',
        color: '#000000',
        backgroundColor: '#ffffff',
      },
    }));
    
    newData.push(newRow);
    
    currentSheet.data = newData;
    currentSheet.rowHeights = [...currentSheet.rowHeights.slice(0, rowIndex), ...currentSheet.rowHeights.slice(rowIndex + 1), 25];
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
    
    // Update selected cell
    selectCell(rowIndex, currentSheet.selectedCell.col);
  };

  // Add a new column
  const addColumn = () => {
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    const newData = [...currentSheet.data];
    
    const colIndex = currentSheet.selectedCell.col + 1;
    
    for (let i = 0; i < newData.length; i++) {
      newData[i].splice(colIndex, 0, {
        value: '',
        formula: '',
        display: '',
        style: {
          fontWeight: 'normal',
          fontStyle: 'normal',
          fontSize: '14px',
          color: '#000000',
          backgroundColor: '#ffffff',
        },
      });
    }
    
    currentSheet.data = newData;
    currentSheet.columnWidths = [...currentSheet.columnWidths.slice(0, colIndex), 100, ...currentSheet.columnWidths.slice(colIndex)];
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
    
    // Update selected cell to be in the new column
    selectCell(currentSheet.selectedCell.row, colIndex);
  };

  // Delete a column
  const deleteColumn = () => {
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    const newData = [...currentSheet.data];
    
    const colIndex = currentSheet.selectedCell.col;
    
    for (let i = 0; i < newData.length; i++) {
      newData[i].splice(colIndex, 1);
      
      // Add a new column at the end to maintain grid size
      newData[i].push({
        value: '',
        formula: '',
        display: '',
        style: {
          fontWeight: 'normal',
          fontStyle: 'normal',
          fontSize: '14px',
          color: '#000000',
          backgroundColor: '#ffffff',
        },
      });
    }
    
    currentSheet.data = newData;
    currentSheet.columnWidths = [...currentSheet.columnWidths.slice(0, colIndex), ...currentSheet.columnWidths.slice(colIndex + 1), 100];
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
    
    // Update selected cell
    selectCell(currentSheet.selectedCell.row, colIndex);
  };

  // Handle column resize
  const handleColumnResizeStart = (e, colIndex) => {
    e.preventDefault();
    setIsResizingColumn(true);
    setResizingColIndex(colIndex);
    setStartX(e.clientX);
  };

  const handleColumnResize = (e) => {
    if (isResizingColumn && resizingColIndex !== null) {
      const deltaX = e.clientX - startX;
      const newSheets = [...sheets];
      const currentSheet = { ...newSheets[activeSheet] };
      const newColumnWidths = [...currentSheet.columnWidths];
      
      newColumnWidths[resizingColIndex] = Math.max(50, currentSheet.columnWidths[resizingColIndex] + deltaX);
      
      currentSheet.columnWidths = newColumnWidths;
      newSheets[activeSheet] = currentSheet;
      setSheets(newSheets);
      
      setStartX(e.clientX);
    }
  };

  const handleColumnResizeEnd = () => {
    setIsResizingColumn(false);
    setResizingColIndex(null);
    setStartX(null);
  };

  // Handle row resize
  const handleRowResizeStart = (e, rowIndex) => {
    e.preventDefault();
    setIsResizingRow(true);
    setResizingRowIndex(rowIndex);
    setStartY(e.clientY);
  };

  const handleRowResize = (e) => {
    if (isResizingRow && resizingRowIndex !== null) {
      const deltaY = e.clientY - startY;
      const newSheets = [...sheets];
      const currentSheet = { ...newSheets[activeSheet] };
      const newRowHeights = [...currentSheet.rowHeights];
      
      newRowHeights[resizingRowIndex] = Math.max(20, currentSheet.rowHeights[resizingRowIndex] + deltaY);
      
      currentSheet.rowHeights = newRowHeights;
      newSheets[activeSheet] = currentSheet;
      setSheets(newSheets);
      
      setStartY(e.clientY);
    }
  };

  const handleRowResizeEnd = () => {
    setIsResizingRow(false);
    setResizingRowIndex(null);
    setStartY(null);
  };

  // Copy selected cells
  const copySelection = () => {
    const { data, selectedCell, selectedRange } = activeSheetData;
    
    if (selectedRange) {
      const { startRow, startCol, endRow, endCol } = selectedRange;
      const copyData = [];
      
      for (let i = startRow; i <= endRow; i++) {
        const row = [];
        for (let j = startCol; j <= endCol; j++) {
          row.push({...data[i][j]});
        }
        copyData.push(row);
      }
      
      setClipboard({
        data: copyData,
        rows: endRow - startRow + 1,
        cols: endCol - startCol + 1
      });
    } else {
      const { row, col } = selectedCell;
      setClipboard({
        data: [[{...data[row][col]}]],
        rows: 1,
        cols: 1
      });
    }
  };

  // Paste copied cells
  const pasteSelection = () => {
    if (!clipboard) return;
    
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    const newData = [...currentSheet.data];
    const { row, col } = currentSheet.selectedCell;
    
    for (let i = 0; i < clipboard.rows; i++) {
      for (let j = 0; j < clipboard.cols; j++) {
        const targetRow = row + i;
        const targetCol = col + j;
        
        if (targetRow < newData.length && targetCol < newData[0].length) {
          newData[targetRow][targetCol] = {...clipboard.data[i][j]};
        }
      }
    }
    
    // Recalculate dependencies
    recalculateDependentCells(newData);
    
    currentSheet.data = newData;
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
  };

  // Find and replace
  const findAndReplace = () => {
    if (!findValue) return;
    
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    const newData = [...currentSheet.data];
    
    let range;
    if (currentSheet.selectedRange) {
      range = currentSheet.selectedRange;
    } else {
      range = {
        startRow: 0,
        startCol: 0,
        endRow: newData.length - 1,
        endCol: newData[0].length - 1
      };
    }
    
    for (let i = range.startRow; i <= range.endRow; i++) {
      for (let j = range.startCol; j <= range.endCol; j++) {
        const cell = newData[i][j];
        if (cell.value.toString().includes(findValue)) {
          const newValue = cell.value.toString().replaceAll(findValue, replaceValue);
          newData[i][j] = {
            ...cell,
            value: newValue,
            display: newValue,
            formula: cell.formula ? cell.formula.replaceAll(findValue, replaceValue) : ''
          };
        }
      }
    }
    
    // Recalculate dependencies
    recalculateDependentCells(newData);
    
    currentSheet.data = newData;
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
  };

  // Remove duplicates in selection
  const removeDuplicates = () => {
    const { selectedRange } = activeSheetData;
    if (!selectedRange) return;
    
    const { startRow, startCol, endRow, endCol } = selectedRange;
    
    const newSheets = [...sheets];
    const currentSheet = { ...newSheets[activeSheet] };
    const newData = [...currentSheet.data];
    
    // Get all rows in the selection
    const rows = [];
    for (let i = startRow; i <= endRow; i++) {
      const row = [];
      for (let j = startCol; j <= endCol; j++) {
        row.push(newData[i][j].value);
      }
      rows.push({ index: i, values: row });
    }
    
    // Find duplicate rows
    const uniqueRows = new Map();
    const duplicateIndices = new Set();
    
    rows.forEach(row => {
      const key = JSON.stringify(row.values);
      if (uniqueRows.has(key)) {
        duplicateIndices.add(row.index);
      } else {
        uniqueRows.set(key, row.index);
      }
    });
    
    // Clear duplicate rows
    duplicateIndices.forEach(rowIndex => {
      for (let j = startCol; j <= endCol; j++) {
        newData[rowIndex][j] = {
          ...newData[rowIndex][j],
          value: '',
          display: '',
          formula: ''
        };
      }
    });
    
    // Recalculate dependencies
    recalculateDependentCells(newData);
    
    currentSheet.data = newData;
    newSheets[activeSheet] = currentSheet;
    setSheets(newSheets);
  };

  // Add a new sheet
  const addSheet = () => {
    const newSheets = [...sheets];
    const newSheetId = Math.max(...newSheets.map(s => s.id)) + 1;
    
    newSheets.push({
      id: newSheetId,
      name: `Sheet${newSheets.length + 1}`,
      data: initializeGrid(50, 26),
      selectedCell: { row: 0, col: 0 },
      selectedRange: null,
      columnWidths: Array(26).fill(100),
      rowHeights: Array(50).fill(25),
    });
    
    setSheets(newSheets);
    setActiveSheet(newSheets.length - 1);
  };

  // Delete the current sheet
  const deleteSheet = () => {
    if (sheets.length <= 1) return;
    
    const newSheets = sheets.filter((_, index) => index !== activeSheet);
    setSheets(newSheets);
    setActiveSheet(Math.min(activeSheet, newSheets.length - 1));
  };

  // Rename the current sheet
  const renameSheet = (newName) => {
    const newSheets = [...sheets];
    newSheets[activeSheet] = {
      ...newSheets[activeSheet],
      name: newName
    };
    setSheets(newSheets);
  };

  // Get column letter from index
  const getColumnLetter = (colIndex) => {
    let letter = '';
    let temp = colIndex + 1;
    
    while (temp > 0) {
      const remainder = (temp - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      temp = Math.floor((temp - 1) / 26);
    }
    
    return letter;
  };

  // Save spreadsheet to localStorage
  const saveSpreadsheet = () => {
    localStorage.setItem('spreadsheetData', JSON.stringify(sheets));
    alert('Spreadsheet saved!');
  };

  // Load spreadsheet from localStorage
  const loadSpreadsheet = () => {
    const savedData = localStorage.getItem('spreadsheetData');
    if (savedData) {
      setSheets(JSON.parse(savedData));
      setActiveSheet(0);
      alert('Spreadsheet loaded!');
    } else {
      alert('No saved spreadsheet found!');
    }
  };

  // Set up event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') {
          copySelection();
        } else if (e.key === 'v') {
          pasteSelection();
        } else if (e.key === 'b') {
          formatCells('fontWeight', activeSheetData.data[activeSheetData.selectedCell.row][activeSheetData.selectedCell.col].style.fontWeight === 'bold' ? 'normal' : 'bold');
        } else if (e.key === 'i') {
          formatCells('fontStyle', activeSheetData.data[activeSheetData.selectedCell.row][activeSheetData.selectedCell.col].style.fontStyle === 'italic' ? 'normal' : 'italic');
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleColumnResize);
    document.addEventListener('mousemove', handleRowResize);
    document.addEventListener('mouseup', handleColumnResizeEnd);
    document.addEventListener('mouseup', handleRowResizeEnd);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleColumnResize);
      document.removeEventListener('mousemove', handleRowResize);
      document.removeEventListener('mouseup', handleColumnResizeEnd);
      document.removeEventListener('mouseup', handleRowResizeEnd);
    };
  });

  return (
    <div className="app">
      <div className="toolbar">
        <div className="toolbar-section">
          <button className="toolbar-button" onClick={() => saveSpreadsheet()}>
            <i className="fas fa-save"></i>
          </button>
          <button className="toolbar-button" onClick={() => loadSpreadsheet()}>
            <i className="fas fa-folder-open"></i>
          </button>
        </div>
        <div className="toolbar-section">
          <button className="toolbar-button" onClick={() => formatCells('fontWeight', activeSheetData.data[activeSheetData.selectedCell.row][activeSheetData.selectedCell.col].style.fontWeight === 'bold' ? 'normal' : 'bold')}>
            <i className="fas fa-bold"></i>
          </button>
          <button className="toolbar-button" onClick={() => formatCells('fontStyle', activeSheetData.data[activeSheetData.selectedCell.row][activeSheetData.selectedCell.col].style.fontStyle === 'italic' ? 'normal' : 'italic')}>
            <i className="fas fa-italic"></i>
          </button>
        </div>
        <div className="toolbar-section">
          <button className="toolbar-button" onClick={() => addRow()}>
            <i className="fas fa-plus-circle"></i> Row
          </button>
          <button className="toolbar-button" onClick={() => deleteRow()}>
            <i className="fas fa-minus-circle"></i> Row
          </button>
          <button className="toolbar-button" onClick={() => addColumn()}>
            <i className="fas fa-plus-circle"></i> Column
          </button>
          <button className="toolbar-button" onClick={() => deleteColumn()}>
            <i className="fas fa-minus-circle"></i> Column
          </button>
        </div>
        <div className="toolbar-section">
          <button className="toolbar-button" onClick={() => setFindReplaceOpen(true)}>
            <i className="fas fa-search"></i> Find & Replace
          </button>
          <button className="toolbar-button" onClick={() => removeDuplicates()}>
            <i className="fas fa-clone"></i> Remove Duplicates
          </button>
          </div>
      
      <div className="formula-bar">
        <div className="cell-address">
          {activeSheetData.selectedCell ? `${getColumnLetter(activeSheetData.selectedCell.col)}${activeSheetData.selectedCell.row + 1}` : ''}
        </div>
        <div className="formula-input-container">
          <span className="formula-fx">fx</span>
          <input
            type="text"
            className="formula-input"
            value={formulaBarValue}
            onChange={(e) => setFormulaBarValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const { row, col } = activeSheetData.selectedCell;
                const isFormula = formulaBarValue.startsWith('=');
                updateCell(row, col, formulaBarValue, isFormula);
              }
            }}
          />
        </div>
      </div>
      
      
      
      <div className="sheets-tab-bar">
        {sheets.map((sheet, index) => (
          <div
            key={sheet.id}
            className={`sheet-tab ${index === activeSheet ? 'active' : ''}`}
            onClick={() => setActiveSheet(index)}
            onDoubleClick={() => {
              const newName = prompt('Enter new sheet name:', sheet.name);
              if (newName) {
                renameSheet(newName);
              }
            }}
          >
            {sheet.name}
          </div>
        ))}
        <div className="sheet-tab add-sheet" onClick={() => addSheet()}>
          <i className="fas fa-plus"></i>
        </div>
        <div className="sheet-tab delete-sheet" onClick={() => deleteSheet()}>
          <i className="fas fa-trash-alt"></i>
        </div>
      </div>
      
      {findReplaceOpen && (
        <div className="find-replace-dialog">
          <div className="find-replace-header">
            <h3>Find & Replace</h3>
            <button className="close-button" onClick={() => setFindReplaceOpen(false)}>×</button>
          </div>
          <div className="find-replace-body">
            <div className="find-replace-row">
              <label>Find:</label>
              <input
                type="text"
                value={findValue}
                onChange={(e) => setFindValue(e.target.value)}
              />
            </div>
            <div className="find-replace-row">
              <label>Replace with:</label>
              <input
                type="text"
                value={replaceValue}
                onChange={(e) => setReplaceValue(e.target.value)}
              />
            </div>
            <div className="find-replace-actions">
              <button onClick={() => findAndReplace()}>Replace All</button>
              <button onClick={() => setFindReplaceOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
        
      )}
    </div>
    <div 
        className="grid-container"
        ref={gridRef}
        onMouseMove={(e) => {
          if (isResizingColumn) {
            handleColumnResize(e);
          }
          if (isResizingRow) {
            handleRowResize(e);
          }
        }}
      >
        <div className="corner-header"></div>
        
        {/* Column headers */}
        <div className="column-headers">
          {activeSheetData.data[0].map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="column-header"
              style={{ width: `${activeSheetData.columnWidths[colIndex]}px` }}
            >
              {getColumnLetter(colIndex)}
              <div 
                className="column-resize-handle"
                onMouseDown={(e) => handleColumnResizeStart(e, colIndex)}
              ></div>
            </div>
          ))}
        </div>
        
        {/* Row headers and cells */}
        <div className="grid-rows">
          {activeSheetData.data.map((row, rowIndex) => (
            <div key={rowIndex} className="grid-row">
              <div 
                className="row-header"
                style={{ height: `${activeSheetData.rowHeights[rowIndex]}px` }}
              >
                {rowIndex + 1}
                <div 
                  className="row-resize-handle"
                  onMouseDown={(e) => handleRowResizeStart(e, rowIndex)}
                ></div>
              </div>
              {row.map((cell, colIndex) => {
                const isSelected = 
                  activeSheetData.selectedCell.row === rowIndex && 
                  activeSheetData.selectedCell.col === colIndex;
                
                let isInRange = false;
                if (activeSheetData.selectedRange) {
                  const { startRow, startCol, endRow, endCol } = activeSheetData.selectedRange;
                  isInRange = 
                    rowIndex >= startRow && 
                    rowIndex <= endRow && 
                    colIndex >= startCol && 
                    colIndex <= endCol;
                }
                
                return (
                  <div
                    key={colIndex}
                    className={`grid-cell ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''}`}
                    style={{
                      width: `${activeSheetData.columnWidths[colIndex]}px`,
                      height: `${activeSheetData.rowHeights[rowIndex]}px`,
                      fontWeight: cell.style.fontWeight,
                      fontStyle: cell.style.fontStyle,
                      fontSize: cell.style.fontSize,
                      color: cell.style.color,
                      backgroundColor: isSelected || isInRange ? '' : cell.style.backgroundColor,
                    }}
                    onMouseDown={(e) => handleCellMouseDown(e, rowIndex, colIndex)}
                    onMouseMove={(e) => handleMouseMove(e, rowIndex, colIndex)}
                    onDoubleClick={(e) => {
                      const input = document.createElement('input');
                      input.type = 'text';
                      input.className = 'cell-editor';
                      input.value = cell.formula || cell.value;
                      
                      const cellElement = e.currentTarget;
                      cellElement.innerHTML = '';
                      cellElement.appendChild(input);
                      
                      input.focus();
                      
                      let isEnterKeyHandled = false;

                      input.onblur = () => {
                        // Skip blur handling if Enter key was just pressed
                        if (isEnterKeyHandled) {
                          isEnterKeyHandled = false;
                          return;
                        }
                        
                        if (input.parentNode === cellElement) {
                          cellElement.removeChild(input);
                          cellElement.textContent = cell.display;
                        }
                      };
                      
                      input.onkeydown = (e) => {
                        if (e.key === 'Enter') {
                          isEnterKeyHandled = true;
                          const isFormula = input.value.startsWith('=');
                          updateCell(rowIndex, colIndex, input.value, isFormula);
                          
                          if (input.parentNode === cellElement) {
                            cellElement.removeChild(input);
                            cellElement.textContent = activeSheetData.data[rowIndex][colIndex].display;
                          }
                        }
                      };
                    }}
                  >
                    {cell.display}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default App;