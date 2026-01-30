/**
 * Système d'authentification partagé pour ChessPoney
 * Gère les redirections intelligentes et l'affichage du profil
 */

// ============== VÉRIFICATION DE L'AUTHENTIFICATION ==============

function getProfile() {
    const profileName = localStorage.getItem('currentProfile');
    if (!profileName) {
        return null;
    }
    
    // Charger le profil via ProfileManager
    if (typeof ProfileManager !== 'undefined') {
        const pm = new ProfileManager();
        const profile = pm.getProfile(profileName);
        return profile;
    }
    
    return null;
}

function isAuthenticated() {
    const profile = getProfile();
    return profile !== null;
}

function logout() {
    localStorage.removeItem('chessponeyProfile');
    localStorage.removeItem('chessponeySessionActive');
    window.location.href = 'index.html';
}

// ============== REDIRECTION INTELLIGENTE ==============

function setupSmartRedirects() {
    const profile = getProfile();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isSessionActive = localStorage.getItem('chessponeySessionActive') === 'true';

    // Si l'utilisateur est sur la landing page ET connecté → rediriger vers play.html
    if (currentPage === 'index.html' && profile && isSessionActive && !profile.isGuest) {
        window.location.href = 'play.html';
        return;
    }

    // Si l'utilisateur est sur une page de contenu et se déconnecte → rester sur sa page
    // (Pas de redirection)
}

// Marquer la session comme active
function markSessionActive() {
    localStorage.setItem('chessponeySessionActive', 'true');
}

// ============== MISE À JOUR DE LA NAVBAR ==============

function updateNavbarProfile() {
    const profile = getProfile();
    const navbarRight = document.querySelector('.navbar-right');
    
    if (!navbarRight) return;

    if (profile) {
        // L'utilisateur est connecté
        const profileHTML = `
            <div class="profile-badge" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: rgba(52, 152, 219, 0.2); border-radius: 8px; border: 1px solid rgba(52, 152, 219, 0.3);">
                <span style="font-size: 18px;">👤</span>
                <div style="font-size: 13px;">
                    <div style="font-weight: 600; color: #ecf0f1;">${profile.username}</div>
                    <div style="color: #bdc3c7; font-size: 12px;">Lvl ${profile.level || 1}</div>
                </div>
            </div>
            <button class="auth-btn auth-btn-logout" onclick="handleLogout()" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 8px 16px;">
                🚪 Déconnecter
            </button>
        `;
        navbarRight.innerHTML = profileHTML;
    } else {
        // L'utilisateur n'est pas connecté
        navbarRight.innerHTML = `
            <button class="auth-btn auth-btn-login" onclick="openAuthModal('login')">🔐 Connexion</button>
            <button class="auth-btn auth-btn-signup" onclick="openAuthModal('signup')">✨ Inscription</button>
            <button class="auth-btn auth-btn-guest" onclick="playAsGuest()">👤 Invité</button>
        `;
    }
}

function handleLogout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        logout();
    }
}

// ============== MODALE D'AUTHENTIFICATION PARTAGÉE ==============

function openAuthModal(tab) {
    // Créer la modale si elle n'existe pas
    let modal = document.getElementById('authModalShared');
    
    if (!modal) {
        const modalHTML = `
            <div id="authModalShared" class="modal" style="
                display: none;
                position: fixed;
                z-index: 2000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
            ">
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #1a1f2e;
                    border-radius: 12px;
                    padding: 32px;
                    width: 90%;
                    max-width: 500px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="margin: 0; color: #ecf0f1;">♔ ChessPoney</h2>
                        <button onclick="closeAuthModal()" style="
                            background: none;
                            border: none;
                            font-size: 28px;
                            cursor: pointer;
                            color: #bdc3c7;
                        ">&times;</button>
                    </div>

                    <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
                        <button class="modal-tab-btn active" data-tab="login" onclick="switchAuthTab('login')" style="
                            background: none;
                            border: none;
                            color: #bdc3c7;
                            padding: 12px 16px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 14px;
                            border-bottom: 3px solid transparent;
                            transition: all 0.2s;
                        ">
                            🔐 Connexion
                        </button>
                        <button class="modal-tab-btn" data-tab="signup" onclick="switchAuthTab('signup')" style="
                            background: none;
                            border: none;
                            color: #bdc3c7;
                            padding: 12px 16px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 14px;
                            border-bottom: 3px solid transparent;
                            transition: all 0.2s;
                        ">
                            ✨ Inscription
                        </button>
                        <button class="modal-tab-btn" data-tab="guest" onclick="switchAuthTab('guest')" style="
                            background: none;
                            border: none;
                            color: #bdc3c7;
                            padding: 12px 16px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 14px;
                            border-bottom: 3px solid transparent;
                            transition: all 0.2s;
                        ">
                            👤 Invité
                        </button>
                    </div>

                    <div id="login-tab-shared" class="modal-tab-content" style="display: block;">
                        <div style="background: linear-gradient(135deg, rgba(52, 152, 219, 0.1) 0%, rgba(46, 204, 113, 0.1) 100%); padding: 12px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; border-left: 4px solid #3498db;">
                            🔐 Entrez vos identifiants pour accéder à votre profil sauvegardé.
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #bdc3c7;">Pseudo :</label>
                            <input id="loginUsername" type="text" placeholder="Votre pseudo" style="
                                width: 100%;
                                padding: 10px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 6px;
                                background: #0f1419;
                                color: #ecf0f1;
                                font-size: 14px;
                            ">
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #bdc3c7;">Mot de passe :</label>
                            <input id="loginPassword" type="password" placeholder="Votre mot de passe" style="
                                width: 100%;
                                padding: 10px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 6px;
                                background: #0f1419;
                                color: #ecf0f1;
                                font-size: 14px;
                            ">
                        </div>
                        <button onclick="handleLogin()" style="
                            width: 100%;
                            padding: 12px;
                            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            font-weight: 600;
                            cursor: pointer;
                            margin-bottom: 12px;
                        ">
                            🔓 Se Connecter
                        </button>
                        <div id="loginError" style="color: #e74c3c; font-size: 13px; display: none;"></div>
                    </div>

                    <div id="signup-tab-shared" class="modal-tab-content" style="display: none;">
                        <div style="background: linear-gradient(135deg, rgba(155, 89, 182, 0.1) 0%, rgba(243, 156, 18, 0.1) 100%); padding: 12px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; border-left: 4px solid #9b59b6;">
                            ✨ Créez un compte pour sauvegarder votre progression et vos stats!
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #bdc3c7;">Pseudo :</label>
                            <input id="signupUsername" type="text" placeholder="Ex: ChessMaster42" style="
                                width: 100%;
                                padding: 10px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 6px;
                                background: #0f1419;
                                color: #ecf0f1;
                                font-size: 14px;
                            ">
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #bdc3c7;">Mot de passe :</label>
                            <input id="signupPassword" type="password" placeholder="Minimum 4 caractères" style="
                                width: 100%;
                                padding: 10px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 6px;
                                background: #0f1419;
                                color: #ecf0f1;
                                font-size: 14px;
                            ">
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #bdc3c7;">Confirmer mot de passe :</label>
                            <input id="signupPasswordConfirm" type="password" placeholder="Confirmer le mot de passe" style="
                                width: 100%;
                                padding: 10px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 6px;
                                background: #0f1419;
                                color: #ecf0f1;
                                font-size: 14px;
                            ">
                        </div>
                        <button onclick="handleSignup()" style="
                            width: 100%;
                            padding: 12px;
                            background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            font-weight: 600;
                            cursor: pointer;
                            margin-bottom: 12px;
                        ">
                            ✨ Créer Compte
                        </button>
                        <div id="signupError" style="color: #e74c3c; font-size: 13px; display: none;"></div>
                    </div>

                    <div id="guest-tab-shared" class="modal-tab-content" style="display: none;">
                        <div style="background: linear-gradient(135deg, rgba(149, 165, 166, 0.1) 0%, rgba(127, 140, 141, 0.1) 100%); padding: 12px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; border-left: 4px solid #95a5a6;">
                            👤 Jouez sans compte. Vos stats ne seront pas sauvegardées.
                        </div>
                        <button onclick="playAsGuest()" style="
                            width: 100%;
                            padding: 12px;
                            background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            👤 Continuer en Invité
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('authModalShared');
    }

    modal.style.display = 'flex';
    switchAuthTab(tab);
}

function closeAuthModal() {
    const modal = document.getElementById('authModalShared');
    if (modal) modal.style.display = 'none';
}

function switchAuthTab(tab) {
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    const tabContents = document.querySelectorAll('.modal-tab-content');

    tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') === tab) {
            btn.style.borderBottomColor = '#3498db';
            btn.style.color = 'white';
        } else {
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = '#bdc3c7';
        }
    });

    tabContents.forEach(content => {
        content.style.display = 'none';
    });

    document.getElementById(tab + '-tab-shared').style.display = 'block';
}

function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!username || !password) {
        errorEl.textContent = 'Veuillez remplir tous les champs.';
        errorEl.style.display = 'block';
        return;
    }

    // Utiliser ProfileManager pour l'authentification
    if (typeof ProfileManager === 'undefined') {
        errorEl.textContent = 'Erreur: ProfileManager non chargé';
        errorEl.style.display = 'block';
        return;
    }

    const pm = new ProfileManager();
    const result = pm.login(username, password);
    
    if (result.success) {
        localStorage.setItem('currentProfile', username);
        sessionStorage.removeItem('guestProfile');
        localStorage.setItem('chessponeySessionActive', 'true');
        errorEl.style.display = 'none';
        closeAuthModal();
        updateNavbarProfile();
        setTimeout(() => {
            window.location.href = 'play.html';
        }, 1000);
    } else {
        errorEl.textContent = result.error || 'Erreur lors de la connexion';
        errorEl.style.display = 'block';
    }
}

function handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirm = document.getElementById('signupPasswordConfirm').value.trim();
    const errorEl = document.getElementById('signupError');

    if (!username || !password || !confirm) {
        errorEl.textContent = 'Veuillez remplir tous les champs.';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 4) {
        errorEl.textContent = 'Le mot de passe doit faire au moins 4 caractères.';
        errorEl.style.display = 'block';
        return;
    }

    if (password !== confirm) {
        errorEl.textContent = 'Les mots de passe ne correspondent pas.';
        errorEl.style.display = 'block';
        return;
    }

    // Utiliser ProfileManager pour l'inscription
    if (typeof ProfileManager === 'undefined') {
        errorEl.textContent = 'Erreur: ProfileManager non chargé';
        errorEl.style.display = 'block';
        return;
    }

    const pm = new ProfileManager();
    const result = pm.createProfile(username, password);
    
    if (result.success) {
        localStorage.setItem('currentProfile', username);
        sessionStorage.removeItem('guestProfile');
        localStorage.setItem('chessponeySessionActive', 'true');
        errorEl.style.display = 'none';
        closeAuthModal();
        updateNavbarProfile();
        setTimeout(() => {
            window.location.href = 'play.html';
        }, 1000);
    } else {
        errorEl.textContent = result.error || 'Erreur lors de l\'inscription';
        errorEl.style.display = 'block';
    }
}

function playAsGuest() {
    // Effacer le profil actuel pour permettre la session invité
    localStorage.removeItem('currentProfile');
    sessionStorage.removeItem('guestProfile');
    
    // Créer un profil invité temporaire
    if (typeof ProfileManager !== 'undefined') {
        const pm = new ProfileManager();
        const guestProfile = pm.getGuestProfile();
        sessionStorage.setItem('guestProfile', JSON.stringify(guestProfile));
    }
    
    localStorage.setItem('chessponeySessionActive', 'true');
    closeAuthModal();
    window.location.href = 'play.html';
}

// ============== INITIALISATION ==============

window.addEventListener('DOMContentLoaded', () => {
    setupSmartRedirects();
    updateNavbarProfile();

    // Fermer la modale si on clique en dehors
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('authModalShared');
        if (modal && e.target === modal) {
            closeAuthModal();
        }
    });
});
