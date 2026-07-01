class Player {
  constructor(x, z) {
    this.x = x; // 3D world X
    this.y = 0; // 3D world Y (height)
    this.z = z; // 3D world Z
    this.radius = 0.6; // Collision radius (units)
    this.height = 1.6;  // Eye height
    this.baseSpeed = 0.16;
    this.currentSpeed = this.baseSpeed;
    
    // Stats & Journal
    this.totalSteps = 0;
    this.relics = [];
    this.discoveredBiomes = new Set();
    this.visitedPOIs = new Set();
    this.activeBiome = null;
    
    // Movement state
    this.moving = false;
    this.angle = 0; // facing direction relative to camera
    
    // Camera orbit angles
    this.cameraYaw = 0; // horizontal angle
    this.cameraPitch = 0.35; // vertical tilt (looking down slightly)
    this.cameraDistance = 7.0; // distance from player
    
    // Relic pool
    this.relicPool = [
      { id: 'compass', name: 'Ancient Compass', desc: 'Points toward a long-forgotten destination.' },
      { id: 'sunstone', name: 'Sunstone Obelisk', desc: 'Glows with a warm, internal solar light.' },
      { id: 'fossil', name: 'Frozen Fern Fossil', desc: 'A perfectly preserved leaf from a warmer era.' },
      { id: 'scarab', name: 'Golden Scarab', desc: 'A heavy gold beetle inscribed with protection runes.' },
      { id: 'acorn', name: 'Petrified Oak Seed', desc: 'An ancient seed that feels heavy as lead.' },
      { id: 'hourglass', name: 'Red Sand Glass', desc: 'Flows endlessly, unaffected by gravity.' },
      { id: 'tablet', name: 'Rune-Carved Tablet', desc: 'Speaks of the creators who shaped this land.' },
      { id: 'trident', name: 'Shattered Trident', desc: 'Still hums with the soft sound of ocean waves.' },
      { id: 'amethyst', name: 'Mountain Amethyst', desc: 'A giant crystal that grows colder when held.' },
      { id: 'diary', name: "Explorer's Logbook", desc: 'Filled with coordinates and sketches of giant peaks.' }
    ];
  }

  // Update player movement and lock height to 3D terrain
  update(keys, world) {
    let dx = 0;
    let dz = 0;

    // Movement relative to camera orientation
    if (keys['w'] || keys['arrowup']) {
      dx += Math.sin(this.cameraYaw);
      dz += Math.cos(this.cameraYaw);
    }
    if (keys['s'] || keys['arrowdown']) {
      dx -= Math.sin(this.cameraYaw);
      dz -= Math.cos(this.cameraYaw);
    }
    if (keys['a'] || keys['arrowleft']) {
      dx += Math.cos(this.cameraYaw);
      dz -= Math.sin(this.cameraYaw);
    }
    if (keys['d'] || keys['arrowright']) {
      dx -= Math.cos(this.cameraYaw);
      dz += Math.sin(this.cameraYaw);
    }

    this.moving = (dx !== 0 || dz !== 0);

    // Get current biome and terrain height
    const groundY = world.getHeight(this.x, this.z);
    const waterLevel = 0.0;
    
    // Float on water if terrain goes below sea level
    const targetY = Math.max(waterLevel, groundY);
    
    // Prohibit sinking below the terrain/water surface (fixes glitching under the map)
    if (this.y < targetY) {
      this.y = targetY;
    } else {
      // Smooth descent when walking down slopes
      this.y += (targetY - this.y) * 0.22;
    }

    const info = world.getBiomeAt(this.x, this.z, groundY);
    this.activeBiome = info.biome;

    // Discovered biome trigger
    if (!this.discoveredBiomes.has(this.activeBiome.id)) {
      this.discoveredBiomes.add(this.activeBiome.id);
      window.dispatchEvent(new CustomEvent('biome-discovered', { detail: this.activeBiome }));
    }

    const speedFactor = this.activeBiome.speed || 1.0;
    this.currentSpeed = this.baseSpeed * speedFactor;

    if (this.moving) {
      // Normalize
      const length = Math.sqrt(dx * dx + dz * dz);
      dx /= length;
      dz /= length;

      // Apply movement step with slope check
      const stepX = dx * this.currentSpeed;
      const stepZ = dz * this.currentSpeed;
      
      const nextX = this.x + stepX;
      const nextZ = this.z + stepZ;
      const nextGroundY = world.getHeight(nextX, nextZ);
      
      // Clamped visual heights (including water surface at Y = 0.0)
      const nextTargetY = Math.max(0.0, nextGroundY);
      const currentTargetY = Math.max(0.0, groundY);
      
      // Slope check: evaluate differences between actual surface heights
      const heightDiff = nextTargetY - currentTargetY;
      
      // Allow a much higher climb threshold (2.2) when climbing out of water onto land
      const maxSlope = (currentTargetY === 0.0) ? 2.2 : 1.15;
      
      if (heightDiff < maxSlope) {
        this.x = nextX;
        this.z = nextZ;
      } else {
        // Try sliding: check X only
        const nextTargetYX = Math.max(0.0, world.getHeight(nextX, this.z));
        if (nextTargetYX - currentTargetY < maxSlope) {
          this.x = nextX;
        } else {
          // Check Z only
          const nextTargetYZ = Math.max(0.0, world.getHeight(this.x, nextZ));
          if (nextTargetYZ - currentTargetY < maxSlope) {
            this.z = nextZ;
          }
        }
      }
      
      this.angle = Math.atan2(dx, dz);
      this.totalSteps += 1;
      
      // Resolve obstacle collision
      this.resolveObstacleCollisions(world);
    }
  }

  // Check and push player out of blocked 3D meshes (trees, rocks, chests)
  resolveObstacleCollisions(world) {
    const cx = Math.floor(this.x / world.chunkWorldSize);
    const cz = Math.floor(this.z / world.chunkWorldSize);

    // Check current chunk and 8 surrounding chunks
    for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        const chunk = world.chunkCache.get(`${cx + offsetX},${cz + offsetZ}`);
        if (!chunk || !chunk.group) continue;

        // Traverse chunk children to find decoration models
        chunk.group.children.forEach(child => {
          if (child.name.startsWith('decor_') && child.userData.blocks) {
            const data = child.userData;
            const dist = Math.hypot(this.x - data.wx, this.z - data.wz);
            const minDist = this.radius + data.radius;

            if (dist < minDist) {
              // Push player out of collision boundary along angle
              const pushAngle = Math.atan2(this.x - data.wx, this.z - data.wz);
              const pushDist = minDist - dist;
              
              this.x += Math.sin(pushAngle) * pushDist;
              this.z += Math.cos(pushAngle) * pushDist;
            }
          }
        });
      }
    }
  }

  // Collect a random relic from the pool
  collectRelic() {
    if (this.relics.length >= this.relicPool.length) {
      return null;
    }
    const uncollected = this.relicPool.filter(r => !this.relics.some(collected => collected.id === r.id));
    if (uncollected.length === 0) return null;

    const randomRelic = uncollected[Math.floor(Math.random() * uncollected.length)];
    this.relics.push(randomRelic);
    return randomRelic;
  }
}

window.Player = Player;
