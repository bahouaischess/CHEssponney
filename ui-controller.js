/**
 * UI Controller - Couche de présentation réactive
 * Écoute les changements d'état et met à jour l'interface
 */
class UIController {
    constructor(gameState) {
        this.state = gameState;
        this.draggedPieceEl = null;
        this.dragStartRow = null;
        this.dragStartCol = null;
        this.moveHistory = []; // Historique des coups
        this.profileManager = new ProfileManager(); // Gestionnaire de profil
        this.init();
    }
    
    init() {
        this.createBoard();
        this.attachEventListeners();
        this.subscribeToStateChanges();
        this.updateDisplay();
        this.updateProfileDisplay(); // Initialiser l'affichage du profil
        this.updateRightPanel(); // Mettre à jour le panneau droit avec défis et réalisations
    }
    
    
    /**
     * Créer le plateau de jeu
     */
    createBoard() {
        const board = document.getElementById('chessboard');
        if (!board) return;
        
        board.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Ajouter la pièce si elle existe
                const piece = this.state.game.board[row][col];
                if (piece) {
                    const pieceEl = this.createPieceElement(piece);
                    square.appendChild(pieceEl);
                    
                    // Drag and drop handlers
                    pieceEl.draggable = true;
                    pieceEl.addEventListener('dragstart', (e) => this.onPieceDragStart(e, row, col));
                }
                
                // Drag over/drop handlers sur la case
                square.addEventListener('dragover', (e) => this.onSquareDragOver(e, row, col));
                square.addEventListener('dragleave', (e) => this.onSquareDragLeave(e));
                square.addEventListener('drop', (e) => this.onSquareDrop(e, row, col));
                
                // Click handler pour les clics classiques
                square.addEventListener('click', (e) => this.onSquareClick(e, row, col));
                
                board.appendChild(square);
            }
        }
        
        // Ajouter la surbrillance d'échec si applicable
        this.updateCheckHighlight();
        
        // Surligner le dernier coup
        this.highlightLastMove();
    }

    /**
     * Drag start d'une pièce
     */
    onPieceDragStart(e, row, col) {
        const piece = this.state.game.board[row][col];
        // Autoriser le drag si mode analyse actif (on veut pouvoir manipuler les deux couleurs)
        if (!piece || (piece.color !== this.state.game.currentPlayer && !window.analysisMode)) {
            e.preventDefault();
            return;
        }
        
        this.dragStartRow = row;
        this.dragStartCol = col;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `${row},${col}`);
    }

    /**
     * Drag over une case
     */
    onSquareDragOver(e, row, col) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Vérifier si c'est un coup valide
        if (this.dragStartRow !== null && this.dragStartCol !== null) {
            const isValidMove = this.state.validMoves.some(m => m[0] === row && m[1] === col);
            const fromPiece = this.state.game.board[this.dragStartRow][this.dragStartCol];
            
            if (isValidMove && fromPiece && fromPiece.color === this.state.game.currentPlayer) {
                e.currentTarget.classList.add('dragging-over');
            }
        }
    }

    /**
     * Drag leave une case
     */
    onSquareDragLeave(e) {
        e.currentTarget.classList.remove('dragging-over');
    }

    /**
     * Drop sur une case
     */
    onSquareDrop(e, row, col) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragging-over');
        
        if (this.dragStartRow === null || this.dragStartCol === null) return;
        
        // Vérifier que c'est un coup valide
        const isValidMove = this.state.validMoves.some(m => m[0] === row && m[1] === col);
        
        if (!isValidMove) {
            this.showMessage('Coup invalide !', 'warning');
            return;
        }
        
        // Effectuer le coup
        this.state.makeMove(this.dragStartRow, this.dragStartCol, row, col);
        this.dragStartRow = null;
        this.dragStartCol = null;
    }

    /**
     * Surligner le dernier coup
     */
    highlightLastMove() {
        if (this.state.lastMove) {
            const { from, to } = this.state.lastMove;
            const fromSquare = document.querySelector(`[data-row="${from.row}"][data-col="${from.col}"]`);
            const toSquare = document.querySelector(`[data-row="${to.row}"][data-col="${to.col}"]`);
            
            if (fromSquare) fromSquare.classList.add('last-move-from');
            if (toSquare) toSquare.classList.add('last-move-to');
        }
    }
    
    /**
     * Mettre à jour la surbrillance d'échec
     */
    updateCheckHighlight() {
        // D'abord, enlever tous les surlignages d'échec/mat
        document.querySelectorAll('[data-row][data-col].check, [data-row][data-col].checkmate').forEach(el => {
            el.classList.remove('check', 'checkmate');
        });
        
        const currentPlayer = this.state.game.currentPlayer;
        const kingPos = this.state.findKing(currentPlayer);
        const isInCheck = this.state.game.isInCheck(currentPlayer);
        const isCheckmated = this.state.game.isCheckmate();
        
        if (kingPos && isInCheck) {
            const kingSquare = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
            if (kingSquare) {
                if (isCheckmated) {
                    kingSquare.classList.add('checkmate');
                } else {
                    kingSquare.classList.add('check');
                }
            }
        }
    }
    
    
    /**
     * Créer un élément visuel pour une pièce
     */
    createPieceElement(piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece ${piece.color}`;
        
        // Créer SVG pour toutes les pièces
        let svg;
        switch (piece.type) {
            case 'king':
                svg = this.createKingSvg(piece.color);
                break;
            case 'queen':
                svg = this.createQueenSvg(piece.color);
                break;
            case 'rook':
                svg = this.createRookSvg(piece.color);
                break;
            case 'bishop':
                svg = this.createBishopSvg(piece.color);
                break;
            case 'knight':
                svg = this.createKnightSvg(piece.color);
                break;
            case 'pawn':
                svg = this.createPawnSvg(piece.color);
                break;
        }
        
        pieceEl.appendChild(svg);
        return pieceEl;
    }

    /**
     * Créer SVG pour le pion
     */
    createPawnSvg(color) {
        const fillColor = color === 'white' ? '#f0f0f0' : '#2a2a2a';
        const strokeColor = color === 'white' ? '#333' : '#ccc';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('fill', fillColor);
        g.setAttribute('stroke', strokeColor);
        g.setAttribute('stroke-width', '1.5');

        // Base
        const base = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        base.setAttribute('cx', '50');
        base.setAttribute('cy', '75');
        base.setAttribute('r', '15');
        g.appendChild(base);

        // Corps
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        body.setAttribute('x', '40');
        body.setAttribute('y', '40');
        body.setAttribute('width', '20');
        body.setAttribute('height', '30');
        g.appendChild(body);

        // Tête
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        head.setAttribute('cx', '50');
        head.setAttribute('cy', '30');
        head.setAttribute('r', '12');
        g.appendChild(head);

        svg.appendChild(g);
        return svg;
    }

    /**
     * Créer SVG pour la tour
     */
    createRookSvg(color) {
        const fillColor = color === 'white' ? '#f0f0f0' : '#2a2a2a';
        const strokeColor = color === 'white' ? '#333' : '#ccc';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('fill', fillColor);
        g.setAttribute('stroke', strokeColor);
        g.setAttribute('stroke-width', '1.5');

        // Base
        const base = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        base.setAttribute('x', '35');
        base.setAttribute('y', '65');
        base.setAttribute('width', '30');
        base.setAttribute('height', '15');
        g.appendChild(base);

        // Corps
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        body.setAttribute('x', '40');
        body.setAttribute('y', '30');
        body.setAttribute('width', '20');
        body.setAttribute('height', '35');
        g.appendChild(body);

        // Créneaux
        for (let i = 0; i < 4; i++) {
            const creneau = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            creneau.setAttribute('x', String(35 + i * 8));
            creneau.setAttribute('y', '15');
            creneau.setAttribute('width', '6');
            creneau.setAttribute('height', '15');
            g.appendChild(creneau);
        }

        svg.appendChild(g);
        return svg;
    }

    /**
     * Créer SVG pour la reine
     */
    createQueenSvg(color) {
        const fillColor = color === 'white' ? '#f0f0f0' : '#2a2a2a';
        const strokeColor = color === 'white' ? '#333' : '#ccc';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('fill', fillColor);
        g.setAttribute('stroke', strokeColor);
        g.setAttribute('stroke-width', '1.5');

        // Base
        const base = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        base.setAttribute('cx', '50');
        base.setAttribute('cy', '75');
        base.setAttribute('r', '13');
        g.appendChild(base);

        // Corps
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        body.setAttribute('d', 'M 45,65 L 38,35 Q 50,18 62,35 L 55,65 Z');
        g.appendChild(body);

        // Couronnes (5 points)
        for (let i = 0; i < 5; i++) {
            const crown = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const x = 30 + i * 10;
            crown.setAttribute('cx', String(x));
            crown.setAttribute('cy', '18');
            crown.setAttribute('r', '4');
            g.appendChild(crown);
        }

        svg.appendChild(g);
        return svg;
    }

    /**
     * Créer SVG pour le roi
     */
    createKingSvg(color) {
        const fillColor = color === 'white' ? '#f0f0f0' : '#2a2a2a';
        const strokeColor = color === 'white' ? '#333' : '#ccc';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('fill', fillColor);
        g.setAttribute('stroke', strokeColor);
        g.setAttribute('stroke-width', '1.5');

        // Base
        const base = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        base.setAttribute('cx', '50');
        base.setAttribute('cy', '75');
        base.setAttribute('r', '14');
        g.appendChild(base);

        // Corps
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        body.setAttribute('d', 'M 44,65 L 38,32 Q 50,16 62,32 L 56,65 Z');
        g.appendChild(body);

        // Croix (signe du roi)
        const cross1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cross1.setAttribute('x1', '50');
        cross1.setAttribute('y1', '8');
        cross1.setAttribute('x2', '50');
        cross1.setAttribute('y2', '22');
        cross1.setAttribute('stroke', strokeColor);
        cross1.setAttribute('stroke-width', '2');
        g.appendChild(cross1);

        const cross2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cross2.setAttribute('x1', '44');
        cross2.setAttribute('y1', '15');
        cross2.setAttribute('x2', '56');
        cross2.setAttribute('y2', '15');
        cross2.setAttribute('stroke', strokeColor);
        cross2.setAttribute('stroke-width', '2');
        g.appendChild(cross2);

        svg.appendChild(g);
        return svg;
    }

    /**
     * Créer SVG pour le cavalier
     */
    createKnightSvg(color) {
        const fillColor = color === 'white' ? '#f0f0f0' : '#2a2a2a';
        const strokeColor = color === 'white' ? '#333' : '#ccc';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('fill', fillColor);
        g.setAttribute('stroke', strokeColor);
        g.setAttribute('stroke-width', '1.5');

        // Corps principal (ellipse)
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        body.setAttribute('cx', '40');
        body.setAttribute('cy', '60');
        body.setAttribute('rx', '18');
        body.setAttribute('ry', '16');
        g.appendChild(body);

        // Cou (trapèze/path)
        const neck = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        neck.setAttribute('d', 'M 50,45 L 56,35 L 68,38 L 62,50 Z');
        g.appendChild(neck);

        // Tête du cheval (ovale)
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        head.setAttribute('cx', '62');
        head.setAttribute('cy', '28');
        head.setAttribute('rx', '12');
        head.setAttribute('ry', '14');
        g.appendChild(head);

        // Museau pointu (path)
        const muzzle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        muzzle.setAttribute('d', 'M 72,28 L 82,30 L 72,35 Z');
        g.appendChild(muzzle);

        // Oreille gauche
        const earL = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        earL.setAttribute('d', 'M 56,15 L 58,5 L 62,15 Z');
        g.appendChild(earL);

        // Oreille droite
        const earR = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        earR.setAttribute('d', 'M 66,15 L 70,5 L 72,15 Z');
        g.appendChild(earR);

        // Oeil
        const eye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        eye.setAttribute('cx', '58');
        eye.setAttribute('cy', '24');
        eye.setAttribute('r', '2');
        eye.setAttribute('fill', strokeColor);
        g.appendChild(eye);

        // Jambes avant gauche
        const legFL = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        legFL.setAttribute('x1', '28');
        legFL.setAttribute('y1', '75');
        legFL.setAttribute('x2', '25');
        legFL.setAttribute('y2', '88');
        legFL.setAttribute('stroke-width', '3');
        g.appendChild(legFL);

        // Jambes avant droite
        const legFR = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        legFR.setAttribute('x1', '40');
        legFR.setAttribute('y1', '76');
        legFR.setAttribute('x2', '42');
        legFR.setAttribute('y2', '88');
        legFR.setAttribute('stroke-width', '3');
        g.appendChild(legFR);

        // Jambes arrière gauche
        const legBL = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        legBL.setAttribute('x1', '48');
        legBL.setAttribute('y1', '75');
        legBL.setAttribute('x2', '44');
        legBL.setAttribute('y2', '88');
        legBL.setAttribute('stroke-width', '3');
        g.appendChild(legBL);

        // Jambes arrière droite
        const legBR = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        legBR.setAttribute('x1', '52');
        legBR.setAttribute('y1', '76');
        legBR.setAttribute('x2', '58');
        legBR.setAttribute('y2', '88');
        legBR.setAttribute('stroke-width', '3');
        g.appendChild(legBR);

        svg.appendChild(g);
        return svg;
    }

    /**
     * Créer SVG pour le fou (avec barre diagonale et point au sommet)
     */
    createBishopSvg(color) {
        const fillColor = color === 'white' ? '#f0f0f0' : '#2a2a2a';
        const strokeColor = color === 'white' ? '#333' : '#ccc';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('fill', fillColor);
        g.setAttribute('stroke', strokeColor);
        g.setAttribute('stroke-width', '1.5');

        // Base
        const base = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        base.setAttribute('cx', '50');
        base.setAttribute('cy', '75');
        base.setAttribute('r', '14');
        g.appendChild(base);

        // Corps galbé
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        body.setAttribute('d', 'M 44,64 Q 40,50 42,35 Q 45,25 50,22 Q 55,25 58,35 Q 60,50 56,64 Z');
        g.appendChild(body);

        // Barre diagonale (de haut-gauche à bas-droit)
        const diagonalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        diagonalLine.setAttribute('x1', '44');
        diagonalLine.setAttribute('y1', '38');
        diagonalLine.setAttribute('x2', '56');
        diagonalLine.setAttribute('y2', '50');
        diagonalLine.setAttribute('stroke', strokeColor);
        diagonalLine.setAttribute('stroke-width', '1.5');
        diagonalLine.setAttribute('opacity', '0.7');
        g.appendChild(diagonalLine);

        // Couronne (3 pointes)
        for (let i = 0; i < 3; i++) {
            const point = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const offsetX = (i - 1) * 8;
            point.setAttribute('d', `M ${50 + offsetX},20 L ${48 + offsetX},12 L ${52 + offsetX},12 Z`);
            g.appendChild(point);
        }

        // Point au-dessus de la tête (sans dépasser de la case)
        const topDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        topDot.setAttribute('cx', '50');
        topDot.setAttribute('cy', '8');
        topDot.setAttribute('r', '3');
        g.appendChild(topDot);

        svg.appendChild(g);
        return svg;
    }
    
    /**
     * S'abonner aux changements d'état
     */
    subscribeToStateChanges() {
        // Quand une pièce est sélectionnée
        this.state.subscribe('squareSelected', (data) => {
            this.highlightSquares(data.row, data.col, data.validMoves);
        });
        
        // Quand la sélection est effacée
        this.state.subscribe('selectionCleared', () => {
            this.clearHighlights();
        });
        
        // Quand un coup est effectué
        this.state.subscribe('moveMade', () => {
            this.addToMoveHistory();
            this.updateCapturedPieces();
            // Ne pas recharger tout le board, juste mettre à jour
            this.updateBoardAfterMove();
        });
        
        // Quand il y a un message
        this.state.subscribe('message', (data) => {
            this.showMessage(data.text, data.type);
        });
        
        // Quand il y a un échec
        this.state.subscribe('check', (data) => {
            const kingPos = this.state.findKing(data.player);
            if (kingPos) {
                const kingSquare = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
                if (kingSquare) {
                    kingSquare.classList.add('check');
                }
            }
        });
        
        // Quand il y a un échec et mat
        this.state.subscribe('checkmate', (data) => {
            const kingPos = this.state.findKing(data.player);
            if (kingPos) {
                const kingSquare = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
                if (kingSquare) {
                    kingSquare.classList.add('checkmate');
                }
            }
        });
        
        // Quand le jeu se termine
        this.state.subscribe('gameEnded', (data) => {
            this.disableBoard();
            const text = data.result === 'checkmate' 
                ? `🎉 Partie terminée - ${data.winner === 'white' ? 'Blanc' : 'Noir'} gagne !`
                : '🤝 Partie nulle !';
            this.showMessage(text, 'info');
            
            // Mettre à jour les stats du profil avec notifications gamification
            const currentProfile = this.profileManager.loadProfile();
            if (currentProfile && currentProfile.type !== 'guest') {
                let result = 'draw';
                if (data.result === 'checkmate') {
                    result = data.winner === 'white' ? 'white-win' : 'black-win';
                }
                const moveCount = this.moveHistory.length;
                // Appel avec notifications gamification
                this.updateGameStats(result, moveCount);
                this.updateProfileDisplay();
            }
            
            if (data.result === 'checkmate') {
                this.showEndOverlay(text);
            } else {
                // remove any previous overlay
                this.hideEndOverlay();
            }
        });
        
        // Nouvelle partie
        this.state.subscribe('newGame', () => {
            this.moveHistory = [];
            this.enableBoard();
            this.createBoard();
            this.updateDisplay();
            this.updateCapturedPieces();
        });
        
        // Promotion demandée par le moteur
        this.state.subscribe('promotionNeeded', (data) => {
            this.showPromotionModal(data);
        });
    }
    
    /**
     * Clic sur une case
     */
    onSquareClick(e, row, col) {
        e.preventDefault();
        e.stopPropagation();
        
        const piece = this.state.game.board[row][col];
        
        // Si une pièce est sélectionnée
        if (this.state.selectedSquare) {
            // Si on clique sur la même pièce, désélectionner
            if (this.state.selectedSquare.row === row && this.state.selectedSquare.col === col) {
                this.state.clearSelection();
                return;
            }
            
            // Si on clique sur une case valide, effectuer le coup
            const isValidMove = this.state.validMoves.some(
                move => move[0] === row && move[1] === col
            );
            
            if (isValidMove) {
                this.state.makeMove(
                    this.state.selectedSquare.row,
                    this.state.selectedSquare.col,
                    row,
                    col
                );
                return;
            }
            
            // Sinon, sélectionner la nouvelle pièce si c'est du bon joueur
            // Permettre la sélection en mode analyse même si ce n'est pas le tour
            if (piece && (piece.color === this.state.game.currentPlayer || window.analysisMode)) {
                this.state.selectSquare(row, col);
            } else {
                this.state.clearSelection();
            }
        } else {
            // Sélectionner la pièce
            if (piece && (piece.color === this.state.game.currentPlayer || window.analysisMode)) {
                this.state.selectSquare(row, col);
            }
        }
    }
    
    /**
     * Mettre en surbrillance les cases valides
     */
    highlightSquares(selectedRow, selectedCol, validMoves) {
        this.clearHighlights();
        
        // Mettre en surbrillance la case sélectionnée
        const selectedSquare = document.querySelector(
            `[data-row="${selectedRow}"][data-col="${selectedCol}"]`
        );
        if (selectedSquare) {
            selectedSquare.classList.add('selected');
        }
        
        // Mettre en surbrillance les coups valides
        validMoves.forEach(([moveRow, moveCol]) => {
            const moveSquare = document.querySelector(
                `[data-row="${moveRow}"][data-col="${moveCol}"]`
            );
            if (moveSquare) {
                moveSquare.classList.add('highlight');
            }
        });
    }
    
    /**
     * Effacer les surbrillances
     */
    clearHighlights() {
        document.querySelectorAll('.square.selected').forEach(sq => {
            sq.classList.remove('selected');
        });
        document.querySelectorAll('.square.highlight').forEach(sq => {
            sq.classList.remove('highlight');
        });
    }
    
    
    /**
     * Mettre à jour l'affichage général
     */
    updateDisplay() {
        const indicator = document.getElementById('turnIndicator');
        if (indicator) {
            indicator.textContent = this.state.game.currentPlayer === 'white' 
                ? 'Blancs à jouer' 
                : 'Noirs à jouer';
        }
        
        // Mettre à jour les stats du profil
        try {
            const currentProfile = this.profileManager && this.profileManager.loadProfile ? this.profileManager.loadProfile() : null;
            if (currentProfile) {
                const stats = currentProfile.stats || {};
                
                // Mettre à jour les éléments d'affichage des stats
                const elements = {
                    'gamesCount': stats.gamesPlayed || 0,
                    'whiteWins': stats.whiteWins || 0,
                    'blackWins': stats.blackWins || 0,
                    'draws': stats.draws || 0,
                    'totalMoves': stats.totalMoves || 0,
                    'levelDisplay': stats.level || 1,
                    'xpDisplay': stats.xp || 0
                };
                
            Object.entries(elements).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            });
            
            // Mettre à jour la barre XP
            const xpNextLevel = stats.xpNextLevel || 100;
            const xpPercent = Math.min(100, (stats.xp / xpNextLevel) * 100);
            const xpBar = document.getElementById('xpBar');
            if (xpBar) xpBar.style.width = xpPercent + '%';
            }
        } catch (err) {
            // Ignorer les erreurs du profileManager
            console.warn('[UpdateDisplay] Erreur profileManager:', err.message);
        }
    }
    
    /**
     * Afficher un message
     */
    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('message');
        if (!messageEl) {
            const msg = document.createElement('div');
            msg.id = 'message';
            msg.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 15px 25px;
                border-radius: 8px;
                font-weight: bold;
                z-index: 1000;
                background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
                color: white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            document.body.appendChild(msg);
        }
        
        const messageEl2 = document.getElementById('message');
        messageEl2.textContent = text;
        messageEl2.style.opacity = '1';
        
        setTimeout(() => {
            messageEl2.style.opacity = '0.5';
        }, 3000);
    }

    /**
     * Afficher le modal de promotion
     */
    showPromotionModal(data) {
        this.hidePromotionModal();
        const overlay = document.createElement('div');
        overlay.id = 'promotionModal';
        overlay.style.cssText = `
            position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; z-index:2000; background: rgba(0,0,0,0.4);
        `;

        const box = document.createElement('div');
        box.style.cssText = 'background: white; padding: 18px; border-radius: 8px; text-align:center;';
        box.innerHTML = '<div style="margin-bottom:8px;font-weight:bold">Choisir la promotion</div>';

        // Choisir les symboles Unicode selon la couleur du pion promu
        const fromPiece = this.state.game.board[data.fromRow] && this.state.game.board[data.fromRow][data.fromCol];
        const color = fromPiece ? fromPiece.color : this.state.game.currentPlayer;

        const symbols = color === 'white'
            ? { queen: '♕', rook: '♖', bishop: '♗', knight: '♘' }
            : { queen: '♛', rook: '♜', bishop: '♝', knight: '♞' };

        const pieces = [
            { type: 'queen', label: symbols.queen },
            { type: 'rook', label: symbols.rook },
            { type: 'bishop', label: symbols.bishop },
            { type: 'knight', label: symbols.knight }
        ];

        pieces.forEach(p => {
            const btn = document.createElement('button');
            btn.textContent = p.label;
            btn.setAttribute('aria-label', p.type);
            btn.style.margin = '6px';
            btn.style.fontSize = '20px';
            btn.addEventListener('click', () => {
                this.state.finishPromotion(p.type);
                this.hidePromotionModal();
                this.createBoard();
                this.updateDisplay();
            });
            box.appendChild(btn);
        });

        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    hidePromotionModal() {
        const existing = document.getElementById('promotionModal');
        if (existing) existing.remove();
    }

    /**
     * Afficher une overlay de fin de partie (mat)
     */
    showEndOverlay(text) {
        this.hideEndOverlay();
        const overlay = document.createElement('div');
        overlay.id = 'endOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; z-index:2200; background: rgba(0,0,0,0.6);
        `;

        const box = document.createElement('div');
        box.style.cssText = 'background: #111; color: #fff; padding: 28px; border-radius: 12px; text-align:center; min-width:320px;';
        box.innerHTML = `<div style="font-size:22px; font-weight:700; margin-bottom:12px">${text}</div>`;

        const btn = document.createElement('button');
        btn.textContent = 'Nouvelle Partie';
        btn.style.cssText = 'padding:10px 16px; font-weight:600; border-radius:8px; cursor:pointer;';
        btn.addEventListener('click', () => {
            this.hideEndOverlay();
            this.state.newGame();
            this.createBoard();
            this.updateDisplay();
        });

        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    hideEndOverlay() {
        const ex = document.getElementById('endOverlay');
        if (ex) ex.remove();
    }
    
    /**
     * Désactiver le plateau (fin de partie)
     */
    disableBoard() {
        const board = document.getElementById('chessboard');
        if (board) {
            board.style.pointerEvents = 'none';
            board.style.opacity = '0.6';
        }
    }
    
    /**
     * Activer le plateau (nouvelle partie)
     */
    enableBoard() {
        const board = document.getElementById('chessboard');
        if (board) {
            board.style.pointerEvents = 'auto';
            board.style.opacity = '1';
        }
    }
    
    /**
     * Mettre à jour le board après un coup (sans recharger complètement)
     */
    updateBoardAfterMove() {
        // Nettoyer les surbrillances
        this.clearHighlights();
        
        // Recréer le board (mais avec du caching ou animation est acceptable ici)
        this.createBoard();
        this.updateDisplay();
        
        // Réactualiser la surbrillance du dernier coup
        this.highlightLastMove();
    }

    /**
     * Ajouter un coup à l'historique
     */
    addToMoveHistory() {
        if (!this.state.lastMove) return;
        const move = this.state.lastMove;
        const from = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row}`;
        const to = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
        const notation = `${from}-${to}${move.promotion ? '=' + move.promotion[0].toUpperCase() : ''}`;
        
        this.moveHistory.push(notation);
        this.updateMoveHistoryDisplay();
    }

    /**
     * Mettre à jour l'affichage de l'historique
     */
    updateMoveHistoryDisplay() {
        const historyEl = document.getElementById('moveHistory');
        if (!historyEl) return;

        historyEl.innerHTML = '';
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const row = document.createElement('div');
            row.className = 'move-item';
            row.innerHTML = `<span class="move-number">${Math.floor(i / 2) + 1}.</span>
                             <span class="move-white">${this.moveHistory[i] || '-'}</span>
                             <span class="move-black">${this.moveHistory[i + 1] || '-'}</span>`;
            historyEl.appendChild(row);
        }

        // Scroll vers le bas
        historyEl.parentElement.scrollTop = historyEl.parentElement.scrollHeight;
    }

    /**
     * Afficher les pièces capturées
     */
    updateCapturedPieces() {
        const capturedWhite = document.getElementById('capturedWhite');
        const capturedBlack = document.getElementById('capturedBlack');

        if (capturedWhite) {
            capturedWhite.innerHTML = '';
            this.state.game.capturedPieces.black.forEach(piece => {
                const pieceEl = this.createCapturedPieceElement(piece);
                capturedWhite.appendChild(pieceEl);
            });
        }

        if (capturedBlack) {
            capturedBlack.innerHTML = '';
            this.state.game.capturedPieces.white.forEach(piece => {
                const pieceEl = this.createCapturedPieceElement(piece);
                capturedBlack.appendChild(pieceEl);
            });
        }
    }

    /**
     * Créer un élément pour une pièce capturée (miniature)
     */
    createCapturedPieceElement(piece) {
        const el = document.createElement('div');
        el.style.cssText = 'width: 24px; height: 24px; margin: 2px; font-size: 18px; display: inline-flex; align-items: center; justify-content: center;';
        
        // Utiliser SVG pour cohérence
        const svg = document.createElement('div');
        svg.style.cssText = 'width: 100%; height: 100%;';
        
        if (piece.type === 'knight') {
            svg.appendChild(this.createKnightSvg(piece.color));
        } else if (piece.type === 'bishop') {
            svg.appendChild(this.createBishopSvg(piece.color));
        } else {
            // Mini SVG pour les autres pièces
            const miniSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            miniSvg.setAttribute('viewBox', '0 0 100 100');
            const fillColor = piece.color === 'white' ? '#f0f0f0' : '#2a2a2a';
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '50');
            text.setAttribute('y', '65');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '70');
            text.setAttribute('fill', fillColor);
            const symbols = { king: '♔', queen: '♕', rook: '♖', pawn: '♙' };
            text.textContent = symbols[piece.type] || '♟';
            miniSvg.appendChild(text);
            svg.appendChild(miniSvg);
        }
        
        el.appendChild(svg);
        return el;
    }
    attachEventListeners() {
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.state.newGame();
            });
        }

        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                const ok = this.state.undo();
                if (ok) {
                    this.createBoard();
                    this.updateDisplay();
                }
            });
        }

        // Mode sombre
        const toggleDarkMode = document.getElementById('toggleDarkMode');
        if (toggleDarkMode) {
            const isDarkMode = localStorage.getItem('darkMode') === 'true';
            if (isDarkMode) document.body.classList.add('dark-mode');
            
            toggleDarkMode.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isNowDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isNowDark);
            });
        }

        // Fullscreen
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.log(`Erreur fullscreen: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            });
        }

        // Profile button
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.openProfileModal();
            });
        }

        // Profile modal tabs
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchProfileTab(tabName);
            });
        });

        // Profile modal actions
        this.setupProfileModalHandlers();

        // Auth button
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            authBtn.addEventListener('click', () => {
                const currentProfile = this.profileManager.loadProfile();
                if (currentProfile && currentProfile.type !== 'guest') {
                    // Connecté - bouton Déconnexion
                    this.profileManager.logout();
                    this.updateProfileDisplay();
                    this.updateAuthButton();
                    this.showMessage('Déconnecté ✓', 'info');
                } else {
                    // Déconnecté - ouvrir modal
                    this.switchProfileTab('login');
                    this.openProfileModal();
                }
            });
        }
    }

    /**
     * Mettre à jour le bouton auth (Connexion/Déconnexion)
     */
    updateAuthButton() {
        const authBtn = document.getElementById('authBtn');
        const authText = document.getElementById('authText');
        const currentProfile = this.profileManager.loadProfile();
        
        if (authBtn && authText) {
            if (currentProfile && currentProfile.type !== 'guest') {
                authText.textContent = '🔓 Déconnexion';
            } else {
                authText.textContent = '🔐 Connexion';
            }
        }
    }

    /**
     * Ouvrir la modal de profil
     */
    openProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateProfileModalContent();
        }
    }

    /**
     * Fermer la modal de profil
     */
    closeProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Changer d'onglet dans la modal profil
     */
    switchProfileTab(tabName) {
        // Désactiver tous les onglets
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Activer l'onglet sélectionné
        const tabContent = document.getElementById(`tab-${tabName}`);
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabContent) tabContent.classList.add('active');
        if (tabBtn) tabBtn.classList.add('active');

        // Remplir les stats si connecté
        if (tabName === 'stats' && this.profileManager.currentProfile.type !== 'guest') {
            this.displayStats();
        }

        // Remplir les badges
        if (tabName === 'badges') {
            this.displayBadges();
        }

        // Remplir les défis quotidiens
        if (tabName === 'challenges') {
            this.displayChallenges();
        }

        // Remplir le leaderboard
        if (tabName === 'leaderboard') {
            this.displayLeaderboard();
        }
    }

    /**
     * Configurer les handlers des boutons de la modal profil
     */
    setupProfileModalHandlers() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const usernameInput = document.getElementById('loginUsername');
                const passwordInput = document.getElementById('loginPassword');
                const username = usernameInput.value.trim();
                const password = passwordInput.value;
                
                if (!username || !password) {
                    this.showModalError('loginError', 'Veuillez entrer votre pseudo et mot de passe');
                    return;
                }
                
                const result = this.profileManager.login(username, password);
                if (result.success) {
                    this.updateProfileDisplay();
                    this.closeProfileModal();
                    this.showMessage('Connecté à ' + username + ' ✓', 'success');
                    usernameInput.value = '';
                    passwordInput.value = '';
                } else {
                    this.showModalError('loginError', result.error || 'Erreur lors de la connexion');
                }
            });
        }

        // Signup button
        const signupBtn = document.getElementById('signupBtn');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                const usernameInput = document.getElementById('signupUsername');
                const passwordInput = document.getElementById('signupPassword');
                const confirmInput = document.getElementById('signupPasswordConfirm');
                const username = usernameInput.value.trim();
                const password = passwordInput.value;
                const confirmPassword = confirmInput.value;
                
                if (!username) {
                    this.showModalError('signupError', 'Veuillez entrer un pseudo');
                    return;
                }
                if (!password) {
                    this.showModalError('signupError', 'Veuillez entrer un mot de passe');
                    return;
                }
                if (password !== confirmPassword) {
                    this.showModalError('signupError', 'Les mots de passe ne correspondent pas');
                    return;
                }
                
                const result = this.profileManager.createProfile(username, password);
                if (result.success) {
                    this.updateProfileDisplay();
                    this.closeProfileModal();
                    this.showMessage('Compte créé : ' + username + ' ✓', 'success');
                    usernameInput.value = '';
                    passwordInput.value = '';
                    confirmInput.value = '';
                } else {
                    this.showModalError('signupError', result.error || 'Erreur lors de la création du compte');
                }
            });
        }

        // Guest button
        const guestBtn = document.getElementById('guestBtn');
        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                this.profileManager.loginAsGuest();
                this.updateProfileDisplay();
                this.closeProfileModal();
                this.showMessage('Connecté en tant qu\'invité', 'success');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.profileManager.logout();
                this.updateProfileDisplay();
                this.updateProfileModalContent();
                this.showMessage('Déconnecté', 'info');
            });
        }
    }

    /**
     * Mettre à jour le contenu de la modal profil
     */
    updateProfileModalContent() {
        const currentProfile = this.profileManager.loadProfile();
        const profileInfo = document.getElementById('profileInfo');
        
        if (currentProfile) {
            profileInfo.style.display = 'block';
            const displayName = currentProfile.type === 'guest' ? 'Invité' : currentProfile.name;
            document.getElementById('currentProfileDisplay').textContent = displayName;
            
            const stats = this.profileManager.getFormattedStats();
            const statsHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div class="profile-stat-item"><strong>Parties:</strong> ${stats.gamesPlayed}</div>
                    <div class="profile-stat-item"><strong>Vic. Blancs:</strong> ${stats.whiteWins}</div>
                    <div class="profile-stat-item"><strong>Vic. Noirs:</strong> ${stats.blackWins}</div>
                    <div class="profile-stat-item"><strong>Nulles:</strong> ${stats.draws}</div>
                    <div class="profile-stat-item"><strong>Niveau:</strong> ${stats.level}</div>
                    <div class="profile-stat-item"><strong>XP:</strong> ${stats.xp}/${stats.xpNextLevel}</div>
                </div>
            `;
            document.getElementById('profileStats').innerHTML = statsHtml;
        } else {
            profileInfo.style.display = 'none';
        }
    }

    /**
     * Afficher une erreur dans la modal
     */
    showModalError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Afficher les statistiques avancées
     */
    displayStats() {
        const statsContent = document.getElementById('statsContent');
        const profile = this.profileManager.currentProfile;
        const stats = this.profileManager.getFormattedStats();
        
        if (!statsContent) return;

        const tier = this.profileManager.getCurrentTier();
        
        let html = `
            <div style="grid-column: 1 / -1;">
                <div class="tier-banner" style="background: linear-gradient(135deg, ${tier.color} 0%, ${tier.color}dd 100%);">
                    ${tier.name} - Level ${profile.stats.level}
                </div>
                <div class="xp-bar">
                    <div class="xp-fill" style="width: ${stats.xpPercent}%">
                        ${Math.round(stats.xpPercent)}%
                    </div>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); text-align: center;">
                    ${profile.stats.xp} / ${profile.stats.xpNextLevel} XP
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Parties</div>
                <div class="stat-value">${stats.gamesPlayed}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Victoires</div>
                <div class="stat-value">${stats.totalWins}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Taux de Victoire</div>
                <div class="stat-value">${stats.winrate}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Nulles</div>
                <div class="stat-value">${stats.draws}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Victoires Blanc</div>
                <div class="stat-value">${stats.whiteWins}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Victoires Noir</div>
                <div class="stat-value">${stats.blackWins}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Coups Totaux</div>
                <div class="stat-value">${stats.totalMoves}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Moy. Coups/Partie</div>
                <div class="stat-value">${stats.avgMovesPerGame}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Meilleure Série</div>
                <div class="stat-value">🔥 ${stats.maxWinStreak}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Badges</div>
                <div class="stat-value">${stats.badgeCount}/${stats.totalBadgesAvailable}</div>
            </div>
        `;
        
        // Ajouter le classement si pas seul joueur
        if (this.profileManager.allProfiles && Object.keys(this.profileManager.allProfiles).length > 1) {
            const rank = this.profileManager.getPlayerRank('level');
            html += `
                <div class="stat-card" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
                    <div class="stat-label" style="color: white;">Classement</div>
                    <div class="stat-value" style="color: white;">#${rank.rank}/${rank.total}</div>
                </div>
            `;
        }
        
        statsContent.innerHTML = html;
    }

    /**
     * Afficher les badges
     */
    displayBadges() {
        const badgesContent = document.getElementById('badgesContent');
        const profile = this.profileManager.currentProfile;
        const badgeLibrary = this.profileManager.badgesLibrary;
        
        if (!badgesContent) return;

        let html = '';
        
        // Afficher tous les badges (unlocked + locked)
        Object.entries(badgeLibrary).forEach(([id, badgeInfo]) => {
            const unlocked = profile.badges.find(b => b.id === id);
            const isLocked = !unlocked;
            
            html += `
                <div class="badge-item ${isLocked ? 'locked' : ''}" title="${badgeInfo.name}: ${badgeInfo.desc}">
                    <div class="badge-rarity ${badgeInfo.rarity}">${badgeInfo.rarity}</div>
                    <div class="badge-icon">${badgeInfo.icon}</div>
                    <div class="badge-name">${badgeInfo.name.split(' ').slice(1).join(' ')}</div>
                </div>
            `;
        });
        
        badgesContent.innerHTML = html;
    }

    /**
     * Afficher le leaderboard
     */
    displayLeaderboard() {
        const leaderboardContent = document.getElementById('leaderboardContent');
        if (!leaderboardContent) return;

        const currentProfile = this.profileManager.currentProfile;
        let leaderboard = this.profileManager.getLeaderboard('level');
        
        let html = '';
        leaderboard.slice(0, 10).forEach((profile, index) => {
            const isSelf = currentProfile.name === profile.name;
            const rank = index + 1;
            let rankIcon = '🥇';
            if (rank === 2) rankIcon = '🥈';
            else if (rank === 3) rankIcon = '🥉';
            
            const stats = profile.stats;
            const totalWins = (stats.whiteWins || 0) + (stats.blackWins || 0);
            
            html += `
                <div class="leaderboard-row ${isSelf ? 'self' : ''}">
                    <div class="rank-badge ${rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''}">
                        ${rank}
                    </div>
                    <div>
                        <div class="leaderboard-name">${profile.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">
                            Lvl ${stats.level} • ${stats.gamesPlayed} parties
                        </div>
                    </div>
                    <div class="leaderboard-stat">
                        ${stats.level}<br>
                        <span style="font-size: 10px; color: var(--text-secondary);">${totalWins} wins</span>
                    </div>
                </div>
            `;
        });
        
        leaderboardContent.innerHTML = html;
        
        // Ajouter les event listeners pour les filtres
        const filters = document.querySelectorAll('.leaderboard-filter');
        filters.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const sortBy = btn.dataset.sort;
                leaderboard = this.profileManager.getLeaderboard(sortBy);
                
                let newHtml = '';
                leaderboard.slice(0, 10).forEach((profile, index) => {
                    const isSelf = currentProfile.name === profile.name;
                    const rank = index + 1;
                    const stats = profile.stats;
                    const totalWins = (stats.whiteWins || 0) + (stats.blackWins || 0);
                    const winrate = stats.gamesPlayed > 0 ? ((totalWins / stats.gamesPlayed) * 100).toFixed(0) : 0;
                    
                    newHtml += `
                        <div class="leaderboard-row ${isSelf ? 'self' : ''}">
                            <div class="rank-badge ${rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''}">
                                ${rank}
                            </div>
                            <div>
                                <div class="leaderboard-name">${profile.name}</div>
                                <div style="font-size: 11px; color: var(--text-secondary);">
                                    Lvl ${stats.level} • ${stats.gamesPlayed} parties
                                </div>
                            </div>
                            <div class="leaderboard-stat">
                                ${sortBy === 'level' ? stats.level : sortBy === 'wins' ? totalWins : sortBy === 'winrate' ? winrate + '%' : (profile.badges || []).length}
                            </div>
                        </div>
                    `;
                });
                
                leaderboardContent.innerHTML = newHtml;
            });
        });
    }

    /**
     * Afficher les défis quotidiens
     */
    displayChallenges() {
        const grid = document.getElementById('challengesGrid');
        const summary = document.getElementById('challengesSummary');
        if (!grid || !summary) return;

        const profile = this.profileManager.currentProfile;
        const challenges = profile.dailyChallenges || [];

        // Mettre à jour le résumé
        const completed = challenges.filter(c => c.completed).length;
        const remaining = challenges.reduce((sum, c) => sum + (c.completed ? 0 : c.reward), 0);

        const completedCountEl = document.getElementById('completedCount');
        const remainingXPEl = document.getElementById('remainingXP');
        if (completedCountEl) completedCountEl.textContent = `${completed}/${challenges.length}`;
        if (remainingXPEl) remainingXPEl.textContent = `${remaining} XP`;

        // Générer les cartes de challenges
        let html = '';
        challenges.forEach(challenge => {
            const progress = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
            const isCompleted = challenge.completed;

            html += `
                <div class="challenge-card ${isCompleted ? 'completed' : ''}">
                    <div class="challenge-icon">${challenge.icon}</div>
                    <div class="challenge-content">
                        <div class="challenge-header">
                            <div class="challenge-name">${challenge.name}</div>
                            <div class="challenge-reward">+${challenge.reward} XP</div>
                        </div>
                        <div class="challenge-description">${challenge.description}</div>
                        <div class="challenge-progress">
                            <div class="challenge-progress-bar" style="width: ${progress}%;"></div>
                        </div>
                        <div class="challenge-progress-text">${challenge.progress}/${challenge.target}</div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    /**
     * Mettre à jour les stats après une partie et afficher l'XP gain
     */
    updateGameStats(result, totalMoves) {
        const oldLevel = this.profileManager.currentProfile.stats.level;
        const oldBadges = [...this.profileManager.currentProfile.badges];
        const oldChallenges = this.profileManager.currentProfile.dailyChallenges 
            ? [...this.profileManager.currentProfile.dailyChallenges.map(c => ({ ...c }))]
            : [];
        
        // Mettre à jour les stats
        this.profileManager.updateStatsAfterGame(result, totalMoves);
        
        const newLevel = this.profileManager.currentProfile.stats.level;
        const stats = this.profileManager.currentProfile.stats;
        
        // Calcul XP gain
        let xpGain = 0;
        const isWin = result === 'white-win' || result === 'black-win';
        if (isWin) {
            xpGain = 30 + Math.floor(totalMoves / 5);
        } else {
            xpGain = 20 + Math.floor(totalMoves / 10);
        }
        if (totalMoves < 30) xpGain += 10;
        else if (totalMoves > 80) xpGain += 15;
        
        // Afficher l'XP gain
        this.showXPGain(xpGain);
        
        // Afficher les défis complétés
        if (this.profileManager.currentProfile.dailyChallenges) {
            this.profileManager.currentProfile.dailyChallenges.forEach((newChall, idx) => {
                const oldChall = oldChallenges[idx];
                if (!oldChall?.completed && newChall.completed) {
                    this.showChallengeComplete(newChall);
                }
            });
        }
        
        // Afficher les nouveaux badges
        const newBadges = this.profileManager.currentProfile.badges.filter(b => 
            !oldBadges.find(ob => ob.id === b.id)
        );
        
        newBadges.forEach(badge => {
            this.showBadgeUnlock(badge);
        });
        
        // Montée de niveau
        if (newLevel > oldLevel) {
            this.showLevelUp(newLevel);
        }
        
        // Afficher le streak
        if (isWin) {
            this.showStreak(stats.winStreak);
        }

        // Mettre à jour le panneau droit
        this.updateRightPanel();
    }

    /**
     * Afficher une notification d'XP gain
     */
    showXPGain(xpAmount) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease;
            z-index: 9999;
        `;
        notification.textContent = `+${xpAmount} XP 🎯`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    /**
     * Afficher le déblocage d'un badge
     */
    showBadgeUnlock(badge) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #9b59b6 0%, #f39c12 100%);
            color: white;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            animation: popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            z-index: 10000;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 12px;">${badge.icon}</div>
            <div style="font-size: 18px; margin-bottom: 8px;">BADGE DÉBLOQUÉ! 🏅</div>
            <div style="font-size: 14px; opacity: 0.9;">${badge.name}</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">${badge.desc}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'popOut 0.4s ease';
            setTimeout(() => notification.remove(), 400);
        }, 3000);
    }

    /**
     * Afficher la montée de niveau
     */
    showLevelUp(newLevel) {
        const notification = document.createElement('div');
        const tier = this.profileManager.getCurrentTier();
        
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
            color: white;
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            font-weight: 700;
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5);
            animation: levelUpPulse 0.6s ease;
            z-index: 10001;
        `;
        
        notification.innerHTML = `
            <div style="font-size: 60px; margin-bottom: 16px;">⚡</div>
            <div style="font-size: 24px; margin-bottom: 8px;">LEVEL UP!</div>
            <div style="font-size: 32px; margin-bottom: 12px;">Lvl ${newLevel}</div>
            <div style="font-size: 16px; opacity: 0.95;">${tier.name}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.4s ease';
            setTimeout(() => notification.remove(), 400);
        }, 3500);
    }

    /**
     * Afficher la complétion d'un challenge
     */
    showChallengeComplete(challenge) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            background: linear-gradient(135deg, #FFC107 0%, #FF9800 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease;
            z-index: 9999;
        `;
        notification.textContent = `${challenge.icon} Défi complété! +${challenge.reward} XP`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2500);

        // Mettre à jour l'affichage des challenges si l'onglet est actif
        if (document.getElementById('tab-challenges')?.classList.contains('active')) {
            this.displayChallenges();
        }
    }

    /**
     * Afficher la série de victoires
     */
    showStreak(streakCount) {
        if (streakCount < 2) return;
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 20px;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            animation: slideInUp 0.3s ease;
            z-index: 9999;
        `;
        notification.textContent = `🔥 Série de ${streakCount} victoires!`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    /**
     * Mettre à jour l'affichage du profil en haut
     */
    updateProfileDisplay() {
        try {
            const currentProfile = this.profileManager && this.profileManager.loadProfile ? this.profileManager.loadProfile() : null;
            const profileName = document.getElementById('profileName');
            const profileLevel = document.getElementById('profileLevel');
            
            if (currentProfile) {
                const displayName = currentProfile.type === 'guest' ? 'Invité' : currentProfile.name;
                if (profileName) profileName.textContent = displayName;
                if (profileLevel) profileLevel.textContent = `Lvl ${currentProfile.stats?.level || 1}`;
            } else {
                if (profileName) profileName.textContent = 'Invité';
                if (profileLevel) profileLevel.textContent = 'Lvl 1';
            }
            
            // Mettre à jour le bouton auth selon l'état de connexion
            this.updateAuthButton();
        } catch (err) {
            console.warn('[UpdateProfileDisplay] Erreur:', err.message);
        }
    }

    /**
     * Mettre à jour le panneau droit avec défis et réalisations
     */
    updateRightPanel() {
        this.displayDailyChallengesPanel();
        this.displayAchievementsPanel();
    }

    /**
     * Afficher les défis quotidiens dans le panneau droit
     */
    displayDailyChallengesPanel() {
        try {
            const container = document.getElementById('challenges');
            if (!container) return;

            const profile = this.profileManager && this.profileManager.currentProfile ? this.profileManager.currentProfile : null;
            const challenges = profile?.dailyChallenges || [];

            if (challenges.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px; text-align: center;">Aucun défi chargé</p>';
                return;
            }

            const completed = challenges.filter(c => c.completed).length;
            const total = challenges.length;
            const totalXP = challenges.reduce((sum, c) => sum + c.reward, 0);
        const earnedXP = challenges.filter(c => c.completed).reduce((sum, c) => sum + c.reward, 0);
        const completionPercent = Math.round((completed / total) * 100);

        let html = `
            <div style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 700; font-size: 12px; color: #FFC107;">🎯 QUÊTE DU JOUR</span>
                    <span style="background: ${completionPercent === 100 ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' : 'linear-gradient(135deg, #FF9800 0%, #FB8C00 100%)'}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">${completed}/${total}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">
                        <span>PROGRESSION</span>
                        <span>${completionPercent}%</span>
                    </div>
                    <div style="background: var(--bg-primary); border-radius: 6px; height: 10px; overflow: hidden; border: 1px solid rgba(255, 193, 7, 0.3); position: relative;">
                        <div style="background: linear-gradient(90deg, #FF9800 0%, #FFC107 50%, #4CAF50 100%); height: 100%; width: ${completionPercent}%; transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative;">
                            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%); animation: shine 2s infinite;"></div>
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px;">
                    <div style="background: rgba(76, 175, 80, 0.1); border-left: 2px solid #4CAF50; padding: 6px 8px; border-radius: 4px;">
                        <div style="color: var(--text-secondary); margin-bottom: 2px;">XP GAGNÉ</div>
                        <div style="font-weight: 700; color: #4CAF50;">${earnedXP}/${totalXP}</div>
                    </div>
                    <div style="background: rgba(255, 152, 0, 0.1); border-left: 2px solid #FF9800; padding: 6px 8px; border-radius: 4px;">
                        <div style="color: var(--text-secondary); margin-bottom: 2px;">RESTANT</div>
                        <div style="font-weight: 700; color: #FF9800;">+${totalXP - earnedXP} XP</div>
                    </div>
                </div>
            </div>
        `;

        // Afficher les défis avec des mini-cartes animées
        challenges.forEach((challenge, idx) => {
            const progress = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
            const isCompleted = challenge.completed;
            const rarityColors = {
                'common': '#95a5a6',
                'uncommon': '#3498db',
                'rare': '#9b59b6',
                'epic': '#f39c12'
            };
            const color = rarityColors[challenge.rarity] || '#95a5a6';
            
            html += `
                <div style="background: ${isCompleted ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.05) 100%)' : 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(52, 152, 219, 0.05) 100%)'}; border: 2px solid ${isCompleted ? '#4CAF50' : color}33; border-left: 4px solid ${isCompleted ? '#4CAF50' : color}; border-radius: 6px; padding: 10px; margin-bottom: 8px; position: relative; overflow: hidden; animation: slideInLeft 0.3s ease backwards; animation-delay: ${idx * 0.1}s;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%);"></div>
                    <div style="position: relative; z-index: 1;">
                        <div style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px;">
                            <span style="font-size: 24px; flex-shrink: 0;">${challenge.icon}</span>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 12px; color: var(--text-primary); margin-bottom: 2px;">${challenge.name}</div>
                                <div style="font-size: 10px; color: var(--text-secondary);">${challenge.description}</div>
                            </div>
                            ${isCompleted ? '<div style="font-size: 18px;">✓</div>' : ''}
                        </div>
                        <div style="background: var(--bg-primary); border-radius: 4px; height: 6px; overflow: hidden; border: 1px solid ${color}33; margin-bottom: 6px;">
                            <div style="background: linear-gradient(90deg, ${color} 0%, ${color}dd 100%); height: 100%; width: ${progress}%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px;">
                            <span style="color: var(--text-secondary);">${challenge.progress}/${challenge.target}</span>
                            <span style="background: rgba(255, 193, 7, 0.2); color: #FFC107; padding: 2px 6px; border-radius: 3px; font-weight: 600;">+${challenge.reward} XP</span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        } catch (err) {
            console.warn('[DisplayDailyChallenges] Erreur:', err.message);
        }
    }

    /**
     * Afficher les réalisations/badges dans le panneau droit
     */
    displayAchievementsPanel() {
        try {
            const container = document.getElementById('achievements');
            if (!container) return;

            const profile = this.profileManager && this.profileManager.currentProfile ? this.profileManager.currentProfile : null;
            const badges = profile?.badges || [];

        if (badges.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px; text-align: center;">Aucune réalisation déverrouillée 🔒</p>';
            return;
        }

        // Afficher tous les badges avec un header spectaculaire
        let html = `
            <div style="background: linear-gradient(135deg, rgba(155, 89, 182, 0.15) 0%, rgba(243, 156, 18, 0.15) 100%); border: 1px solid rgba(155, 89, 182, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 12px; text-align: center;">
                <div style="font-size: 28px; margin-bottom: 6px;">🏆</div>
                <div style="font-weight: 700; font-size: 12px; color: #9b59b6; margin-bottom: 4px;">COLLECTION</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--text-primary);">${badges.length}</div>
                <div style="font-size: 10px; color: var(--text-secondary);">réalisations déverrouillées</div>
            </div>
        `;

        // Afficher les badges en grille colorée avec animations
        badges.forEach((badge, idx) => {
            const rarityColors = {
                'common': { bg: '#95a5a6', text: '#7f8c8d' },
                'uncommon': { bg: '#3498db', text: '#2980b9' },
                'rare': { bg: '#9b59b6', text: '#8e44ad' },
                'epic': { bg: '#f39c12', text: '#e67e22' }
            };
            const colors = rarityColors[badge.rarity] || rarityColors['common'];
            
            html += `
                <div style="background: linear-gradient(135deg, rgba(${badge.rarity === 'common' ? '149, 165, 166' : badge.rarity === 'uncommon' ? '52, 152, 219' : badge.rarity === 'rare' ? '155, 89, 182' : '243, 156, 18'}, 0.12) 0%, var(--bg-secondary) 100%); border: 2px solid ${colors.bg}; border-radius: 8px; padding: 10px; margin-bottom: 8px; position: relative; overflow: hidden; animation: fadeIn 0.5s ease backwards; animation-delay: ${idx * 0.05}s; transition: all 0.2s ease;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);"></div>
                    <div style="position: relative; z-index: 1;">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <div style="font-size: 28px; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">${badge.icon}</div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 700; font-size: 11px; color: ${colors.bg}; text-transform: uppercase; letter-spacing: 0.5px;">${badge.name}</div>
                                <div style="font-size: 10px; color: var(--text-secondary); line-height: 1.3;">${badge.desc}</div>
                            </div>
                            <div style="font-size: 10px; background: ${colors.bg}; color: white; padding: 4px 8px; border-radius: 12px; font-weight: 600; flex-shrink: 0;">${badge.rarity.toUpperCase()[0]}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        } catch (err) {
            console.warn('[DisplayAchievements] Erreur:', err.message);
        }
    }
}
