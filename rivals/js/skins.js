// js/skins.js
// Weapon details, skins registry, inventory management, and case opening logic

const WEAPONS_CONFIG = {
    Rifle: {
        name: "Assault Rifle",
        type: "Rifle",
        damage: 24,
        headshotMultiplier: 1.5,
        ammoMax: 30,
        fireRate: 110, // ms between shots (automatic)
        reloadTime: 1800, // ms
        recoil: 0.015,
        zoomFov: 40,
        adsOffset: { x: 0, y: -0.16, z: -0.15 },
        color: 0x3a3d40
    },
    Sniper: {
        name: "Sniper Rifle",
        type: "Sniper",
        damage: 100,
        headshotMultiplier: 2.0,
        ammoMax: 5,
        fireRate: 1400, // bolt action reload delay
        reloadTime: 2500,
        recoil: 0.05,
        zoomFov: 15,
        adsOffset: { x: 0, y: -0.155, z: -0.1 },
        color: 0x22252a
    },
    Shotgun: {
        name: "Shotgun",
        type: "Shotgun",
        damage: 15, // per pellet
        pellets: 8,
        headshotMultiplier: 1.25,
        ammoMax: 6,
        fireRate: 800, // pump action
        reloadTime: 2200,
        recoil: 0.04,
        zoomFov: 50,
        adsOffset: { x: 0, y: -0.16, z: -0.15 },
        color: 0x2e3033
    },
    Pistol: {
        name: "Pistol",
        type: "Pistol",
        damage: 18,
        headshotMultiplier: 1.75,
        ammoMax: 12,
        fireRate: 200, // semi-automatic
        reloadTime: 1200,
        recoil: 0.01,
        zoomFov: 45,
        adsOffset: { x: 0, y: -0.18, z: -0.2 },
        color: 0x4a4d52
    },
    Katana: {
        name: "Katana",
        type: "Melee",
        damage: 55,
        headshotMultiplier: 1.0,
        ammoMax: 1, // infinite dummy value
        fireRate: 500, // swing rate
        reloadTime: 0,
        recoil: 0,
        zoomFov: 55,
        adsOffset: null,
        color: 0xeaeaea
    }
};

const SKINS_REGISTRY = {
    Rifle: [
        { id: "rifle_default", name: "Default Steel", rarity: "Common", color: "#4f5357", hex: 0x4f5357 },
        { id: "rifle_camo", name: "Forest Camo", rarity: "Rare", color: "#2d5a27", hex: 0x2d5a27 },
        { id: "rifle_digital", name: "Digital Desert", rarity: "Rare", color: "#bda55d", hex: 0xbda55d },
        { id: "rifle_neon", name: "Neon Cyber", rarity: "Epic", color: "#00ffcc", hex: 0x00ffcc },
        { id: "rifle_nebula", name: "Nebula", rarity: "Epic", color: "#8a2be2", hex: 0x8a2be2 },
        { id: "rifle_gold", name: "Gilded Glory", rarity: "Legendary", color: "#ffd700", hex: 0xffd700 },
        { id: "rifle_magma", name: "Magma Flow", rarity: "Legendary", color: "#ff4500", hex: 0xff4500 }
    ],
    Sniper: [
        { id: "sniper_default", name: "Default Carbon", rarity: "Common", color: "#22252a", hex: 0x22252a },
        { id: "sniper_camo", name: "Arctic Camo", rarity: "Rare", color: "#d0e1e1", hex: 0xd0e1e1 },
        { id: "sniper_digital", name: "Digital Urban", rarity: "Rare", color: "#607d8b", hex: 0x607d8b },
        { id: "sniper_neon", name: "Laser Beam", rarity: "Epic", color: "#ff007f", hex: 0xff007f },
        { id: "sniper_nebula", name: "Deep Space", rarity: "Epic", color: "#4b0082", hex: 0x4b0082 },
        { id: "sniper_gold", name: "Royal Gold", rarity: "Legendary", color: "#ffd700", hex: 0xffd700 },
        { id: "sniper_magma", name: "Volcanic Ash", rarity: "Legendary", color: "#e65100", hex: 0xe65100 }
    ],
    Shotgun: [
        { id: "shotgun_default", name: "Default Matte", rarity: "Common", color: "#2e3033", hex: 0x2e3033 },
        { id: "shotgun_camo", name: "Safari", rarity: "Rare", color: "#8d6e63", hex: 0x8d6e63 },
        { id: "shotgun_digital", name: "Navy Digital", rarity: "Rare", color: "#1a237e", hex: 0x1a237e },
        { id: "shotgun_neon", name: "Acid Glow", rarity: "Epic", color: "#39ff14", hex: 0x39ff14 },
        { id: "shotgun_nebula", name: "Orion", rarity: "Epic", color: "#ab47bc", hex: 0xab47bc },
        { id: "shotgun_gold", name: "Solid Gold", rarity: "Legendary", color: "#ffd700", hex: 0xffd700 },
        { id: "shotgun_magma", name: "Inferno", rarity: "Legendary", color: "#ff3d00", hex: 0xff3d00 }
    ],
    Pistol: [
        { id: "pistol_default", name: "Default Slate", rarity: "Common", color: "#4a4d52", hex: 0x4a4d52 },
        { id: "pistol_camo", name: "Woodland", rarity: "Rare", color: "#3e2723", hex: 0x3e2723 },
        { id: "pistol_digital", name: "Winter Camo", rarity: "Rare", color: "#eceff1", hex: 0xeceff1 },
        { id: "pistol_neon", name: "Pulse", rarity: "Epic", color: "#00e5ff", hex: 0x00e5ff },
        { id: "pistol_nebula", name: "Cosmo", rarity: "Epic", color: "#7e57c2", hex: 0x7e57c2 },
        { id: "pistol_gold", name: "Executive Gold", rarity: "Legendary", color: "#ffd700", hex: 0xffd700 },
        { id: "pistol_magma", name: "Molten Core", rarity: "Legendary", color: "#ff9100", hex: 0xff9100 }
    ],
    Katana: [
        { id: "katana_default", name: "Default Steel", rarity: "Common", color: "#eaeaea", hex: 0xeaeaea },
        { id: "katana_camo", name: "Bamboo", rarity: "Rare", color: "#4caf50", hex: 0x4caf50 },
        { id: "katana_digital", name: "Cyber Red", rarity: "Rare", color: "#d50000", hex: 0xd50000 },
        { id: "katana_neon", name: "Hyper Blade", rarity: "Epic", color: "#e040fb", hex: 0xe040fb },
        { id: "katana_nebula", name: "Galactic", rarity: "Epic", color: "#311b92", hex: 0x311b92 },
        { id: "katana_gold", name: "Emperor's Blade", rarity: "Legendary", color: "#ffd700", hex: 0xffd700 },
        { id: "katana_magma", name: "Dragon Breath", rarity: "Legendary", color: "#ff3d00", hex: 0xff3d00 }
    ]
};

const RARITIES = {
    Common: { name: "Common", chance: 0.55, color: "#9e9e9e" },
    Rare: { name: "Rare", chance: 0.30, color: "#2196f3" },
    Epic: { name: "Epic", chance: 0.12, color: "#9c27b0" },
    Legendary: { name: "Legendary", chance: 0.03, color: "#ffeb3b" }
};

const CASE_PRICE = 200;

class InventoryManager {
    constructor() {
        this.coins = 500;
        this.unlockedSkins = [];
        this.equippedSkins = {
            Rifle: "rifle_default",
            Sniper: "sniper_default",
            Shotgun: "shotgun_default",
            Pistol: "pistol_default",
            Katana: "katana_default"
        };
        // Statistics
        this.stats = {
            wins: 0,
            losses: 0,
            kills: 0,
            deaths: 0,
            shotsFired: 0,
            shotsHit: 0,
            headshots: 0
        };
        this.load();
    }

    load() {
        try {
            const data = localStorage.getItem("roblox_rivals_data");
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.coins !== undefined) this.coins = parsed.coins;
                if (parsed.unlockedSkins) this.unlockedSkins = parsed.unlockedSkins;
                if (parsed.equippedSkins) this.equippedSkins = { ...this.equippedSkins, ...parsed.equippedSkins };
                if (parsed.stats) this.stats = { ...this.stats, ...parsed.stats };
            } else {
                // Initial defaults
                this.unlockedSkins = [
                    "rifle_default",
                    "sniper_default",
                    "shotgun_default",
                    "pistol_default",
                    "katana_default"
                ];
                this.save();
            }
        } catch (e) {
            console.error("Failed to load inventory:", e);
        }
    }

    save() {
        try {
            const data = {
                coins: this.coins,
                unlockedSkins: this.unlockedSkins,
                equippedSkins: this.equippedSkins,
                stats: this.stats
            };
            localStorage.setItem("roblox_rivals_data", JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save inventory:", e);
        }
    }

    addCoins(amount) {
        this.coins += amount;
        this.save();
        this.updateUIPanels();
    }

    deductCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            this.save();
            this.updateUIPanels();
            return true;
        }
        return false;
    }

    unlockSkin(skinId) {
        if (!this.unlockedSkins.includes(skinId)) {
            this.unlockedSkins.push(skinId);
            this.save();
        }
    }

    equipSkin(weaponType, skinId) {
        if (this.unlockedSkins.includes(skinId)) {
            this.equippedSkins[weaponType] = skinId;
            this.save();
            this.updateUIPanels();
            return true;
        }
        return false;
    }

    getEquippedSkin(weaponType) {
        const skinId = this.equippedSkins[weaponType] || `${weaponType.toLowerCase()}_default`;
        const list = SKINS_REGISTRY[weaponType];
        return list.find(s => s.id === skinId) || list[0];
    }

    addStat(name, value = 1) {
        if (this.stats[name] !== undefined) {
            this.stats[name] += value;
            this.save();
            this.updateUIPanels();
        }
    }

    updateUIPanels() {
        // Update coin counts in HTML
        const coinEls = document.querySelectorAll(".coin-count");
        coinEls.forEach(el => {
            el.textContent = this.coins;
        });

        // Update stats dashboard
        const winEl = document.getElementById("stats-wins");
        const lossEl = document.getElementById("stats-losses");
        const kdEl = document.getElementById("stats-kd");
        const accEl = document.getElementById("stats-accuracy");
        const hsEl = document.getElementById("stats-headshots");

        if (winEl) winEl.textContent = this.stats.wins;
        if (lossEl) lossEl.textContent = this.stats.losses;
        if (kdEl) {
            const kd = this.stats.deaths === 0 ? this.stats.kills : (this.stats.kills / this.stats.deaths).toFixed(2);
            kdEl.textContent = kd;
        }
        if (accEl) {
            const acc = this.stats.shotsFired === 0 ? "0%" : Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100) + "%";
            accEl.textContent = acc;
        }
        if (hsEl) hsEl.textContent = this.stats.headshots;
    }
}

// Global Inventory Instance
window.inventory = new InventoryManager();

// Spin generator helper
function generateSpinSequence() {
    // Choose weapon type randomly
    const wKeys = Object.keys(SKINS_REGISTRY);
    const weaponType = wKeys[Math.floor(Math.random() * wKeys.length)];
    const list = SKINS_REGISTRY[weaponType];

    // Determine rarity won based on chances
    const rand = Math.random();
    let selectedRarity = "Common";
    if (rand < RARITIES.Legendary.chance) {
        selectedRarity = "Legendary";
    } else if (rand < RARITIES.Legendary.chance + RARITIES.Epic.chance) {
        selectedRarity = "Epic";
    } else if (rand < RARITIES.Legendary.chance + RARITIES.Epic.chance + RARITIES.Rare.chance) {
        selectedRarity = "Rare";
    } else {
        selectedRarity = "Common";
    }

    // Filter skins of that rarity. If none exist (shouldn't happen), pick default
    let candidateSkins = list.filter(s => s.rarity === selectedRarity);
    if (candidateSkins.length === 0) candidateSkins = [list[0]];

    const winningSkin = candidateSkins[Math.floor(Math.random() * candidateSkins.length)];

    // Generate a sequence of 32 skins for display. Winning skin is at index 25.
    const sequence = [];
    for (let i = 0; i < 32; i++) {
        if (i === 25) {
            sequence.push({ ...winningSkin, weaponType });
        } else {
            // Fill with random skins
            const rType = wKeys[Math.floor(Math.random() * wKeys.length)];
            const rList = SKINS_REGISTRY[rType];
            const randSkin = rList[Math.floor(Math.random() * rList.length)];
            sequence.push({ ...randSkin, weaponType: rType });
        }
    }

    return {
        winningSkin,
        weaponType,
        sequence
    };
}
