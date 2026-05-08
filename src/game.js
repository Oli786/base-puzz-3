// Game Configuration
export const GRID_SIZE = 8;
export const TILE_TYPES = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({
  level: i + 1,
  targetScore: 500 + i * 250,
  moves: Math.max(25 - Math.floor(i / 3), 10),
}));

export class GameEngine {
  constructor(onUpdate) {
    this.grid = [];
    this.onUpdate = onUpdate; // Callback for UI updates
    this.score = 0;
    this.moves = 0;
    this.currentLevel = null;
    this.isProcessing = false;
    this.selectedTile = null;
  }

  initLevel(levelNum) {
    this.currentLevel = LEVELS.find(l => l.level === levelNum);
    this.score = 0;
    this.moves = this.currentLevel.moves;
    this.createGrid();
    this.onUpdate({
      score: this.score,
      moves: this.moves,
      level: this.currentLevel.level,
      target: this.currentLevel.targetScore,
      grid: this.grid
    });
  }

  createGrid() {
    this.grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        let type;
        do {
          type = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
        } while (this.wouldFormMatch(r, c, type));
        this.grid[r][c] = { r, c, type, id: Math.random().toString(36).substr(2, 9) };
      }
    }
  }

  wouldFormMatch(r, c, type) {
    // Check horizontal
    if (c >= 2 && this.grid[r][c - 1]?.type === type && this.grid[r][c - 2]?.type === type) return true;
    // Check vertical
    if (r >= 2 && this.grid[r - 1] && this.grid[r - 1][c]?.type === type && this.grid[r - 2] && this.grid[r - 2][c]?.type === type) return true;
    return false;
  }

  async swapTiles(r1, c1, r2, c2) {
    if (this.isProcessing || this.moves <= 0) return;
    
    // Check if adjacent
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    this.isProcessing = true;
    this.moves--;

    const tile1 = this.grid[r1][c1];
    const tile2 = this.grid[r2][c2];

    // Swap in grid
    this.grid[r1][c1] = { ...tile2, r: r1, c: c1 };
    this.grid[r2][c2] = { ...tile1, r: r2, c: c2 };

    this.onUpdate({ grid: this.grid, moves: this.moves });

    const matches = this.findMatches();
    if (matches.length > 0) {
      await this.processMatches();
    } else {
      // Swap back if no match
      await new Promise(r => setTimeout(r, 300));
      this.grid[r1][c1] = tile1;
      this.grid[r2][c2] = tile2;
      this.moves++; // Refund move if no match? Some games do this, some don't. 
      // The prompt says "matching three or more tiles clears them and gives points".
      // I'll refund the move to make it "easy/lightweight" as requested.
      this.onUpdate({ grid: this.grid, moves: this.moves });
    }

    this.isProcessing = false;
    this.checkGameStatus();
  }

  findMatches() {
    const matchedTiles = new Set();

    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        const type = this.grid[r][c].type;
        if (type && this.grid[r][c + 1].type === type && this.grid[r][c + 2].type === type) {
          matchedTiles.add(`${r},${c}`);
          matchedTiles.add(`${r},${c + 1}`);
          matchedTiles.add(`${r},${c + 2}`);
          // Continue for 4 or 5
          let nextC = c + 3;
          while (nextC < GRID_SIZE && this.grid[r][nextC].type === type) {
            matchedTiles.add(`${r},${nextC}`);
            nextC++;
          }
        }
      }
    }

    // Vertical
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 2; r++) {
        const type = this.grid[r][c].type;
        if (type && this.grid[r + 1][c].type === type && this.grid[r + 2][c].type === type) {
          matchedTiles.add(`${r},${c}`);
          matchedTiles.add(`${r + 1},${c}`);
          matchedTiles.add(`${r + 2},${c}`);
          let nextR = r + 3;
          while (nextR < GRID_SIZE && this.grid[nextR][c].type === type) {
            matchedTiles.add(`${nextR},${c}`);
            nextR++;
          }
        }
      }
    }

    return Array.from(matchedTiles).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { r, c };
    });
  }

  async processMatches() {
    let matches = this.findMatches();
    while (matches.length > 0) {
      // 1. Clear matches
      this.score += matches.length * 10;
      matches.forEach(({ r, c }) => {
        this.grid[r][c].clearing = true;
      });
      this.onUpdate({ grid: this.grid, score: this.score });
      
      await new Promise(r => setTimeout(r, 300));

      // 2. Remove tiles and apply gravity
      for (let c = 0; c < GRID_SIZE; c++) {
        let emptyCount = 0;
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
          if (this.grid[r][c].clearing) {
            emptyCount++;
            this.grid[r][c] = null;
          } else if (emptyCount > 0) {
            const tile = this.grid[r][c];
            this.grid[r + emptyCount][c] = { ...tile, r: r + emptyCount, c };
            this.grid[r][c] = null;
          }
        }
        // 3. Spawn new tiles
        for (let i = 0; i < emptyCount; i++) {
          const type = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
          this.grid[i][c] = { 
            r: i, 
            c, 
            type, 
            id: Math.random().toString(36).substr(2, 9),
            isNew: true 
          };
        }
      }

      this.onUpdate({ grid: this.grid });
      await new Promise(r => setTimeout(r, 300));
      
      // Clear flags
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.grid[r][c]) {
            delete this.grid[r][c].isNew;
            delete this.grid[r][c].clearing;
          }
        }
      }

      matches = this.findMatches();
    }
  }

  checkGameStatus() {
    if (this.score >= this.currentLevel.targetScore) {
      this.onUpdate({ status: 'SUCCESS' });
    } else if (this.moves <= 0) {
      this.onUpdate({ status: 'FAIL' });
    }
  }
}
