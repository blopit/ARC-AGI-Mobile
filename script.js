// Constants and state management
const COLORS = {
    0: '#000000', // black
    1: '#0000ff', // blue
    2: '#ff0000', // red
    3: '#00ff00', // green
    4: '#ffff00', // yellow
    5: '#808080', // grey
    6: '#ff69b4', // pink
    7: '#ffa500', // orange
    8: '#00ffff', // cyan
    9: '#a52a2a'  // brown
};

let currentState = {
    currentPuzzle: null,
    currentExample: 0,
    selectedColor: 0,
    isDragging: false
};

// DOM Elements
const elements = {
    tabs: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    puzzleId: document.getElementById('puzzleId'),
    prevPuzzle: document.getElementById('prevPuzzle'),
    nextPuzzle: document.getElementById('nextPuzzle'),
    prevExample: document.getElementById('prevExample'),
    nextExample: document.getElementById('nextExample'),
    exampleNumber: document.getElementById('exampleNumber'),
    exampleInput: document.getElementById('exampleInput'),
    exampleOutput: document.getElementById('exampleOutput'),
    testInput: document.getElementById('testInput'),
    testOutput: document.getElementById('testOutput'),
    colorPalette: document.querySelector('.color-palette'),
    copyInput: document.getElementById('copyInput'),
    clearGrid: document.getElementById('clearGrid'),
    submit: document.getElementById('submit')
};

// Tab switching
elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        elements.tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Grid creation functions
function createGrid(container, rows, cols) {
    container.innerHTML = '';
    
    for (let i = 0; i < rows; i++) {
        const row = document.createElement('div');
        row.className = 'grid-row';
        
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            row.appendChild(cell);
        }
        
        container.appendChild(row);
    }
}

function updateGrid(grid, data) {
    data.forEach((row, i) => {
        row.forEach((value, j) => {
            const cell = grid.children[i].children[j];
            cell.style.backgroundColor = COLORS[value] || COLORS[0];
            cell.dataset.value = value || 0;
        });
    });
}

// Color palette setup
function setupColorPalette() {
    Object.entries(COLORS).forEach(([value, color]) => {
        const button = document.createElement('button');
        button.className = 'color-btn';
        button.style.backgroundColor = color;
        button.dataset.value = value;
        if (value === '0') button.classList.add('active');
        button.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentState.selectedColor = parseInt(value);
        });
        elements.colorPalette.appendChild(button);
    });
}

// Drawing functionality
function setupDrawing() {
    const testOutput = elements.testOutput;
    
    function handleCellInteraction(cell) {
        cell.style.backgroundColor = COLORS[currentState.selectedColor];
        cell.dataset.value = currentState.selectedColor;
    }

    testOutput.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('grid-cell')) {
            currentState.isDragging = true;
            handleCellInteraction(e.target);
        }
    });

    testOutput.addEventListener('mousemove', (e) => {
        if (currentState.isDragging && e.target.classList.contains('grid-cell')) {
            handleCellInteraction(e.target);
        }
    });

    testOutput.addEventListener('mouseup', () => {
        currentState.isDragging = false;
    });

    testOutput.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const cell = document.elementFromPoint(touch.clientX, touch.clientY);
        if (cell?.classList.contains('grid-cell')) {
            currentState.isDragging = true;
            handleCellInteraction(cell);
        }
    }, { passive: false });

    testOutput.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (currentState.isDragging) {
            const touch = e.touches[0];
            const cell = document.elementFromPoint(touch.clientX, touch.clientY);
            if (cell?.classList.contains('grid-cell')) {
                handleCellInteraction(cell);
            }
        }
    }, { passive: false });

    testOutput.addEventListener('touchend', () => {
        currentState.isDragging = false;
    });
}

// Puzzle loading and navigation
async function loadPuzzle(puzzleId) {
    try {
        const response = await fetch(`data/${puzzleId}.json`);
        const puzzle = await response.json();
        currentState.currentPuzzle = puzzle;
        
        // Update puzzle ID display
        elements.puzzleId.textContent = `Puzzle ID: ${puzzleId}`;
        
        // Setup example grids
        const firstExample = puzzle.train[0];
        createGrid(elements.exampleInput, firstExample.input.length, firstExample.input[0].length);
        createGrid(elements.exampleOutput, firstExample.output.length, firstExample.output[0].length);
        updateGrid(elements.exampleInput, firstExample.input);
        updateGrid(elements.exampleOutput, firstExample.output);
        
        // Setup test grids
        const test = puzzle.test[0];
        createGrid(elements.testInput, test.input.length, test.input[0].length);
        createGrid(elements.testOutput, test.output.length, test.output[0].length);
        updateGrid(elements.testInput, test.input);
        
        // Update example counter
        elements.exampleNumber.textContent = `Example 1/${puzzle.train.length}`;
        
    } catch (error) {
        console.error('Error loading puzzle:', error);
    }
}

// Button handlers
elements.copyInput.addEventListener('click', () => {
    const testInput = elements.testInput;
    const testOutput = elements.testOutput;
    const inputData = [];
    
    // Get input grid data
    testInput.querySelectorAll('.grid-row').forEach(row => {
        const rowData = [];
        row.querySelectorAll('.grid-cell').forEach(cell => {
            rowData.push(parseInt(cell.dataset.value) || 0);
        });
        inputData.push(rowData);
    });

    // Get output grid dimensions
    const outputRows = testOutput.querySelectorAll('.grid-row').length;
    const outputCols = testOutput.querySelector('.grid-row').children.length;
    
    // Scale input to output size
    const scaledData = scaleGrid(inputData, outputRows, outputCols);
    
    // Update output grid
    testOutput.querySelectorAll('.grid-row').forEach((row, i) => {
        row.querySelectorAll('.grid-cell').forEach((cell, j) => {
            const value = scaledData[i][j];
            cell.style.backgroundColor = COLORS[value] || COLORS[0];
            cell.dataset.value = value;
        });
    });
});

function scaleGrid(inputGrid, targetRows, targetCols) {
    const inputRows = inputGrid.length;
    const inputCols = inputGrid[0].length;
    const result = Array(targetRows).fill().map(() => Array(targetCols).fill(0));
    
    // Calculate scaling factors
    const rowScale = targetRows / inputRows;
    const colScale = targetCols / inputCols;
    
    for (let i = 0; i < targetRows; i++) {
        for (let j = 0; j < targetCols; j++) {
            // Map output coordinates back to input coordinates
            const inputRow = Math.floor(i / rowScale);
            const inputCol = Math.floor(j / colScale);
            
            // Copy the value from the corresponding input cell
            result[i][j] = inputGrid[inputRow][inputCol];
        }
    }
    
    return result;
}

elements.clearGrid.addEventListener('click', () => {
    const cells = elements.testOutput.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.style.backgroundColor = COLORS[0];
        cell.dataset.value = '0';
    });
});

elements.submit.addEventListener('click', () => {
    if (!currentState.currentPuzzle) return;
    
    const outputCells = elements.testOutput.querySelectorAll('.grid-cell');
    const userSolution = Array.from(outputCells).map(cell => parseInt(cell.dataset.value) || 0);
    const correctSolution = currentState.currentPuzzle.test[0].output.flat();
    
    const isCorrect = userSolution.every((value, index) => value === correctSolution[index]);
    alert(isCorrect ? 'Correct!' : 'Try again!');
});

// Example navigation
elements.prevExample.addEventListener('click', () => {
    if (!currentState.currentPuzzle) return;
    currentState.currentExample = (currentState.currentExample - 1 + currentState.currentPuzzle.train.length) % currentState.currentPuzzle.train.length;
    updateExampleDisplay();
});

elements.nextExample.addEventListener('click', () => {
    if (!currentState.currentPuzzle) return;
    currentState.currentExample = (currentState.currentExample + 1) % currentState.currentPuzzle.train.length;
    updateExampleDisplay();
});

function updateExampleDisplay() {
    const example = currentState.currentPuzzle.train[currentState.currentExample];
    updateGrid(elements.exampleInput, example.input);
    updateGrid(elements.exampleOutput, example.output);
    elements.exampleNumber.textContent = `Example ${currentState.currentExample + 1}/${currentState.currentPuzzle.train.length}`;
}

// Initialize
function init() {
    setupColorPalette();
    setupDrawing();
    loadPuzzle('007bbfb7');
}

init(); 