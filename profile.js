// Profile manager skeleton for Chessponey
// - Loads and saves profile data to localStorage
// - Renders a minimal profile view into a container

class ProfileManagerSimple {
    constructor(opts = {}){
        this.storageKey = opts.storageKey || 'cp_profile';
        this.containerId = opts.containerId || 'section-profile';
        this.profile = this.load() || this.defaultProfile();
    }

    defaultProfile(){
        return {
            username: 'Invité',
            stats: {games:0, wins:0, losses:0, draws:0, moves:0, xp:0, level:1},
            badges: []
        };
    }

    load(){
        try{
            return JSON.parse(localStorage.getItem(this.storageKey));
        } catch(e){
            return null;
        }
    }

    save(){
        localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
    }

    render(containerId){
        const container = document.getElementById(containerId || this.containerId);
        if(!container) return;
        container.innerHTML = `
            <div class="profile-card">
                <h2 id="profileUsername">${this.profile.username}</h2>
                <div class="profile-stats">
                    <div>Niveaux: <strong id="profileLevel">${this.profile.stats.level}</strong></div>
                    <div>Parties: <strong id="profileGames">${this.profile.stats.games}</strong></div>
                    <div>Victoires: <strong id="profileWins">${this.profile.stats.wins}</strong></div>
                    <div>XP: <strong id="profileXP">${this.profile.stats.xp}</strong></div>
                </div>
                <div id="profileBadges" class="badges-grid">
                    ${this.profile.badges.map(b=>`<span class="badge">${b}</span>`).join('')}
                </div>
            </div>
        `;
    }

    updateStats(delta){
        this.profile.stats.games += delta.games || 0;
        this.profile.stats.wins += delta.wins || 0;
        this.profile.stats.losses += delta.losses || 0;
        this.profile.stats.draws += delta.draws || 0;
        this.profile.stats.moves += delta.moves || 0;
        this.profile.stats.xp += delta.xp || 0;
        // simple leveling: 100 xp per level
        this.profile.stats.level = Math.floor(this.profile.stats.xp / 100) + 1;
        this.save();
    }
}

if(typeof module !== 'undefined' && module.exports){
    module.exports = ProfileManagerSimple;
} else {
    window.ProfileManagerSimple = ProfileManagerSimple;
}
