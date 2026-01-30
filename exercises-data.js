/**
 * Exercices et Puzzles - ChessPoney
 * Contient les exercices tactiques pour les joueurs
 */

class ExerciseSet {
    constructor() {
        this.exercises = [
            {
                id: 1,
                title: 'Fou vs Cavalier',
                difficulty: 'Facile',
                description: 'Trouvez le meilleur coup',
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                solution: 'e2e4',
                hint: 'Avancez un pion central',
                completed: false
            },
            {
                id: 2,
                title: 'Ouverture Italienne',
                difficulty: 'Facile',
                description: 'Développez vos pièces',
                fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
                solution: 'e7e5',
                hint: 'Contrôlez le centre',
                completed: false
            },
            {
                id: 3,
                title: 'Gambit Roi',
                difficulty: 'Moyen',
                description: 'Un sacrifice classique',
                fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 1',
                solution: 'f2f4',
                hint: 'Sacrifiez un pion pour l\'initiative',
                completed: false
            },
            {
                id: 4,
                title: 'Défense Sicilienne',
                difficulty: 'Moyen',
                description: 'La défense la plus populaire',
                fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                solution: 'Nf3',
                hint: 'Développez vers le centre',
                completed: false
            },
            {
                id: 5,
                title: 'Tactique d\'Épingle',
                difficulty: 'Moyen',
                description: 'Une pièce piégée ne peut pas se défendre',
                fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
                solution: 'Bxc6',
                hint: 'Attaquez la pièce non défendue',
                completed: false
            },
            {
                id: 6,
                title: 'Fourchette',
                difficulty: 'Facile',
                description: 'Attaquer deux pièces à la fois',
                fen: '6k1/5ppp/8/8/3N4/8/5PPP/6K1 w - - 0 1',
                solution: 'Nf5',
                hint: 'Le cavalier peut en attaquer deux',
                completed: false
            },
            {
                id: 7,
                title: 'Brochette',
                difficulty: 'Moyen',
                description: 'Alignez roi et pièce',
                fen: '6k1/6pp/8/8/8/8/4R1PP/6K1 w - - 0 1',
                solution: 'Re8',
                hint: 'Cherchez l\'alignement',
                completed: false
            },
            {
                id: 8,
                title: 'Découverte',
                difficulty: 'Difficile',
                description: 'Bouger une pièce en révèle une autre',
                fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
                solution: 'dxc6',
                hint: 'Révélez l\'attaque cachée',
                completed: false
            },
            {
                id: 9,
                title: 'Double Attaque',
                difficulty: 'Moyen',
                description: 'Attaquez deux cibles importantes',
                fen: '2kr3r/8/8/8/8/8/4N3/2K5 w - - 0 1',
                solution: 'Nf4',
                hint: 'Menacez le roi et la tour',
                completed: false
            },
            {
                id: 10,
                title: 'Promotion',
                difficulty: 'Facile',
                description: 'Transformez votre pion en reine',
                fen: '6k1/6P1/6K1/8/8/8/8/8 w - - 0 1',
                solution: 'g8=Q',
                hint: 'Le pion peut devenir une reine',
                completed: false
            }
        ];

        this.currentExerciseId = 0;
        this.loadProgress();
    }

    loadProgress() {
        const saved = localStorage.getItem('chessponeyExercises');
        if (saved) {
            const savedExercises = JSON.parse(saved);
            this.exercises = this.exercises.map(e => {
                const saved_e = savedExercises.find(se => se.id === e.id);
                return saved_e ? { ...e, ...saved_e } : e;
            });
        }
    }

    saveProgress() {
        localStorage.setItem('chessponeyExercises', JSON.stringify(this.exercises));
    }

    getExercise(id) {
        return this.exercises.find(e => e.id === id);
    }

    getAllExercises() {
        return this.exercises;
    }

    getIncompleteExercises() {
        return this.exercises.filter(e => !e.completed);
    }

    getCompletedExercises() {
        return this.exercises.filter(e => e.completed);
    }

    completeExercise(id) {
        const exercise = this.getExercise(id);
        if (exercise && !exercise.completed) {
            exercise.completed = true;
            this.saveProgress();

            // Déclencher la quête
            if (typeof questManager !== 'undefined') {
                const puzzles_completed = this.getCompletedExercises().length;
                questManager.updateQuestProgress('solve_first_puzzle', 1);
                questManager.updateQuestProgress('solve_10_puzzles', 1);
                questManager.updateQuestProgress('solve_50_puzzles', 1);
                questManager.updateQuestProgress('tactic_master', 1);
            }

            return true;
        }
        return false;
    }

    getProgressStats() {
        const completed = this.getCompletedExercises().length;
        const total = this.exercises.length;
        return {
            completed: completed,
            total: total,
            percentage: Math.round((completed / total) * 100)
        };
    }

    resetProgress() {
        this.exercises.forEach(e => e.completed = false);
        this.saveProgress();
    }
}

// Initialiser globalement
const exerciseSet = new ExerciseSet();
