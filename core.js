/**
 * CORE - Moteur centralisé du jeu ChessPoney
 * Fusion de: gamestate, profile-manager, quests, gamification
 * Émet TOUS les événements du système
 */

class ChessPoneyCore {
    constructor() {
        // ===== ÉTAT DU JEU =====
        this.game = new ChessGame();
        this.selectedSquare = null;
        this.validMoves = [];
        this.pendingPromotion = null;
        this.lastMove = null;
        
        // ===== PROFIL & STATS =====
        this.profile = this.loadProfile();
        this.isGuest = this.profile.type === 'guest';
        
        // ===== GAMIFICATION =====
        this.badges = this.initBadges();
        this.tiers = this.initTiers();
        this.quests = this.initQuests();
        this.dailyChallenges = this.profile.dailyChallenges || [];
        
        // ===== GESTION D'ÉVÉNEMENTS =====
        this.listeners = {};
    }

    // ========== ÉVÉNEMENTS ==========
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    // ========== GESTION DU JEU ==========
    selectSquare(row, col) {
        if (!this.game.board[row][col]) {
            this.clearSelection();
            return;
        }
        const piece = this.game.board[row][col];
        if (piece.color !== this.game.currentPlayer && !window.analysisMode) {
            return;
        }
        this.selectedSquare = { row, col };
        this.validMoves = this.game.getPossibleMoves(row, col);
        this.emit('squareSelected', { row, col, validMoves: this.validMoves });
    }

    clearSelection() {
        this.selectedSquare = null;
        this.validMoves = [];
        this.emit('selectionCleared', null);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const isValid = this.validMoves.some(m => m[0] === toRow && m[1] === toCol);
        if (!isValid) return false;

        if (this.game.needsPromotion(fromRow, fromCol, toRow, toCol)) {
            this.pendingPromotion = { fromRow, fromCol, toRow, toCol };
            this.emit('promotionNeeded', { fromRow, fromCol, toRow, toCol });
            return true;
        }

        const moved = this.game.makeMove(fromRow, fromCol, toRow, toCol, null);
        if (!moved) return false;

        this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
        this.clearSelection();
        
        // Incrémenter les stats
        this.profile.stats.totalMoves++;
        
        this.emit('moveMade', { from: this.lastMove.from, to: this.lastMove.to });
        this.checkGameState();
        this.save();

        return true;
    }

    promoteAndMove(fromRow, fromCol, toRow, toCol, promotionType) {
        const moved = this.game.makeMove(fromRow, fromCol, toRow, toCol, promotionType);
        if (!moved) return false;

        this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
        this.clearSelection();
        this.profile.stats.totalMoves++;
        
        this.emit('moveMade', { from: this.lastMove.from, to: this.lastMove.to, promotion: promotionType });
        this.checkGameState();
        this.save();

        return true;
    }

    newGame() {
        this.game = new ChessGame();
        this.selectedSquare = null;
        this.validMoves = [];
        this.pendingPromotion = null;
        this.lastMove = null;
        this.emit('newGame', null);
    }

    undoMove() {
        if (this.game.moveHistory.length === 0) {
            this.emit('message', { text: '↶ Impossible d\'annuler', type: 'warning' });
            return false;
        }
        this.game.undoMove();
        this.clearSelection();
        this.emit('moveUndone', null);
        this.emit('message', { text: '↶ Coup annulé', type: 'info' });
        this.save();
        return true;
    }

    checkGameState() {
        const currentPlayer = this.game.currentPlayer;
        const opponentColor = currentPlayer === 'white' ? 'black' : 'white';
        const opponentMoves = this.game.getAllLegalMoves(opponentColor);

        if (opponentMoves.length === 0) {
            if (this.game.isInCheck(opponentColor)) {
                this.finishGame('checkmate', opponentColor);
            } else {
                this.finishGame('stalemate', null);
            }
            return;
        }

        if (this.game.isInCheck(opponentColor)) {
            this.emit('check', { player: opponentColor });
            this.emit('message', { text: `⚠️ ${opponentColor === 'white' ? 'Blanc' : 'Noir'} en échec !`, type: 'warning' });
        }
    }

    finishGame(result, winner) {
        const opponentColor = this.game.currentPlayer === 'white' ? 'black' : 'white';
        
        // Mettre à jour stats
        this.profile.stats.gamesPlayed++;
        if (result === 'checkmate') {
            if (winner === 'white') this.profile.stats.whiteWins++;
            else this.profile.stats.blackWins++;
            this.emit('message', { text: `🎉 Échec et mat ! ${winner === 'white' ? 'Blanc' : 'Noir'} gagne !`, type: 'success' });
            this.emit('checkmate', { winner, loser: opponentColor });
        } else if (result === 'stalemate') {
            this.profile.stats.draws++;
            this.emit('message', { text: '🤝 Pat - Partie nulle !', type: 'info' });
            this.emit('stalemate', { player: this.game.currentPlayer });
        }

        // Émettre événement de fin
        this.emit('gameEnded', { result, winner });
        
        // Vérifier/récompenser les quêtes
        this.updateQuestProgress(result, winner);
        this.updateDailyChallenges(result, winner);
        
        this.save();
    }

    // ========== PROFIL & GAMIFICATION ==========
    loadProfile() {
        const guestSession = sessionStorage.getItem('guestProfile');
        if (guestSession) return JSON.parse(guestSession);

        const profileName = localStorage.getItem('currentProfile');
        if (profileName) return JSON.parse(localStorage.getItem(`profile_${profileName}`)) || this.defaultProfile();
        
        return this.defaultProfile();
    }

    defaultProfile() {
        return {
            name: 'Invité',
            type: 'guest',
            createdAt: new Date().toISOString(),
            stats: {
                gamesPlayed: 0,
                whiteWins: 0,
                blackWins: 0,
                draws: 0,
                totalMoves: 0,
                level: 1,
                xp: 0,
                xpToNextLevel: 100
            },
            badges: [],
            completedQuests: [],
            dailyChallenges: this.getDefaultDailyChallenges()
        };
    }

    save() {
        // Sauvegarder dans localStorage ou sessionStorage
        if (this.isGuest) {
            sessionStorage.setItem('guestProfile', JSON.stringify(this.profile));
        } else {
            const profileName = this.profile.name;
            localStorage.setItem(`profile_${profileName}`, JSON.stringify(this.profile));
        }
        this.emit('profileUpdated', this.profile);
    }

    addXP(amount) {
        const oldLevel = this.profile.stats.level;
        this.profile.stats.xp += amount;
        
        // Calculer nouveau niveau
        let totalXpRequired = 0;
        let level = 1;
        while (totalXpRequired + (100 + (level - 1) * 50) <= this.profile.stats.xp) {
            totalXpRequired += 100 + (level - 1) * 50;
            level++;
        }
        
        this.profile.stats.level = level;
        this.profile.stats.xpToNextLevel = 100 + (level - 1) * 50;
        
        if (level > oldLevel) {
            this.emit('levelUp', { newLevel: level, xp: this.profile.stats.xp });
        }
        
        this.save();
    }

    addBadge(badgeId) {
        if (!this.profile.badges.includes(badgeId)) {
            this.profile.badges.push(badgeId);
            this.emit('badgeEarned', { badgeId, badge: this.badges[badgeId] });
            this.save();
        }
    }

    // ========== QUÊTES ==========
    initQuests() {
        return {
            firstGame: { id: 'firstGame', name: '🎮 Première Partie', desc: 'Jouer votre première partie', type: 'play', target: 1, progress: 0, reward: 100, completed: false },
            wins5: { id: 'wins5', name: '🏆 Cinq Victoires', desc: 'Remporter 5 parties', type: 'play', target: 5, progress: 0, reward: 500, completed: false },
            wins10: { id: 'wins10', name: '🏆 Dix Victoires', desc: 'Remporter 10 parties', type: 'play', target: 10, progress: 0, reward: 1000, completed: false },
            checkmate5: { id: 'checkmate5', name: '⚔️ Échec et Mat!', desc: 'Faire 5 échecsmats', type: 'play', target: 5, progress: 0, reward: 300, completed: false },
            whiteVictories5: { id: 'whiteVictories5', name: '⚪ Blancs Dominants', desc: '5 victoires en blanc', type: 'play', target: 5, progress: 0, reward: 250, completed: false },
            blackVictories5: { id: 'blackVictories5', name: '⚫ Noirs Puissants', desc: '5 victoires en noir', type: 'play', target: 5, progress: 0, reward: 250, completed: false }
        };
    }

    updateQuestProgress(result, winner) {
        if (result === 'checkmate' && winner) {
            this.quests.checkmate5.progress++;
            if (this.quests.checkmate5.progress >= this.quests.checkmate5.target && !this.quests.checkmate5.completed) {
                this.completeQuest('checkmate5');
            }

            const whiteOrBlack = winner === 'white' ? 'whiteVictories5' : 'blackVictories5';
            this.quests[whiteOrBlack].progress++;
            if (this.quests[whiteOrBlack].progress >= this.quests[whiteOrBlack].target && !this.quests[whiteOrBlack].completed) {
                this.completeQuest(whiteOrBlack);
            }
        }

        const totalWins = this.profile.stats.whiteWins + this.profile.stats.blackWins;
        this.quests.firstGame.progress = Math.min(1, totalWins);
        this.quests.wins5.progress = Math.min(totalWins, 5);
        this.quests.wins10.progress = Math.min(totalWins, 10);

        for (let questId of ['firstGame', 'wins5', 'wins10']) {
            if (this.quests[questId].progress >= this.quests[questId].target && !this.quests[questId].completed) {
                this.completeQuest(questId);
            }
        }
    }

    completeQuest(questId) {
        const quest = this.quests[questId];
        if (!quest || quest.completed) return;
        
        quest.completed = true;
        this.profile.completedQuests.push(questId);
        const xpReward = quest.reward;
        this.addXP(xpReward);
        this.emit('questCompleted', { questId, quest, xpReward });
        this.save();
    }

    // ========== DÉFIS QUOTIDIENS ==========
    getDefaultDailyChallenges() {
        return [
            { id: 'wins3', name: '🎯 Trio Gagnant', desc: 'Remporter 3 parties', type: 'wins', target: 3, progress: 0, reward: 50, completed: false },
            { id: 'games5', name: '⚔️ Guerrier', desc: 'Jouer 5 parties', type: 'games', target: 5, progress: 0, reward: 40, completed: false }
        ];
    }

    updateDailyChallenges(result, winner) {
        this.dailyChallenges.forEach(challenge => {
            if (challenge.completed) return;
            
            if (challenge.type === 'games') {
                challenge.progress++;
            } else if (challenge.type === 'wins' && result === 'checkmate' && winner) {
                challenge.progress++;
            }

            if (challenge.progress >= challenge.target) {
                challenge.completed = true;
                this.addXP(challenge.reward);
                this.emit('dailyChallengeCompleted', { challenge, xpReward: challenge.reward });
            }
        });
    }

    // ========== BADGES & TIERS ==========
    initBadges() {
        return {
            firstGame: { name: '🎮 Première Partie', desc: 'Joue ta première partie', rarity: 'common' },
            whiteVictory5: { name: '⚪ Blancs Dominants', desc: '5 victoires en blanc', rarity: 'uncommon' },
            blackVictory5: { name: '⚫ Noirs Puissants', desc: '5 victoires en noir', rarity: 'uncommon' },
            checkmate5: { name: '⚔️ Maître Tactique', desc: '5 échecsmats', rarity: 'rare' },
            level5: { name: '⚡ Apprenti Maître', desc: 'Atteindre niveau 5', rarity: 'uncommon' },
            level10: { name: '⚡⭐ Maître Confirmé', desc: 'Atteindre niveau 10', rarity: 'rare' }
        };
    }

    initTiers() {
        return [
            { level: 1, name: '🥚 Œuf', color: '#95a5a6' },
            { level: 5, name: '🐣 Poussin', color: '#f39c12' },
            { level: 10, name: '🦅 Aigle', color: '#e74c3c' },
            { level: 15, name: '👑 Roi', color: '#f1c40f' },
            { level: 20, name: '⚡ Dieu', color: '#9b59b6' },
            { level: 30, name: '👹 Titan', color: '#2c3e50' }
        ];
    }

    getTierForLevel(level) {
        for (let i = this.tiers.length - 1; i >= 0; i--) {
            if (level >= this.tiers[i].level) return this.tiers[i];
        }
        return this.tiers[0];
    }

    // ========== UTILITAIRES ==========
    getWinRate() {
        const total = this.profile.stats.whiteWins + this.profile.stats.blackWins + this.profile.stats.draws;
        if (total === 0) return 0;
        return ((this.profile.stats.whiteWins + this.profile.stats.blackWins) / total * 100).toFixed(1);
    }

    reset() {
        this.newGame();
        this.emit('stateChanged', { game: this.game, profile: this.profile });
    }
}

// Export pour Node/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessPoneyCore;
}
