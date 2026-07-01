// js/entities.js
// Procedural 3D Weapon Meshes, Roblox Avatar meshes, and Bot AI State Machine

class WeaponMeshBuilder {
    static createWeaponMesh(type, skinHex, rarity) {
        const group = new THREE.Group();
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0x22252a,
            roughness: 0.5,
            metalness: 0.8
        });

        // Skin material: glows if Epic or Legendary
        const isGlowing = rarity === "Epic" || rarity === "Legendary";
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: skinHex,
            roughness: 0.3,
            metalness: rarity === "Legendary" ? 0.9 : 0.4,
            emissive: isGlowing ? skinHex : 0x000000,
            emissiveIntensity: isGlowing ? 0.8 : 0
        });

        const accentMaterial = new THREE.MeshStandardMaterial({
            color: rarity === "Legendary" ? 0xffffff : 0xff4500,
            roughness: 0.4,
            metalness: 0.5
        });

        if (type === "Rifle") {
            // Main body
            const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.4), skinMaterial);
            receiver.position.set(0, 0, 0);
            group.add(receiver);

            // Handguard / Barrel
            const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.3), metalMaterial);
            barrel.position.set(0, 0.015, -0.3);
            group.add(barrel);

            // Mag
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.06), metalMaterial);
            mag.position.set(0, -0.07, -0.05);
            mag.rotation.x = 0.2;
            group.add(mag);

            // Stock
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.25), skinMaterial);
            stock.position.set(0, -0.01, 0.3);
            group.add(stock);

            // Grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.03), metalMaterial);
            grip.position.set(0, -0.06, 0.1);
            grip.rotation.x = -0.3;
            group.add(grip);

            // Scope / Sight
            const sight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.12), accentMaterial);
            sight.position.set(0, 0.045, -0.05);
            group.add(sight);

        } else if (type === "Sniper") {
            // Main body (Chunky)
            const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.45), skinMaterial);
            receiver.position.set(0, 0, 0);
            group.add(receiver);

            // Very long barrel
            const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.7), metalMaterial);
            barrel.position.set(0, 0.02, -0.5);
            group.add(barrel);

            // Bolt handle
            const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), metalMaterial);
            bolt.position.set(0.04, 0.025, 0.05);
            group.add(bolt);

            // Heavy stock
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.35), skinMaterial);
            stock.position.set(0, -0.02, 0.35);
            group.add(stock);

            // Grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.035), metalMaterial);
            grip.position.set(0, -0.07, 0.15);
            grip.rotation.x = -0.2;
            group.add(grip);

            // Big sniper scope (Cylinder-like box)
            const scopeMain = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.28), skinMaterial);
            scopeMain.position.set(0, 0.06, -0.05);
            group.add(scopeMain);

            const scopeLens = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.03), accentMaterial);
            scopeLens.position.set(0, 0.06, -0.19);
            group.add(scopeLens);

            // Mag
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.05), metalMaterial);
            mag.position.set(0, -0.06, -0.08);
            group.add(mag);

        } else if (type === "Shotgun") {
            // Fat body
            const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.45), skinMaterial);
            receiver.position.set(0, 0, 0);
            group.add(receiver);

            // Thick barrel
            const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.5), metalMaterial);
            barrel.position.set(0, 0.015, -0.4);
            group.add(barrel);

            // Wooden/Skin Pump forend
            const pump = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.2), skinMaterial);
            pump.position.set(0, -0.005, -0.3);
            group.add(pump);

            // Stock
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.3), metalMaterial);
            stock.position.set(0, -0.02, 0.32);
            group.add(stock);

        } else if (type === "Pistol") {
            // Slide (Skin color)
            const slide = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.2), skinMaterial);
            slide.position.set(0, 0.02, -0.03);
            group.add(slide);

            // Frame / Grip (Metal color)
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.07, 0.035), metalMaterial);
            frame.position.set(0, -0.03, 0.02);
            frame.rotation.x = -0.25;
            group.add(frame);

            // Barrel tip
            const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.05), metalMaterial);
            barrel.position.set(0, 0.02, -0.15);
            group.add(barrel);

        } else if (type === "Katana") {
            // Blade (Metallic / Skin Color)
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.9, 0.04), skinMaterial);
            blade.position.set(0, 0.45, 0);
            group.add(blade);

            // Guard (Tsuba)
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.06), metalMaterial);
            guard.position.set(0, 0, 0);
            group.add(guard);

            // Handle (Tsuka)
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.025), accentMaterial);
            handle.position.set(0, -0.12, 0);
            group.add(handle);
        }

        // Adjust overall weapon scale and position for default camera viewport
        group.scale.set(1.5, 1.5, 1.5);

        return group;
    }
}

// Procedural Roblox Character Mesh Builder
class RobloxCharacterMesh {
    constructor(skinHex) {
        this.group = new THREE.Group();

        // Create standard materials
        this.bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x0078ff, // Classic blue Roblox shirt
            roughness: 0.7
        });
        this.limbMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a, // Charcoal pants
            roughness: 0.7
        });
        this.skinMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd180, // Peachy yellow skin
            roughness: 0.6
        });

        // If bot skin is custom (from matching weapon colors for cool factor)
        if (skinHex) {
            const isImpossible = skinHex === 0xff3300;
            this.bodyMaterial = new THREE.MeshStandardMaterial({
                color: skinHex,
                roughness: 0.5,
                metalness: 0.5,
                emissive: isImpossible ? 0xff3300 : 0x000000,
                emissiveIntensity: isImpossible ? 0.8 : 0
            });
        }

        this.buildCharacter();
    }

    buildCharacter() {
        // Roblox Grid sizing: Head: 1.25x1.25x1.25, Torso: 2x2x1, Limbs: 1x2x1
        
        // Torso
        this.torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.6), this.bodyMaterial);
        this.torso.position.set(0, 0.6, 0);
        this.torso.castShadow = true;
        this.torso.receiveShadow = true;
        this.group.add(this.torso);

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), this.skinMaterial);
        this.head.position.set(0, 1.55, 0);
        this.head.castShadow = true;
        this.head.receiveShadow = true;
        this.group.add(this.head);

        // Add a blocky visor/eyes (classic Roblox style face)
        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.72, 0.15, 0.15),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        visor.position.set(0, 1.6, 0.3);
        this.head.add(visor);

        const smile = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.05, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        smile.position.set(0, 1.35, 0.33);
        this.head.add(smile);

        // Left Arm
        this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), this.skinMaterial);
        this.leftArm.position.set(-0.9, 0.6, 0);
        this.leftArm.castShadow = true;
        this.leftArm.receiveShadow = true;
        this.group.add(this.leftArm);

        // Right Arm (Aimed forward slightly by default)
        this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), this.skinMaterial);
        this.rightArm.position.set(0.9, 0.6, 0);
        this.rightArm.castShadow = true;
        this.rightArm.receiveShadow = true;
        this.group.add(this.rightArm);

        // Left Leg
        this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.2, 0.52), this.limbMaterial);
        this.leftLeg.position.set(-0.32, -0.6, 0);
        this.leftLeg.castShadow = true;
        this.leftLeg.receiveShadow = true;
        this.group.add(this.leftLeg);

        // Right Leg
        this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.2, 0.52), this.limbMaterial);
        this.rightLeg.position.set(0.32, -0.6, 0);
        this.rightLeg.castShadow = true;
        this.rightLeg.receiveShadow = true;
        this.group.add(this.rightLeg);

        // Put group anchor at the character's feet (y = 0)
        // Currently the bottom of the legs is at y = -1.2 relative to torso (which is at 0.6)
        // Total height: feet = -1.2, head top = 1.9. 
        // Let's offset everything up so feet are at y = 0
        this.group.children.forEach(child => {
            child.position.y += 1.2;
        });
    }

    animateWalking(time, speed) {
        // Basic roblox wobble leg swing
        const wave = Math.sin(time * speed * 8);
        this.leftLeg.position.z = wave * 0.3;
        this.leftLeg.position.y = 0.6 + Math.abs(wave) * 0.05; // slight bounce
        
        this.rightLeg.position.z = -wave * 0.3;
        this.rightLeg.position.y = 0.6 + Math.abs(wave) * 0.05;

        // Arm swing
        this.leftArm.position.z = -wave * 0.35;
        this.leftArm.position.y = 1.8 + Math.abs(wave) * 0.02;

        // If not holding a weapon, right arm swings too
        if (!this.isAiming) {
            this.rightArm.position.z = wave * 0.35;
            this.rightArm.position.y = 1.8 + Math.abs(wave) * 0.02;
            this.rightArm.rotation.x = 0;
        } else {
            // Hold gun forwards
            this.rightArm.position.z = 0.2;
            this.rightArm.position.y = 1.95;
            this.rightArm.rotation.x = -1.3;
        }
    }

    resetLimbAnimations() {
        this.leftLeg.position.z = 0;
        this.leftLeg.position.y = 0.6;
        this.rightLeg.position.z = 0;
        this.rightLeg.position.y = 0.6;

        this.leftArm.position.z = 0;
        this.leftArm.position.y = 1.8;
        this.leftArm.rotation.set(0, 0, 0);

        if (!this.isAiming) {
            this.rightArm.position.z = 0;
            this.rightArm.position.y = 1.8;
            this.rightArm.rotation.set(0, 0, 0);
        }
    }
}

// Bot AI Opponent Controller
class BotCharacter {
    constructor(scene, spawnPos, difficulty = "Medium") {
        this.scene = scene;
        this.difficulty = difficulty;
        
        // Choose skin hex according to difficulty
        let diffColor = 0x2196f3; // blue
        if (difficulty === "Easy") diffColor = 0x4caf50; // green
        if (difficulty === "Hard") diffColor = 0xf44336; // red
        if (difficulty === "Impossible") diffColor = 0xff3300; // gold-red glow

        this.charMesh = new RobloxCharacterMesh(diffColor);
        this.mesh = this.charMesh.group;
        this.mesh.position.copy(spawnPos);
        this.scene.add(this.mesh);

        // Core stats
        this.maxHealth = 100;
        this.health = 100;
        this.maxShield = 100;
        this.shield = 100;
        this.isDead = false;

        // Movement variables
        this.velocity = new THREE.Vector3();
        this.moveSpeed = 7.0; // Units/s
        this.roamTarget = new THREE.Vector3();
        this.state = "PATROL"; // PATROL, CHASE, ESCAPE
        this.lastStateChange = 0;
        this.roamWaitTime = 2000; // ms
        this.lastRoamUpdate = 0;

        // Bot Weapon
        this.botWeaponType = "Rifle";
        this.lastShotTime = 0;
        this.shotInterval = 600; // ms (based on difficulty)
        this.botAimError = 0.15; // default spread

        // Hitbox meshes for targeting/raycasting
        this.hitboxes = [];
        this.setupHitboxes();
        this.applyDifficultySettings();
    }

    applyDifficultySettings() {
        if (this.difficulty === "Easy") {
            this.moveSpeed = 5.0;
            this.shotInterval = 1000;
            this.botAimError = 0.28; // high spread (misses often)
        } else if (this.difficulty === "Medium") {
            this.moveSpeed = 7.5;
            this.shotInterval = 650;
            this.botAimError = 0.14; // moderate spread
        } else if (this.difficulty === "Hard") {
            this.moveSpeed = 9.5;
            this.shotInterval = 450; // rapid firing sniper/rifle
            this.botAimError = 0.05; // highly accurate
        } else if (this.difficulty === "Impossible") {
            this.moveSpeed = 11.5; // extremely fast
            this.shotInterval = 350; // heavy machine-gun fire rate
            this.botAimError = 0.015; // laser-like precision
        }
    }

    setupHitboxes() {
        // Head Hitbox
        const headBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.85, 0.85),
            new THREE.MeshBasicMaterial({ visible: false, wireframe: true })
        );
        headBox.position.copy(this.charMesh.head.position);
        headBox.userData = { parentBot: this, type: "Head" };
        this.mesh.add(headBox);
        this.hitboxes.push(headBox);

        // Torso Hitbox
        const torsoBox = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 1.3, 0.7),
            new THREE.MeshBasicMaterial({ visible: false, wireframe: true })
        );
        torsoBox.position.copy(this.charMesh.torso.position);
        torsoBox.userData = { parentBot: this, type: "Torso" };
        this.mesh.add(torsoBox);
        this.hitboxes.push(torsoBox);

        // Leg/Arm generalized box (everything else)
        const limbsBox = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 1.2, 0.8),
            new THREE.MeshBasicMaterial({ visible: false, wireframe: true })
        );
        limbsBox.position.set(0, 0.6, 0); // lower body
        limbsBox.userData = { parentBot: this, type: "Limb" };
        this.mesh.add(limbsBox);
        this.hitboxes.push(limbsBox);
    }

    takeDamage(damage, type) {
        if (this.isDead) return { damageDealt: 0, headshot: false };

        const headshot = type === "Head";
        const actualDamage = headshot ? Math.round(damage * 1.8) : damage;

        // Sound effect (bot grunt)
        if (window.soundFX) window.soundFX.playOof();

        // Deplete Shield first, then Health
        let damageRemaining = actualDamage;
        if (this.shield > 0) {
            if (this.shield >= damageRemaining) {
                this.shield -= damageRemaining;
                damageRemaining = 0;
            } else {
                damageRemaining -= this.shield;
                this.shield = 0;
            }
        }

        if (damageRemaining > 0) {
            this.health = Math.max(0, this.health - damageRemaining);
        }

        if (this.health <= 0) {
            this.die();
        }

        return { damageDealt: actualDamage, headshot };
    }

    die() {
        this.isDead = true;
        this.health = 0;
        this.shield = 0;
        
        // Dynamic Roblox physics explosion / Ragdoll representation:
        // We throw all body parts outwards with gravity!
        const duration = 1.5;
        const parts = [
            { mesh: this.charMesh.head, vel: new THREE.Vector3((Math.random() - 0.5) * 5, 8 + Math.random() * 5, (Math.random() - 0.5) * 5) },
            { mesh: this.charMesh.torso, vel: new THREE.Vector3((Math.random() - 0.5) * 4, 6 + Math.random() * 4, (Math.random() - 0.5) * 4) },
            { mesh: this.charMesh.leftArm, vel: new THREE.Vector3((Math.random() - 0.5) * 6, 7 + Math.random() * 4, (Math.random() - 0.5) * 6) },
            { mesh: this.charMesh.rightArm, vel: new THREE.Vector3((Math.random() - 0.5) * 6, 7 + Math.random() * 4, (Math.random() - 0.5) * 6) },
            { mesh: this.charMesh.leftLeg, vel: new THREE.Vector3((Math.random() - 0.5) * 3, 5 + Math.random() * 3, (Math.random() - 0.5) * 3) },
            { mesh: this.charMesh.rightLeg, vel: new THREE.Vector3((Math.random() - 0.5) * 3, 5 + Math.random() * 3, (Math.random() - 0.5) * 3) }
        ];

        let elapsed = 0;
        const clock = new THREE.Clock();

        const animateDeath = () => {
            const dt = clock.getDelta();
            elapsed += dt;

            parts.forEach(part => {
                // Apply gravity
                part.vel.y -= 9.8 * dt;
                part.mesh.position.addScaledVector(part.vel, dt);
                
                // Add rotation
                part.mesh.rotation.x += part.vel.z * 0.1;
                part.mesh.rotation.y += part.vel.x * 0.1;
            });

            if (elapsed < duration) {
                requestAnimationFrame(animateDeath);
            } else {
                // Fade out and clean up
                this.scene.remove(this.mesh);
            }
        };

        clock.start();
        animateDeath();
    }

    update(dt, playerPosition, environmentCrates, onPlayerDamaged) {
        if (this.isDead) return;

        // Stealth check: if player is hidden in a bush, bot loses visual tracking
        const isHidden = window.game && window.game.isPlayerHidden();
        const distanceToPlayer = isHidden ? 999999 : this.mesh.position.distanceTo(playerPosition);
        const time = Date.now();

        // 1. STATE MACHINE AI LOGIC
        const isLargeMap = window.game && (window.game.selectedMapName === 'Jungle' || window.game.selectedMapName === 'Highlands');
        const chaseLimit = isLargeMap ? 180 : 25;
        const patrolLimit = isLargeMap ? 210 : 35;

        if (this.health < 30 && this.state !== "ESCAPE") {
            this.state = "ESCAPE";
            this.lastStateChange = time;
            this.pickEscapeLocation(playerPosition);
        } else if (distanceToPlayer < chaseLimit && this.state !== "CHASE" && this.health >= 30) {
            this.state = "CHASE";
            this.lastStateChange = time;
        } else if (distanceToPlayer > patrolLimit && this.state !== "PATROL") {
            this.state = "PATROL";
            this.lastStateChange = time;
        }


        // 2. STATE EXECUTION
        let targetSpeed = this.moveSpeed;
        let targetLookAt = playerPosition.clone();
        targetLookAt.y = this.mesh.position.y; // keep level

        const aimLimit = isLargeMap ? 500 : 40;
        this.charMesh.isAiming = (this.state === "CHASE" || this.state === "ESCAPE") && distanceToPlayer < aimLimit;



        if (this.state === "PATROL") {
            // Roam randomly in the arena
            if (time - this.lastRoamUpdate > this.roamWaitTime) {
                const roamRad = isLargeMap ? 170 : 40;
                // Pick a point in the arena
                this.roamTarget.set(
                    (Math.random() - 0.5) * roamRad * 2,
                    0,
                    (Math.random() - 0.5) * roamRad * 2
                );
                this.lastRoamUpdate = time;
                this.roamWaitTime = 2000 + Math.random() * 2000;
            }


            // Move to roam target
            const dir = new THREE.Vector3().subVectors(this.roamTarget, this.mesh.position);
            dir.y = 0;
            if (dir.lengthSq() > 1.0) {
                dir.normalize();
                this.velocity.copy(dir).multiplyScalar(targetSpeed * 0.6);
                this.mesh.position.addScaledVector(this.velocity, dt);

                // Look in direction of movement
                const look = this.mesh.position.clone().add(dir);
                this.mesh.lookAt(look);

                this.charMesh.animateWalking(time / 1000, 0.6);
            } else {
                this.charMesh.resetLimbAnimations();
            }

        } else if (this.state === "CHASE") {
            // Face the player directly
            this.mesh.lookAt(targetLookAt);

            // Move towards player if not too close
            if (distanceToPlayer > 10) {
                const dir = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
                dir.y = 0;
                dir.normalize();

                // Check environment collision in front
                let obstacleInFront = false;
                const botOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0));
                const raycaster = new THREE.Raycaster(botOrigin, dir, 0.1, 2.5);
                const intersects = raycaster.intersectObjects(environmentCrates);

                if (intersects.length > 0) {
                    obstacleInFront = true;
                }

                // If obstacle in front, jump!
                const currentFloorY = window.game ? window.game.getTerrainHeight(this.mesh.position.x, this.mesh.position.z) : 0.0;
                if (obstacleInFront && Math.abs(this.mesh.position.y - currentFloorY) < 0.2) {
                    this.velocity.y = 8.0; // Jump force
                }

                // Horizontal movement
                this.velocity.x = dir.x * targetSpeed;
                this.velocity.z = dir.z * targetSpeed;
            } else {
                // Strafe sideways to make it harder for player to shoot
                const dir = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
                dir.y = 0;
                dir.normalize();
                
                const strafeDir = new THREE.Vector3(-dir.z, 0, dir.x); // perpendicular
                const strafeWave = Math.sin(time / 500);
                this.velocity.x = strafeDir.x * targetSpeed * 0.7 * strafeWave;
                this.velocity.z = strafeDir.z * targetSpeed * 0.7 * strafeWave;
            }

            // Apply gravity and update position
            const floorY = window.game ? window.game.getTerrainHeight(this.mesh.position.x, this.mesh.position.z) : 0.0;
            const botInCaveSystem = this.mesh.position.y < -3.0 || 
                                    (Math.abs(this.mesh.position.x - 75.0) < 22.0 && this.mesh.position.z < -95.0) || 
                                    (Math.abs(this.mesh.position.x + 75.0) < 22.0 && this.mesh.position.z > 95.0);
            const botWaterLevel = botInCaveSystem ? -24.0 : (window.game && window.game.selectedMapName === 'Jungle' ? 3.5 : 6.0);
            const isBotSubmerged = this.mesh.position.y < botWaterLevel - 0.2;


            if (isBotSubmerged) {
                this.velocity.y = Math.max(-2.0, this.velocity.y - 4.5 * dt); // water gravity
                if (playerPosition.y > this.mesh.position.y + 1.0) {
                    this.velocity.y = 3.0; // swim up towards player height
                }
            } else if (this.mesh.position.y > floorY + 0.05) {
                this.velocity.y -= 18.0 * dt; // air gravity
            } else {
                this.velocity.y = Math.max(0, this.velocity.y);
                this.mesh.position.y = floorY;
            }


            this.mesh.position.addScaledVector(this.velocity, dt);
            this.charMesh.animateWalking(time / 1000, 1.0);

            // AIM & SHOOT AT PLAYER
            const shootRange = isLargeMap ? 140 : 35;
            if (distanceToPlayer < shootRange && time - this.lastShotTime > this.shotInterval) {
                this.shootAtPlayer(playerPosition, onPlayerDamaged);
                this.lastShotTime = time;
            }




        } else if (this.state === "ESCAPE") {
            // Run to a cover position opposite to player
            const dir = new THREE.Vector3().subVectors(this.roamTarget, this.mesh.position);
            dir.y = 0;
            if (dir.lengthSq() > 1.0) {
                dir.normalize();
                this.velocity.copy(dir).multiplyScalar(targetSpeed * 1.2);
                this.mesh.position.addScaledVector(this.velocity, dt);

                this.mesh.lookAt(targetLookAt); // Still watch the player while escaping!
                this.charMesh.animateWalking(time / 1000, 1.3);
            } else {
                // Re-evaluate cover
                this.state = "CHASE";
            }

            // Shoot occasionally while escaping (suppressive fire)
            if (distanceToPlayer < 30 && time - this.lastShotTime > this.shotInterval * 1.5) {
                this.shootAtPlayer(playerPosition, onPlayerDamaged);
                this.lastShotTime = time;
            }
        }

        // Snaps bot directly to the terrain floor height, bypassing when deep inside cave chambers
        const floorY = window.game ? window.game.getTerrainHeight(this.mesh.position.x, this.mesh.position.z) : 0.0;
        const inCaveZone = this.mesh.position.y < -3.0 && Math.abs(this.mesh.position.x) < 265.0 && Math.abs(this.mesh.position.z) <= 100.0;



        if (inCaveZone) {
            if (this.mesh.position.y <= -25.0) {
                this.mesh.position.y = -25.0;
                this.velocity.y = 0;
            }
        } else {
            if (this.mesh.position.y < floorY || (this.state !== "CHASE" && Math.abs(this.mesh.position.y - floorY) > 0.05)) {
                this.mesh.position.y = floorY;
                this.velocity.y = 0;
            }
        }

    }


    pickEscapeLocation(playerPos) {
        const isLargeMap = window.game && (window.game.selectedMapName === 'Jungle' || window.game.selectedMapName === 'Highlands');
        const escapeDist = isLargeMap ? 60 : 15;
        const borderLimit = isLargeMap ? 180 : 22;

        // Pick opposite vector from player pos
        const escapeDir = new THREE.Vector3().subVectors(this.mesh.position, playerPos).normalize();
        escapeDir.y = 0;
        
        // Project a target point
        this.roamTarget.copy(this.mesh.position).addScaledVector(escapeDir, escapeDist);
        // Clamp to arena limits
        this.roamTarget.x = Math.max(-borderLimit, Math.min(borderLimit, this.roamTarget.x));
        this.roamTarget.z = Math.max(-borderLimit, Math.min(borderLimit, this.roamTarget.z));
    }


    shootAtPlayer(playerPos, onPlayerDamaged) {
        if (this.isDead) return;

        // Look at player chest
        const chestTarget = playerPos.clone().add(new THREE.Vector3(0, 1.0, 0));
        const botWeaponMuzzle = this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        
        // Synthesize gunshot audio locally for bot shooting
        if (window.soundFX) window.soundFX.playShoot("Rifle");

        // Line-of-sight terrain height check (prevents shooting through hills/mountains)
        const dist = botWeaponMuzzle.distanceTo(chestTarget);

        const steps = 16;
        let isBlocked = false;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const px = botWeaponMuzzle.x * (1 - t) + chestTarget.x * t;
            const py = botWeaponMuzzle.y * (1 - t) + chestTarget.y * t;
            const pz = botWeaponMuzzle.z * (1 - t) + chestTarget.z * t;
            const h = window.game ? window.game.getTerrainHeight(px, pz) : 0.0;
            if (py < h - 0.15) {
                isBlocked = true;
                break;
            }
        }

        // Raycast check against collidable world objects (crates, cave walls)
        if (!isBlocked && window.game && window.game.collidableObjects.length > 0) {
            const raycaster = new THREE.Raycaster();
            const direction = new THREE.Vector3().subVectors(chestTarget, botWeaponMuzzle).normalize();
            raycaster.set(botWeaponMuzzle, direction);
            raycaster.far = dist;
            const intersects = raycaster.intersectObjects(window.game.collidableObjects);
            if (intersects.length > 0) {
                isBlocked = true;
            }
        }

        if (isBlocked) {
            // Draw bullet tracer that misses/hits the wall instead of damaging player
            return;
        }


        // Calculate bullet tracer endpoint
        // Add random spread based on difficulty
        const spread = this.botAimError;
        const target = chestTarget.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * spread * 10,
            (Math.random() - 0.5) * spread * 6,
            (Math.random() - 0.5) * spread * 10
        ));

        // Draw visual 3D tracer line

        const tracerGeo = new THREE.BufferGeometry().setFromPoints([botWeaponMuzzle, target]);
        const tracerMat = new THREE.LineBasicMaterial({
            color: 0xff0000, // red tracer for bot
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        const tracer = new THREE.Line(tracerGeo, tracerMat);
        this.scene.add(tracer);

        // Fade tracer quickly
        setTimeout(() => {
            this.scene.remove(tracer);
            tracerGeo.dispose();
            tracerMat.dispose();
        }, 120);

        // Roll probability to see if the raycast "hits" the player
        // Since players have a hitbox around their camera (position), 
        // we can check if the randomized tracer line is close enough to player center
        const distanceToTracer = target.distanceTo(chestTarget);
        
        // If distance is within player collision bounds, it's a hit!
        const hitRadius = 0.95; // bounding box threshold
        if (distanceToTracer < hitRadius) {
            // Apply damage to player
            const isHeadshot = Math.random() < (this.difficulty === "Impossible" ? 0.65 : (this.difficulty === "Hard" ? 0.35 : 0.08));
            const baseDamage = 15;
            const finalDamage = isHeadshot ? Math.round(baseDamage * 1.5) : baseDamage;

            onPlayerDamaged(finalDamage, isHeadshot);
        }
    }
}
