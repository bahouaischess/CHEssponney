/**
 * APP - Gestion principale de l'application ChessPoney
 */

class ChessPoneyApp {
    constructor() {
        this.currentSection = 'play';
        this.currentPuzzle = 0;
        this.puzzles = this.initPuzzles();
        this.completedPuzzles = [];
        this.exerciseGame = null;
        this.exerciseManager = null;
        this.profileManager = null;
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadCompletedPuzzles();
        
        // Initialiser ExerciseManager
        if (typeof ExerciseManager !== 'undefined') {
            this.exerciseManager = new ExerciseManager({containerId: 'exerciseBoard'});
        }

        // Attendre que le profileManager soit défini
        const self = this;
        setTimeout(() => {
            // S'assurer que ProfileManager est chargé
            if (typeof ProfileManager !== 'undefined') {
                self.loadProfilePage();
            }
        }, 100);
    }

    /**
     * Initialiser les puzzles d'entraînement
     */
    initPuzzles() {
        return [
            {
                id: 0,
                title: 'Puzzle 1: Mat en 1',
                description: 'Les Blancs jouent et font mat en 1 coup.',
                difficulty: '★☆☆',
                solution: 'Ff6#',
                position: {
                    'a1': { piece: 'K', color: 'white' },
                    'g5': { piece: 'B', color: 'white' },
                    'h8': { piece: 'k', color: 'black' }
                },
                turnColor: 'white',
                hint: 'Le fou blanc peut se déplacer...'
            },
            {
                id: 1,
                title: 'Puzzle 2: Double Attaque',
                description: 'Les Blancs jouent et gagnent du matériel.',
                difficulty: '★★☆',
                solution: 'Ra8+',
                position: {
                    'a1': { piece: 'R', color: 'white' },
                    'h8': { piece: 'k', color: 'black' },
                    'a8': { piece: 'r', color: 'black' },
                    'h1': { piece: 'N', color: 'white' }
                },
                turnColor: 'white',
                hint: 'Cherchez les coups d\'échec...'
            }
        ];
    }

    /**
     * Configurer la navigation entre les sections
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = btn.dataset.section;
                this.switchSection(section);
            });
        });

        // Ajouter des événements pour les boutons de jeu
        const playGameBtn = document.getElementById('playGameBtn');
        if (playGameBtn) {
            playGameBtn.addEventListener('click', () => {
                this.playNewGame();
            });
        }

        const createChallengeBtn = document.getElementById('createChallengeBtn');
        if (createChallengeBtn) {
            createChallengeBtn.addEventListener('click', () => {
                this.createChallenge();
            });
        }
    }

    /**
     * Changer de section
     */
    switchSection(section) {
        // Désactiver l'ancienne section
        const oldSection = document.getElementById(`section-${this.currentSection}`);
        if (oldSection) {
            oldSection.classList.remove('active');
        }

        // Activer la nouvelle section
        const newSection = document.getElementById(`section-${section}`);
        if (newSection) {
            newSection.classList.add('active');
        }

        // Mettre à jour les boutons de nav
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        this.currentSection = section;

        // Charger le contenu spécifique
        if (section === 'exercise') {
            this.loadExerciseMode();
        } else if (section === 'profile') {
            this.loadProfilePage();
        }
    }

    /**
     * Charger le mode exercice
     */
    loadExerciseMode() {
        // Utiliser ExerciseManager si disponible
        if (this.exerciseManager) {
            this.exerciseManager.init();
        } else {
            // Fallback: code original
            this.displayPuzzleList();
            this.displayPuzzle(this.currentPuzzle);
            this.createExerciseBoard();

            // Ajouter l'événement au bouton Puzzle Suivant
            const nextBtn = document.getElementById('nextPuzzleBtn');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (this.currentPuzzle < this.puzzles.length - 1) {
                        this.currentPuzzle++;
                        this.completePuzzle(this.currentPuzzle - 1);
                        this.loadExerciseMode();
                    } else {
                        alert('Félicitations! Vous avez complété tous les puzzles! 🎉');
                    }
                });
            }
        }
    }

    /**
     * Afficher la liste des puzzles
     */
    displayPuzzleList() {
        const list = document.getElementById('puzzleList');
        if (!list) return;

        let html = '';
        this.puzzles.forEach((puzzle, idx) => {
            const isCompleted = this.completedPuzzles.includes(idx);
            const isCurrent = idx === this.currentPuzzle;

            html += `
                <div style="background: ${isCurrent ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' : isCompleted ? 'rgba(76, 175, 80, 0.1)' : 'var(--bg-primary)'}; border: 2px solid ${isCurrent ? '#3498db' : isCompleted ? '#4CAF50' : 'var(--border)'}; padding: 12px; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s ease;" data-puzzle-id="${idx}" onclick="app.switchPuzzle(${idx})">
                    <div style="font-weight: 600; font-size: 12px; color: ${isCurrent ? 'white' : 'var(--text-primary)'};">
                        ${isCompleted ? '✓' : '○'} Puzzle ${idx + 1}
                    </div>
                    <div style="font-size: 10px; color: ${isCurrent ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)'}; margin-top: 4px;">
                        ${puzzle.difficulty}
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
    }

    /**
     * Afficher un puzzle
     */
    displayPuzzle(puzzleIdx) {
        const puzzle = this.puzzles[puzzleIdx];
        if (!puzzle) return;

        document.getElementById('puzzleTitle').textContent = puzzle.title;
        document.getElementById('puzzleDescription').textContent = puzzle.description;
        document.getElementById('puzzleSolution').textContent = puzzle.solution;
        document.getElementById('completedPuzzles').textContent = this.completedPuzzles.length;
    }

    /**
     * Créer le plateau d'exercice
     */
    createExerciseBoard() {
        const boardContainer = document.getElementById('exerciseBoard');
        if (!boardContainer) return;

        boardContainer.innerHTML = '';
        
        const board = document.createElement('div');
        board.id = 'exerciseBoardMain';
        board.style.cssText = `
            width: 100%;
            aspect-ratio: 1;
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            grid-template-rows: repeat(8, 1fr);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            gap: 0;
        `;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;
                
                square.style.cssText = `
                    background: ${isLight ? '#f0d9b5' : '#b58863'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    aspect-ratio: 1;
                `;

                // Ajouter les pièces du puzzle actuel
                const puzzle = this.puzzles[this.currentPuzzle];
                const file = String.fromCharCode(97 + col);
                const rank = 8 - row;
                const squareName = file + rank;

                if (puzzle.position[squareName]) {
                    const piece = puzzle.position[squareName];
                    
                    const pieceUnicode = {
                        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
                        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
                    };
                    
                    const pieceEl = document.createElement('div');
                    pieceEl.textContent = pieceUnicode[piece.piece];
                    pieceEl.style.cssText = `
                        font-size: clamp(2rem, 8vw, 4rem);
                        cursor: move;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        user-select: none;
                    `;
                    
                    square.appendChild(pieceEl);
                }

                board.appendChild(square);
            }
        }

        boardContainer.appendChild(board);
    }

    /**
     * Changer de puzzle
     */
    switchPuzzle(puzzleIdx) {
        this.currentPuzzle = puzzleIdx;
        this.displayPuzzle(puzzleIdx);
        this.createExerciseBoard();
        this.displayPuzzleList();
    }

    /**
     * Charger la page profil
     */
    loadProfilePage() {
        const profile = this.profileManager ? this.profileManager.currentProfile : null;
        
        if (!profile) {
            const profileSection = document.getElementById('section-profile');
            if (profileSection) {
                profileSection.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">Connectez-vous pour voir votre profil</p>';
            }
            return;
        }

        // Mettre à jour les infos principales avec vérifications
        const usernameEl = document.getElementById('profileUsername');
        if (usernameEl) usernameEl.textContent = profile.name;
        
        const levelEl = document.getElementById('profileLevel2');
        if (levelEl) levelEl.textContent = profile.stats.level;
        
        const totalWins = (profile.stats.whiteWins || 0) + (profile.stats.blackWins || 0);
        
        const gamesEl = document.getElementById('profileGames');
        if (gamesEl) gamesEl.textContent = profile.stats.gamesPlayed;
        
        const winrate = profile.stats.gamesPlayed > 0 ? Math.round((totalWins / profile.stats.gamesPlayed) * 100) : 0;
        const winrateEl = document.getElementById('profileWinrate');
        if (winrateEl) winrateEl.textContent = winrate + '%';

        // Statistiques détaillées
        const statsHtml = `
            <div style="background: rgba(76, 175, 80, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #4CAF50;">
                <div style="font-size: 11px; color: var(--text-secondary);">Victoires Blancs</div>
                <div style="font-size: 18px; font-weight: 700; color: #4CAF50;">${profile.stats.whiteWins || 0}</div>
            </div>
            <div style="background: rgba(52, 152, 219, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #3498db;">
                <div style="font-size: 11px; color: var(--text-secondary);">Victoires Noirs</div>
                <div style="font-size: 18px; font-weight: 700; color: #3498db;">${profile.stats.blackWins || 0}</div>
            </div>
            <div style="background: rgba(155, 89, 182, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #9b59b6;">
                <div style="font-size: 11px; color: var(--text-secondary);">Nulles</div>
                <div style="font-size: 18px; font-weight: 700; color: #9b59b6;">${profile.stats.draws || 0}</div>
            </div>
            <div style="background: rgba(243, 156, 18, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #f39c12;">
                <div style="font-size: 11px; color: var(--text-secondary);">Coups Joués</div>
                <div style="font-size: 18px; font-weight: 700; color: #f39c12;">${profile.stats.totalMoves || 0}</div>
            </div>
            <div style="background: rgba(46, 204, 113, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #2ecc71;">
                <div style="font-size: 11px; color: var(--text-secondary);">Streak Actuel</div>
                <div style="font-size: 18px; font-weight: 700; color: #2ecc71;">🔥 ${profile.stats.winStreak || 0}</div>
            </div>
            <div style="background: rgba(52, 152, 219, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #3498db;">
                <div style="font-size: 11px; color: var(--text-secondary);">Max Streak</div>
                <div style="font-size: 18px; font-weight: 700; color: #3498db;">${profile.stats.maxWinStreak || 0}</div>
            </div>
        `;
        const statsEl = document.getElementById('profileDetailedStats');
        if (statsEl) statsEl.innerHTML = statsHtml;

        // Tier actuel
        const tier = this.profileManager.getCurrentTier();
        const tierHtml = `
            <div style="font-size: 48px; margin-bottom: 12px;">${tier.name.split(' ')[0]}</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--text-primary);">${tier.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">Prochain: ${profile.stats.xpNextLevel} XP</div>
        `;
        const tierEl = document.getElementById('profileTier');
        if (tierEl) tierEl.innerHTML = tierHtml;

        // XP Progress
        const xpPercent = Math.round((profile.stats.xp / profile.stats.xpNextLevel) * 100);
        const xpHtml = `
            <div style="margin-bottom: 8px; font-weight: 600;">${profile.stats.xp}/${profile.stats.xpNextLevel} XP</div>
            <div style="background: var(--bg-primary); border-radius: 6px; height: 12px; overflow: hidden; border: 1px solid var(--border);">
                <div style="background: linear-gradient(90deg, #3498db 0%, #2ecc71 100%); height: 100%; width: ${xpPercent}%; transition: width 0.3s ease;"></div>
            </div>
        `;
        const xpEl = document.getElementById('profileXPProgress');
        if (xpEl) xpEl.innerHTML = xpHtml;

        // Challenges
        const challenges = profile.dailyChallenges || [];
        const completedChallenges = challenges.filter(c => c.completed).length;
        const challengesHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-weight: 600;">Complétés Aujourd'hui</span>
                <span style="background: ${completedChallenges === challenges.length ? '#4CAF50' : '#FF9800'}; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${completedChallenges}/${challenges.length}</span>
            </div>
            <div style="background: var(--bg-primary); border-radius: 6px; height: 8px; overflow: hidden; border: 1px solid var(--border);">
                <div style="background: linear-gradient(90deg, #FF9800 0%, #4CAF50 100%); height: 100%; width: ${challenges.length > 0 ? Math.round((completedChallenges / challenges.length) * 100) : 0}%;"></div>
            </div>
        `;
        document.getElementById('profileChallenges').innerHTML = challengesHtml;

        // Badges
        const badges = profile.badges || [];
        const badgesHtml = badges.length === 0 ? '<p style="color: var(--text-secondary);">Aucun badge déverrouillé</p>' : badges.map((badge, idx) => `
            <div style="background: var(--bg-primary); border: 2px solid ${{'common': '#95a5a6', 'uncommon': '#3498db', 'rare': '#9b59b6', 'epic': '#f39c12'}[badge.rarity]}; border-radius: 8px; padding: 12px; text-align: center; animation: fadeIn 0.5s ease backwards; animation-delay: ${idx * 0.05}s;">
                <div style="font-size: 32px; margin-bottom: 8px;">${badge.icon}</div>
                <div style="font-size: 11px; font-weight: 600; color: ${{'common': '#95a5a6', 'uncommon': '#3498db', 'rare': '#9b59b6', 'epic': '#f39c12'}[badge.rarity]};">${badge.name}</div>
            </div>
        `).join('');
        const badgesEl = document.getElementById('profileBadgesGrid');
        if (badgesEl) badgesEl.innerHTML = badgesHtml;
    }

    /**
     * Charger les puzzles complétés
     */
    loadCompletedPuzzles() {
        const saved = localStorage.getItem('completedPuzzles');
        this.completedPuzzles = saved ? JSON.parse(saved) : [];
    }

    /**
     * Sauvegarder les puzzles complétés
     */
    saveCompletedPuzzles() {
        localStorage.setItem('completedPuzzles', JSON.stringify(this.completedPuzzles));
    }

    /**
     * Compléter un puzzle
     */
    completePuzzle(puzzleIdx) {
        if (!this.completedPuzzles.includes(puzzleIdx)) {
            this.completedPuzzles.push(puzzleIdx);
            this.saveCompletedPuzzles();
        }
    }

    /**
     * Jouer une nouvelle partie
     */
    playNewGame() {
        if (window.appState && window.appState.newGame) {
            window.appState.newGame();
        }
        // Afficher un message si nécessaire
        console.log('Nouvelle partie créée!');
    }

    /**
     * Créer un défi
     */
    createChallenge() {
        console.log('Création d\'un défi...');
        // TODO: Implémenter la création de défi
        alert('La création de défi sera disponible bientôt!');
    }
}

// Initialiser l'app après le chargement
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ChessPoneyApp();
});
