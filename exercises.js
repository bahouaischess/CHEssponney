// Exercise manager for Chessponey
// - Loads puzzles with real ChessGame engine
// - Renders interactive board with actual game rules
// - Validates moves according to ChessPoney rules (including knight moves for all pieces)
// Usage: const ex = new ExerciseManager({containerId:'exerciseBoard'}); ex.init();

class ExerciseManager {
    constructor(opts = {}){
        this.containerId = opts.containerId || 'exerciseBoard';
        this.puzzles = opts.puzzles || this.defaultPuzzles();
        this.current = 0;
        this.completedKey = 'cp_completed_puzzles';
        this.completed = new Set(JSON.parse(localStorage.getItem(this.completedKey) || '[]'));
        
        // ChessGame instance pour chaque puzzle
        this.game = null;
        this.selectedFrom = null;
        this.highlightedMoves = [];
        
        // Vérifier que ChessGame est disponible
        if(typeof ChessGame === 'undefined') {
            console.error('ExerciseManager: ChessGame not found!');
        }
    }

    defaultPuzzles(){
        return [
            {
                id: 'puzzle-1',
                title: 'Mat en 1 avec règles ChessPoney',
                description: "Les Blancs jouent et font mat en 1. Rappel : toutes les pièces sauf le pion et le roi ont aussi les mouvements du cavalier en plus de leurs mouvements classiques.",
                fen: 'k7/8/8/6B1/8/8/K7 w - - 0 1',
                solution: 'Bf6#',
                hint: "Le fou en g5 peut atteindre f6 grâce aux mouvements supplémentaires du cavalier."
            },
            {
                id: 'puzzle-2',
                title: 'Double attaque',
                description: "Trouver le coup tactique qui gagne du matériel.",
                fen: 'r6k/8/8/8/8/8/R6K w - - 0 1',
                solution: 'Ra8#',
                hint: "La tour blanche peut capturer la tour noire avec échec."
            }
        ];
    }

    init(){
        this.container = document.getElementById(this.containerId);
        if(!this.container) {
            console.warn('ExerciseManager: container not found:', this.containerId);
            return;
        }
        this.loadPuzzle(this.current);
    }

    loadPuzzle(idx){
        if(idx < 0 || idx >= this.puzzles.length) return;
        this.current = idx;
        this.puzzle = this.puzzles[idx];
        
        // Créer une nouvelle instance de jeu
        this.game = new ChessGame();
        this.loadFromFen(this.puzzle.fen);
        
        // Mettre à jour les éléments HTML existants
        const titleEl = document.getElementById('puzzleTitle');
        if(titleEl) titleEl.textContent = this.puzzle.title;
        
        const descEl = document.getElementById('puzzleDescription');
        if(descEl) descEl.textContent = this.puzzle.description;
        
        const hintEl = document.getElementById('puzzleHint');
        if(hintEl) hintEl.textContent = this.puzzle.hint || '';
        
        const solutionEl = document.getElementById('puzzleSolution');
        if(solutionEl) solutionEl.textContent = '(Caché - résolvez le puzzle!)';
        
        this.selectedFrom = null;
        this.highlightedMoves = [];
        
        // Rendre le plateau
        if(this.container) {
            this.renderBoard();
        }
        
        this.updateStatus();
        this.solutionRevealed = false;
    }

    loadFromFen(fen) {
        // Analyser FEN simple et charger dans le jeu
        const parts = fen.split(' ');
        const boardStr = parts[0];
        const currentPlayer = parts[1] === 'b' ? 'black' : 'white';
        
        // Réinitialiser le plateau
        this.game.board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        const rows = boardStr.split('/');
        for (let r = 0; r < 8; r++) {
            let col = 0;
            for (let ch of rows[r]) {
                if (/\d/.test(ch)) {
                    col += parseInt(ch);
                } else {
                    const color = ch === ch.toUpperCase() ? 'white' : 'black';
                    const type = this.charToPieceType(ch.toUpperCase());
                    this.game.board[r][col] = { type, color };
                    col++;
                }
            }
        }
        
        this.game.currentPlayer = currentPlayer;
    }

    charToPieceType(ch) {
        const map = { 'K': 'king', 'Q': 'queen', 'R': 'rook', 'B': 'bishop', 'N': 'knight', 'P': 'pawn' };
        return map[ch] || 'pawn';
    }

    renderBoard(){
        const files = ['a','b','c','d','e','f','g','h'];
        const ranks = [8,7,6,5,4,3,2,1];
        const board = document.createElement('div');
        board.className = 'cp-board-interactive';
        board.style.display = 'grid';
        board.style.gridTemplateColumns = 'repeat(8, 50px)';
        board.style.gridTemplateRows = 'repeat(8, 50px)';
        board.style.gap = '0';
        board.style.padding = '8px';
        board.style.background = '#333';
        board.style.borderRadius = '4px';
        
        for(let r = 0; r < 8; r++){
            for(let c = 0; c < 8; c++){
                const rank = ranks[r];
                const file = files[c];
                const sq = file + rank;
                
                const cell = document.createElement('div');
                cell.className = 'cp-square-interactive';
                cell.dataset.square = sq;
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.style.width = '50px';
                cell.style.height = '50px';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontSize = '28px';
                cell.style.cursor = 'pointer';
                cell.style.userSelect = 'none';
                cell.style.transition = 'background 0.2s';
                
                const light = (c + r) % 2 === 0;
                cell.style.background = light ? '#f0d9b5' : '#b58863';
                
                // Ajouter la pièce
                const piece = this.game.board[r][c];
                if(piece) {
                    cell.textContent = this.pieceToUnicode(piece);
                }
                
                cell.addEventListener('click', (e)=> this.onSquareClick(r, c));
                cell.addEventListener('mouseover', (e)=> this.onSquareHover(r, c));
                board.appendChild(cell);
            }
        }
        
        this.container.innerHTML = '';
        this.container.appendChild(board);
    }

    pieceToUnicode(piece) {
        const map = {
            'king': { white: '♔', black: '♚' },
            'queen': { white: '♕', black: '♛' },
            'rook': { white: '♖', black: '♜' },
            'bishop': { white: '♗', black: '♝' },
            'knight': { white: '♘', black: '♞' },
            'pawn': { white: '♙', black: '♟' }
        };
        return map[piece.type] ? map[piece.type][piece.color] : '';
    }

    onSquareHover(r, c) {
        // Optionnel : afficher les coups disponibles au survol
        if (this.selectedFrom === null) {
            const piece = this.game.board[r][c];
            if (piece && piece.color === this.game.currentPlayer) {
                const moves = this.game.getPossibleMoves(r, c);
                this.highlightedMoves = moves;
                this.updateHighlights();
            }
        }
    }

    onSquareClick(r, c) {
        if(this.selectedFrom === null) {
            // Sélectionner une pièce
            const piece = this.game.board[r][c];
            if(!piece || piece.color !== this.game.currentPlayer) {
                return;
            }
            
            this.selectedFrom = [r, c];
            this.highlightedMoves = this.game.getPossibleMoves(r, c);
            this.updateHighlights();
            return;
        }
        
        // Essayer de faire un coup
        const [fr, fc] = this.selectedFrom;
        
        // Vérifier si c'est un coup valide
        const validMoves = this.game.getPossibleMoves(fr, fc);
        if(!validMoves.some(m => m[0] === r && m[1] === c)) {
            // Coup invalide - essayer de sélectionner une autre pièce
            if(this.game.board[r][c] && this.game.board[r][c].color === this.game.currentPlayer) {
                this.selectedFrom = [r, c];
                this.highlightedMoves = this.game.getPossibleMoves(r, c);
                this.updateHighlights();
            } else {
                this.selectedFrom = null;
                this.highlightedMoves = [];
                this.updateHighlights();
            }
            return;
        }
        
        // Faire le coup
        const piece = this.game.board[fr][fc];
        this.game.makeMove(fr, fc, r, c);
        
        this.selectedFrom = null;
        this.highlightedMoves = [];
        this.renderBoard();
        
        // Vérifier si c'est la solution
        this.checkIfSolved();
    }

    updateHighlights() {
        const cells = this.container.querySelectorAll('.cp-square-interactive');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            
            const light = (c + r) % 2 === 0;
            const baseColor = light ? '#f0d9b5' : '#b58863';
            
            if(this.selectedFrom && this.selectedFrom[0] === r && this.selectedFrom[1] === c) {
                cell.style.background = '#baca44';
            } else if(this.highlightedMoves.some(m => m[0] === r && m[1] === c)) {
                cell.style.background = '#baca44';
                cell.style.opacity = '0.6';
            } else {
                cell.style.background = baseColor;
                cell.style.opacity = '1';
            }
        });
    }

    checkIfSolved() {
        // Vérifier si le jeu est en échec et mat (pour les puzzles de mat)
        const isCheckmate = this.game.isInCheck(this.game.currentPlayer === 'white' ? 'black' : 'white') &&
                           this.getAvailableMovesCount(this.game.currentPlayer === 'white' ? 'black' : 'white') === 0;
        
        const statusEl = document.getElementById('puzzleStatus');
        
        // Pour les puzzles de mat, vérifier le mat
        if(this.puzzle.solution.includes('#')) {
            if(isCheckmate) {
                this.markCompleted(this.puzzle.id);
                if(statusEl) statusEl.textContent = 'Mat! Puzzle résolu ✅';
            }
        } else if(this.puzzle.solution.includes('+')) {
            // Pour les puzzles d'échec
            const opponent = this.game.currentPlayer === 'white' ? 'black' : 'white';
            if(this.game.isInCheck(opponent)) {
                this.markCompleted(this.puzzle.id);
                if(statusEl) statusEl.textContent = 'Échec! Puzzle résolu ✅';
            }
        }
    }

    getAvailableMovesCount(color) {
        let count = 0;
        for(let r = 0; r < 8; r++) {
            for(let c = 0; c < 8; c++) {
                const piece = this.game.board[r][c];
                if(piece && piece.color === color) {
                    const moves = this.game.getPossibleMoves(r, c);
                    count += moves.length;
                }
            }
        }
        return count;
    }

    markCompleted(id){
        this.completed.add(id);
        localStorage.setItem(this.completedKey, JSON.stringify(Array.from(this.completed)));
        const btn = document.getElementById('nextPuzzleBtn');
        if(btn) btn.textContent = 'Puzzle Suivant →';
    }

    updateStatus(){
        const statusEl = document.getElementById('puzzleStatus');
        if(!statusEl) return;
        const isCompleted = this.completed.has(this.puzzle.id);
        if(isCompleted){
            statusEl.textContent = '✓ Puzzle complété!';
            statusEl.style.color = '#2ecc71';
        } else {
            statusEl.textContent = '○ En cours... Jouez avec les règles ChessPoney!';
            statusEl.style.color = '#f39c12';
        }
    }

    revealSolution(){
        const statusEl = document.getElementById('puzzleStatus');
        const solutionEl = document.getElementById('puzzleSolution');
        this.solutionRevealed = true;
        if(solutionEl) solutionEl.textContent = 'Solution: ' + this.puzzle.solution;
        if(statusEl) statusEl.textContent = 'Solution révélée: ' + this.puzzle.solution;
    }

    nextPuzzle(){
        const next = (this.current + 1) % this.puzzles.length;
        this.loadPuzzle(next);
    }
}

// Auto-export for module or global
if(typeof module !== 'undefined' && module.exports){
    module.exports = ExerciseManager;
} else {
    window.ExerciseManager = ExerciseManager;
}
