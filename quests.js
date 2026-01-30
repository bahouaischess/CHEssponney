/**
 * Système de Quêtes et Exercices Gamifiés - ChessPoney
 * Les quêtes sont réparties entre play.html et exercises.html
 */

class QuestManager {
    constructor() {
        this.quests = [
            // ===== QUÊTES DE JEU (play.html) =====
            {
                id: 'first_game',
                type: 'play',
                title: '🎮 Première Partie',
                description: 'Jouer votre première partie',
                reward: { xp: 100, level_multiplier: 1 },
                progress: 0,
                target: 1,
                completed: false
            },
            {
                id: 'win_5_games',
                type: 'play',
                title: '🏆 Cinq Victoires',
                description: 'Remporter 5 parties',
                reward: { xp: 500, level_multiplier: 1.5 },
                progress: 0,
                target: 5,
                completed: false
            },
            {
                id: 'checkmate_5',
                type: 'play',
                title: '⚔️ Échec et Mat!',
                description: 'Faire 5 échecsmats',
                reward: { xp: 300, level_multiplier: 1.2 },
                progress: 0,
                target: 5,
                completed: false
            },
            {
                id: 'fast_game',
                type: 'play',
                title: '⚡ Blitz',
                description: 'Remporter une partie en moins de 5 minutes',
                reward: { xp: 150, level_multiplier: 1 },
                progress: 0,
                target: 1,
                completed: false
            },
            {
                id: 'long_game',
                type: 'play',
                title: '⏱️ Endurance',
                description: 'Jouer une partie de plus de 20 coups',
                reward: { xp: 200, level_multiplier: 1.1 },
                progress: 0,
                target: 1,
                completed: false
            },

            // ===== QUÊTES D'EXERCICES (exercises.html) =====
            {
                id: 'solve_first_puzzle',
                type: 'exercise',
                title: '🧩 Premier Puzzle',
                description: 'Résoudre votre premier puzzle',
                reward: { xp: 50, level_multiplier: 1 },
                progress: 0,
                target: 1,
                completed: false
            },
            {
                id: 'solve_10_puzzles',
                type: 'exercise',
                title: '🧩 Dix Puzzles',
                description: 'Résoudre 10 puzzles',
                reward: { xp: 300, level_multiplier: 1.2 },
                progress: 0,
                target: 10,
                completed: false
            },
            {
                id: 'solve_50_puzzles',
                type: 'exercise',
                title: '🧩 Expert Puzzle',
                description: 'Résoudre 50 puzzles',
                reward: { xp: 1000, level_multiplier: 2 },
                progress: 0,
                target: 50,
                completed: false
            },
            {
                id: 'tactic_master',
                type: 'exercise',
                title: '🎯 Maître Tactique',
                description: 'Résoudre 5 puzzles tactiques difficiles',
                reward: { xp: 400, level_multiplier: 1.5 },
                progress: 0,
                target: 5,
                completed: false
            },
            {
                id: 'perfect_puzzle',
                type: 'exercise',
                title: '✨ Puzzle Parfait',
                description: 'Résoudre 3 puzzles sans erreur',
                reward: { xp: 250, level_multiplier: 1.3 },
                progress: 0,
                target: 3,
                completed: false
            },

            // ===== QUÊTES GLOBALES (Combinées) =====
            {
                id: 'balanced_player',
                type: 'global',
                title: '⚖️ Joueur Équilibré',
                description: 'Jouer 5 parties ET résoudre 5 puzzles',
                reward: { xp: 400, level_multiplier: 1.4 },
                progress: 0,
                target: 1,
                completed: false,
                requirements: { games: 5, puzzles: 5 }
            },
            {
                id: 'level_10',
                type: 'global',
                title: '🌟 Niveau 10',
                description: 'Atteindre le niveau 10',
                reward: { xp: 500, level_multiplier: 1.5 },
                progress: 0,
                target: 1,
                completed: false,
                requirements: { level: 10 }
            }
        ];

        this.loadQuests();
    }

    loadQuests() {
        // Déterminer si c'est un invité
        const isGuest = !localStorage.getItem('currentProfile');
        const storageKey = 'chessponeyQuests';
        const storage = isGuest ? sessionStorage : localStorage;
        
        // Charger les quêtes sauvegardées
        const saved = storage.getItem(storageKey);
        if (saved) {
            try {
                const savedQuests = JSON.parse(saved);
                // Fusionner avec les quêtes par défaut (pour nouvelles quêtes)
                this.quests = this.quests.map(q => {
                    const saved_q = savedQuests.find(sq => sq.id === q.id);
                    return saved_q ? { ...q, ...saved_q } : q;
                });
            } catch (e) {
                console.error('Erreur chargement quêtes:', e);
            }
        }
        
        // Sauvegarder tout de suite
        this.saveQuests();
    }

    saveQuests() {
        const isGuest = !localStorage.getItem('currentProfile');
        const storageKey = 'chessponeyQuests';
        const storage = isGuest ? sessionStorage : localStorage;
        storage.setItem(storageKey, JSON.stringify(this.quests));
    }

    getQuestsByType(type) {
        return this.quests.filter(q => q.type === type);
    }

    updateQuestProgress(questId, amount = 1) {
        const quest = this.quests.find(q => q.id === questId);
        if (quest && !quest.completed) {
            quest.progress = Math.min(quest.progress + amount, quest.target);
            if (quest.progress >= quest.target) {
                quest.completed = true;
                this.saveQuests();
                return { completed: true, reward: quest.reward };
            }
            this.saveQuests();
        }
        return { completed: false };
    }

    completeQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (quest && !quest.completed) {
            quest.completed = true;
            quest.progress = quest.target;
            this.saveQuests();
            return quest.reward;
        }
        return null;
    }

    getActiveQuests() {
        return this.quests.filter(q => !q.completed);
    }

    getCompletedQuests() {
        return this.quests.filter(q => q.completed);
    }

    getQuestProgress(questId) {
        const quest = this.quests.find(q => q.id === questId);
        return quest ? { progress: quest.progress, target: quest.target, completed: quest.completed } : null;
    }

    resetAllQuests() {
        this.quests.forEach(q => {
            q.progress = 0;
            q.completed = false;
        });
        this.saveQuests();
    }

    triggerEvent(eventType, data = {}) {
        // Déclenche les mises à jour de quêtes basées sur les événements
        if (eventType === 'solve_puzzle') {
            // Incrementer solve_first_puzzle
            this.updateQuestProgress('solve_first_puzzle', 1);
            // Incrementer solve_10_puzzles
            this.updateQuestProgress('solve_10_puzzles', 1);
            // Incrementer solve_50_puzzles
            this.updateQuestProgress('solve_50_puzzles', 1);
            // Incrementer tactic_master si difficulté difficile+
            if (data.exerciseDifficulty && ['difficile', 'impossible', 'grand-maître'].includes(data.exerciseDifficulty)) {
                this.updateQuestProgress('tactic_master', 1);
            }
            // Incrementer perfect_puzzle (on assume qu'il n'y a pas d'erreur si le puzzle est résolu)
            this.updateQuestProgress('perfect_puzzle', 1);
        } else if (eventType === 'win_game') {
            this.updateQuestProgress('first_game', 1);
            this.updateQuestProgress('win_5_games', 1);
        } else if (eventType === 'checkmate') {
            this.updateQuestProgress('checkmate_5', 1);
        }
    }
}

// Initialiser globalement
const questManager = new QuestManager();
