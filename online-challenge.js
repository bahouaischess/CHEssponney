/**
 * MODULE DÉFIS EN LIGNE - Jeu multijoueur temps réel
 * Permet à 2 joueurs de jouer ensemble via un lien de défi
 */

class OnlineChallenge {
    constructor() {
        this.activeChallenges = new Map(); // Map des défis actifs
        this.currentGameId = null;
        this.currentPlayer = null;
        this.observers = [];
        this.loadChallengesFromStorage();
    }

    /**
     * Générer un code de défi unique (6 caractères)
     */
    generateChallengeCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Créer un nouveau défi en ligne
     */
    createChallenge(playerName, playerColor = 'white', timing = '3+2') {
        const challengeCode = this.generateChallengeCode();
        
        // Parser le timing (ex: "3+2" -> {minutes: 3, increment: 2})
        const [minutes, increment] = timing.split('+').map(Number);
        
        const challenge = {
            code: challengeCode,
            createdAt: new Date().toISOString(),
            players: {
                [playerColor]: {
                    name: playerName,
                    id: this.generatePlayerId(),
                    color: playerColor,
                    status: 'ready',
                    timeRemaining: minutes * 60 * 1000, // Convertir en ms
                    lastMoveTime: Date.now()
                }
            },
            gameState: {
                moves: [],
                board: this.getInitialBoardState(),
                currentPlayer: 'white',
                gameStatus: 'waiting', // waiting, active, finished
                result: null
            },
            settings: {
                timeLimit: minutes * 60 * 1000, // Limite totale en ms
                timeIncrement: increment * 1000, // Incrément par coup en ms
                timingFormat: timing, // Format original (ex: "3+2")
                isPublic: false
            }
        };

        this.activeChallenges.set(challengeCode, challenge);
        this.saveChallengeToStorage(challengeCode, challenge);
        
        console.log(`[OnlineChallenge] Défi créé: ${challengeCode} (${timing})`);
        this.notifyObservers('challengeCreated', challenge);
        
        return challenge;
    }

    /**
     * Rejoindre un défi existant
     */
    joinChallenge(challengeCode, playerName) {
        const challenge = this.activeChallenges.get(challengeCode);
        
        if (!challenge) {
            console.error(`[OnlineChallenge] Défi ${challengeCode} non trouvé`);
            return { success: false, error: 'Défi introuvable' };
        }

        if (Object.keys(challenge.players).length >= 2) {
            return { success: false, error: 'Défi complet (2 joueurs max)' };
        }

        // Déterminer la couleur du second joueur
        const existingColor = Object.keys(challenge.players)[0];
        const newColor = existingColor === 'white' ? 'black' : 'white';
        
        // Récupérer la limite de temps du premier joueur
        const firstPlayer = Object.values(challenge.players)[0];
        const timeLimit = challenge.settings.timeLimit || (3 * 60 * 1000); // Par défaut 3min

        challenge.players[newColor] = {
            name: playerName,
            id: this.generatePlayerId(),
            color: newColor,
            status: 'ready',
            timeRemaining: timeLimit,
            lastMoveTime: Date.now()
        };

        challenge.gameState.gameStatus = 'active';
        this.saveChallengeToStorage(challengeCode, challenge);

        console.log(`[OnlineChallenge] ${playerName} a rejoint: ${challengeCode}`);
        this.notifyObservers('playerJoined', { challenge, player: challenge.players[newColor] });

        return { success: true, challenge };
    }

    /**
     * Enregistrer un mouvement dans le défi
     */
    recordMove(challengeCode, fromRow, fromCol, toRow, toCol, playerColor) {
        const challenge = this.activeChallenges.get(challengeCode);
        
        if (!challenge) return false;

        const move = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            player: playerColor,
            timestamp: new Date().toISOString()
        };

        challenge.gameState.moves.push(move);
        challenge.gameState.currentPlayer = playerColor === 'white' ? 'black' : 'white';
        
        this.saveChallengeToStorage(challengeCode, challenge);
        this.notifyObservers('moveRecorded', { challengeCode, move });

        return true;
    }

    /**
     * Obtenir l'état complet d'un défi
     */
    getChallenge(challengeCode) {
        return this.activeChallenges.get(challengeCode);
    }

    /**
     * Terminer un défi (victoire/abandon)
     */
    finishChallenge(challengeCode, result) {
        const challenge = this.activeChallenges.get(challengeCode);
        
        if (!challenge) return false;

        challenge.gameState.gameStatus = 'finished';
        challenge.gameState.result = result; // { winner: 'white'|'black', reason: 'checkmate'|'resignation'|'timeout' }
        
        this.saveChallengeToStorage(challengeCode, challenge);
        this.notifyObservers('challengeFinished', { challengeCode, result });

        return true;
    }

    /**
     * Obtenir l'URL de lien du défi pour partager
     */
    getShareLink(challengeCode) {
        const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, 'play.html');
        return `${baseUrl}?challenge=${challengeCode}`;
    }

    /**
     * Obtenir le code du défi depuis l'URL
     */
    getChallengeCodeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('challenge');
    }

    /**
     * Obtenir l'état initial du plateau
     */
    getInitialBoardState() {
        return {
            white: [
                { type: 'rook', positions: [[7, 0], [7, 7]] },
                { type: 'knight', positions: [[7, 1], [7, 6]] },
                { type: 'bishop', positions: [[7, 2], [7, 5]] },
                { type: 'queen', positions: [[7, 3]] },
                { type: 'king', positions: [[7, 4]] },
                { type: 'pawn', positions: [[6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 7]] }
            ],
            black: [
                { type: 'rook', positions: [[0, 0], [0, 7]] },
                { type: 'knight', positions: [[0, 1], [0, 6]] },
                { type: 'bishop', positions: [[0, 2], [0, 5]] },
                { type: 'queen', positions: [[0, 3]] },
                { type: 'king', positions: [[0, 4]] },
                { type: 'pawn', positions: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7]] }
            ]
        };
    }

    /**
     * Générateur d'ID joueur unique
     */
    generatePlayerId() {
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sauvegarder dans localStorage
     */
    saveChallengeToStorage(code, challenge) {
        try {
            const challenges = JSON.parse(localStorage.getItem('chessponeyOnlineChallenges') || '{}');
            challenges[code] = challenge;
            localStorage.setItem('chessponeyOnlineChallenges', JSON.stringify(challenges));
        } catch (e) {
            console.error('[OnlineChallenge] Erreur sauvegarde:', e);
        }
    }

    /**
     * Charger depuis localStorage
     */
    loadChallengesFromStorage() {
        try {
            const challenges = JSON.parse(localStorage.getItem('chessponeyOnlineChallenges') || '{}');
            for (const [code, challenge] of Object.entries(challenges)) {
                this.activeChallenges.set(code, challenge);
            }
            console.log(`[OnlineChallenge] ${this.activeChallenges.size} défis chargés`);
        } catch (e) {
            console.error('[OnlineChallenge] Erreur chargement:', e);
        }
    }

    /**
     * Observer pattern pour notifications en temps réel
     */
    subscribe(callback) {
        this.observers.push(callback);
    }

    notifyObservers(event, data) {
        this.observers.forEach(callback => callback(event, data));
    }

    /**
     * Nettoyer les anciens défis (> 24h)
     */
    cleanupOldChallenges() {
        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (const [code, challenge] of this.activeChallenges.entries()) {
            const createdTime = new Date(challenge.createdAt).getTime();
            if (now.getTime() - createdTime > oneDayMs) {
                this.activeChallenges.delete(code);
                try {
                    const challenges = JSON.parse(localStorage.getItem('chessponeyOnlineChallenges') || '{}');
                    delete challenges[code];
                    localStorage.setItem('chessponeyOnlineChallenges', JSON.stringify(challenges));
                } catch (e) {
                    console.error('[OnlineChallenge] Erreur nettoyage:', e);
                }
            }
        }
    }

    /**
     * Obtenir les défis actifs du joueur
     */
    getActiveGamesForPlayer(playerName) {
        const active = [];
        for (const [code, challenge] of this.activeChallenges.entries()) {
            if (challenge.gameState.gameStatus === 'active' || challenge.gameState.gameStatus === 'waiting') {
                const playerExists = Object.values(challenge.players).some(p => p.name === playerName);
                if (playerExists) {
                    active.push({ code, challenge });
                }
            }
        }
        return active;
    }
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnlineChallenge;
}
