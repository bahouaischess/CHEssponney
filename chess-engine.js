/**
 * Chessponey - Moteur d'Échecs CORRIGÉ AVEC ROQUE ET PROMOTIONS
 */

class ChessGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameState = 'playing';
        this.castleRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.lastPawnDoubleMove = null; // Pour l'en passant
        this.initializeBoard();
    }

    initializeBoard() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Rangée 7: Pièces blanches
        this.board[7] = [
            { type: 'rook', color: 'white' },
            { type: 'knight', color: 'white' },
            { type: 'bishop', color: 'white' },
            { type: 'queen', color: 'white' },
            { type: 'king', color: 'white' },
            { type: 'bishop', color: 'white' },
            { type: 'knight', color: 'white' },
            { type: 'rook', color: 'white' }
        ];

        // Rangée 6: Pions blancs
        for (let c = 0; c < 8; c++) {
            this.board[6][c] = { type: 'pawn', color: 'white' };
        }

        // Rangée 1: Pièces noires
        this.board[0] = [
            { type: 'rook', color: 'black' },
            { type: 'knight', color: 'black' },
            { type: 'bishop', color: 'black' },
            { type: 'queen', color: 'black' },
            { type: 'king', color: 'black' },
            { type: 'bishop', color: 'black' },
            { type: 'knight', color: 'black' },
            { type: 'rook', color: 'black' }
        ];

        // Rangée 2: Pions noirs
        for (let c = 0; c < 8; c++) {
            this.board[1][c] = { type: 'pawn', color: 'black' };
        }
    }

    isValid(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        let moves = [];

        // Obtenir les mouvements de base selon le type de pièce
        if (piece.type === 'pawn') {
            moves = this.getPawnMoves(row, col, piece.color);
        } else if (piece.type === 'knight') {
            moves = this.getKnightMoves(row, col, piece.color);
        } else if (piece.type === 'bishop') {
            moves = this.getBishopMoves(row, col, piece.color);
        } else if (piece.type === 'rook') {
            moves = this.getRookMoves(row, col, piece.color);
        } else if (piece.type === 'queen') {
            moves = this.getQueenMoves(row, col, piece.color);
        } else if (piece.type === 'king') {
            moves = this.getKingMoves(row, col, piece.color);
        }

        // RÈGLE CHESSPONEY: Ajouter les mouvements du cavalier pour toutes les pièces sauf King et Pawn
        if (piece.type !== 'king' && piece.type !== 'pawn') {
            const knightMoves = this.getKnightMoves(row, col, piece.color);
            // Ajouter sans doublons
            knightMoves.forEach(m => {
                if (!moves.some(existing => existing[0] === m[0] && existing[1] === m[1])) {
                    moves.push(m);
                }
            });
        }

        // Filtrer les mouvements illégaux (qui laisseraient le roi en échec)
        return moves.filter(([tr, tc]) => !this.wouldBeInCheck(row, col, tr, tc, piece.color));
    }

    getPawnMoves(r, c, color) {
        const moves = [];
        const dir = color === 'white' ? -1 : 1;
        const start = color === 'white' ? 6 : 1;

        // Avancer 1
        const nr = r + dir;
        if (this.isValid(nr, c) && !this.board[nr][c]) {
            moves.push([nr, c]);

            // Avancer 2 au départ
            if (r === start && !this.board[r + 2*dir][c]) {
                moves.push([r + 2*dir, c]);
            }
        }

        // Captures normales
        for (let dc of [-1, 1]) {
            const nr = r + dir;
            const nc = c + dc;
            if (this.isValid(nr, nc)) {
                const t = this.board[nr][nc];
                if (t && t.color !== color) {
                    moves.push([nr, nc]);
                }
            }
        }

        // EN PASSANT - Capture du pion adverse qui vient de faire un double-mouvement
        if (this.lastPawnDoubleMove) {
            const [lastR, lastC] = this.lastPawnDoubleMove;
            // Si un pion adverse est à côté et vient de faire un double-mouvement
            if (r === lastR && Math.abs(c - lastC) === 1) {
                // Le coup d'en passant amène le pion capturant sur la case devant
                // lui dans sa direction de déplacement
                const tr = r + dir;
                if (this.isValid(tr, lastC)) {
                    moves.push([tr, lastC]);
                }
            }
        }

        return moves;
    }

    getKnightMoves(r, c, color) {
        const moves = [];
        const offs = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

        offs.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isValid(nr, nc)) {
                const t = this.board[nr][nc];
                if (!t || t.color !== color) {
                    moves.push([nr, nc]);
                }
            }
        });

        return moves;
    }

    getBishopMoves(r, c, color) {
        const moves = [];
        const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];

        dirs.forEach(([dr, dc]) => {
            let nr = r + dr;
            let nc = c + dc;
            while (this.isValid(nr, nc)) {
                const t = this.board[nr][nc];
                if (!t) {
                    moves.push([nr, nc]);
                } else if (t.color !== color) {
                    moves.push([nr, nc]);
                    break;
                } else {
                    break;
                }
                nr += dr;
                nc += dc;
            }
        });

        return moves;
    }

    getRookMoves(r, c, color) {
        const moves = [];
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

        dirs.forEach(([dr, dc]) => {
            let nr = r + dr;
            let nc = c + dc;
            while (this.isValid(nr, nc)) {
                const t = this.board[nr][nc];
                if (!t) {
                    moves.push([nr, nc]);
                } else if (t.color !== color) {
                    moves.push([nr, nc]);
                    break;
                } else {
                    break;
                }
                nr += dr;
                nc += dc;
            }
        });

        return moves;
    }

    getQueenMoves(r, c, color) {
        return [...this.getRookMoves(r, c, color), ...this.getBishopMoves(r, c, color)];
    }

    getKingMoves(r, c, color) {
        const moves = [];
        const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

        dirs.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isValid(nr, nc)) {
                const t = this.board[nr][nc];
                if (!t || t.color !== color) {
                    moves.push([nr, nc]);
                }
            }
        });

        // ROQUE - Vérifications complètes
        if (color === 'white' && r === 7 && c === 4) {
            // Petit roque blanc
            if (this.castleRights.white.kingSide &&
                !this.board[7][5] && !this.board[7][6] &&
                this.board[7][7] && this.board[7][7].type === 'rook' &&
                !this.isInCheck('white') &&
                !this.isSquareAttacked(7, 5, 'black') &&
                !this.isSquareAttacked(7, 6, 'black')) {
                moves.push([7, 6]);
            }
            // Grand roque blanc
            if (this.castleRights.white.queenSide &&
                !this.board[7][1] && !this.board[7][2] && !this.board[7][3] &&
                this.board[7][0] && this.board[7][0].type === 'rook' &&
                !this.isInCheck('white') &&
                !this.isSquareAttacked(7, 3, 'black') &&
                !this.isSquareAttacked(7, 2, 'black')) {
                moves.push([7, 2]);
            }
        } else if (color === 'black' && r === 0 && c === 4) {
            // Petit roque noir
            if (this.castleRights.black.kingSide &&
                !this.board[0][5] && !this.board[0][6] &&
                this.board[0][7] && this.board[0][7].type === 'rook' &&
                !this.isInCheck('black') &&
                !this.isSquareAttacked(0, 5, 'white') &&
                !this.isSquareAttacked(0, 6, 'white')) {
                moves.push([0, 6]);
            }
            // Grand roque noir
            if (this.castleRights.black.queenSide &&
                !this.board[0][1] && !this.board[0][2] && !this.board[0][3] &&
                this.board[0][0] && this.board[0][0].type === 'rook' &&
                !this.isInCheck('black') &&
                !this.isSquareAttacked(0, 3, 'white') &&
                !this.isSquareAttacked(0, 2, 'white')) {
                moves.push([0, 2]);
            }
        }

        return moves;
    }

    wouldBeInCheck(fr, fc, tr, tc, color) {
        const orig = this.board[tr][tc];
        const p = this.board[fr][fc];

        this.board[tr][tc] = p;
        this.board[fr][fc] = null;

        const inCheck = this.isInCheck(color);

        this.board[fr][fc] = p;
        this.board[tr][tc] = orig;

        return inCheck;
    }

    isInCheck(color) {
        let kR, kC;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] && this.board[r][c].type === 'king' && this.board[r][c].color === color) {
                    kR = r;
                    kC = c;
                }
            }
        }

        if (kR === undefined) return false;

        const opp = color === 'white' ? 'black' : 'white';
        return this.isSquareAttacked(kR, kC, opp);
    }

    isSquareAttacked(r, c, byColor) {
        // Vérifier si la case (r,c) est attaquée par une pièce de couleur byColor
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === byColor) {
                    const moves = this.getBasicMoves(row, col, piece.type, piece.color);
                    if (moves.some(m => m[0] === r && m[1] === c)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getBasicMoves(r, c, type, color) {
        // Mouvements de base sans la règle spéciale (pour la détection d'échec)
        let moves = [];
        if (type === 'pawn') moves = this.getPawnMoves(r, c, color);
        else if (type === 'knight') moves = this.getKnightMoves(r, c, color);
        else if (type === 'bishop') moves = this.getBishopMoves(r, c, color);
        else if (type === 'rook') moves = this.getRookMoves(r, c, color);
        else if (type === 'queen') moves = this.getQueenMoves(r, c, color);
        else if (type === 'king') moves = this.getKingMoves(r, c, color);

        // Règle Chessponey: toutes les pièces (sauf le roi et le pion) contrôlent
        // également les déplacements du cavalier. Pour la détection d'échec,
        // inclure ces mouvements sans doublons.
        if (type !== 'king' && type !== 'pawn') {
            const knightMoves = this.getKnightMoves(r, c, color);
            knightMoves.forEach(m => {
                if (!moves.some(existing => existing[0] === m[0] && existing[1] === m[1])) {
                    moves.push(m);
                }
            });
        }

        return moves;
    }

    makeMove(fr, fc, tr, tc, promotion = null) {
        const p = this.board[fr][fc];
        if (!p || p.color !== this.currentPlayer) return false;

        const moves = this.getPossibleMoves(fr, fc);
        if (!moves.some(m => m[0] === tr && m[1] === tc)) return false;

        const t = this.board[tr][tc];
        let isEnPassant = false;

        // Gestion EN PASSANT
        if (p.type === 'pawn' && !t) {
            // Mouvement de pion sans capture = c'est une capture en passant possible
            if (Math.abs(fc - tc) === 1) {
                const capturedRow = fr; // Le pion capturé est à côté horizontalement
                const capturedPiece = this.board[capturedRow][tc];
                if (capturedPiece && capturedPiece.color !== p.color) {
                    this.capturedPieces[capturedPiece.color].push(capturedPiece);
                    this.board[capturedRow][tc] = null; // Supprimer le pion en passant
                    isEnPassant = true;
                }
            }
        } else if (t) {
            this.capturedPieces[t.color].push(t);
        }

        // Déterminer si c'est un double mouvement de pion (pour l'en passant)
        this.lastPawnDoubleMove = null;
        if (p.type === 'pawn' && Math.abs(fr - tr) === 2) {
            // Pion a fait un double-mouvement
            this.lastPawnDoubleMove = [tr, tc];
        }

        // Gestion du ROQUE
        let isCastling = false;
        if (p.type === 'king' && Math.abs(fc - tc) === 2) {
            isCastling = true;
            if (tc === 6) { // Petit roque
                this.board[fr][5] = this.board[fr][7];
                this.board[fr][7] = null;
            } else if (tc === 2) { // Grand roque
                this.board[fr][3] = this.board[fr][0];
                this.board[fr][0] = null;
            }
        }

        // Mise à jour des droits de roque
        if (p.type === 'king') {
            this.castleRights[p.color].kingSide = false;
            this.castleRights[p.color].queenSide = false;
        } else if (p.type === 'rook') {
            if (p.color === 'white') {
                if (fc === 0) this.castleRights.white.queenSide = false;
                if (fc === 7) this.castleRights.white.kingSide = false;
            } else {
                if (fc === 0) this.castleRights.black.queenSide = false;
                if (fc === 7) this.castleRights.black.kingSide = false;
            }
        }

        this.board[tr][tc] = p;
        this.board[fr][fc] = null;

        // PROMOTION DU PION
        if (p.type === 'pawn' && ((p.color === 'white' && tr === 0) || (p.color === 'black' && tr === 7))) {
            if (promotion) {
                p.type = promotion;
            } else {
                p.type = 'queen';
            }
        }

        this.moveHistory.push({
            fr, fc, tr, tc,
            p: { ...p },
            captured: t,
            isCastling,
            isEnPassant,
            promotion,
            castleRightsBefore: { ...this.castleRights[p.color] }
        });

        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.updateGameState();

        return true;
    }

    updateGameState() {
        const hasLegal = this.hasLegalMoves(this.currentPlayer);
        const inCheck = this.isInCheck(this.currentPlayer);

        if (inCheck && !hasLegal) {
            this.gameState = 'checkmate';
        } else if (inCheck) {
            this.gameState = 'check';
        } else if (!hasLegal) {
            this.gameState = 'stalemate';
        } else {
            this.gameState = 'playing';
        }
    }

    hasLegalMoves(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p && p.color === color && this.getPossibleMoves(r, c).length > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    undoMove() {
        if (this.moveHistory.length === 0) return false;

        const m = this.moveHistory.pop();

        // Restaurer la pièce
        this.board[m.fr][m.fc] = m.p;
        this.board[m.tr][m.tc] = null;

        // Restaurer la pièce capturée
        if (m.captured) {
            this.board[m.tr][m.tc] = m.captured;
            this.capturedPieces[m.captured.color].pop();
        }

        // Annuler le roque
        if (m.isCastling) {
            if (m.tc === 6) { // Petit roque
                this.board[m.fr][7] = this.board[m.fr][5];
                this.board[m.fr][5] = null;
            } else if (m.tc === 2) { // Grand roque
                this.board[m.fr][0] = this.board[m.fr][3];
                this.board[m.fr][3] = null;
            }
        }

        // Restaurer les droits de roque
        if (m.castleRightsBefore) {
            this.castleRights[m.p.color] = { ...m.castleRightsBefore };
        }

        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.updateGameState();

        return true;
    }

    reset() {
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.currentPlayer = 'white';
        this.gameState = 'playing';
        this.lastPawnDoubleMove = null;
        this.castleRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.initializeBoard();
    }

    // Méthode pour vérifier si un mouvement nécessite une promotion
    needsPromotion(fr, fc, tr, tc) {
        const p = this.board[fr][fc];
        return p && p.type === 'pawn' &&
               ((p.color === 'white' && tr === 0) || (p.color === 'black' && tr === 7));
    }

    isCheckmate() {
        return this.gameState === 'checkmate';
    }

    isStalemate() {
        return this.gameState === 'stalemate';
    }

    isCheck() {
        return this.gameState === 'check';
    }
}