/**
 * GameState - Gestion centralisée de l'état du jeu
 * Version simplifiée pour utiliser ChessGame directement
 */
class GameState {
    constructor() {
        this.game = new ChessGame();
        this.selectedSquare = null;
        this.validMoves = [];
        this.listeners = {};
        this.pendingPromotion = null;
        this.lastMove = null; // Tracker le dernier coup pour surlignage
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }
    
    /**
     * Emit state change event
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
    
    /**
     * Sélectionner une pièce
     */
    selectSquare(row, col) {
        if (!this.game.board[row][col]) {
            this.clearSelection();
            return;
        }
        
        // Vérifier que c'est le tour du bon joueur
        const piece = this.game.board[row][col];
        // Autoriser la sélection pour tous les côtés si le mode analyse est actif
        if (piece.color !== this.game.currentPlayer && !window.analysisMode) {
            return;
        }
        
        this.selectedSquare = { row, col };
        this.validMoves = this.game.getPossibleMoves(row, col);
        
        this.emit('squareSelected', { row, col, validMoves: this.validMoves });
    }
    
    /**
     * Effacer la sélection
     */
    clearSelection() {
        this.selectedSquare = null;
        this.validMoves = [];
        this.emit('selectionCleared', null);
    }
    
    
    /**
     * Effectuer un coup
     */
    makeMove(fromRow, fromCol, toRow, toCol) {
        // Vérifier que c'est un coup valide
        const isValid = this.validMoves.some(m => m[0] === toRow && m[1] === toCol);
        if (!isValid) return false;
        
        // If the engine indicates a promotion is needed, defer to UI
        if (this.game.needsPromotion(fromRow, fromCol, toRow, toCol)) {
            this.pendingPromotion = { fromRow, fromCol, toRow, toCol };
            this.emit('promotionNeeded', { fromRow, fromCol, toRow, toCol });
            return true;
        }

        // Use engine to perform the move (handles en passant, rook/king moves, promotions)
        const moved = this.game.makeMove(fromRow, fromCol, toRow, toCol, null);
        if (!moved) return false;

        // Tracker le dernier coup pour surlignage
        this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };

        this.clearSelection();
        this.emit('moveMade', { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
        this.emit('stateChanged', { game: this.game });

        // Vérifier l'état du jeu (échec, mat, pat)
        this.checkGameState();

        return true;
    }

    /**
     * Finaliser une promotion choisie par l'UI
     */
    finishPromotion(promotionType) {
        if (!this.pendingPromotion) return false;
        const { fromRow, fromCol, toRow, toCol } = this.pendingPromotion;
        const moved = this.game.makeMove(fromRow, fromCol, toRow, toCol, promotionType);
        this.pendingPromotion = null;
        if (!moved) return false;

        // Tracker le dernier coup
        this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, promotion: promotionType };

        this.clearSelection();
        this.emit('moveMade', { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, promotion: promotionType });
        this.emit('stateChanged', { game: this.game });
        this.checkGameState();
        return true;
    }
    
    /**
     * Nouvelle partie
     */
    newGame() {
        this.game = new ChessGame();
        this.lastMove = null;
        this.clearSelection();
        this.emit('newGame', null);
    }

    /**
     * Annuler le dernier coup (Undo)
     */
    undo() {
        const ok = this.game.undoMove();
        if (!ok) {
            this.emit('message', { text: '↶ Impossible d\'annuler', type: 'warning' });
            return false;
        }

        this.clearSelection();
        this.emit('moveUndone', null);
        this.emit('stateChanged', { game: this.game });
        this.checkGameState();
        this.emit('message', { text: '↶ Coup annulé', type: 'info' });
        return true;
    }
    
    /**
     * Vérifier l'état du jeu (échec, mat, pat)
     */
    checkGameState() {
        const currentPlayer = this.game.currentPlayer;
        const opponentColor = currentPlayer === 'white' ? 'black' : 'white';
        
        const isInCheck = this.game.isInCheck(currentPlayer);

        // Si pas en échec et pas de mouvements légaux, c'est pat
        if (!isInCheck && this.game.isStalemate()) {
            this.emit('gameEnded', { result: 'stalemate', winner: null });
            this.emit('message', { text: '🤝 Pat - Partie nulle !', type: 'info' });
            this.emit('stalemate', { player: currentPlayer });
            return;
        }

        if (isInCheck) {
            // Vérifier si le joueur a au moins UN mouvement légal (pas seulement le roi)
            const hasAnyLegalMove = this.hasLegalMovesComprehensive(currentPlayer);

            if (!hasAnyLegalMove) {
                // Échec et mat - aucun mouvement légal possible
                this.emit('gameEnded', { result: 'checkmate', winner: opponentColor });
                this.emit('message', { text: `🎉 Échec et mat ! ${opponentColor === 'white' ? 'Blanc' : 'Noir'} gagne !`, type: 'success' });
                this.emit('checkmate', { player: currentPlayer, winner: opponentColor });
            } else {
                // Juste échec - il existe au moins un coup légal
                this.emit('check', { player: currentPlayer });
                this.emit('message', { text: `⚠️ ${currentPlayer === 'white' ? 'Blanc' : 'Noir'} en échec !`, type: 'warning' });
            }
        }
    }
    
    /**
     * Trouver la position du roi
     */
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.game.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    /**
     * Vérifier si le joueur a AU MOINS UN coup légal
     * (considère TOUS les mouvements possibles, pas juste le roi)
     */
    hasLegalMovesComprehensive(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.game.board[row][col];
                if (piece && piece.color === color) {
                    // Récupérer les mouvements possibles (qui filter les coups illégaux)
                    const legalMoves = this.game.getPossibleMoves(row, col);
                    if (legalMoves && legalMoves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    /**
     * Obtenir l'état actuel
     */
    getState() {
        return {
            game: this.game,
            selectedSquare: this.selectedSquare,
            validMoves: this.validMoves
        };
    }
}
