/**
 * UI RENDERER - Couche de présentation réactive simplifiée
 * Écoute les événements de core.js et met à jour l'interface
 */

class UIRenderer {
    constructor(core) {
        this.core = core;
        this.dragStartRow = null;
        this.dragStartCol = null;
        this.init();
    }

    init() {
        this.createBoard();
        this.attachEventListeners();
        this.subscribeToEvents();
        this.updateAllDisplays();
    }

    // ========== PLATEAU DE JEU ==========
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
                
                const piece = this.core.game.board[row][col];
                if (piece) {
                    const pieceEl = this.createPieceElement(piece);
                    square.appendChild(pieceEl);
                    pieceEl.draggable = true;
                    pieceEl.addEventListener('dragstart', (e) => this.onPieceDragStart(e, row, col));
                }
                
                square.addEventListener('dragover', (e) => this.onSquareDragOver(e, row, col));
                square.addEventListener('dragleave', (e) => this.onSquareDragLeave(e));
                square.addEventListener('drop', (e) => this.onSquareDrop(e, row, col));
                square.addEventListener('click', (e) => this.onSquareClick(e, row, col));
                
                board.appendChild(square);
            }
        }
        
        this.updateCheckHighlight();
        this.highlightLastMove();
    }

    createPieceElement(piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece ${piece.color} ${piece.type}`;
        pieceEl.dataset.type = piece.type;
        pieceEl.dataset.color = piece.color;
        pieceEl.textContent = this.getPieceSymbol(piece.type, piece.color);
        return pieceEl;
    }

    getPieceSymbol(type, color) {
        const symbols = {
            pawn: color === 'white' ? '♙' : '♟',
            knight: color === 'white' ? '♘' : '♞',
            bishop: color === 'white' ? '♗' : '♝',
            rook: color === 'white' ? '♖' : '♜',
            queen: color === 'white' ? '♕' : '♛',
            king: color === 'white' ? '♔' : '♚'
        };
        return symbols[type] || '';
    }

    // ========== DRAG & DROP ==========
    onPieceDragStart(e, row, col) {
        const piece = this.core.game.board[row][col];
        if (!piece || (piece.color !== this.core.game.currentPlayer && !window.analysisMode)) {
            e.preventDefault();
            return;
        }
        
        this.dragStartRow = row;
        this.dragStartCol = col;
        this.core.selectSquare(row, col);
        e.dataTransfer.effectAllowed = 'move';
    }

    onSquareDragOver(e, row, col) {
        e.preventDefault();
        if (this.dragStartRow !== null) {
            const isValid = this.core.validMoves.some(m => m[0] === row && m[1] === col);
            e.dataTransfer.dropEffect = isValid ? 'move' : 'none';
        }
    }

    onSquareDragLeave(e) {
        e.preventDefault();
    }

    onSquareDrop(e, row, col) {
        e.preventDefault();
        if (this.dragStartRow !== null) {
            this.core.makeMove(this.dragStartRow, this.dragStartCol, row, col);
            this.dragStartRow = null;
            this.dragStartCol = null;
        }
    }

    // ========== CLIC CLASSIQUE ==========
    onSquareClick(e, row, col) {
        if (this.core.selectedSquare && this.core.selectedSquare.row === row && this.core.selectedSquare.col === col) {
            this.core.clearSelection();
            return;
        }

        if (this.core.validMoves.some(m => m[0] === row && m[1] === col)) {
            this.core.makeMove(this.core.selectedSquare.row, this.core.selectedSquare.col, row, col);
        } else {
            this.core.selectSquare(row, col);
        }
    }

    // ========== AFFICHAGE ==========
    updateAllDisplays() {
        this.updateBoardDisplay();
        this.updateProfileDisplay();
        this.updateQuestsDisplay();
        this.updateGameInfoDisplay();
    }

    updateBoardDisplay() {
        this.createBoard();
        const currentPlayerEl = document.getElementById('currentPlayer');
        if (currentPlayerEl) {
            currentPlayerEl.textContent = this.core.game.currentPlayer === 'white' ? '⚪ Blanc' : '⚫ Noir';
        }
    }

    updateProfileDisplay() {
        const profile = this.core.profile;
        
        // Informations générales
        const nameEl = document.getElementById('profileUsername');
        if (nameEl) nameEl.textContent = profile.name || 'Invité';
        
        const levelEl = document.getElementById('profileLevel');
        if (levelEl) levelEl.textContent = profile.stats.level;
        
        const tierEl = document.getElementById('profileTier');
        const tier = this.core.getTierForLevel(profile.stats.level);
        if (tierEl) tierEl.innerHTML = `${tier.name} <span style="font-size: 0.8em; color: ${tier.color};">●</span>`;
        
        // Stats
        const statsEl = document.getElementById('profileStats');
        if (statsEl) {
            const total = profile.stats.gamesPlayed;
            const wins = profile.stats.whiteWins + profile.stats.blackWins;
            const wr = this.core.getWinRate();
            
            statsEl.innerHTML = `
                <div>Parties: <strong>${total}</strong></div>
                <div>Victoires: <strong>${wins}</strong></div>
                <div>Taux Victoire: <strong>${wr}%</strong></div>
                <div>Niv. Blanc: <strong>${profile.stats.whiteWins}</strong></div>
                <div>Niv. Noir: <strong>${profile.stats.blackWins}</strong></div>
                <div>Nulles: <strong>${profile.stats.draws}</strong></div>
                <div>XP: <strong>${profile.stats.xp}</strong> / ${profile.stats.xpToNextLevel}</div>
            `;
        }

        // Badges
        const badgesEl = document.getElementById('profileBadges');
        if (badgesEl) {
            badgesEl.innerHTML = profile.badges
                .map(bid => `<span class="badge" title="${this.core.badges[bid]?.desc || ''}">${this.core.badges[bid]?.name || '?'}</span>`)
                .join('');
        }
    }

    updateQuestsDisplay() {
        const quests = this.core.quests;
        const container = document.getElementById('questsList');
        if (!container) return;

        container.innerHTML = Object.values(quests)
            .map(quest => {
                const progress = Math.min(100, (quest.progress / quest.target) * 100);
                return `
                    <div class="quest-item ${quest.completed ? 'completed' : ''}">
                        <div class="quest-header">
                            <span>${quest.name}</span>
                            <span class="quest-xp">+${quest.reward}XP</span>
                        </div>
                        <div class="quest-description">${quest.desc}</div>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">${quest.progress}/${quest.target}</div>
                    </div>
                `;
            })
            .join('');
    }

    updateGameInfoDisplay() {
        const moveHistoryEl = document.getElementById('moveHistory');
        if (moveHistoryEl) {
            moveHistoryEl.innerHTML = this.core.game.moveHistory
                .map((move, i) => `<span>${i + 1}. ${move}</span>`)
                .join(' ');
        }
    }

    updateCheckHighlight() {
        const kingPos = this.findKingPosition(this.core.game.currentPlayer);
        if (kingPos && this.core.game.isInCheck(this.core.game.currentPlayer)) {
            const [row, col] = kingPos;
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (square) square.classList.add('check');
        }
        document.querySelectorAll('[data-row][data-col].check').forEach(el => {
            if (!this.isCurrentPlayerKingInCheck(el.dataset.row, el.dataset.col)) {
                el.classList.remove('check');
            }
        });
    }

    highlightLastMove() {
        document.querySelectorAll('[data-row][data-col]').forEach(el => el.classList.remove('last-move'));
        if (this.core.lastMove) {
            const { from, to } = this.core.lastMove;
            const fromEl = document.querySelector(`[data-row="${from.row}"][data-col="${from.col}"]`);
            const toEl = document.querySelector(`[data-row="${to.row}"][data-col="${to.col}"]`);
            if (fromEl) fromEl.classList.add('last-move');
            if (toEl) toEl.classList.add('last-move');
        }
    }

    findKingPosition(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.core.game.board[r][c];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return [r, c];
                }
            }
        }
        return null;
    }

    isCurrentPlayerKingInCheck(row, col) {
        const piece = this.core.game.board[parseInt(row)][parseInt(col)];
        return piece && piece.type === 'king' && piece.color === this.core.game.currentPlayer && this.core.game.isInCheck(this.core.game.currentPlayer);
    }

    // ========== ÉVÉNEMENTS ==========
    attachEventListeners() {
        // Boutons principaux
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) newGameBtn.addEventListener('click', () => this.core.newGame());

        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) undoBtn.addEventListener('click', () => this.core.undoMove());

        // Promotion
        const promotionBtns = document.querySelectorAll('[data-promotion]');
        promotionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const promotionType = e.target.dataset.promotion;
                if (this.core.pendingPromotion) {
                    const { fromRow, fromCol, toRow, toCol } = this.core.pendingPromotion;
                    this.core.promoteAndMove(fromRow, fromCol, toRow, toCol, promotionType);
                    this.hidePromotionModal();
                }
            });
        });
    }

    subscribeToEvents() {
        // Jeu
        this.core.on('squareSelected', () => this.updateBoardDisplay());
        this.core.on('moveMade', () => this.updateAllDisplays());
        this.core.on('newGame', () => this.updateAllDisplays());
        this.core.on('checkmate', () => this.updateAllDisplays());
        this.core.on('check', () => this.updateCheckHighlight());
        this.core.on('promotionNeeded', (data) => this.showPromotionModal(data));
        
        // Profil & Gamification
        this.core.on('profileUpdated', () => this.updateProfileDisplay());
        this.core.on('levelUp', (data) => this.showLevelUpAnimation(data));
        this.core.on('questCompleted', (data) => this.showQuestCompletedNotif(data));
        this.core.on('badgeEarned', (data) => this.showBadgeNotif(data));
        this.core.on('message', (data) => this.showMessage(data));
        
        // Défis quotidiens
        this.core.on('dailyChallengeCompleted', (data) => this.showChallengeBonusNotif(data));
    }

    showPromotionModal(data) {
        const modal = document.getElementById('promotionModal');
        if (!modal) {
            const div = document.createElement('div');
            div.id = 'promotionModal';
            div.className = 'modal';
            div.innerHTML = `
                <div class="modal-content">
                    <h3>Promotion du pion</h3>
                    <div class="promotion-buttons">
                        <button data-promotion="queen">♕ Reine</button>
                        <button data-promotion="rook">♖ Tour</button>
                        <button data-promotion="bishop">♗ Fou</button>
                        <button data-promotion="knight">♘ Cavalier</button>
                    </div>
                </div>
            `;
            document.body.appendChild(div);
        }
        modal.style.display = 'flex';
    }

    hidePromotionModal() {
        const modal = document.getElementById('promotionModal');
        if (modal) modal.style.display = 'none';
    }

    showMessage(data) {
        const container = document.getElementById('messageContainer') || this.createMessageContainer();
        const msg = document.createElement('div');
        msg.className = `message message-${data.type}`;
        msg.textContent = data.text;
        container.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    }

    showQuestCompletedNotif(data) {
        this.showMessage({ text: `🎯 Quête complétée: ${data.quest.name} +${data.xpReward}XP`, type: 'success' });
        this.updateQuestsDisplay();
    }

    showBadgeNotif(data) {
        this.showMessage({ text: `🏅 Badge obtenu: ${data.badge.name}`, type: 'success' });
        this.updateProfileDisplay();
    }

    showLevelUpAnimation(data) {
        this.showMessage({ text: `⭐ Niveau ${data.newLevel}!`, type: 'success' });
        this.updateProfileDisplay();
    }

    showChallengeBonusNotif(data) {
        this.showMessage({ text: `✨ Défi quotidien complété! +${data.xpReward}XP`, type: 'success' });
    }

    createMessageContainer() {
        const div = document.createElement('div');
        div.id = 'messageContainer';
        div.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(div);
        return div;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIRenderer;
}
