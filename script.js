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
    isDragging: false,
    puzzleIds: [],  // Will store all available puzzle IDs
    currentPuzzleIndex: 0,  // Track current position in puzzleIds array
    isStampMode: false,
    stampPreview: null
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
    submit: document.getElementById('submit'),
    showAnswer: document.getElementById('showAnswer'),
    stamp: document.getElementById('stamp')
};

// Tab switching
elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        elements.tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const content = document.getElementById(tab.dataset.tab);
        content.classList.add('active');
        
        // Resize grids in the newly active tab
        if (currentState.currentPuzzle) {
            if (tab.dataset.tab === 'examples') {
                const example = currentState.currentPuzzle.train[currentState.currentExample];
                createGrid(elements.exampleInput, example.input.length, example.input[0].length);
                createGrid(elements.exampleOutput, example.output.length, example.output[0].length);
                updateGrid(elements.exampleInput, example.input);
                updateGrid(elements.exampleOutput, example.output);
            } else if (tab.dataset.tab === 'test') {
                const test = currentState.currentPuzzle.test[0];
                createGrid(elements.testInput, test.input.length, test.input[0].length);
                createGrid(elements.testOutput, test.output.length, test.output[0].length);
                updateGrid(elements.testInput, test.input);
                
                // Preserve user's work in test output
                const outputData = getCurrentGridData(elements.testOutput);
                updateGrid(elements.testOutput, outputData);
            }
        }
    });
});

// Helper function to get current grid data
function getCurrentGridData(grid) {
    const data = [];
    grid.querySelectorAll('.grid-row').forEach(row => {
        const rowData = [];
        row.querySelectorAll('.grid-cell').forEach(cell => {
            rowData.push(parseInt(cell.dataset.value) || 0);
        });
        data.push(rowData);
    });
    return data;
}

// Grid creation functions
function createGrid(container, rows, cols) {
    container.innerHTML = '';
    
    // Get container width
    const containerWidth = container.clientWidth || container.parentElement.clientWidth;
    const maxCellSize = 30; // Default maximum cell size
    const minCellSize = 5;  // Minimum cell size
    
    // Calculate ideal cell size based on container width and columns
    let cellSize = Math.min(maxCellSize, Math.floor((containerWidth - cols) / cols));
    cellSize = Math.max(cellSize, minCellSize);
    
    for (let i = 0; i < rows; i++) {
        const row = document.createElement('div');
        row.className = 'grid-row';
        
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            // Set dynamic size
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            row.appendChild(cell);
        }
        
        container.appendChild(row);
    }

    // Add horizontal scrolling if needed
    container.style.overflowX = cols * cellSize > containerWidth ? 'auto' : 'hidden';
}

function updateGrid(grid, data) {
    const rows = grid.querySelectorAll('.grid-row');
    data.forEach((rowData, i) => {
        const row = rows[i];
        if (!row) return;
        
        const cells = row.querySelectorAll('.grid-cell');
        rowData.forEach((value, j) => {
            const cell = cells[j];
            if (!cell) return;
            
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
        if (currentState.isStampMode) {
            createStampPreview();
            updateStampPreviewPosition(e, testOutput);
        } else if (currentState.isDragging && e.target.classList.contains('grid-cell')) {
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

    testOutput.addEventListener('mouseleave', () => {
        if (currentState.stampPreview) {
            currentState.stampPreview.style.display = 'none';
        }
    });

    testOutput.addEventListener('click', (e) => {
        if (!currentState.isStampMode) return;
        
        const pos = updateStampPreviewPosition(e, testOutput);
        if (!pos) return;
        
        // Get input grid data
        const inputData = getCurrentGridData(elements.testInput);
        const outputRows = testOutput.querySelectorAll('.grid-row');
        
        // Apply stamp at calculated position
        inputData.forEach((rowData, i) => {
            const targetY = pos.gridY + i;
            if (targetY < 0 || targetY >= outputRows.length) return;
            
            const outputCells = outputRows[targetY].querySelectorAll('.grid-cell');
            rowData.forEach((value, j) => {
                const targetX = pos.gridX + j;
                if (targetX < 0 || targetX >= outputCells.length) return;
                
                const cell = outputCells[targetX];
                cell.style.backgroundColor = COLORS[value];
                cell.dataset.value = value;
            });
        });
    });
}

// Puzzle loading and navigation
async function loadPuzzle(puzzleId) {
    try {
        const response = await fetch(`data/${puzzleId}.json`);
        const puzzle = await response.json();
        currentState.currentPuzzle = puzzle;
        
        // Update current index
        currentState.currentPuzzleIndex = currentState.puzzleIds.indexOf(puzzleId);
        
        // Update puzzle ID display and URL hash without triggering hashchange event
        elements.puzzleId.textContent = `Puzzle ID: ${puzzleId}`;
        history.replaceState(null, '', `#${puzzleId}`); // Use replaceState instead of setting hash directly
        
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
    
    // Get input and output dimensions
    const inputRows = testInput.querySelectorAll('.grid-row');
    const outputRows = testOutput.querySelectorAll('.grid-row');
    
    // Copy as much of the input as will fit in the output
    inputRows.forEach((inputRow, i) => {
        if (i >= outputRows.length) return; // Stop if we run out of output rows
        
        const inputCells = inputRow.querySelectorAll('.grid-cell');
        const outputCells = outputRows[i].querySelectorAll('.grid-cell');
        
        inputCells.forEach((inputCell, j) => {
            if (j >= outputCells.length) return; // Stop if we run out of output columns
            
            const value = parseInt(inputCell.dataset.value) || 0;
            const outputCell = outputCells[j];
            outputCell.style.backgroundColor = COLORS[value];
            outputCell.dataset.value = value;
        });
    });
});

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
    
    const totalExamples = currentState.currentPuzzle.train.length;
    currentState.currentExample = 
        (currentState.currentExample - 1 + totalExamples) % totalExamples;
    
    console.log('Previous clicked, new index:', currentState.currentExample); // Debug log
    updateExampleDisplay();
});

elements.nextExample.addEventListener('click', () => {
    if (!currentState.currentPuzzle) return;
    
    const totalExamples = currentState.currentPuzzle.train.length;
    currentState.currentExample = 
        (currentState.currentExample + 1) % totalExamples;
    
    console.log('Next clicked, new index:', currentState.currentExample); // Debug log
    updateExampleDisplay();
});

function updateExampleDisplay() {
    const example = currentState.currentPuzzle.train[currentState.currentExample];
    
    // First recreate the grids with correct dimensions
    createGrid(elements.exampleInput, example.input.length, example.input[0].length);
    createGrid(elements.exampleOutput, example.output.length, example.output[0].length);
    
    // Then update the grid contents
    updateGrid(elements.exampleInput, example.input);
    updateGrid(elements.exampleOutput, example.output);
    
    // Update example counter
    elements.exampleNumber.textContent = 
        `Example ${currentState.currentExample + 1}/${currentState.currentPuzzle.train.length}`;
    
    // Log for debugging
    console.log('Updating to example:', currentState.currentExample);
    console.log('Input:', example.input);
    console.log('Output:', example.output);
}

// Add navigation functions
function getNextPuzzleId(currentId) {
    // Simple increment of the hex number
    const nextNum = parseInt(currentId, 16) + 1;
    return nextNum.toString(16).padStart(8, '0');
}

function getPrevPuzzleId(currentId) {
    // Simple decrement of the hex number
    const prevNum = Math.max(0, parseInt(currentId, 16) - 1);
    return prevNum.toString(16).padStart(8, '0');
}

// Update button handlers
elements.prevPuzzle.addEventListener('click', () => navigatePuzzle(-1));
elements.nextPuzzle.addEventListener('click', () => navigatePuzzle(1));

// Handle URL hash changes
window.addEventListener('hashchange', () => {
    const puzzleId = window.location.hash.slice(1);
    if (puzzleId && currentState.puzzleIds.includes(puzzleId)) {
        loadPuzzle(puzzleId);
    }
});

// Add function to load puzzle list
async function loadPuzzleList() {
    try {
        const response = await fetch('list_puzzles.php');
        const data = await response.json();
        currentState.puzzleIds = data.puzzles;
        
        if (data.puzzles.length > 0) {
            await loadPuzzle(data.puzzles[0]);
        }
    } catch (error) {
        console.error('Error loading puzzle list:', error);
    }
}

// Update navigation functions
async function navigatePuzzle(direction) {
    if (currentState.puzzleIds.length === 0) return;
    
    // Calculate new index with proper wrapping in both directions
    let newIndex = currentState.currentPuzzleIndex + direction;
    
    // Wrap around to the end if going backwards from first
    if (newIndex < 0) {
        newIndex = currentState.puzzleIds.length - 1;
    }
    // Wrap around to the beginning if going forwards from last
    else if (newIndex >= currentState.puzzleIds.length) {
        newIndex = 0;
    }
    
    currentState.currentPuzzleIndex = newIndex;
    await loadPuzzle(currentState.puzzleIds[currentState.currentPuzzleIndex]);
}

// Initialize
async function init() {
    setupColorPalette();
    setupDrawing();
    await loadPuzzleList();
    
    // Load puzzle from URL hash if present, otherwise load first puzzle
    const puzzleId = window.location.hash.slice(1);
    if (puzzleId && currentState.puzzleIds.includes(puzzleId)) {
        await loadPuzzle(puzzleId);
    } else if (currentState.puzzleIds.length > 0) {
        await loadPuzzle(currentState.puzzleIds[0]);
    }
}

init(); 

// Add the show answer button handler
elements.showAnswer.addEventListener('click', () => {
    if (!currentState.currentPuzzle) return;
    
    const answer = currentState.currentPuzzle.test[0].output;
    const testOutput = elements.testOutput;
    
    // Update the grid with the answer
    const rows = testOutput.querySelectorAll('.grid-row');
    answer.forEach((rowData, i) => {
        const row = rows[i];
        if (!row) return;
        
        const cells = row.querySelectorAll('.grid-cell');
        rowData.forEach((value, j) => {
            const cell = cells[j];
            if (!cell) return;
            
            cell.style.backgroundColor = COLORS[value];
            cell.dataset.value = value;
        });
    });
});

// Add stamp mode toggle
elements.stamp.addEventListener('click', () => {
    currentState.isStampMode = !currentState.isStampMode;
    elements.stamp.classList.toggle('active');
    
    if (!currentState.isStampMode) {
        removeStampPreview();
    }
});

function createStampPreview() {
    if (currentState.stampPreview) return;
    
    const preview = document.createElement('div');
    preview.className = 'stamp-preview';
    preview.style.position = 'absolute';
    preview.style.pointerEvents = 'none';
    preview.style.opacity = '0.7';
    preview.style.display = 'none';
    document.body.appendChild(preview);
    
    // Create grid inside preview
    const inputGrid = elements.testInput;
    const rows = inputGrid.querySelectorAll('.grid-row');
    rows.forEach(row => {
        const previewRow = document.createElement('div');
        previewRow.className = 'grid-row';
        row.querySelectorAll('.grid-cell').forEach(cell => {
            const previewCell = document.createElement('div');
            previewCell.className = 'grid-cell';
            previewCell.style.backgroundColor = cell.style.backgroundColor;
            previewCell.style.width = cell.style.width;
            previewCell.style.height = cell.style.height;
            previewRow.appendChild(previewCell);
        });
        preview.appendChild(previewRow);
    });
    
    currentState.stampPreview = preview;
}

function removeStampPreview() {
    if (currentState.stampPreview) {
        currentState.stampPreview.remove();
        currentState.stampPreview = null;
    }
}

function updateStampPreviewPosition(e, outputGrid) {
    if (!currentState.stampPreview) return;
    
    const rect = outputGrid.getBoundingClientRect();
    const cellSize = parseInt(outputGrid.querySelector('.grid-cell').style.width);
    const previewWidth = currentState.stampPreview.offsetWidth;
    const previewHeight = currentState.stampPreview.offsetHeight;
    
    // Calculate grid position, accounting for the center of the preview
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Adjust mouse position to account for preview center
    const adjustedX = mouseX - (previewWidth / 2);
    const adjustedY = mouseY - (previewHeight / 2);
    
    // Calculate grid position based on adjusted coordinates
    const gridX = Math.floor(adjustedX / cellSize);
    const gridY = Math.floor(adjustedY / cellSize);
    
    // Calculate snapped position in pixels
    const snappedX = (gridX * cellSize) + rect.left;
    const snappedY = (gridY * cellSize) + rect.top;
    
    // Position preview at snapped coordinates
    currentState.stampPreview.style.left = `${snappedX}px`;
    currentState.stampPreview.style.top = `${snappedY}px`;
    currentState.stampPreview.style.display = 'block';
    
    return {
        gridX: gridX,
        gridY: gridY
    };
}

// Add some CSS for the stamp preview
const style = document.createElement('style');
style.textContent = `
    .stamp-preview {
        z-index: 1000;
        pointer-events: none;
    }
    #stamp.active {
        background-color: #005cbf;
    }
`;
document.head.appendChild(style);
