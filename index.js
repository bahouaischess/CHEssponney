// Extracted inline script from index.html
// Debug: vérifier que tous les modules sont chargés
console.log('=== Chargement des modules ===');
console.log('ExerciseManager:', typeof ExerciseManager !== 'undefined' ? '✓' : '✗');
console.log('ProfileManagerSimple:', typeof ProfileManagerSimple !== 'undefined' ? '✓' : '✗');
console.log('ChessPoneyApp:', typeof ChessPoneyApp !== 'undefined' ? '✓' : '✗');
console.log('GameState:', typeof GameState !== 'undefined' ? '✓' : '✗');
console.log('UIController:', typeof UIController !== 'undefined' ? '✓' : '✗');
console.log('ProfileManager:', typeof ProfileManager !== 'undefined' ? '✓' : '✗');

// Fonctions d'authentification / invité
function openAuthTab(tab) {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.toggle('active', tc.id === ('tab-' + tab)));
}

function playAsGuest() {
    const guestProfile = { username: 'Invité', level: 1, guest: true };
    try { localStorage.setItem('cp_profile', JSON.stringify(guestProfile)); } catch (e) { console.warn('localStorage not available', e); }
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'none';
    window.location.href = 'play.html';
}

// Initialiser l'application après le DOM et app.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    const appState = new GameState();
    const uiController = new UIController(appState);

    // Attendre que app soit créé puis assigner le profileManager
    setTimeout(() => {
        if (typeof app !== 'undefined' && app) {
            console.log('App created successfully');
            app.profileManager = uiController.profileManager;
            // Charger la page profil initiale si elle est affichée
            if (app.currentSection === 'profile') {
                app.loadProfilePage();
            }
        } else {
            console.error('App not defined');
        }
    }, 50);

    // Lier le bouton invité du modal
    const guestBtnEl = document.getElementById('guestBtn');
    if (guestBtnEl) guestBtnEl.addEventListener('click', playAsGuest);
});
