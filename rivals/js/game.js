// js/game.js
// Core 3D Engine, Player Movement Physics, Pointer Lock Camera, Weapon mechanics, and Round Management

class GameEngine {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Game states: 'LOBBY', 'COUNTDOWN', 'ACTIVE', 'FINISH'
        this.gameState = 'LOBBY';
        this.matchScore = { player: 0, bot: 0 };
        this.activeRound = 1;
        this.countdownTimer = 3;
        this.countdownInterval = null;
        
        // Physics & Player Movement
        this.playerPos = new THREE.Vector3(0, 0, 18);
        this.playerVelocity = new THREE.Vector3();
        this.playerHeight = 1.6;
        this.playerHealth = 100;
        this.playerShield = 100;
        this.isPlayerDead = false;
        this.currentMapLimit = 48.8;

        // Slide Dash State
        this.isSliding = false;
        this.slideTimer = 0; 
        this.slideCooldown = 0; 
        this.slideDirection = new THREE.Vector3();
        this.slideSpeed = 0.0;



        this.moveDirection = { forward: false, backward: false, left: false, right: false };
        this.isSprinting = false;
        this.isJumping = false;
        this.isGrounded = true;

        this.mouseSensitivity = 0.0022;
        this.cameraPitch = 0;
        this.cameraYaw = 0;

        // Sound sync
        this.lastStepTime = 0;

        // Combat & Weapons
        this.equippedWeapons = ['Rifle', 'Pistol', 'Katana']; // Slot 1, 2, 3
        this.activeSlot = 0;
        this.ammoCount = {}; // ammo per weapon type
        this.weaponMeshGroup = null; // mesh parented to camera
        this.isADS = false;
        this.isReloading = false;
        this.lastFireTime = 0;
        this.muzzleFlash = null;
        
        // Bot Reference
        this.activeBot = null;
        this.botSpawnPoint = new THREE.Vector3(0, 0, -18);
        this.playerSpawnPoint = new THREE.Vector3(0, 0, 18);
        
        // Level Obstacles (for collision checks)
        this.collidableObjects = [];
        this.bushes = [];


        // Particles
        this.particleSystems = [];

        this.selectedMapName = 'Jungle';
        this.arenaObjects = [];

        // Bind events
        this.initThree();
        this.loadMap('Jungle');

        this.setupEventListeners();
        this.initWeaponsState();
        
        // Start Loop
        this.animate();
    }


    getTerrainHeight(x, z) {
        // Winding River math used for both large maps
        const riverX = Math.sin(z * 0.012) * 90.0 + Math.cos(z * 0.004) * 40.0;
        const distToRiver = Math.abs(x - riverX);

        if (this.selectedMapName === 'Jungle') {
            // Massive rolling jungle hills up to height 35
            let height = Math.sin(x * 0.015) * Math.cos(z * 0.015) * 22.0 + Math.cos(x * 0.007) * 13.0;

            // Raise North and South spawn zones to dry plateaus (above water level 3.5)
            if (Math.abs(z) > 220.0) {
                const t = Math.min(1.0, (Math.abs(z) - 220.0) / 80.0);
                height = height * (1.0 - t) + 12.0 * t;
            }

            // Carve winding river channel
            if (distToRiver < 25.0 && Math.abs(z) < 260.0) {
                const blend = distToRiver / 25.0; // 0.0 to 1.0
                const riverFloor = 1.0 + blend * blend * 8.0;
                height = Math.min(height, riverFloor);
            }

            // 4 Cave Entrance Trench Carvings (slope down to y = -25.0)
            if (Math.abs(x - (-240.0)) < 18.0 && z >= -140.0 && z <= -100.0) {
                const t = (z - (-140.0)) / 40.0;
                return height * (1.0 - t) + (-25.0) * t;
            }
            if (Math.abs(x - (-240.0)) < 18.0 && z >= 100.0 && z <= 140.0) {
                const t = (140.0 - z) / 40.0;
                return height * (1.0 - t) + (-25.0) * t;
            }
            if (Math.abs(x - 240.0) < 18.0 && z >= -140.0 && z <= -100.0) {
                const t = (z - (-140.0)) / 40.0;
                return height * (1.0 - t) + (-25.0) * t;
            }
            if (Math.abs(x - 240.0) < 18.0 && z >= 100.0 && z <= 140.0) {
                const t = (140.0 - z) / 40.0;
                return height * (1.0 - t) + (-25.0) * t;
            }



            return height;
        }

        if (this.selectedMapName === 'Highlands') {
            // 6 organic climbable peaks (scaled up to majestic heights!)
            const peaks = [
                { x: 260, z: 240, h: 80, r: 140 },
                { x: -260, z: -240, h: 80, r: 140 },
                { x: -280, z: 220, h: 75, r: 130 },
                { x: 280, z: -220, h: 75, r: 130 },
                { x: 320, z: 0, h: 85, r: 150 },
                { x: -320, z: 0, h: 85, r: 150 }
            ];
            let height = 0.0;


            for (let i = 0; i < peaks.length; i++) {
                const p = peaks[i];
                const dx = x - p.x;
                const dz = z - p.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < p.r) {
                    const hVal = p.h * 0.5 * (1.0 + Math.cos((dist * Math.PI) / p.r));
                    if (hVal > height) height = hVal;
                }
            }

            // Add craggy ridge and stone noise to make the peaks look rugged and realistic
            const ridgeNoise = Math.cos(x * 0.08) * Math.sin(z * 0.08) * 3.5 + Math.sin(x * 0.25) * Math.cos(z * 0.25) * 1.2;
            height += ridgeNoise;

            // Raise North and South spawn zones to dry plateaus (above water level 6.0)
            if (Math.abs(z) > 220.0) {
                const t = Math.min(1.0, (Math.abs(z) - 220.0) / 80.0);
                height = height * (1.0 - t) + 12.0 * t;
            }

            // Carve winding river channel
            if (distToRiver < 25.0 && Math.abs(z) < 260.0) {
                const blend = distToRiver / 25.0;
                const riverFloor = 3.0 + blend * blend * 9.0;
                height = Math.min(height, riverFloor);
            }

            // 4 Cave Entrance Trench Carvings (slope down to y = -25.0)
            if (Math.abs(x - (-240.0)) < 18.0 && z >= -140.0 && z <= -100.0) {
                const t = (z - (-140.0)) / 40.0;
                return height * (1.0 - t) + (-25.0) * t;
            }
            if (Math.abs(x - (-240.0)) < 18.0 && z >= 100.0 && z <= 140.0) {
                const t = (140.0 - z) / 40.0;
                return height * (1.0 - t) + (-25.0) * t;
            }
            if (Math.abs(x - 240.0) < 18.0 && z >= -140.0 && z <= -100.0) {
                const t = (z - (-140.0)) / 40.0;
                return height * (1.0 - t) + (-25.0) * t;
            }
            if (Math.abs(x - 240.0) < 18.0 && z >= 100.0 && z <= 140.0) {
                const t = (140.0 - z) / 40.0;
                return height * (1.0 - t) + (-25.0) * t;
            }



            return Math.max(0.0, height);
        }

        return 0.0;
    }



    createProceduralTexture(type) {

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        if (type === 'Grass') {
            ctx.fillStyle = '#2e7d32'; // medium forest green
            ctx.fillRect(0, 0, 256, 256);
            // Add leafy noise speckles
            for (let i = 0; i < 6000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#1b5e20' : '#4caf50';
                ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
            }
        } else if (type === 'Rock') {
            ctx.fillStyle = '#78909c'; // grey stone base
            ctx.fillRect(0, 0, 256, 256);
            // Add stone/slate noise speckles
            for (let i = 0; i < 6000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#455a64' : '#b0bec5';
                ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
            }
        } else if (type === 'Sand') {
            ctx.fillStyle = '#caab6e'; // warm desert sand
            ctx.fillRect(0, 0, 256, 256);
            // Add sand grain speckles
            for (let i = 0; i < 8000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#bcaaa4' : '#e0e0e0';
                ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
            }
        } else if (type === 'Grid') {
            ctx.fillStyle = '#101014';
            ctx.fillRect(0, 0, 256, 256);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 256, 256);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 256, 256);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    initThree() {


        const container = document.getElementById('game-container');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xaaccff); // Light blue skybox
        this.scene.fog = new THREE.FogExp2(0xaaccff, 0.015);

        // Camera
        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(this.playerPos.x, this.playerPos.y + this.playerHeight, this.playerPos.z);
        this.scene.add(this.camera);

        // Weapon Group attached to camera
        this.weaponContainer = new THREE.Group();
        this.camera.add(this.weaponContainer);
        // Position weapon group in bottom right corner of camera viewport by default
        this.weaponContainer.position.set(0.18, -0.22, -0.35);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Ambient Light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        // Directional Light (Sun)
        this.sunLight = new THREE.DirectionalLight(0xfffaed, 0.8);
        this.sunLight.position.set(30, 45, 20);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 150;
        const d = 30;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.scene.add(this.sunLight);

        // Add grid ground visual helper for Roblox style
        this.gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x888888);
        this.gridHelper.position.y = 0.01;
        this.scene.add(this.gridHelper);


        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    loadMap(mapName) {
        // 1. Clear old map objects
        if (this.arenaObjects && this.arenaObjects.length > 0) {
            this.arenaObjects.forEach(obj => {
                this.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
        }
        
        this.collidableObjects = [];
        this.arenaObjects = [];
        this.houses = [];


        const isLargeMap = mapName === 'Jungle' || mapName === 'Highlands';
        this.currentMapLimit = isLargeMap ? 396.0 : 48.8;

        if (isLargeMap) {
            this.playerSpawnPoint.set(0, 0, 340);
            this.botSpawnPoint.set(0, 0, -340);
        } else {
            this.playerSpawnPoint.set(0, 0, 18);
            this.botSpawnPoint.set(0, 0, -18);
        }


        // 3. Adjust lighting and background theme colors based on chosen Map Name
        if (mapName === 'Desert') {
            // Sunset Desert theme
            this.scene.background.setHex(0xffd180);
            this.scene.fog.color.setHex(0xffd180);
            this.scene.fog.density = 0.016;

            if (this.ambientLight) {
                this.ambientLight.color.setHex(0xffe0b2);
                this.ambientLight.intensity = 0.6;
            }
            if (this.sunLight) {
                this.sunLight.color.setHex(0xffab40);
                this.sunLight.intensity = 0.9;
                this.sunLight.position.set(40, 30, 10);
            }
            if (this.gridHelper) {
                this.scene.remove(this.gridHelper);
                this.gridHelper = new THREE.GridHelper(100, 50, 0x8d6e63, 0xd7ccc8);
                this.gridHelper.position.y = 0.01;
                this.scene.add(this.gridHelper);
                this.arenaObjects.push(this.gridHelper);
            }

            // Build Desert layout
            this.buildDesertMap();

        } else if (mapName === 'Cyber') {
            // Dark Cyber theme
            this.scene.background.setHex(0x0a0614);
            this.scene.fog.color.setHex(0x0a0614);
            this.scene.fog.density = 0.024;

            if (this.ambientLight) {
                this.ambientLight.color.setHex(0x220044);
                this.ambientLight.intensity = 0.45;
            }
            if (this.sunLight) {
                this.sunLight.color.setHex(0x00ffff);
                this.sunLight.intensity = 0.75;
                this.sunLight.position.set(20, 35, -15);
            }
            if (this.gridHelper) {
                this.scene.remove(this.gridHelper);
                this.gridHelper = new THREE.GridHelper(100, 50, 0xff00ff, 0x00e5ff);
                this.gridHelper.position.y = 0.01;
                this.scene.add(this.gridHelper);
                this.arenaObjects.push(this.gridHelper);
            }

            // Build Cyber layout
            this.buildCyberMap();

        } else if (mapName === 'Jungle') {
            // Bright blue sky Jungle morning
            this.scene.background.setHex(0x80d8ff);
            this.scene.fog.color.setHex(0x80d8ff);
            this.scene.fog.density = 0.0035;

            if (this.ambientLight) {
                this.ambientLight.color.setHex(0xffffff);
                this.ambientLight.intensity = 0.95;
            }
            if (this.sunLight) {
                this.sunLight.color.setHex(0xffffff);
                this.sunLight.intensity = 1.25;
                this.sunLight.position.set(50, 70, 40);
            }

            if (this.gridHelper) {
                this.scene.remove(this.gridHelper);
                this.gridHelper = new THREE.GridHelper(400, 80, 0x2e7d32, 0x1b5e20);
                this.gridHelper.position.y = 0.01;
                this.scene.add(this.gridHelper);
                this.arenaObjects.push(this.gridHelper);
            }

            // Build Jungle Canopy layout
            this.buildJungleMap();

        } else if (mapName === 'Highlands') {
            // Highlands blue mist
            this.scene.background.setHex(0xb0bec5);
            this.scene.fog.color.setHex(0xb0bec5);
            this.scene.fog.density = 0.008;

            if (this.ambientLight) {
                this.ambientLight.color.setHex(0xeceff1);
                this.ambientLight.intensity = 0.6;
            }
            if (this.sunLight) {
                this.sunLight.color.setHex(0xffffff);
                this.sunLight.intensity = 0.8;
                this.sunLight.position.set(-60, 80, 20);
            }
            if (this.gridHelper) {
                this.scene.remove(this.gridHelper);
                this.gridHelper = new THREE.GridHelper(400, 80, 0x37474f, 0x455a64);
                this.gridHelper.position.y = 0.01;
                this.scene.add(this.gridHelper);
                this.arenaObjects.push(this.gridHelper);
            }

            // Build Highlands Peaks layout
            this.buildHighlandsMap();

        } else {
            // Default Classic theme
            this.scene.background.setHex(0xaaccff);
            this.scene.fog.color.setHex(0xaaccff);
            this.scene.fog.density = 0.015;

            if (this.ambientLight) {
                this.ambientLight.color.setHex(0xffffff);
                this.ambientLight.intensity = 0.5;
            }
            if (this.sunLight) {
                this.sunLight.color.setHex(0xfffaed);
                this.sunLight.intensity = 0.8;
                this.sunLight.position.set(30, 45, 20);
            }
            if (this.gridHelper) {
                this.scene.remove(this.gridHelper);
                this.gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x888888);
                this.gridHelper.position.y = 0.01;
                this.scene.add(this.gridHelper);
                this.arenaObjects.push(this.gridHelper);
            }

            // Build Classic layout
            this.buildClassicMap();
        }
    }


    buildClassicMap() {
        // Floor Plane
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const rockTex = this.createProceduralTexture('Rock');
        rockTex.repeat.set(10, 10);

        const floorMat = new THREE.MeshStandardMaterial({
            map: rockTex,
            roughness: 0.85
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);

        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.arenaObjects.push(floor);

        // Boundary walls
        const wallMaterial = 0x546e7a;
        const barrierSize = 50;
        
        this.createBlock(0, 4, -barrierSize, 100, 8, 2, wallMaterial);
        this.createBlock(0, 4, barrierSize, 100, 8, 2, wallMaterial);
        this.createBlock(-barrierSize, 4, 0, 2, 8, 100, wallMaterial);
        this.createBlock(barrierSize, 4, 0, 2, 8, 100, wallMaterial);

        // Spawn barricades
        const redColor = 0xc62828;
        const blueColor = 0x1565c0;
        const woodColor = 0x8d6e63;
        
        this.createBlock(0, 1.5, 23, 6, 3, 2, blueColor);
        this.createBlock(0, 1.5, -23, 6, 3, 2, redColor);

        // Arena Centerpieces
        this.createBlock(0, 4, 0, 4, 8, 4, 0x37474f); // Center pillar
        
        // Left side cover
        this.createBlock(-12, 1, 0, 4, 2, 4, woodColor);
        this.createBlock(-12, 2.5, 0, 2, 1, 2, woodColor);

        // Right side cover
        this.createBlock(12, 1, 0, 4, 2, 4, woodColor);
        this.createBlock(12, 2.5, 0, 2, 1, 2, woodColor);

        // Diagonal cover shields
        this.createBlock(-8, 1.5, -10, 3, 3, 3, redColor);
        this.createBlock(8, 1.5, 10, 3, 3, 3, blueColor);

        this.createBlock(-8, 1, 12, 2, 2, 4, 0x78909c);
        this.createBlock(8, 1, -12, 2, 2, 4, 0x78909c);

        // Ramps
        this.createRamp(-15, 0.75, 5, 4, 1.5, 6, 0.5, 0x78909c);
        this.createRamp(15, 0.75, -5, 4, 1.5, 6, -0.5, 0x78909c);
    }

    buildDesertMap() {
        // Floor Plane (Sandy gold)
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const sandTex = this.createProceduralTexture('Sand');
        sandTex.repeat.set(10, 10);

        const floorMat = new THREE.MeshStandardMaterial({
            map: sandTex,
            roughness: 0.9,
            metalness: 0.05
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);

        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.arenaObjects.push(floor);

        // Boundary walls (Sandstone brick color)
        const wallMaterial = 0x8d6e63;
        const barrierSize = 50;
        
        this.createBlock(0, 4, -barrierSize, 100, 8, 2, wallMaterial);
        this.createBlock(0, 4, barrierSize, 100, 8, 2, wallMaterial);
        this.createBlock(-barrierSize, 4, 0, 2, 8, 100, wallMaterial);
        this.createBlock(barrierSize, 4, 0, 2, 8, 100, wallMaterial);

        // Desert ruins blocks
        const stoneColor = 0xa1887f;
        const brickColor = 0xbcaaa4;

        // Sand spawn barricades
        this.createBlock(0, 1.5, 23, 6, 3, 2, stoneColor);
        this.createBlock(0, 1.5, -23, 6, 3, 2, stoneColor);

        // Center Lookout Tower monument
        this.createBlock(0, 5, 0, 3, 10, 3, 0x5d4037); 
        const platform = this.createBlock(0, 10.25, 0, 4.5, 0.5, 4.5, stoneColor); 

        // Left Archway Ruins
        this.createBlock(-12, 3, -4, 1.5, 6, 1.5, brickColor);
        this.createBlock(-12, 3, 4, 1.5, 6, 1.5, brickColor);
        this.createBlock(-12, 6.25, 0, 1.5, 0.5, 9.5, stoneColor);

        // Right Archway Ruins
        this.createBlock(12, 3, -4, 1.5, 6, 1.5, brickColor);
        this.createBlock(12, 3, 4, 1.5, 6, 1.5, brickColor);
        this.createBlock(12, 6.25, 0, 1.5, 0.5, 9.5, stoneColor);

        // Raised sniper blocks
        this.createBlock(-16, 2.5, 12, 5, 5, 5, stoneColor);
        this.createRamp(-16, 1.25, 7, 5, 2.5, 5, 0.25, brickColor); 

        this.createBlock(16, 2.5, -12, 5, 5, 5, stoneColor);
        this.createRamp(16, 1.25, -7, 5, 2.5, 5, -0.25, brickColor);

        // Scattered dunes / low ruins piles
        this.createBlock(8, 0.5, 8, 3, 1, 3, 0xcaab6e);
        this.createBlock(-8, 0.5, -8, 3, 1, 3, 0xcaab6e);
        this.createBlock(-8, 1, -12, 3, 2, 3, brickColor);
        this.createBlock(8, 1, 12, 3, 2, 3, brickColor);
    }

    buildCyberMap() {
        // Floor Plane (Glossy dark grid)
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const gridTex = this.createProceduralTexture('Grid');
        gridTex.repeat.set(10, 10);

        const floorMat = new THREE.MeshStandardMaterial({
            map: gridTex,
            roughness: 0.15,
            metalness: 0.95
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);

        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.arenaObjects.push(floor);

        // Boundary walls (Dark metallic panels)
        const wallMaterial = 0x15151e;
        const barrierSize = 50;
        
        this.createBlock(0, 4, -barrierSize, 100, 8, 2, wallMaterial);
        this.createBlock(0, 4, barrierSize, 100, 8, 2, wallMaterial);
        this.createBlock(-barrierSize, 4, 0, 2, 8, 100, wallMaterial);
        this.createBlock(barrierSize, 4, 0, 2, 8, 100, wallMaterial);

        // Neon colors
        const cyanNeon = 0x00f5ff;
        const magentaNeon = 0xff007f;
        const orangeNeon = 0xff6d00;
        const purpleDark = 0x311b92;

        // Team spawn blockers (semi-translucent glowing prisms)
        this.createBlock(0, 1.5, 23, 6, 3, 2, cyanNeon, true, 0.85);
        this.createBlock(0, 1.5, -23, 6, 3, 2, magentaNeon, true, 0.85);

        // Centerpiece: Mega glowing crystal tower
        this.createBlock(0, 5, 0, 5, 10, 5, orangeNeon, true, 0.9);

        // Left Cyber Prisms
        this.createBlock(-12, 2.5, 0, 2.5, 5, 7.5, magentaNeon, true, 0.75);

        // Right Cyber Prisms
        this.createBlock(12, 2.5, 0, 2.5, 5, 7.5, cyanNeon, true, 0.75);

        // Elevated sniper positions
        this.createBlock(-16, 2.0, 10, 4, 4, 4, purpleDark);
        this.createRamp(-16, 1.0, 5, 4, 2.0, 6, 0.3, cyanNeon, true, 0.95);

        this.createBlock(16, 2.0, -10, 4, 4, 4, purpleDark);
        this.createRamp(16, 1.0, -5, 4, 2.0, 6, -0.3, magentaNeon, true, 0.95);

        // Scattered grid shields
        this.createBlock(-8, 1, -12, 2, 2, 4, orangeNeon, true, 0.8);
        this.createBlock(8, 1, 12, 2, 2, 4, orangeNeon, true, 0.8);
        
        // Scattered grid shields
        this.createBlock(-8, 1, 14, 3, 2, 1.5, purpleDark);
        this.createBlock(8, 1, -14, 3, 2, 1.5, purpleDark);
    }

    buildJungleMap() {
        // Floor Plane (Subdivided and Deformed into massive hills and valleys spanning 800x800)
        const floorGeo = new THREE.PlaneGeometry(800, 800, 80, 80);
        const posAttr = floorGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const zVal = -posAttr.getY(i);
            const height = this.getTerrainHeight(x, zVal);
            posAttr.setZ(i, height);
        }
        floorGeo.computeVertexNormals();

        const grassTex = this.createProceduralTexture('Grass');
        grassTex.repeat.set(50, 50);

        const floorMat = new THREE.MeshStandardMaterial({
            map: grassTex,
            roughness: 0.85
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.arenaObjects.push(floor);

        // Translucent Water Plane spanning 800x800 at y = 3.5 (forming rivers and lakes)
        const waterGeo = new THREE.PlaneGeometry(800, 800);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x80deea, // light blue
            roughness: 0.15,
            metalness: 0.85,
            transparent: true,
            opacity: 0.55
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 3.5;
        this.scene.add(water);
        this.arenaObjects.push(water);


        // Huge boundaries walls (Thick forest jungle walls)
        const wallMaterial = 0x0d230a;
        const barrierSize = 400; // 800x800 limits
        
        this.createBlock(0, 12, -barrierSize, 800, 24, 6, wallMaterial);
        this.createBlock(0, 12, barrierSize, 800, 24, 6, wallMaterial);
        this.createBlock(-barrierSize, 12, 0, 6, 24, 800, wallMaterial);
        this.createBlock(barrierSize, 12, 0, 6, 24, 800, wallMaterial);

        // Crates spawn buffers at base coordinates
        this.createBlock(0, 1.5, 335, 6, 3, 2, 0x1565c0); // blue spawn wall
        this.createBlock(0, 1.5, -335, 6, 3, 2, 0xc62828); // red spawn wall

        // Spawning forest trees (200 trees scattered on sides)
        const woodColor = 0x5d4037;
        const leafColor = 0x2e7d32;

        for (let i = 0; i < 200; i++) {
            const rx = (Math.random() - 0.5) * 720;
            const rz = (Math.random() - 0.5) * 720;

            // Keep the central duel corridor clear so players have a clear path in the middle
            if (Math.abs(rx) < 25 && Math.abs(rz) < 320) continue;

            const h = this.getTerrainHeight(rx, rz);
            if (h < 3.8) continue; // Prevent trees spawning in river water!

            const tHeight = 4.0 + Math.random() * 5.0;

            
            // Trunk
            this.createBlock(rx, h + tHeight / 2, rz, 1.0, tHeight, 1.0, woodColor);

            // Foliage Box layers
            this.createBlock(rx, h + tHeight + 1.5, rz, 3.6, 3.0, 3.6, leafColor);
            this.createBlock(rx, h + tHeight + 3.2, rz, 2.2, 1.6, 2.2, leafColor);
        }

        // Giant Trees with climbable tree houses (4 Giants)
        const giantCoords = [
            { x: 45, z: 45 },
            { x: -45, z: -45 },
            { x: -45, z: 45 },
            { x: 45, z: -45 }
        ];

        giantCoords.forEach(pos => {
            const giantTrunkColor = 0x3e2723;
            const h = this.getTerrainHeight(pos.x, pos.z);
            // Giant Trunk (Height 20 units)
            this.createBlock(pos.x, h + 10, pos.z, 2.8, 20, 2.8, giantTrunkColor);

            // Canopy Deck floor
            this.createBlock(pos.x, h + 20.1, pos.z, 12, 0.4, 12, 0x8d6e63);

            // Fences around deck
            this.createBlock(pos.x, h + 20.7, pos.z - 5.9, 12, 0.8, 0.2, woodColor);
            this.createBlock(pos.x, h + 20.7, pos.z + 5.9, 12, 0.8, 0.2, woodColor);
            this.createBlock(pos.x - 5.9, h + 20.7, pos.z, 0.2, 0.8, 12, woodColor);
            this.createBlock(pos.x + 5.9, h + 20.7, pos.z, 0.2, 0.8, 12, woodColor);

            // Tree house on deck
            const thFloorX = pos.x;
            const thFloorZ = pos.z;
            
            // 4 posts
            this.createBlock(thFloorX - 2.5, h + 22.25, thFloorZ - 2.5, 0.3, 4.5, 0.3, woodColor);
            this.createBlock(thFloorX + 2.5, h + 22.25, thFloorZ - 2.5, 0.3, 4.5, 0.3, woodColor);
            this.createBlock(thFloorX - 2.5, h + 22.25, thFloorZ + 2.5, 0.3, 4.5, 0.3, woodColor);
            this.createBlock(thFloorX + 2.5, h + 22.25, thFloorZ + 2.5, 0.3, 4.5, 0.3, woodColor);

            // Thatch roof
            this.createBlock(thFloorX, h + 24.6, thFloorZ, 6.2, 0.5, 6.2, 0xd84315);

            // Giant Foliage above house
            this.createBlock(pos.x, h + 28, pos.z, 14, 6, 14, leafColor);
            this.createBlock(pos.x, h + 32, pos.z, 10, 4, 10, leafColor);

            // Spiral stepping stones wrapping trunk (Climbing ladder simulation)
            const numSteps = 15;
            for (let s = 0; s < numSteps; s++) {
                const angle = (s / numSteps) * Math.PI * 2.5; // spiral wrap
                const sx = pos.x + Math.sin(angle) * 3.0;
                const sz = pos.z + Math.cos(angle) * 3.0;
                const sy = h + (s / numSteps) * 20;

                // Create jump step block
                this.createBlock(sx, sy + 0.35, sz, 1.4, 0.7, 1.4, 0x8d6e63);
            }
        });


        // Scatter center cover logs
        this.createBlock(0, 1.25, 0, 10, 2.5, 4, woodColor);
        this.createBlock(-12, 1, 40, 6, 2, 6, woodColor);
        this.createBlock(12, 1, -40, 6, 2, 6, woodColor);

        // Spawn interactive stealth bushes (where player can hide)
        this.bushes = [];
        const bushCoords = [
            { x: -30, z: 25 }, { x: 35, z: -55 }, { x: -80, z: -110 },
            { x: 80, z: 110 }, { x: 45, z: 65 }, { x: -45, z: -65 },
            { x: 0, z: 140 }, { x: 0, z: -140 }
        ];
        bushCoords.forEach(pos => {
            const h = this.getTerrainHeight(pos.x, pos.z);
            if (h > 3.8) {
                // Non-solid, transparent green bush mesh
                this.createBlock(pos.x, h + 1.25, pos.z, 9.0, 2.5, 9.0, 0x2e7d32, false, 0.75, false);
                this.bushes.push({ position: new THREE.Vector3(pos.x, h, pos.z), radius: 5.5 });
            }
        });

        // Scatter additional Jungle stone barriers for cover
        const jBarriers = [
            { x: -15, z: 90 }, { x: 15, z: -90 }, { x: -45, z: 30 }, { x: 45, z: -30 },
            { x: -70, z: -50 }, { x: 70, z: 50 }, { x: -100, z: 10 }, { x: 100, z: -10 }
        ];
        jBarriers.forEach(pos => {
            const h = this.getTerrainHeight(pos.x, pos.z);
            if (h > 3.8) {
                this.createBlock(pos.x, h + 1.5, pos.z, 4.0, 3.0, 4.0, 0x455a64);
            }
        });

        // Spawn cute ambient wildlife (rabbits)
        this.spawnWildlife('Jungle');


        // Spawn colorful flowers
        this.spawnFlowers();

        // Build underground cave system
        this.buildCaveSystem();
    }






    buildHighlandsMap() {
        // 800x800 Subdivided Plane for detailed mountain ranges
        const floorGeo = new THREE.PlaneGeometry(800, 800, 80, 80);
        const posAttr = floorGeo.attributes.position;
        const colors = new Float32Array(posAttr.count * 3);

        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const zVal = -posAttr.getY(i);
            const height = this.getTerrainHeight(x, zVal);
            posAttr.setZ(i, height);

            // Slope/Height based coloring
            let r = 0.42, g = 0.45, b = 0.48; // default slate grey rock

            if (height < 9.5) {
                // Valley lush green grass
                const t = height / 9.5;
                r = 0.2 + t * 0.22;
                g = 0.45 + t * 0.0;
                b = 0.15 + t * 0.33;
            } else if (height > 48.0) {
                // Snow-capped peak peaks
                const t = Math.min(1.0, (height - 48.0) / 12.0);
                r = 0.42 + t * 0.53;
                g = 0.45 + t * 0.5;
                b = 0.48 + t * 0.47;
            } else {
                // Spots of greenery on slopes!
                const greenNoise = Math.sin(x * 0.07) * Math.cos(zVal * 0.07);
                if (greenNoise > 0.35 && height < 32.0) {
                    r = 0.22;
                    g = 0.46;
                    b = 0.18;
                }
            }

            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
        }

        floorGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        floorGeo.computeVertexNormals();

        const floorMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.05
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.arenaObjects.push(floor);

        // Translucent Lake Water Plane spanning 800x800 at y = 6.0
        const waterGeo = new THREE.PlaneGeometry(800, 800);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x80deea, // light blue
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.55
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 6.0;
        this.scene.add(water);
        this.arenaObjects.push(water);


        // Charcoal stone boundary walls
        const wallMaterial = 0x37474f;
        const barrierSize = 400; // 800x800 size
        
        this.createBlock(0, 12, -barrierSize, 800, 24, 6, wallMaterial);
        this.createBlock(0, 12, barrierSize, 800, 24, 6, wallMaterial);
        this.createBlock(-barrierSize, 12, 0, 6, 24, 800, wallMaterial);
        this.createBlock(barrierSize, 12, 0, 6, 24, 800, wallMaterial);

        // Spawn barricades at base coordinates
        this.createBlock(0, 1.5, 335, 6, 3, 2, 0x558b2f);
        this.createBlock(0, 1.5, -335, 6, 3, 2, 0x558b2f);

        // Suspension Bridges (re-positioned at high summits)
        const bridgeColor = 0x705d49;
        this.createBlock(-87.5, 67.0, 35, 2.2, 0.2, 70, bridgeColor).rotation.y = 0.55;
        this.createBlock(87.5, 67.0, -35, 2.2, 0.2, 70, bridgeColor).rotation.y = 0.55;




        // Watchtowers (2 stone sniping outposts)
        const h1 = this.getTerrainHeight(0, 80);
        this.createBlock(0, h1 + 6, 80, 4.5, 12, 4.5, 0x455a64); // Foundation
        this.createBlock(0, h1 + 12.2, 80, 6, 0.4, 6, 0x90a4ae); // Platform deck
        this.createBlock(0, h1 + 12.8, 77.2, 6, 0.8, 0.2, 0x37474f); // railings
        this.createBlock(0, h1 + 12.8, 82.8, 6, 0.8, 0.2, 0x37474f);
        this.createBlock(-2.8, h1 + 12.8, 80, 0.2, 0.8, 6, 0x37474f);
        this.createBlock(2.8, h1 + 12.8, 80, 0.2, 0.8, 6, 0x37474f);

        const h2 = this.getTerrainHeight(0, -80);
        this.createBlock(0, h2 + 6, -80, 4.5, 12, 4.5, 0x455a64); 
        this.createBlock(0, h2 + 12.2, -80, 6, 0.4, 6, 0x90a4ae); 
        this.createBlock(0, h2 + 12.8, -77.2, 6, 0.8, 0.2, 0x37474f); 
        this.createBlock(0, h2 + 12.8, -82.8, 6, 0.8, 0.2, 0x37474f);
        this.createBlock(-2.8, h2 + 12.8, -80, 0.2, 0.8, 6, 0x37474f);
        this.createBlock(2.8, h2 + 12.8, -80, 0.2, 0.8, 6, 0x37474f);

        // Decorate with Pine Trees
        const trunkColor = 0x4e342e;
        const pineColor = 0x1b5e20;
        
        for (let i = 0; i < 160; i++) {
            const rx = (Math.random() - 0.5) * 720;
            const rz = (Math.random() - 0.5) * 720;

            // Keep spawns corridor clear
            if (Math.abs(rx) < 25 && Math.abs(rz) < 320) continue;
            
            const h = this.getTerrainHeight(rx, rz);
            if (h < 6.6 || h > 32.0) continue; // Prevent spawning in lake water or on steep peaks!


            const tHeight = 5.0 + Math.random() * 4.0;
            // Trunk
            this.createBlock(rx, h + tHeight / 2, rz, 0.8, tHeight, 0.8, trunkColor);
            // layered cones leaf boxes (pyramid pine)
            this.createBlock(rx, h + tHeight + 1.2, rz, 3.2, 2.4, 3.2, pineColor);
            this.createBlock(rx, h + tHeight + 2.5, rz, 2.0, 1.8, 2.0, pineColor);
            this.createBlock(rx, h + tHeight + 3.4, rz, 1.0, 1.2, 1.0, pineColor);
        }

        // Center monument cover
        const hc = this.getTerrainHeight(0, 0);
        this.createBlock(0, hc + 3, 0, 4, 6, 4, 0x455a64);
        this.createBlock(0, hc + 1, 15, 6, 2, 4, 0x78909c);
        this.createBlock(0, hc + 1, -15, 6, 2, 4, 0x78909c);

        // Waterfall 1 (Emerges from Peak A at height 56.0, cascades to river lake)
        this.createBlock(52.0, 55.0, 48.0, 10.0, 2.0, 4.0, 0x37474f); // rock ledge pool
        this.createBlock(52.0, 31.0, 48.0, 8.0, 50.0, 2.0, 0x80deea, true, 0.65); // water column

        // Waterfall 2 (Emerges from Peak B at height 56.0, cascades to river lake)
        this.createBlock(-52.0, 55.0, -48.0, 10.0, 2.0, 4.0, 0x37474f); // rock ledge pool
        this.createBlock(-52.0, 31.0, -48.0, 8.0, 50.0, 2.0, 0x80deea, true, 0.65); // water column


        // Scatter additional Highlands stone ruins barriers for cover
        const hBarriers = [
            { x: -35, z: 80 }, { x: 35, z: -80 }, { x: -55, z: -20 }, { x: 55, z: 20 },
            { x: -90, z: 45 }, { x: 90, z: -45 }, { x: -120, z: -80 }, { x: 120, z: 80 }
        ];
        hBarriers.forEach(pos => {
            const h = this.getTerrainHeight(pos.x, pos.z);
            if (h > 6.6) {
                this.createBlock(pos.x, h + 2.0, pos.z, 5.0, 4.0, 5.0, 0x37474f);
            }
        });

        // Spawn cute ambient wildlife (rabbits)
        this.spawnWildlife('Highlands');


        // Spawn colorful flowers
        this.spawnFlowers();

        // Build underground cave system
        this.buildCaveSystem();
    }





    spawnFlowers() {
        const count = 60;
        const colors = [
            0xff1744, // Bright Red
            0xffea00, // Vibrant Yellow
            0xe040fb, // Purple-Magenta
            0x00e5ff, // Sky Cyan
            0xff4081, // Pink
            0xff9100  // Orange
        ];

        for (let i = 0; i < count; i++) {
            const limit = 320.0;
            const rx = (Math.random() - 0.5) * limit * 2.0;
            const rz = (Math.random() - 0.5) * limit * 2.0;

            const h = this.getTerrainHeight(rx, rz);
            const waterLevel = this.selectedMapName === 'Jungle' ? 3.8 : 6.6;
            if (h < waterLevel) continue; // Skip water spawn

            const color = colors[Math.floor(Math.random() * colors.length)];

            // Stem (non-collidable)
            this.createBlock(rx, h + 0.4, rz, 0.12, 0.8, 0.12, 0x2e7d32, false, 1.0, false);
            // Flower Head
            this.createBlock(rx, h + 0.8, rz, 0.4, 0.4, 0.4, color, false, 1.0, false);
        }
    }

    spawnWildlife(mapName) {
        this.wildlife = this.wildlife || [];
        
        // 1. Spawn cute rabbits
        const rabbitCount = 8;
        for (let i = 0; i < rabbitCount; i++) {
            const group = new THREE.Group();
            
            // Cute rabbit model
            const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 1.0);
            const furColor = mapName === 'Jungle' ? 0xd7ccc8 : 0xf5f5f5;
            const bodyMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.8 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.3;
            body.castShadow = true;
            group.add(body);
            
            const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const head = new THREE.Mesh(headGeo, bodyMat);
            head.position.set(0, 0.65, 0.4);
            group.add(head);
            
            const earGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
            const earL = new THREE.Mesh(earGeo, bodyMat);
            earL.position.set(-0.15, 1.0, 0.35);
            group.add(earL);
            const earR = new THREE.Mesh(earGeo, bodyMat);
            earR.position.set(0.15, 1.0, 0.35);
            group.add(earR);
            
            const limit = 160.0;
            const rx = (Math.random() - 0.5) * limit * 2.0;
            const rz = (Math.random() - 0.5) * limit * 2.0;
            const h = this.getTerrainHeight(rx, rz);
            group.position.set(rx, h, rz);
            
            this.scene.add(group);
            this.arenaObjects.push(group);
            
            this.wildlife.push({
                type: 'rabbit',
                mesh: group,
                x: rx,
                z: rz,
                baseY: h,
                speed: 1.5 + Math.random() * 2.0,
                angle: Math.random() * Math.PI * 2,
                hopPhase: Math.random() * Math.PI * 2,
                wanderTimer: 0.0
            });
        }

        // 2. Spawn flying ambient birds in the sky
        const birdCount = 8;
        for (let i = 0; i < birdCount; i++) {
            const group = new THREE.Group();
            
            // Bird body
            const bodyGeo = new THREE.BoxGeometry(0.35, 0.16, 0.65);
            const furColor = mapName === 'Jungle' ? 0x8d6e63 : 0x78909c; // dark brown for jungle, bluish-grey for highlands
            const bodyMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.85 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.castShadow = true;
            group.add(body);
            
            // Left Wing
            const wingGeo = new THREE.BoxGeometry(0.7, 0.03, 0.32);
            const wingL = new THREE.Mesh(wingGeo, bodyMat);
            wingL.position.set(-0.35, 0, 0);
            group.add(wingL);
            
            // Right Wing
            const wingR = new THREE.Mesh(wingGeo, bodyMat);
            wingR.position.set(0.35, 0, 0);
            group.add(wingR);
            
            // Beak
            const beakGeo = new THREE.BoxGeometry(0.08, 0.08, 0.15);
            const beakMat = new THREE.MeshStandardMaterial({ color: 0xffb74d, roughness: 0.6 });
            const beak = new THREE.Mesh(beakGeo, beakMat);
            beak.position.set(0, 0, 0.38);
            group.add(beak);
            
            const limit = 200.0;
            const rx = (Math.random() - 0.5) * limit * 2.0;
            const rz = (Math.random() - 0.5) * limit * 2.0;
            const h = 40.0 + Math.random() * 25.0; // fly high above the ground!
            group.position.set(rx, h, rz);
            
            this.scene.add(group);
            this.arenaObjects.push(group);
            
            this.wildlife.push({
                type: 'bird',
                mesh: group,
                wingL: wingL,
                wingR: wingR,
                x: rx,
                z: rz,
                y: h,
                speed: 10.0 + Math.random() * 8.0, // birds fly faster
                angle: Math.random() * Math.PI * 2,
                flapPhase: Math.random() * Math.PI * 2,
                wanderTimer: 0.0
            });
        }
    }



    buildVillage(mapName) {
        this.houses = this.houses || [];

        let coords = [];
        let woodColor, roofColor;

        if (mapName === 'Jungle') {
            woodColor = 0x5d4037; // dark wood
            roofColor = 0xd84315; // thatch red-orange
            coords = [
                { x: -120, z: -100 }, { x: -140, z: -100 }, { x: -100, z: -100 },
                { x: -140, z: -80 },  { x: -100, z: -80 },  { x: -120, z: -50 },
                { x: -140, z: -50 },  { x: -100, z: -50 },  { x: -120, z: -20 },
                { x: -140, z: -20 },  { x: -100, z: -20 },  { x: -120, z: 10 },
                { x: -140, z: 10 },   { x: -100, z: 10 },   { x: -140, z: 40 }
            ];
        } else if (mapName === 'Highlands') {
            woodColor = 0x4e342e; // rustic brown
            roofColor = 0x455a64; // slate blue-grey
            coords = [
                { x: 180, z: -180 }, { x: 150, z: -160 }, { x: 210, z: -160 },
                { x: 180, z: -130 }, { x: 150, z: -110 }, { x: 210, z: -110 },
                { x: 180, z: -80 },  { x: 150, z: -60 },  { x: 210, z: -60 },
                { x: 180, z: -30 },  { x: 150, z: -10 },  { x: 210, z: -10 },
                { x: 180, z: 20 },   { x: 150, z: 40 },   { x: 210, z: 40 }
            ];
        } else {
            return;
        }

        coords.forEach((pos, idx) => {
            const h = this.getTerrainHeight(pos.x, pos.z);
            
            // Prevent spawning inside surface water pools/rivers
            const waterLimit = mapName === 'Jungle' ? 3.8 : 6.6;
            if (h < waterLimit) return;

            // Generate three distinct sizes to avoid boring duplicate layouts
            const sizeProfile = idx % 3;
            let w, d, hw;
            if (sizeProfile === 0) {
                // Large Cottage
                w = 12.0; d = 12.0; hw = 6.5;
            } else if (sizeProfile === 1) {
                // Medium Cabin
                w = 10.0; d = 10.0; hw = 5.5;
            } else {
                // Small Hut
                w = 8.0; d = 8.0; hw = 4.5;
            }
            
            // House dimensions:
            // 1. Floor slab
            this.createBlock(pos.x, h + 0.1, pos.z, w, 0.2, d, woodColor);

            // 2. North Wall
            this.createBlock(pos.x, h + hw/2, pos.z - d/2 + 0.25, w, hw, 0.5, woodColor);

            // 3. West Wall (with window for Medium cabin)
            if (sizeProfile === 1) {
                // Front and back portions of the wall
                this.createBlock(pos.x - w/2 + 0.25, h + hw/2, pos.z - d/4 - 0.5, 0.5, hw, d/2 - 1.0, woodColor);
                this.createBlock(pos.x - w/2 + 0.25, h + hw/2, pos.z + d/4 + 0.5, 0.5, hw, d/2 - 1.0, woodColor);
                // Glass panel
                this.createBlock(pos.x - w/2 + 0.25, h + 3.0, pos.z, 0.2, 2.0, 2.0, 0x80deea, false, 0.55, false);
            } else {
                this.createBlock(pos.x - w/2 + 0.25, h + hw/2, pos.z, 0.5, hw, d, woodColor);
            }
            
            // 4. East Wall (solid)
            this.createBlock(pos.x + w/2 - 0.25, h + hw/2, pos.z, 0.5, hw, d, woodColor);
            
            // 5. South Wall (leaving center doorway)
            const sw = (w - 3.0) / 2;
            this.createBlock(pos.x - w/2 + sw/2, h + hw/2, pos.z + d/2 - 0.25, sw, hw, 0.5, woodColor);
            this.createBlock(pos.x + w/2 - sw/2, h + hw/2, pos.z + d/2 - 0.25, sw, hw, 0.5, woodColor);
            
            // 6. Gabled Stepped Shingle Roof (non-solid for smooth camera behavior inside)
            this.createBlock(pos.x, h + hw + 0.2, pos.z, w + 1.6, 0.4, d + 0.6, roofColor, false, 1.0, false);
            this.createBlock(pos.x, h + hw + 0.6, pos.z, w - 1.6, 0.4, d + 0.6, roofColor, false, 1.0, false);
            this.createBlock(pos.x, h + hw + 1.0, pos.z, w - 4.8, 0.4, d + 0.6, roofColor, false, 1.0, false);

            // Architectural Details:
            if (sizeProfile === 0) {
                // Large Cottage: Porch roof and posts, plus stone chimney!
                this.createBlock(pos.x, h + hw - 0.3, pos.z + d/2 + 1.5, w + 0.8, 0.3, 3.0, roofColor, false, 1.0, false);
                this.createBlock(pos.x - w/2 + 0.2, h + (hw - 0.3)/2, pos.z + d/2 + 2.8, 0.4, hw - 0.3, 0.4, woodColor);
                this.createBlock(pos.x + w/2 - 0.2, h + (hw - 0.3)/2, pos.z + d/2 + 2.8, 0.4, hw - 0.3, 0.4, woodColor);
                // Chimney
                this.createBlock(pos.x + w/3, h + hw + 1.2, pos.z - d/3, 1.2, 4.0, 1.2, 0x455a64);
            } else if (sizeProfile === 1) {
                // Medium Cabin: Front door awning canopy
                this.createBlock(pos.x, h + hw - 0.3, pos.z + d/2 + 0.6, 4.5, 0.25, 1.5, roofColor, false, 1.0, false);
            }

            // Track for hiding logic
            this.houses.push({ x: pos.x, y: h, z: pos.z, w: w, d: d });
        });
    }



    buildCaveSystem() {
        const isJungle = this.selectedMapName === 'Jungle';
        const stoneColor = isJungle ? 0x3e2723 : 0x263238; // mossy brown for jungle, slate grey for highlands
        const woodColor = 0x5d4037;

        // Boulders organic spawner helper
        const spawnRock = (x, y, z, sx, sy, sz, color) => {
            const rsx = sx * (0.8 + Math.random() * 0.4);
            const rsy = sy * (0.8 + Math.random() * 0.4);
            const rsz = sz * (0.8 + Math.random() * 0.4);
            const mesh = this.createBlock(x, y, z, rsx, rsy, rsz, color);
            mesh.rotation.set(
                Math.random() * 0.3 - 0.15,
                Math.random() * Math.PI * 2,
                Math.random() * 0.3 - 0.15
            );
            return mesh;
        };

        const createOrganicWall = (x1, z1, x2, z2, color) => {
            const dx = x2 - x1;
            const dz = z2 - z1;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const steps = Math.ceil(dist / 4.5);
            for (let i = 0; i <= steps; i++) {
                const t = steps === 0 ? 0.0 : i / steps;
                const wx = x1 + dx * t;
                const wz = z1 + dz * t;
                spawnRock(
                    wx + (Math.random() - 0.5) * 1.5,
                    -15.5 + (Math.random() - 0.5) * 1.0,
                    wz + (Math.random() - 0.5) * 1.0,
                    5.5,
                    22.0,
                    5.5,
                    color
                );
            }
        };

        const createSolidWall = (x1, z1, x2, z2, color) => {
            // 1. Visual bumpy organic rock boulders
            createOrganicWall(x1, z1, x2, z2, color);
            
            // 2. Thick solid flat backing to prevent player/bot from escaping into the black void!
            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dx, dz);
            
            const backing = this.createBlock(
                (x1 + x2) / 2,
                -15.5,
                (z1 + z2) / 2,
                4.0, // thick solid backstop
                24.0, // tall backstop
                length + 2.0,
                color,
                false,
                1.0,
                true // solid!
            );
            backing.rotation.y = angle;
        };

        const createOrganicCeiling = (cx, cz, cw, cd, color) => {
            const steps = Math.ceil(Math.max(cw, cd) / 8.0);
            for (let i = 0; i < steps; i++) {
                const rx = cx + (Math.random() - 0.5) * cw * 0.6;
                const rz = cz + (Math.random() - 0.5) * cd * 0.6;
                const ceiling = this.createBlock(
                    rx,
                    -5.0 + (Math.random() - 0.5) * 0.8,
                    rz,
                    14.0 + Math.random() * 4.0,
                    2.0,
                    14.0 + Math.random() * 4.0,
                    color,
                    false,
                    1.0,
                    false // non-solid ceiling so players don't get trapped by irregular rock angles
                );
                ceiling.rotation.set(
                    Math.random() * 0.15 - 0.075,
                    Math.random() * Math.PI,
                    Math.random() * 0.15 - 0.075
                );
            }
        };

        // 1. Organic Rock Entrances (framing the sloped trenches at both x = -240 and x = 240)
        const entrances = [
            { x: -240, type: 'West' },
            { x: 240, type: 'East' }
        ];

        entrances.forEach(ent => {
            // South Entrance (near z = -120)
            for (let zVal = -140; zVal <= -100; zVal += 5.0) {
                const zDist = Math.abs(zVal - (-120));
                const h = 5.0 + (1.0 - Math.min(1.0, zDist / 20.0)) * 11.0;
                spawnRock(ent.x - 11.0 + (Math.random() - 0.5) * 1.0, h / 2 - 3.0, zVal, 5.0, h + 3.0, 5.0, stoneColor);
                spawnRock(ent.x + 11.0 + (Math.random() - 0.5) * 1.0, h / 2 - 3.0, zVal, 5.0, h + 3.0, 5.0, stoneColor);
            }
            for (let zVal = -138; zVal <= -102; zVal += 5.0) {
                const zDist = Math.abs(zVal - (-120));
                const yPos = 11.5 - (zDist / 20.0) * 8.0;
                const arch = this.createBlock(ent.x, yPos, zVal, 26.0, 3.5, 8.5, stoneColor, false, 1.0, false);
                arch.rotation.set(Math.random() * 0.08 - 0.04, Math.random() * Math.PI, Math.random() * 0.08 - 0.04);
            }

            // North Entrance (near z = 120)
            for (let zVal = 100; zVal <= 140; zVal += 5.0) {
                const zDist = Math.abs(zVal - 120);
                const h = 5.0 + (1.0 - Math.min(1.0, zDist / 20.0)) * 11.0;
                spawnRock(ent.x - 11.0 + (Math.random() - 0.5) * 1.0, h / 2 - 3.0, zVal, 5.0, h + 3.0, 5.0, stoneColor);
                spawnRock(ent.x + 11.0 + (Math.random() - 0.5) * 1.0, h / 2 - 3.0, zVal, 5.0, h + 3.0, 5.0, stoneColor);
            }
            for (let zVal = 102; zVal <= 138; zVal += 5.0) {
                const zDist = Math.abs(zVal - 120);
                const yPos = 11.5 - (zDist / 20.0) * 8.0;
                const arch = this.createBlock(ent.x, yPos, zVal, 26.0, 3.5, 8.5, stoneColor, false, 1.0, false);
                arch.rotation.set(Math.random() * 0.08 - 0.04, Math.random() * Math.PI, Math.random() * 0.08 - 0.04);
            }
        });

        // 2. Cavern Floor Slabs (flat net support inside the entire branching network)
        const segments = [
            // West Corridor
            { x: -240, z: -105, w: 20, d: 32 },
            { x: -240, z: -70, w: 20, d: 42 },
            { x: -240, z: -30, w: 20, d: 42 },
            { x: -240, z: 0, w: 20, d: 32 },
            { x: -240, z: 30, w: 20, d: 42 },
            { x: -240, z: 70, w: 20, d: 42 },
            { x: -240, z: 105, w: 20, d: 32 },
            
            // East Corridor
            { x: 240, z: -105, w: 20, d: 32 },
            { x: 240, z: -70, w: 20, d: 42 },
            { x: 240, z: -30, w: 20, d: 42 },
            { x: 240, z: 0, w: 20, d: 32 },
            { x: 240, z: 30, w: 20, d: 42 },
            { x: 240, z: 70, w: 20, d: 42 },
            { x: 240, z: 105, w: 20, d: 32 },
            
            // South Cross-Connect
            { x: -120, z: -60, w: 220, d: 20 },
            { x: 120, z: -60, w: 220, d: 20 },
            
            // North Cross-Connect
            { x: -120, z: 60, w: 220, d: 20 },
            { x: 120, z: 60, w: 220, d: 20 },
            
            // Center Connector
            { x: 0, z: 0, w: 20, d: 100 }
        ];

        segments.forEach(seg => {
            // Flat walk floor slab
            this.createBlock(seg.x, -26.0, seg.z, seg.w, 1.0, seg.d, 0x181818);
            
            // Continuous solid ceiling slab to block out the sky completely and prevent falling out!
            this.createBlock(seg.x, -4.5, seg.z, seg.w + 6.0, 1.5, seg.d + 6.0, stoneColor, false, 1.0, true);
            
            // Decorative bumpy organic ceiling blocks underneath the solid backing
            createOrganicCeiling(seg.x, seg.z, seg.w, seg.d, stoneColor);
        });


        // 3. Airtight Solid Cavern Walls (incorporating visual organic boulders in front of invisible backstops)
        // West vertical trunk walls
        createSolidWall(-251.0, -120.0, -251.0, 120.0, stoneColor); // Left outer wall
        createSolidWall(-229.0, -120.0, -229.0, -70.0, stoneColor); // Right inner wall segment 1
        createSolidWall(-229.0, -50.0, -229.0, 50.0, stoneColor);   // Right inner wall segment 2
        createSolidWall(-229.0, 70.0, -229.0, 120.0, stoneColor);   // Right inner wall segment 3

        // East vertical trunk walls
        createSolidWall(251.0, -120.0, 251.0, 120.0, stoneColor);  // Right outer wall
        createSolidWall(229.0, -120.0, 229.0, -70.0, stoneColor);  // Left inner wall segment 1
        createSolidWall(229.0, -50.0, 229.0, 50.0, stoneColor);    // Left inner wall segment 2
        createSolidWall(229.0, 70.0, 229.0, 120.0, stoneColor);    // Left inner wall segment 3

        // South cross-connect walls (z = -60)
        createSolidWall(-230.0, -70.0, 230.0, -70.0, stoneColor);  // South outer wall
        createSolidWall(-230.0, -50.0, -10.0, -50.0, stoneColor);  // North wall segment 1
        createSolidWall(10.0, -50.0, 230.0, -50.0, stoneColor);    // North wall segment 2

        // North cross-connect walls (z = 60)
        createSolidWall(-230.0, 70.0, 230.0, 70.0, stoneColor);    // North outer wall
        createSolidWall(-230.0, 50.0, -10.0, 50.0, stoneColor);    // South wall segment 1
        createSolidWall(10.0, 50.0, 230.0, 50.0, stoneColor);      // South wall segment 2

        // Center connector walls (x = 0)
        createSolidWall(-10.0, -50.0, -10.0, 50.0, stoneColor);    // West wall
        createSolidWall(10.0, -50.0, 10.0, 50.0, stoneColor);      // East wall

        // 4. Subterranean Cavern Lakes (Translucent water pools inside horizontal sections)
        const lakeMat = new THREE.MeshStandardMaterial({
            color: 0x80deea,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.55
        });

        // Under-river Pool West-South
        const poolGeoA = new THREE.PlaneGeometry(90, 10);
        const poolA = new THREE.Mesh(poolGeoA, lakeMat);
        poolA.rotation.x = -Math.PI / 2;
        poolA.position.set(-120.0, -24.0, -60.0);
        this.scene.add(poolA);
        this.arenaObjects.push(poolA);

        // Under-river Pool East-North
        const poolGeoB = new THREE.PlaneGeometry(90, 10);
        const poolB = new THREE.Mesh(poolGeoB, lakeMat);
        poolB.rotation.x = -Math.PI / 2;
        poolB.position.set(120.0, -24.0, 60.0);
        this.scene.add(poolB);
        this.arenaObjects.push(poolB);

        // 5. Cavern support arches (Wooden post beams)
        const spawnSupportFrame = (x, z) => {
            this.createBlock(x, -15.5, z, 12, 1, 1, woodColor); // top beam
            this.createBlock(x - 6, -15.5, z, 1, 20, 1, woodColor); // left post
            this.createBlock(x + 6, -15.5, z, 1, 20, 1, woodColor); // right post
        };
        spawnSupportFrame(-240, -85);
        spawnSupportFrame(-240, 85);
        spawnSupportFrame(240, -85);
        spawnSupportFrame(240, 85);
        spawnSupportFrame(0, 0);

        // Glowing crystal veins on cavern walls
        this.createBlock(-228, -14.0, -30, 1.5, 5, 1.5, 0x00f5ff, true); // cyan crystal
        this.createBlock(228, -14.0, 30, 1.5, 5, 1.5, 0xff00ff, true);   // magenta crystal
        this.createBlock(-100, -10.0, -51, 4, 2, 1, 0x00ff00, true);    // green crystal
        this.createBlock(100, -10.0, 51, 4, 2, 1, 0xffea00, true);      // yellow crystal
    }






    createBlock(x, y, z, sx, sy, sz, colorHex, isEmissive = false, opacity = 1.0, isCollidable = true) {
        const geo = new THREE.BoxGeometry(sx, sy, sz);
        const mat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: isEmissive ? 0.15 : 0.7,
            metalness: isEmissive ? 0.95 : 0.2,
            emissive: isEmissive ? colorHex : 0x000000,
            emissiveIntensity: isEmissive ? 0.9 : 0,
            transparent: opacity < 1.0,
            opacity: opacity
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = !isEmissive;
        mesh.receiveShadow = !isEmissive;
        this.scene.add(mesh);
        if (isCollidable) {
            this.collidableObjects.push(mesh);
        }
        this.arenaObjects.push(mesh);
        return mesh;
    }


    createRamp(x, y, z, sx, sy, sz, rotationZ, colorHex, isEmissive = false, opacity = 1.0) {
        const mesh = this.createBlock(x, y, z, sx, sy, sz, colorHex, isEmissive, opacity);
        mesh.rotation.z = rotationZ;
        return mesh;
    }

    isPlayerHidden() {
        // 1. Check if inside a bush (Jungle only)
        if (this.selectedMapName === 'Jungle' && this.bushes) {
            for (let i = 0; i < this.bushes.length; i++) {
                const bush = this.bushes[i];
                const dx = this.playerPos.x - bush.position.x;
                const dz = this.playerPos.z - bush.position.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < bush.radius * bush.radius) {
                    return true;
                }
            }
        }
        // 2. Check if inside any village house floor slab (10x10 area)
        if (this.houses) {
            for (let i = 0; i < this.houses.length; i++) {
                const house = this.houses[i];
                const dx = Math.abs(this.playerPos.x - house.x);
                const dz = Math.abs(this.playerPos.z - house.z);
                const dy = this.playerPos.y - house.y;
                if (dx < 5.0 && dz < 5.0 && dy >= -0.2 && dy < 6.0) {
                    return true;
                }
            }
        }
        return false;
    }


    drawMinimap() {
        const canvas = document.getElementById('minimap-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, 140, 140);

        // Draw circular backing
        ctx.fillStyle = '#0a0f19';
        ctx.beginPath();
        ctx.arc(70, 70, 68, 0, Math.PI * 2);
        ctx.fill();

        // Sample terrain height surrounding the player
        // Minimap scale: 1.6 units in world = 1 pixel on minimap
        const scale = 1.6;
        const size = 140;
        const halfSize = size / 2;
        const step = 4; // draw in 4x4 blocks to avoid performance lag!

        // Compute player camera yaw rotation factors
        const cosYaw = Math.cos(-this.cameraYaw);
        const sinYaw = Math.sin(-this.cameraYaw);

        for (let x = 0; x < size; x += step) {
            for (let z = 0; z < size; z += step) {
                // Check if inside circular minimap boundary
                const dx_c = x - halfSize;
                const dz_c = z - halfSize;
                if (dx_c * dx_c + dz_c * dz_c > 68 * 68) continue;

                // Rotate the local offset by player look angle to get world coordinates
                const worldOffsetX = (dx_c * cosYaw - dz_c * sinYaw) * scale;
                const worldOffsetZ = (dx_c * sinYaw + dz_c * cosYaw) * scale;

                const wx = this.playerPos.x + worldOffsetX;
                const wz = this.playerPos.z + worldOffsetZ;

                // Check bounds
                const limit = this.currentMapLimit || 48.8;
                if (Math.abs(wx) > limit || Math.abs(wz) > limit) {
                    ctx.fillStyle = '#05070a'; // out of bounds
                } else {
                    const h = this.getTerrainHeight(wx, wz);
                    
                    if (this.selectedMapName === 'Jungle') {
                        if (h < 3.5) {
                            ctx.fillStyle = '#4dd0e1'; // light blue water
                        } else if (h > 24) {
                            ctx.fillStyle = '#1b5e20'; // dark ridge green
                        } else {
                            ctx.fillStyle = '#4caf50'; // standard green grass
                        }
                    } else if (this.selectedMapName === 'Highlands') {
                        if (h < 6.0) {
                            ctx.fillStyle = '#00acc1'; // light blue lake
                        } else if (h > 45.0) {
                            ctx.fillStyle = '#ffffff'; // snow cap white
                        } else if (h > 20.0) {
                            ctx.fillStyle = '#78909c'; // rocky slate grey
                        } else {
                            ctx.fillStyle = '#66bb6a'; // valley grass green
                        }
                    } else if (this.selectedMapName === 'Desert') {
                        if (h > 10.0) {
                            ctx.fillStyle = '#d7ccc8'; // brown dunes
                        } else {
                            ctx.fillStyle = '#ffe082'; // sand yellow
                        }
                    } else {
                        // Classic Grid Map
                        ctx.fillStyle = '#12161f';
                    }
                }

                ctx.fillRect(x, z, step, step);
            }
        }

        // Draw center player indicator pointing straight UP
        ctx.fillStyle = '#ffeb3b'; // bright yellow arrow
        ctx.beginPath();
        ctx.moveTo(halfSize, halfSize - 7);
        ctx.lineTo(halfSize - 5, halfSize + 5);
        ctx.lineTo(halfSize, halfSize + 2);
        ctx.lineTo(halfSize + 5, halfSize + 5);
        ctx.closePath();
        ctx.fill();

        // Draw active bot indicator if bot is alive
        if (this.activeBot && !this.activeBot.isDead) {
            const dx = this.activeBot.mesh.position.x - this.playerPos.x;
            const dz = this.activeBot.mesh.position.z - this.playerPos.z;

            // Rotate relative position to align with player's heading-up screen space
            const cosB = Math.cos(this.cameraYaw);
            const sinB = Math.sin(this.cameraYaw);
            
            const rx = (dx * cosB - dz * sinB) / scale;
            const rz = (dx * sinB + dz * cosB) / scale;

            // Distance check to fit in circle
            const distSq = rx * rx + rz * rz;
            const radius = 64; // boundary radius
            if (distSq < radius * radius) {
                ctx.fillStyle = '#f44336'; // red bot dot
                ctx.beginPath();
                ctx.arc(halfSize + rx, halfSize + rz, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Outer pulsing rings
                ctx.strokeStyle = 'rgba(244, 67, 54, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(halfSize + rx, halfSize + rz, 7 + Math.sin(Date.now() * 0.01) * 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Draw circular border ring overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(halfSize, halfSize, 68, 0, Math.PI * 2);
        ctx.stroke();
    }




    setupEventListeners() {
        const canvas = this.renderer.domElement;

        // Pointer Lock request
        canvas.addEventListener('click', () => {
            if (this.gameState === 'ACTIVE' || this.gameState === 'COUNTDOWN') {
                canvas.requestPointerLock();
            }
        });

        // Mouse look input
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement !== canvas) return;
            if (this.isPlayerDead) return;

            this.cameraYaw -= e.movementX * this.mouseSensitivity;
            this.cameraPitch -= e.movementY * this.mouseSensitivity;

            // Clamp pitch (up/down look)
            this.cameraPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.cameraPitch));

            this.camera.quaternion.setFromEuler(new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ'));
        });

        // Keyboard Movement Controls
        document.addEventListener('keydown', (e) => {
            if (this.isPlayerDead) return;

            switch (e.code) {
                case 'KeyW': this.moveDirection.forward = true; break;
                case 'KeyS': this.moveDirection.backward = true; break;
                case 'KeyA': this.moveDirection.left = true; break;
                case 'KeyD': this.moveDirection.right = true; break;
                case 'ShiftLeft': this.isSprinting = true; break;
                case 'KeyC':
                    if (this.isGrounded && !this.isSliding && Date.now() - this.slideCooldown > 1200 && this.gameState === 'ACTIVE') {
                        this.startSlide();
                    }
                    break;
                case 'Space': 
                    this.moveDirection.jump = true;
                    if (this.isSliding) {
                        this.cancelSlideAndJump();
                    } else if (this.isGrounded && this.gameState !== 'COUNTDOWN') {
                        this.playerVelocity.y = 8.5; // Jump velocity
                        this.isGrounded = false;
                    }
                    break;
                case 'Digit1': this.switchWeaponSlot(0); break;
                case 'Digit2': this.switchWeaponSlot(1); break;
                case 'Digit3': this.switchWeaponSlot(2); break;
                case 'KeyR': this.reloadWeapon(); break;
            }
        });


        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.moveDirection.forward = false; break;
                case 'KeyS': this.moveDirection.backward = false; break;
                case 'KeyA': this.moveDirection.left = false; break;
                case 'KeyD': this.moveDirection.right = false; break;
                case 'ShiftLeft': this.isSprinting = false; break;
                case 'Space': this.moveDirection.jump = false; break;
            }
        });


        // Mouse Click Shoot & ADS
        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement !== canvas) return;
            if (this.isPlayerDead || this.gameState !== 'ACTIVE') return;

            if (e.button === 0) {
                // Left Click: Shoot
                this.shootActiveWeapon();
            } else if (e.button === 2) {
                // Right Click: AIM down sights
                this.setADS(true);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.setADS(false);
            }
        });

        // Prevent right-click context menu in game
        document.addEventListener('contextmenu', e => e.preventDefault());
    }

    initWeaponsState() {
        // Initialize max ammo
        this.equippedWeapons.forEach(type => {
            const config = WEAPONS_CONFIG[type];
            this.ammoCount[type] = config.ammoMax;
        });
        
        // Spawn active weapon 3D mesh
        this.switchWeaponSlot(0, true);
    }

    switchWeaponSlot(slotIndex, force = false) {
        if (this.isReloading && !force) return;
        if (slotIndex < 0 || slotIndex >= this.equippedWeapons.length) return;
        
        this.activeSlot = slotIndex;
        const weaponType = this.equippedWeapons[this.activeSlot];

        // Highlight active HUD slot
        document.querySelectorAll('.hud-slot').forEach((el, idx) => {
            if (idx === slotIndex) el.classList.add('active');
            else el.classList.remove('active');
        });

        // Set ADS off
        this.setADS(false);

        // Remove old mesh
        if (this.weaponMeshGroup) {
            this.weaponContainer.remove(this.weaponMeshGroup);
        }

        // Retrieve current equipped skin for this weapon from local storage database
        const skin = window.inventory.getEquippedSkin(weaponType);

        // Build procedural mesh
        this.weaponMeshGroup = WeaponMeshBuilder.createWeaponMesh(weaponType, skin.hex, skin.rarity);
        this.weaponContainer.add(this.weaponMeshGroup);

        // Position offset adjustment for idle position
        this.updateWeaponViewportOffset();

        // Update ammo display
        this.updateAmmoHUD();
    }

    updateWeaponViewportOffset() {
        if (!this.weaponMeshGroup) return;

        const weaponType = this.equippedWeapons[this.activeSlot];
        
        if (this.isADS) {
            const config = WEAPONS_CONFIG[weaponType];
            if (config.adsOffset) {
                // Center the gun relative to screen and push it forward
                this.weaponContainer.position.set(config.adsOffset.x, config.adsOffset.y, config.adsOffset.z);
                this.weaponMeshGroup.rotation.set(0, 0, 0);
            }
        } else {
            // Right hip-fire layout
            this.weaponContainer.position.set(0.18, -0.22, -0.35);
            // Slight angle inwards
            this.weaponMeshGroup.rotation.set(0.08, -0.1, -0.05);
        }
    }

    setADS(state) {
        const weaponType = this.equippedWeapons[this.activeSlot];
        if (weaponType === 'Katana') return; // no ADS for sword

        this.isADS = state;
        this.updateWeaponViewportOffset();

        // Show/hide crosshair ADS zoom HUD
        const overlay = document.getElementById('sniper-scope');
        const standardCross = document.getElementById('crosshair-overlay');

        if (this.isADS) {
            this.camera.fov = WEAPONS_CONFIG[weaponType].zoomFov;
            this.camera.updateProjectionMatrix();

            if (weaponType === 'Sniper') {
                overlay.style.display = 'block';
                if (standardCross) standardCross.style.display = 'none';
                if (this.weaponMeshGroup) this.weaponMeshGroup.visible = false; // Hide gun mesh in sniper zoom
            } else {
                if (standardCross) standardCross.style.transform = 'translate(-50%, -50%) scale(0.6)';
            }
        } else {
            this.camera.fov = 65; // default FOV
            this.camera.updateProjectionMatrix();

            overlay.style.display = 'none';
            if (standardCross) {
                standardCross.style.display = 'flex';
                standardCross.style.transform = 'translate(-50%, -50%) scale(1)';
            }
            if (this.weaponMeshGroup) this.weaponMeshGroup.visible = true;
        }

    }

    shootActiveWeapon() {
        const weaponType = this.equippedWeapons[this.activeSlot];
        const config = WEAPONS_CONFIG[weaponType];
        const now = Date.now();

        if (this.isReloading) return;
        if (this.ammoCount[weaponType] <= 0 && weaponType !== 'Katana') {
            this.reloadWeapon();
            return;
        }

        // Fire rate cap
        if (now - this.lastFireTime < config.fireRate) return;
        this.lastFireTime = now;

        // Consume ammo
        if (weaponType !== 'Katana') {
            this.ammoCount[weaponType]--;
            this.updateAmmoHUD();
            
            // Audio sound
            window.soundFX.playShoot(weaponType);

            // Animate Gun Kickback (Recoil)
            this.triggerGunKick();
            
            // Generate tracer raycast
            this.fireHitscanBullet(weaponType, config);
        } else {
            // Melee Slash
            window.soundFX.playMeleeSwing();
            this.triggerKatanaSlash();
            this.fireMeleeHitscan(config);
        }

        // Increment stats
        if (weaponType !== 'Katana') {
            window.inventory.addStat('shotsFired');
        }
    }

    triggerGunKick() {
        if (!this.weaponMeshGroup) return;

        const originalZ = this.weaponContainer.position.z;
        const kickbackDistance = this.isADS ? 0.08 : 0.15;

        // Add visual displacement back
        this.weaponContainer.position.z += kickbackDistance;
        // Pitch upward camera recoil
        this.cameraPitch += (Math.random() * 0.005) + 0.008;

        // Animate snap back
        let start = Date.now();
        const duration = 120; // ms

        const recoilAnimate = () => {
            const progress = (Date.now() - start) / duration;
            if (progress < 1) {
                // Linear decay
                this.weaponContainer.position.z = originalZ + kickbackDistance * (1 - progress);
                requestAnimationFrame(recoilAnimate);
            } else {
                this.updateWeaponViewportOffset();
            }
        };
        recoilAnimate();

        // Muzzle flash particle box
        this.spawnMuzzleFlash();
    }

    triggerKatanaSlash() {
        if (!this.weaponMeshGroup) return;

        // Sword swipe animation: rotate group forward quickly
        const origRot = this.weaponMeshGroup.rotation.clone();
        
        this.weaponMeshGroup.rotation.y = -Math.PI / 3;
        this.weaponMeshGroup.rotation.x = -Math.PI / 4;

        let start = Date.now();
        const duration = 180;

        const slashAnimate = () => {
            const progress = (Date.now() - start) / duration;
            if (progress < 1) {
                this.weaponMeshGroup.rotation.y = -Math.PI / 3 + (Math.PI * 0.8 * progress);
                requestAnimationFrame(slashAnimate);
            } else {
                this.weaponMeshGroup.rotation.copy(origRot);
            }
        };
        slashAnimate();
    }

    spawnMuzzleFlash() {
        if (!this.weaponMeshGroup) return;

        // If exists, dispose
        if (this.muzzleFlash) {
            this.scene.remove(this.muzzleFlash);
        }

        // Generate glowing yellow block near camera muzzle position
        const flashGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);

        // Attach slightly in front of weapon camera
        this.weaponContainer.add(this.muzzleFlash);
        // Rifle muzzle position approx:
        const weaponType = this.equippedWeapons[this.activeSlot];
        if (weaponType === 'Rifle') this.muzzleFlash.position.set(0, 0.02, -0.6);
        else if (weaponType === 'Sniper') this.muzzleFlash.position.set(0, 0.02, -1.1);
        else if (weaponType === 'Shotgun') this.muzzleFlash.position.set(0, 0.02, -0.9);
        else this.muzzleFlash.position.set(0, 0.02, -0.4); // Pistol

        setTimeout(() => {
            if (this.muzzleFlash) {
                this.weaponContainer.remove(this.muzzleFlash);
                this.muzzleFlash = null;
                flashGeo.dispose();
                flashMat.dispose();
            }
        }, 50);
    }

    fireHitscanBullet(weaponType, config) {
        // Raycast from center of camera
        const raycaster = new THREE.Raycaster();
        
        // Slightly jitter the center if hipfiring (recoil spread)
        const accuracyJitter = new THREE.Vector2(0, 0);
        if (!this.isADS) {
            const spread = weaponType === 'Shotgun' ? 0.04 : 0.015;
            accuracyJitter.x = (Math.random() - 0.5) * spread;
            accuracyJitter.y = (Math.random() - 0.5) * spread;
        }

        raycaster.setFromCamera(accuracyJitter, this.camera);

        // Fire multiple pellets for shotgun
        const pelletCount = weaponType === 'Shotgun' ? config.pellets : 1;
        const hitbot = this.activeBot;

        for (let p = 0; p < pelletCount; p++) {
            let shootRaycaster = raycaster;

            if (pelletCount > 1) {
                // Extra spread for each shotgun pellet
                const pelletJitter = new THREE.Vector2(
                    accuracyJitter.x + (Math.random() - 0.5) * 0.07,
                    accuracyJitter.y + (Math.random() - 0.5) * 0.07
                );
                shootRaycaster = new THREE.Raycaster();
                shootRaycaster.setFromCamera(pelletJitter, this.camera);
            }

            // Check collisions with Bot and Crates
            const targetObjects = [];
            if (hitbot && !hitbot.isDead) {
                targetObjects.push(...hitbot.hitboxes);
            }
            targetObjects.push(...this.collidableObjects);

            const intersects = shootRaycaster.intersectObjects(targetObjects);

            let endpoint = new THREE.Vector3();
            // Project bullet forward 60 meters if no hit
            shootRaycaster.ray.at(60, endpoint);

            if (intersects.length > 0) {
                const hit = intersects[0];
                endpoint.copy(hit.point);

                // Check if hit a bot hitbox
                if (hit.object.userData && hit.object.userData.parentBot) {
                    const bot = hit.object.userData.parentBot;
                    const hitType = hit.object.userData.type; // 'Head', 'Torso', 'Limb'

                    // Register Hit
                    const hitDetails = bot.takeDamage(config.damage, hitType);

                    if (hitDetails.damageDealt > 0) {
                        window.inventory.addStat('shotsHit');
                        // Hitmarker HUD
                        this.triggerHitmarker(hitDetails.headshot);
                        // Damage number pop
                        this.spawnFloatingDamageNumber(hit.point, hitDetails.damageDealt, hitDetails.headshot);
                        // Blood/Impact blocky particles
                        this.spawnImpactParticles(hit.point, 0xff0000);

                        if (hitDetails.headshot) {
                            window.inventory.addStat('headshots');
                        }
                    }
                } else {
                    // Hit crate / obstacle: wood debris particle
                    this.spawnImpactParticles(hit.point, 0x8d6e63);
                }
            }

            // Draw visual bullet tracer line from weapon barrel
            this.drawTracerLine(endpoint);
        }
    }

    fireMeleeHitscan(config) {
        // Melee is short-range forward raycast
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0,0), this.camera);
        raycaster.far = 3.2; // 3 meters reach

        const hitbot = this.activeBot;
        const targets = [];
        if (hitbot && !hitbot.isDead) targets.push(...hitbot.hitboxes);

        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const bot = hit.object.userData.parentBot;
            
            const hitDetails = bot.takeDamage(config.damage, "Torso"); // melee is uniform

            if (hitDetails.damageDealt > 0) {
                this.triggerHitmarker(false);
                this.spawnFloatingDamageNumber(hit.point, hitDetails.damageDealt, false);
                this.spawnImpactParticles(hit.point, 0xff0000);
            }
        }
    }

    drawTracerLine(endPoint) {
        // Trace starts at approximate muzzle of the gun
        const startPoint = new THREE.Vector3();
        this.weaponContainer.getWorldPosition(startPoint);
        
        // Shift start point down and right slightly so it comes from the gun muzzle
        const dir = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
        
        const tracerGeo = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
        const tracerMat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });
        const line = new THREE.Line(tracerGeo, tracerMat);
        this.scene.add(line);

        setTimeout(() => {
            this.scene.remove(line);
            tracerGeo.dispose();
            tracerMat.dispose();
        }, 80);
    }

    triggerHitmarker(isHeadshot) {
        // satisfying ping sound
        window.soundFX.playHitmarker();

        const hitEl = document.getElementById('hitmarker');
        hitEl.style.borderColor = isHeadshot ? '#ffd700' : '#ffffff'; // golden hitmarker for headshots
        hitEl.classList.remove('active');
        // trigger animation redraw
        void hitEl.offsetWidth;
        hitEl.classList.add('active');

        // Headshot text HUD pop
        if (isHeadshot) {
            const hsHUD = document.getElementById('headshot-banner');
            hsHUD.classList.remove('active');
            void hsHUD.offsetWidth;
            hsHUD.classList.add('active');
        }
    }

    spawnFloatingDamageNumber(position, amount, isHeadshot) {
        // Project 3D hit point to screen space CSS coordinates
        const vector = position.clone();
        
        // Create HTML element overlay
        const container = document.getElementById('hud-container');
        const span = document.createElement('span');
        span.className = `floating-damage ${isHeadshot ? 'headshot' : ''}`;
        span.textContent = `${isHeadshot ? 'CRIT ' : ''}${amount}`;
        container.appendChild(span);

        // Keep updating position on frame loop relative to camera view
        const updatePos = () => {
            const proj = vector.clone().project(this.camera);
            
            // Check if behind camera
            if (proj.z > 1) {
                span.style.display = 'none';
                return;
            }

            const x = (proj.x *  .5 + .5) * window.innerWidth;
            const y = (proj.y * -.5 + .5) * window.innerHeight;

            span.style.left = `${x}px`;
            span.style.top = `${y}px`;
        };

        // Run projection update
        updatePos();

        // Let numbers float up slightly in 3D space
        let elapsed = 0;
        const drift = () => {
            elapsed += 16; // approx 60fps
            vector.y += 0.02; // drift up
            updatePos();

            if (elapsed < 600) {
                requestAnimationFrame(drift);
            } else {
                span.remove();
            }
        };
        drift();
    }

    spawnImpactParticles(position, colorHex) {
        // Simple procedural cube debris bursting out
        const pGroup = new THREE.Group();
        const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

        const velocities = [];

        for (let i = 0; i < 8; i++) {
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.copy(position);
            pGroup.add(p);

            // Random burst direction
            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() * 4) + 2, // burst up
                (Math.random() - 0.5) * 5
            ));
        }

        this.scene.add(pGroup);

        const clock = new THREE.Clock();
        clock.start();
        let elapsed = 0;

        const updateParticles = () => {
            const dt = clock.getDelta();
            elapsed += dt;

            pGroup.children.forEach((p, idx) => {
                const vel = velocities[idx];
                vel.y -= 9.8 * dt; // gravity
                p.position.addScaledVector(vel, dt);
                p.scale.multiplyScalar(0.96); // shrink
            });

            if (elapsed < 0.6) {
                requestAnimationFrame(updateParticles);
            } else {
                this.scene.remove(pGroup);
                pGeo.dispose();
                pMat.dispose();
            }
        };

        updateParticles();
    }

    reloadWeapon() {
        const weaponType = this.equippedWeapons[this.activeSlot];
        const config = WEAPONS_CONFIG[weaponType];

        if (weaponType === 'Katana') return;
        if (this.isReloading) return;
        if (this.ammoCount[weaponType] === config.ammoMax) return;

        this.isReloading = true;
        this.setADS(false);

        // Reload sound
        window.soundFX.playReload();

        // Animate Gun dipping down
        const originalY = this.weaponContainer.position.y;
        let start = Date.now();
        const duration = config.reloadTime;

        const reloadLoop = () => {
            const elapsed = Date.now() - start;
            const progress = elapsed / duration;

            if (progress < 1) {
                // Dip down in first half, raise in second half
                const dip = Math.sin(progress * Math.PI) * -0.25;
                this.weaponContainer.position.y = originalY + dip;
                requestAnimationFrame(reloadLoop);
            } else {
                this.weaponContainer.position.y = originalY;
                this.ammoCount[weaponType] = config.ammoMax;
                this.isReloading = false;
                this.updateAmmoHUD();
            }
        };
        reloadLoop();
    }

    updateAmmoHUD() {
        const weaponType = this.equippedWeapons[this.activeSlot];
        const config = WEAPONS_CONFIG[weaponType];

        const label = document.getElementById('hud-ammo-label');
        if (weaponType === 'Katana') {
            label.textContent = '∞';
        } else {
            label.textContent = `${this.ammoCount[weaponType]} / ${config.ammoMax}`;
        }

        const nameLabel = document.getElementById('hud-weapon-name');
        nameLabel.textContent = config.name;
    }

    // Process damage applied to player
    damagePlayer(amount, isHeadshot) {
        if (this.gameState !== 'ACTIVE' || this.isPlayerDead) return;

        // Grunt oof sound
        window.soundFX.playOof();

        // Shield / Armor absorb first
        let damageRemaining = amount;
        if (this.playerShield > 0) {
            if (this.playerShield >= damageRemaining) {
                this.playerShield -= damageRemaining;
                damageRemaining = 0;
            } else {
                damageRemaining -= this.playerShield;
                this.playerShield = 0;
            }
        }

        if (damageRemaining > 0) {
            this.playerHealth = Math.max(0, this.playerHealth - damageRemaining);
        }

        // Update HUD bars
        this.updatePlayerStatsHUD();

        // Trigger damage direction indicator in HTML overlay
        if (window.triggerDamageIndicator && this.activeBot) {
            window.triggerDamageIndicator(this.activeBot.mesh.position);
        }

        // Screen red flash
        const flash = document.getElementById('damage-flash');
        flash.style.opacity = isHeadshot ? '0.6' : '0.35';
        setTimeout(() => { flash.style.opacity = '0'; }, 150);


        if (this.playerHealth <= 0) {
            this.diePlayer();
        }
    }

    updatePlayerStatsHUD() {
        const hpBar = document.getElementById('hud-hp-bar');
        const armorBar = document.getElementById('hud-armor-bar');

        hpBar.style.width = `${this.playerHealth}%`;
        armorBar.style.width = `${this.playerShield}%`;
    }

    diePlayer() {
        this.isPlayerDead = true;
        this.playerHealth = 0;
        this.playerShield = 0;
        this.updatePlayerStatsHUD();

        window.inventory.addStat('deaths');
        this.finishRound('bot');
    }

    // START MATCH (triggered by Dashboard play)
    startMatch(difficulty, mapName) {
        // Reset scoreboard
        this.matchScore.player = 0;
        this.matchScore.bot = 0;
        this.activeRound = 1;

        // Hide dashboard, show hud
        document.getElementById('dashboard-menu').style.display = 'none';
        document.getElementById('hud-container').style.display = 'block';
        document.getElementById('minimap-overlay').style.display = 'block';

        this.botDifficulty = difficulty;
        this.selectedMapName = mapName || 'Classic';


        // Load procedural structures
        this.loadMap(this.selectedMapName);

        // Initial spawn
        this.startNextRound();
    }


    startNextRound() {
        this.gameState = 'COUNTDOWN';
        this.isPlayerDead = false;
        this.playerHealth = 100;
        this.playerShield = 100;
        this.updatePlayerStatsHUD();

        // Reset ammo
        this.equippedWeapons.forEach(type => {
            this.ammoCount[type] = WEAPONS_CONFIG[type].ammoMax;
        });
        this.updateAmmoHUD();

        // Spawn player and bot at nodes
        this.playerPos.copy(this.playerSpawnPoint);
        this.playerPos.y = this.getTerrainHeight(this.playerPos.x, this.playerPos.z);
        this.cameraYaw = Math.PI; // Look towards center (North)
        this.cameraPitch = 0;
        this.camera.quaternion.setFromEuler(new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ'));
        this.camera.position.set(this.playerPos.x, this.playerPos.y + this.playerHeight, this.playerPos.z);
        this.playerVelocity.set(0, 0, 0);

        // Remove old bot, construct fresh one
        if (this.activeBot) {
            this.scene.remove(this.activeBot.mesh);
            this.activeBot = null;
        }
        const bSpawn = this.botSpawnPoint.clone();
        bSpawn.y = this.getTerrainHeight(bSpawn.x, bSpawn.z);
        this.activeBot = new BotCharacter(this.scene, bSpawn, this.botDifficulty);


        // Update Round stats text
        document.getElementById('hud-round-label').textContent = `ROUND ${this.activeRound}`;
        document.getElementById('hud-score-label').textContent = `${this.matchScore.player} - ${this.matchScore.bot}`;

        // Reset overlays
        document.getElementById('round-win-overlay').style.display = 'none';
        document.getElementById('round-lose-overlay').style.display = 'none';

        // Trigger 3, 2, 1 countdown overlay
        this.runCountdown();
    }

    runCountdown() {
        const overlay = document.getElementById('countdown-overlay');
        const text = document.getElementById('countdown-number');
        overlay.style.display = 'flex';
        this.countdownTimer = 3;
        text.textContent = this.countdownTimer;

        // Lock pointer focus
        this.renderer.domElement.requestPointerLock();

        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.countdownInterval = setInterval(() => {
            this.countdownTimer--;
            if (this.countdownTimer > 0) {
                text.textContent = this.countdownTimer;
            } else if (this.countdownTimer === 0) {
                text.textContent = 'DUEL!';
            } else {
                clearInterval(this.countdownInterval);
                overlay.style.display = 'none';
                this.gameState = 'ACTIVE';
            }
        }, 1000);
    }

    finishRound(winner) {
        this.gameState = 'FINISH';
        this.setADS(false);

        let roundText = '';
        if (winner === 'player') {
            this.matchScore.player++;
            roundText = 'ROUND WON';
            document.getElementById('round-win-overlay').style.display = 'flex';
            window.soundFX.playVictory();
        } else {
            this.matchScore.bot++;
            roundText = 'ROUND LOST';
            document.getElementById('round-lose-overlay').style.display = 'flex';
            window.soundFX.playDefeat();
        }

        // Draw HUD score updates
        document.getElementById('hud-score-label').textContent = `${this.matchScore.player} - ${this.matchScore.bot}`;

        // Trigger slow-motion round outcome loop
        let elapsed = 0;
        const clock = new THREE.Clock();
        clock.start();

        // Slow motion camera path orbiting bot or looking at battleground
        const orbitCamera = () => {
            if (this.gameState !== 'FINISH') return;
            const dt = clock.getDelta();
            elapsed += dt;

            // Slowly spin yaw camera look angle
            this.cameraYaw += 0.4 * dt;
            this.camera.quaternion.setFromEuler(new THREE.Euler(-0.1, this.cameraYaw, 0, 'YXZ'));
            
            // Move camera up and zoom out slightly
            this.camera.position.y += 0.8 * dt;

            if (elapsed < 3.5) {
                requestAnimationFrame(orbitCamera);
            } else {
                this.checkMatchConditions();
            }
        };
        orbitCamera();
    }

    checkMatchConditions() {
        const maxScore = 5; // Best of 9: first to 5
        
        if (this.matchScore.player >= maxScore || this.matchScore.bot >= maxScore) {
            this.endMatch();
        } else {
            this.activeRound++;
            this.startNextRound();
        }
    }

    endMatch() {
        this.gameState = 'LOBBY';
        document.exitPointerLock();

        // Hide HUD, show match end panel
        document.getElementById('hud-container').style.display = 'none';
        document.getElementById('minimap-overlay').style.display = 'none';
        
        const summary = document.getElementById('match-summary');

        const title = document.getElementById('summary-title');
        const rewardText = document.getElementById('summary-coins');
        
        summary.style.display = 'flex';

        const won = this.matchScore.player > this.matchScore.bot;
        if (won) {
            title.textContent = 'VICTORY!';
            title.style.color = '#ffd700';
            // Reward coins: 200 for win
            window.inventory.addCoins(200);
            window.inventory.addStat('wins');
            rewardText.textContent = '+200 Rival Coins!';
        } else {
            title.textContent = 'DEFEAT';
            title.style.color = '#f44336';
            // Reward coins: 50 for loss
            window.inventory.addCoins(50);
            window.inventory.addStat('losses');
            rewardText.textContent = '+50 Rival Coins (Participation)';
        }

        // Tally game kills
        if (this.activeBot && this.activeBot.isDead) {
            window.inventory.addStat('kills');
        }

        // Clean up entities from scene
        if (this.activeBot) {
            this.scene.remove(this.activeBot.mesh);
            this.activeBot = null;
        }

        // Restart lobby ambient music
        if (window.soundFX) window.soundFX.startLobbyMusic();
    }

    startSlide() {
        this.isSliding = true;
        this.slideTimer = 650; // ms duration
        this.slideCooldown = Date.now();
        this.playerHeight = 0.8; // drop camera height

        // Slide in direction camera is facing
        const camDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw).normalize();
        this.slideDirection.copy(camDir);
        this.slideSpeed = 18.0; // initial slide dash speed

        if (window.soundFX) {
            window.soundFX.playFootstep(); // feedback thump
        }
    }

    cancelSlideAndJump() {
        this.isSliding = false;
        this.slideTimer = 0;
        this.playerHeight = 1.6; // restore camera height
        
        // Jump impulse preserving current sliding horizontal velocity
        this.playerVelocity.y = 8.5;
        this.isGrounded = false;

        if (window.soundFX) window.soundFX.playFootstep();
    }

    // Movement engine loop & gravity

    updatePlayerMovement(dt) {
        if (this.isPlayerDead) return;

        // Spatial cave system check to prevent entrance ramp and cavern water flooding
        const inCaveSystem = this.playerPos.y < -3.0 || 
                             (Math.abs(Math.abs(this.playerPos.x) - 240.0) < 22.0 && Math.abs(this.playerPos.z) > 95.0);



        const waterLevel = inCaveSystem ? -24.0 : (this.selectedMapName === 'Jungle' ? 3.5 : 6.0);
        const isSubmerged = this.playerPos.y < waterLevel - 0.2;

        // Water screen overlay trigger
        const wOverlay = document.getElementById('water-overlay');
        if (wOverlay) {
            wOverlay.style.opacity = isSubmerged ? '0.45' : '0';
        }

        if (this.isSliding) {
            if (isSubmerged) {
                // Cancel sliding in water
                this.isSliding = false;
                this.playerHeight = 1.6;
            } else {
                // Lock velocity to slide direction and decay speed
                this.playerVelocity.x = this.slideDirection.x * this.slideSpeed;
                this.playerVelocity.z = this.slideDirection.z * this.slideSpeed;

                this.slideSpeed = Math.max(6.0, this.slideSpeed - 16.0 * dt);
                this.slideTimer -= dt * 1000;

                if (this.slideTimer <= 0 || !this.isGrounded) {
                    this.isSliding = false;
                    this.playerHeight = 1.6;
                }
            }
        } 
        
        if (!this.isSliding) {
            // Apply speed factors (increased speeds for faster gameplay)
            let speed = 8.5; // default walking
            if (this.isSprinting) speed = 14.5; // faster sprinting!
            if (this.isADS) speed = 4.5; 
            if (isSubmerged) speed *= 0.55; // water resistance


            // Calculate direction vectors relative to camera yaw angle
            const camDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw).normalize();
            const sideDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw).normalize();

            const moveVec = new THREE.Vector3();

            if (this.moveDirection.forward) moveVec.add(camDir);
            if (this.moveDirection.backward) moveVec.sub(camDir);
            if (this.moveDirection.right) moveVec.add(sideDir);
            if (this.moveDirection.left) moveVec.sub(sideDir);

            if (moveVec.lengthSq() > 0) {
                moveVec.normalize();
                
                // Update horizontal velocity
                this.playerVelocity.x = moveVec.x * speed;
                this.playerVelocity.z = moveVec.z * speed;

                // Footstep audio triggers (0.35s delay sprint, 0.5s walking)
                const stepDelay = this.isSprinting ? 320 : 480;
                const now = Date.now();
                if (this.isGrounded && !isSubmerged && now - this.lastStepTime > stepDelay) {
                    window.soundFX.playFootstep();
                    this.lastStepTime = now;
                }
            } else {
                // Decelerate quickly on ground
                this.playerVelocity.x *= 0.75;
                this.playerVelocity.z *= 0.75;
            }
        }


        // Apply Gravity / Buoyancy
        if (isSubmerged) {
            // Water physics (reduced gravity and buoyancy swim keys)
            this.playerVelocity.y = Math.max(-2.0, this.playerVelocity.y - 4.5 * dt);
            if (this.moveDirection.jump) {
                this.playerVelocity.y = 3.8; // swim upwards
            }
        } else {
            // Standard air physics gravity
            this.playerVelocity.y -= 22.0 * dt;
        }

        // Resolve position updates
        const nextPos = this.playerPos.clone().addScaledVector(this.playerVelocity, dt);

        // Simple Collision with level boundary walls
        const wallLimit = this.currentMapLimit || 48.8;
        nextPos.x = Math.max(-wallLimit, Math.min(wallLimit, nextPos.x));
        nextPos.z = Math.max(-wallLimit, Math.min(wallLimit, nextPos.z));


        // Basic blocky AABB collision boxes checks against crates/centerpiece
        this.collidableObjects.forEach(box => {
            // Compute distance from player center to block center
            const size = new THREE.Vector3();
            box.geometry.computeBoundingBox();
            box.geometry.boundingBox.getSize(size);
            
            const dx = Math.abs(nextPos.x - box.position.x);
            const dz = Math.abs(nextPos.z - box.position.z);
            const dy = nextPos.y - box.position.y;

            const thresholdX = (size.x / 2) + 0.75;
            const thresholdZ = (size.z / 2) + 0.75;
            const thresholdY = (size.y / 2);

            // Check if player position bounds overlap vertically and horizontally (3D AABB)
            const playerBottom = nextPos.y;
            const playerTop = nextPos.y + 1.8;
            const blockBottom = box.position.y - size.y / 2;
            const blockTop = box.position.y + size.y / 2;
            const yOverlap = playerBottom < blockTop && playerTop > blockBottom;

            if (dx < thresholdX && dz < thresholdZ && yOverlap) {
                // If player is on top of the block, support them (Grounded on slab)
                if (dy >= thresholdY - 0.2 && this.playerVelocity.y <= 0) {
                    nextPos.y = box.position.y + thresholdY;
                    this.playerVelocity.y = 0;
                    this.isGrounded = true;
                } else if (dy < thresholdY - 0.2) {
                    // Solid side pushback (wall block)
                    const penX = thresholdX - dx;
                    const penZ = thresholdZ - dz;
                    
                    if (penX < penZ) {
                        nextPos.x += (nextPos.x > box.position.x ? penX : -penX);
                    } else {
                        nextPos.z += (nextPos.z > box.position.z ? penZ : -penZ);
                    }
                }
            }
        });


        // Floor ground collision check (bypassed when deep inside the cave chamber)
        const floorHeight = this.getTerrainHeight(nextPos.x, nextPos.z);
        const inCaveZone = nextPos.y < -3.0 && Math.abs(nextPos.x) < 265.0 && Math.abs(nextPos.z) <= 100.0;
        



        if (inCaveZone) {
            // Cave floor clamp safety net
            if (nextPos.y <= -26.0) {
                nextPos.y = -25.0;
                this.playerVelocity.y = 0;
                this.isGrounded = true;
            }
        } else {
            if (nextPos.y <= floorHeight) {
                nextPos.y = floorHeight;
                this.playerVelocity.y = 0;
                this.isGrounded = true;
            }
        }





        // Apply next position coordinates to actual variables
        this.playerPos.copy(nextPos);
        
        // Update 3D Camera coordinates
        this.camera.position.set(this.playerPos.x, this.playerPos.y + this.playerHeight, this.playerPos.z);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        let dt = this.clock.getDelta();
        if (dt > 0.1) dt = 0.1; // clamp lag spike dt

        // If in game round, perform loops
        if (this.gameState === 'ACTIVE' || this.gameState === 'COUNTDOWN') {
            
            // Player movements
            if (this.gameState === 'ACTIVE') {
                this.updatePlayerMovement(dt);
            }

            // Update Bot AI state machine
            if (this.activeBot) {
                this.activeBot.update(
                    dt, 
                    this.playerPos, 
                    this.collidableObjects, 
                    (dmg, headshot) => this.damagePlayer(dmg, headshot)
                );

                // If bot is dead, trigger round win
                if (this.activeBot.isDead && this.gameState === 'ACTIVE') {
                    this.finishRound('player');
                }
            }

            // Spawn animated waterfall splash particles
            if (this.selectedMapName === 'Highlands' && Math.random() < 0.25) {
                this.spawnImpactParticles(new THREE.Vector3(52.0 + (Math.random() - 0.5) * 6.0, 6.2, 48.0 + (Math.random() - 0.5) * 2.0), 0xe0f7fa);
                this.spawnImpactParticles(new THREE.Vector3(-52.0 + (Math.random() - 0.5) * 6.0, 6.2, -48.0 + (Math.random() - 0.5) * 2.0), 0xe0f7fa);
            }

            // Update Wildlife movements snapped to terrain
            if (this.wildlife && this.gameState === 'ACTIVE') {
                this.wildlife.forEach(animal => {
                    animal.wanderTimer -= dt;
                    if (animal.wanderTimer <= 0) {
                        animal.angle += (Math.random() - 0.5) * 1.5;
                        animal.wanderTimer = 1.5 + Math.random() * 3.0;
                    }

                    animal.x += Math.sin(animal.angle) * animal.speed * dt;
                    animal.z += Math.cos(animal.angle) * animal.speed * dt;

                    // Clamping inside boundary limits
                    const limit = 320.0;
                    if (Math.abs(animal.x) > limit) animal.angle = -animal.angle;
                    if (Math.abs(animal.z) > limit) animal.angle = Math.PI - animal.angle;

                    if (animal.type === 'rabbit') {
                        const terrainH = this.getTerrainHeight(animal.x, animal.z);
                        animal.hopPhase += dt * animal.speed * 4.0;
                        const hopY = Math.abs(Math.sin(animal.hopPhase)) * 1.2;
                        animal.mesh.position.set(animal.x, terrainH + hopY, animal.z);
                        animal.mesh.rotation.y = animal.angle;
                    } else if (animal.type === 'bird') {
                        // Flap wings dynamically
                        animal.flapPhase += dt * 24.0;
                        const flap = Math.sin(animal.flapPhase) * 0.65;
                        if (animal.wingL) animal.wingL.rotation.z = -flap;
                        if (animal.wingR) animal.wingR.rotation.z = flap;

                        // Slight height variation in flight path
                        const flightY = animal.y + Math.sin(animal.flapPhase * 0.1) * 1.5;
                        animal.mesh.position.set(animal.x, flightY, animal.z);
                        
                        // Face flight direction (with yaw angle rotation)
                        animal.mesh.rotation.y = animal.angle;
                    }
                });
            }


            // Draw minimap overlay
            this.drawMinimap();
        }




        // Simple idle sway on weapon model when walking/standing
        if (this.weaponMeshGroup && !this.isADS && !this.isPlayerDead) {
            const time = Date.now() * 0.004;
            const swayX = Math.sin(time) * 0.006;
            const swayY = Math.cos(time * 2) * 0.006;
            this.weaponMeshGroup.position.set(swayX, swayY, 0);
        }

        // Render Frame
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Global Main class instancer
window.addEventListener('load', () => {
    window.game = new GameEngine();
});

