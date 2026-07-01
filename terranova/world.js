const BIOMES = {
  DEEP_OCEAN: { id: 'deep_ocean', name: 'Deep Ocean', color: '#0f2042', speed: 0.35, isWater: true },
  SHALLOW_OCEAN: { id: 'shallow_ocean', name: 'Ocean Shallows', color: '#1a3c6d', speed: 0.5, isWater: true },
  BEACH: { id: 'beach', name: 'Sandy Beach', color: '#e2cb99', speed: 0.85 },
  
  SNOWY_PEAK: { id: 'snowy_peak', name: 'Snowy Peak', color: '#ffffff', speed: 0.4 },
  ROCKY_MOUNTAIN: { id: 'rocky_mountain', name: 'Rocky Mountain', color: '#686f7a', speed: 0.55 },
  PLATEAU: { id: 'plateau', name: 'Red Clay Plateau', color: '#b25329', speed: 0.8 },
  ROLLING_HILLS: { id: 'rolling_hills', name: 'Rolling Hills', color: '#74a34f', speed: 0.75 },
  
  DENSE_FOREST: { id: 'dense_forest', name: 'Dense Oak Forest', color: '#134015', speed: 0.65 },
  FOREST: { id: 'forest', name: 'Forest', color: '#255c28', speed: 0.75 },
  TUNDRA_FOREST: { id: 'tundra_forest', name: 'Tundra Pine Forest', color: '#18382c', speed: 0.6 },
  TUNDRA_PLAIN: { id: 'tundra_plain', name: 'Snowy Tundra', color: '#c2d6cf', speed: 0.7 },
  
  PLAINS: { id: 'plains', name: 'Vibrant Plains', color: '#559c3f', speed: 1.0 },
  SAVANNAH: { id: 'savannah', name: 'Savannah', color: '#a0b25e', speed: 0.9 },
  DESERT: { id: 'desert', name: 'Sandy Desert', color: '#e8cd7d', speed: 0.75 },
  
  RIVER: { id: 'river', name: 'River', color: '#255ab2', speed: 0.4, isWater: true },
  LAKE: { id: 'lake', name: 'Lake', color: '#1c4a96', speed: 0.4, isWater: true }
};

class WorldGenerator {
  constructor(seed = 12345) {
    this.seed = seed;
    this.chunkSize = 32;       // grid segments per chunk side
    this.chunkWorldSize = 64;  // physical size (units) of a chunk in 3D
    this.tileSize = this.chunkWorldSize / this.chunkSize; // size of 1 tile (2 units)
    
    // Multiple noise generators for variety
    this.elevationNoise = new SimplexNoise(seed);
    this.moistureNoise = new SimplexNoise(seed + 100);
    this.temperatureNoise = new SimplexNoise(seed + 200);
    this.riverNoise = new SimplexNoise(seed + 300);
    this.lakeNoise = new SimplexNoise(seed + 400);
    this.plateauNoise = new SimplexNoise(seed + 500);
    this.poiNoise = new SimplexNoise(seed + 600); // For campfires/ruins

    this.chunkCache = new Map(); // key: "cx,cy" -> 3D group and logical chunk data
    this.openedChests = new Set(); // coordinates string "x,z" of opened chests
    this.litCampfires = new Set(); // coordinates of active campfires
    
    // Cache materials to share them between chunks
    this.sharedMaterials = {};
    this.initSharedMaterials();
  }

  // Helper to generate seed-stable granular procedural canvas textures locally (bypasses CORS blocks)
  generateProceduralTexture(type, baseColorHex, repeatSize = 4) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const tempColor = new THREE.Color(baseColorHex);
    const imgData = ctx.createImageData(512, 512);
    const data = imgData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % 512;
      const y = Math.floor((i / 4) / 512);
      
      const n = Math.random(); // High-frequency grain
      let factor = 1.0;
      
      if (type === 'bark') {
        // Bark crack segments and vertical lines
        const stripe = Math.sin(x * 0.08) * 0.15 + Math.sin(x * 0.4) * 0.04;
        const crack = (Math.sin(x * 0.14) * Math.cos(y * 0.02) > 0.42) ? -0.22 : 0;
        factor = 0.8 + stripe + crack + n * 0.08;
      } else if (type === 'leaves') {
        // Detailed leaf clump shadows
        const pattern = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.16 + Math.sin(x * 0.18) * Math.cos(y * 0.18) * 0.06;
        factor = 0.86 + pattern + n * 0.05;
      } else if (type === 'stone') {
        // Stone fissures and noise grains
        const fissures = (Math.sin(x * 0.03 + y * 0.03) * Math.cos(x * 0.015 - y * 0.015) > 0.45) ? -0.15 : 0;
        const noiseLayer = n * 0.18 + Math.sin(x * 0.08) * Math.cos(y * 0.08) * 0.08;
        factor = 0.82 + fissures + noiseLayer;
      } else if (type === 'wood') {
        // Wood grain rings
        const dx = x - 256;
        const dy = y - 256;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const rings = Math.sin(dist * 0.14) * 0.12;
        factor = 0.85 + rings + n * 0.05;
      } else if (type === 'sand') {
        // Wind sand ripples
        const dune = Math.sin(x * 0.04 + y * 0.02) * 0.06 + Math.sin(x * 0.12) * 0.02;
        factor = 0.92 + dune + n * 0.06;
      } else if (type === 'detail') {
        // Multi-frequency detail overlay (grass, rocks, sand grain)
        const f1 = Math.sin(x * 0.06) * Math.cos(y * 0.06) * 0.12;
        const f2 = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.06;
        const f3 = n * 0.15;
        factor = 0.8 + f1 + f2 + f3;
      }
      
      data[i] = Math.min(255, Math.floor(tempColor.r * 255 * factor));
      data[i+1] = Math.min(255, Math.floor(tempColor.g * 255 * factor));
      data[i+2] = Math.min(255, Math.floor(tempColor.b * 255 * factor));
      data[i+3] = 255;
    }
    
    ctx.putImageData(imgData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatSize, repeatSize);
    return texture;
  }

  initSharedMaterials() {
    // Generate organic procedural textures
    this.detailTexture = this.generateProceduralTexture('detail', 0xffffff, 48);
    const barkTex = this.generateProceduralTexture('bark', 0x5c4033, 2);
    const oakLeavesTex = this.generateProceduralTexture('leaves', 0x14532d, 3);
    const birchLeavesTex = this.generateProceduralTexture('leaves', 0x65a30d, 3);
    const pineLeavesTex = this.generateProceduralTexture('leaves', 0x0f402f, 3);
    const cactusTex = this.generateProceduralTexture('sand', 0x16a34a, 2);
    const stoneTex = this.generateProceduralTexture('stone', 0x64748b, 4);
    const orangeStoneTex = this.generateProceduralTexture('stone', 0xb45309, 4);
    const sandstoneTex = this.generateProceduralTexture('sand', 0xd97706, 4);
    const chestWoodTex = this.generateProceduralTexture('wood', 0x78350f, 1);
    const logWoodTex = this.generateProceduralTexture('wood', 0x5a2d0c, 1);

    // MeshPhysicalMaterials for realistic lighting, clearcoats, and soft sheens
    this.sharedMaterials.trunk = new THREE.MeshPhysicalMaterial({ map: barkTex, roughness: 0.88, clearcoat: 0.05, flatShading: true });
    this.sharedMaterials.oakLeaves = new THREE.MeshPhysicalMaterial({ map: oakLeavesTex, roughness: 0.65, sheen: 0.8, sheenColor: 0x34d399, flatShading: true });
    this.sharedMaterials.birchLeaves = new THREE.MeshPhysicalMaterial({ map: birchLeavesTex, roughness: 0.65, sheen: 0.8, sheenColor: 0xa3e635, flatShading: true });
    this.sharedMaterials.pineLeaves = new THREE.MeshPhysicalMaterial({ map: pineLeavesTex, roughness: 0.7, sheen: 0.7, sheenColor: 0x10b981, flatShading: true });
    this.sharedMaterials.cactus = new THREE.MeshPhysicalMaterial({ map: cactusTex, roughness: 0.85, flatShading: true });
    this.sharedMaterials.rock = new THREE.MeshPhysicalMaterial({ map: stoneTex, roughness: 0.82, clearcoat: 0.15, clearcoatRoughness: 0.7, flatShading: true });
    this.sharedMaterials.orangeRock = new THREE.MeshPhysicalMaterial({ map: orangeStoneTex, roughness: 0.82, clearcoat: 0.15, clearcoatRoughness: 0.7, flatShading: true });
    this.sharedMaterials.sandstone = new THREE.MeshPhysicalMaterial({ map: sandstoneTex, roughness: 0.85, flatShading: true });
    
    this.sharedMaterials.chestWood = new THREE.MeshPhysicalMaterial({ map: chestWoodTex, roughness: 0.82, clearcoat: 0.25 });
    this.sharedMaterials.chestIron = new THREE.MeshPhysicalMaterial({ color: 0x475569, metalness: 0.95, roughness: 0.2, clearcoat: 0.5 });
    this.sharedMaterials.chestGold = new THREE.MeshPhysicalMaterial({ color: 0xfacc15, metalness: 0.98, roughness: 0.12, clearcoat: 0.8 });
    this.sharedMaterials.ruinStone = new THREE.MeshPhysicalMaterial({ map: stoneTex, roughness: 0.82, clearcoat: 0.2, clearcoatRoughness: 0.7, flatShading: true });
    this.sharedMaterials.logSeat = new THREE.MeshPhysicalMaterial({ map: logWoodTex, roughness: 0.88 });
  }

  // Generate seed-stable pseudo-random number based on x and z coordinates
  hashCoords(x, z) {
    let h = Math.imul(x, 1540483477) ^ Math.imul(z, 2246822507);
    h = Math.imul(h ^ (h >>> 15), h | 1);
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  }

  // Clear caches
  reset() {
    this.chunkCache.forEach(chunk => {
      // Dispose meshes
      if (chunk.group) {
        chunk.group.traverse(child => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else if (child.material && child.material !== this.sharedMaterials[child.name]) {
              child.material.dispose();
            }
          }
        });
      }
    });
    this.chunkCache.clear();
    this.openedChests.clear();
    this.litCampfires.clear();
  }

  // Get procedural height of the terrain at world (wx, wz) coordinates
  getHeight(wx, wz) {
    const eScale = 0.003;
    const rScale = 0.006;
    const lScale = 0.005;
    const pScale = 0.005;

    // Multi-octave elevation
    let elev = this.elevationNoise.fBm(wx * eScale, wz * eScale, 5, 0.45, 2.0);
    // Scale height (from valleys to massive peaks)
    let baseH = elev * 20.0;

    // Smooth water channels for rivers
    const rNoise = this.riverNoise.noise2D(wx * rScale, wz * rScale);
    const riverDist = Math.abs(rNoise);
    if (riverDist < 0.025 && baseH > -2.0 && baseH < 18.0) {
      const factor = (0.025 - riverDist) / 0.025; // 0 to 1
      baseH -= factor * 12.0; // Carve deep river channel
    }

    // inland lakes
    let lakeN = this.lakeNoise.noise2D(wx * lScale, wz * lScale);
    lakeN = (lakeN + 1) * 0.5;
    if (lakeN > 0.65 && baseH > -3.0 && baseH < 8.0) {
      const factor = (lakeN - 0.65) / 0.35;
      baseH -= factor * 7.0; // Carve down
    }

    // Plateaus (flat tables)
    const platN = this.plateauNoise.noise2D(wx * pScale, wz * pScale);
    if (platN > 0.35 && baseH > 5.0 && baseH < 22.0) {
      const targetHeight = 10.0;
      // Flatten terrain height towards 10.0
      baseH = targetHeight + (baseH - targetHeight) * 0.15;
    }

    return baseH;
  }

  // Get procedural biome info at world (wx, wz) coordinates
  getBiomeAt(wx, wz, height) {
    const mScale = 0.004;
    const tScale = 0.003;
    const pScale = 0.005;

    let moist = this.moistureNoise.fBm(wx * mScale, wz * mScale, 3, 0.5, 2.0);
    moist = (moist + 1) * 0.5;

    let tempNoise = this.temperatureNoise.fBm(wx * tScale, wz * tScale, 3, 0.5, 2.0);
    tempNoise = (tempNoise + 1) * 0.5;
    
    // Altitude cooling: colder at high elevation
    let temp = tempNoise - Math.max(0, height / 35.0) * 0.5;
    temp = Math.max(0, Math.min(1, temp));

    let biome = BIOMES.PLAINS;
    const waterLevel = 0.0;
    let isWater = false;
    let isRiver = false;
    let isLake = false;

    // Check if water
    if (height < waterLevel) {
      isWater = true;
      
      // River logic
      const rNoise = this.riverNoise.noise2D(wx * 0.006, wz * 0.006);
      const isRiverLine = Math.abs(rNoise) < 0.025;
      
      // Lake logic
      let lakeN = this.lakeNoise.noise2D(wx * 0.005, wz * 0.005);
      lakeN = (lakeN + 1) * 0.5;
      const isLakeArea = lakeN > 0.65;

      if (isRiverLine && height < 4.0) {
        biome = BIOMES.RIVER;
        isRiver = true;
      } else if (isLakeArea) {
        biome = BIOMES.LAKE;
        isLake = true;
      } else if (height < waterLevel - 6.0) {
        biome = BIOMES.DEEP_OCEAN;
      } else {
        biome = BIOMES.SHALLOW_OCEAN;
      }
    } else {
      // Beach
      if (height < waterLevel + 0.6) {
        biome = BIOMES.BEACH;
      }
      // Snowy Peak
      else if (temp < 0.25 && height > 16.0) {
        biome = BIOMES.SNOWY_PEAK;
      }
      // Rocky Mountain
      else if (height > 20.0) {
        biome = BIOMES.ROCKY_MOUNTAIN;
      }
      // Plateau
      else if (height > 8.0 && height < 12.0 && this.plateauNoise.noise2D(wx * pScale, wz * pScale) > 0.35) {
        biome = BIOMES.PLATEAU;
      }
      // Cold
      else if (temp < 0.28) {
        if (moist > 0.4) {
          biome = BIOMES.TUNDRA_FOREST;
        } else {
          biome = BIOMES.TUNDRA_PLAIN;
        }
      }
      // Hot Desert
      else if (temp > 0.72 && moist < 0.3) {
        biome = BIOMES.DESERT;
      }
      // Rolling Hills
      else if (height > 8.0) {
        biome = BIOMES.ROLLING_HILLS;
      }
      // Forests
      else if (moist > 0.65) {
        biome = BIOMES.DENSE_FOREST;
      } else if (moist > 0.42) {
        biome = BIOMES.FOREST;
      } else if (moist > 0.22) {
        biome = BIOMES.PLAINS;
      } else {
        biome = BIOMES.SAVANNAH;
      }
    }

    return {
      biome,
      moisture: moist,
      temperature: temp,
      isWater,
      isRiver,
      isLake
    };
  }

  // Returns 3D group and logical data for a chunk, loading from cache or generating
  getChunk(cx, cz, scene) {
    const key = `${cx},${cz}`;
    if (this.chunkCache.has(key)) {
      return this.chunkCache.get(key);
    }

    const chunk = this.generate3DChunk(cx, cz, scene);
    this.chunkCache.set(key, chunk);
    return chunk;
  }

  // Generate 3D Chunk meshes and child geometries
  generate3DChunk(cx, cz, scene) {
    const group = new THREE.Group();
    group.name = `chunk_${cx}_${cz}`;

    const size = this.chunkSize;
    const worldSize = this.chunkWorldSize;
    const startX = cx * worldSize;
    const startZ = cz * worldSize;

    // 1. Create Terrain Geometry
    // We add 1 segment extra to match boundaries seamlessly
    const geometry = new THREE.PlaneGeometry(worldSize, worldSize, size, size);
    geometry.rotateX(-Math.PI / 2); // Lie flat on X-Z

    const pos = geometry.attributes.position;
    const colors = [];

    // Temporary color objects
    const cObj = new THREE.Color();
    const cliffColor = new THREE.Color('#52525b');
    const snowColor = new THREE.Color('#ffffff');

    // Create height & biome logical grid representation of chunk
    const logicalTiles = [];

    for (let j = 0; j <= size; j++) {
      const row = [];
      for (let i = 0; i <= size; i++) {
        const vertexIndex = j * (size + 1) + i;

        // Query the actual geometry coordinate values (which accounts for rotateX)
        const vx = pos.getX(vertexIndex);
        const vz = pos.getZ(vertexIndex);
        
        const wx = startX + vx + worldSize / 2;
        const wz = startZ + vz + worldSize / 2;

        const height = this.getHeight(wx, wz);

        // Set geometry vertex height
        if (vertexIndex < pos.count) {
          pos.setY(vertexIndex, height);
        }

        // Biome and coloring details
        const info = this.getBiomeAt(wx, wz, height);
        row.push({
          wx,
          wz,
          height,
          biome: info.biome,
          isWater: info.isWater,
          isRiver: info.isRiver,
          isLake: info.isLake
        });
      }
      logicalTiles.push(row);
    }

    // Compute normals first to calculate slope angles (cliffs)
    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;

    // Generate colors per vertex
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k);
      const nx = normals.getX(k);
      const ny = normals.getY(k);
      const nz = normals.getZ(k);

      // slope: steeper means smaller normal Y value
      const slope = ny; // 1 = flat, 0 = vertical

      const wx = startX + pos.getX(k) + worldSize / 2;
      const wz = startZ + pos.getZ(k) + worldSize / 2;
      const info = this.getBiomeAt(wx, wz, y);

      cObj.set(info.biome.color);

      // Visual modifications based on slope and height
      if (slope < 0.65 && y > 0.2) {
        // Steep Cliff Face (Rocky Grey)
        cObj.lerp(cliffColor, 0.85);
      } else if (y > 15.0 && slope > 0.72 && info.biome.id === 'snowy_peak') {
        // Snow capped peaks
        cObj.lerp(snowColor, 0.9);
      } else if (info.biome.id === 'plateau') {
        // Plateau orange clay variation
        const hVal = this.hashCoords(Math.floor(wx * 2), Math.floor(wz * 2));
        if (hVal < 0.3) cObj.multiplyScalar(0.9);
      }

      colors.push(cObj.r, cObj.g, cObj.b);
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    
    // Create Terrain Mesh (low poly look with flatShading)
    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: this.detailTexture,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true
    });
    const terrainMesh = new THREE.Mesh(geometry, terrainMat);
    terrainMesh.position.set(startX + worldSize / 2, 0, startZ + worldSize / 2);
    terrainMesh.castShadow = true;
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // 2. Add Water Plane if chunk has low terrain areas
    const waterGeom = new THREE.PlaneGeometry(worldSize, worldSize);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9, // sky blue water
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.76,
      transmission: 0.55, // physical translucency
      ior: 1.333,        // water index of refraction
      clearcoat: 1.0,     // wet varnish highlight
      clearcoatRoughness: 0.05,
      flatShading: true
    });
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.position.set(startX + worldSize / 2, -0.05, startZ + worldSize / 2);
    waterMesh.receiveShadow = true;
    group.add(waterMesh);

    // 3. Spawn 3D decorations (trees, rocks, chests) procedurally
    // Scan logical tile positions to spawn models stably
    const step = 4; // Check every 4 grid points to avoid congestion
    for (let j = 2; j < size - 2; j += step) {
      for (let i = 2; i < size - 2; i += step) {
        const tile = logicalTiles[j][i];
        
        // Skip spawning objects in water/beach
        if (tile.isWater || tile.biome === BIOMES.BEACH) continue;

        const hash = this.hashCoords(Math.floor(tile.wx), Math.floor(tile.wz));
        const dec = this.generate3DDecoration(tile.wx, tile.wz, tile.biome, hash, tile.height);
        
        if (dec) {
          dec.position.set(tile.wx, tile.height, tile.wz);
          group.add(dec);
        }
      }
    }

    // Add Group to active scene
    scene.add(group);

    return {
      cx,
      cz,
      group,
      tiles: logicalTiles
    };
  }

  // Construct procedural low-poly 3D models from primitive geometries
  generate3DDecoration(wx, wz, biome, hash, y) {
    const poiHash = this.poiNoise.noise2D(wx * 0.01, wz * 0.01);
    
    // Spawn Chests / Campfires inside Campsites
    if (poiHash > 0.6 && hash < 0.04 && (biome === BIOMES.PLAINS || biome === BIOMES.FOREST || biome === BIOMES.ROLLING_HILLS || biome === BIOMES.SAVANNAH)) {
      const innerHash = this.hashCoords(Math.floor(wx + 5), Math.floor(wz - 5));
      if (innerHash < 0.3) {
        // 3D Campfire
        return this.create3DModel('campfire', wx, wz);
      } else if (innerHash < 0.5) {
        // 3D Log seat
        return this.create3DModel('log_seat', wx, wz, innerHash * Math.PI * 2);
      } else if (innerHash < 0.7) {
        // 3D Chest
        return this.create3DModel('chest', wx, wz);
      }
    }

    // Spawn Ruins
    if (poiHash < -0.62 && hash < 0.07 && (biome === BIOMES.PLAINS || biome === BIOMES.ROLLING_HILLS || biome === BIOMES.DESERT || biome === BIOMES.PLATEAU)) {
      const innerHash = this.hashCoords(Math.floor(wx - 5), Math.floor(wz + 5));
      if (innerHash < 0.3) {
        return this.create3DModel('ruin_pillar', wx, wz);
      } else if (innerHash < 0.5) {
        return this.create3DModel('ruin_arch', wx, wz, innerHash * Math.PI);
      } else if (innerHash < 0.75) {
        return this.create3DModel('chest', wx, wz);
      }
    }

    // Biome items
    switch (biome.id) {
      case 'snowy_peak':
        if (hash < 0.15) return this.create3DModel('pine_tree_snow', wx, wz, 0, 0.7 + hash * 0.4);
        if (hash > 0.95) return this.create3DModel('rock_snow', wx, wz, 0, 0.8 + hash * 0.4);
        break;

      case 'rocky_mountain':
        if (hash < 0.15) return this.create3DModel('dead_tree', wx, wz, 0, 0.8 + hash * 0.4);
        if (hash > 0.9) return this.create3DModel('rock_grey', wx, wz, 0, 1.0 + hash * 0.8);
        break;

      case 'plateau':
        if (hash > 0.92) return this.create3DModel('rock_orange', wx, wz, 0, 0.8 + hash * 0.6);
        break;

      case 'rolling_hills':
        if (hash < 0.08) return this.create3DModel('rock_grey', wx, wz, 0, 0.6 + hash * 0.5);
        if (hash > 0.92) return this.create3DModel('oak_tree', wx, wz, 0, 0.7 + hash * 0.3);
        break;

      case 'dense_forest':
        if (hash < 0.55) {
          const type = hash < 0.35 ? 'oak_tree' : 'birch_tree';
          return this.create3DModel(type, wx, wz, 0, 0.9 + hash * 0.3);
        }
        break;

      case 'forest':
        if (hash < 0.3) {
          const type = hash < 0.2 ? 'oak_tree' : 'birch_tree';
          return this.create3DModel(type, wx, wz, 0, 0.8 + hash * 0.4);
        }
        if (hash > 0.96) return this.create3DModel('rock_grey', wx, wz, 0, 0.7 + hash * 0.5);
        break;

      case 'tundra_forest':
        if (hash < 0.4) return this.create3DModel('pine_tree_snow', wx, wz, 0, 0.8 + hash * 0.4);
        if (hash > 0.95) return this.create3DModel('rock_snow', wx, wz, 0, 0.8);
        break;

      case 'tundra_plain':
        if (hash < 0.08) return this.create3DModel('pine_tree_snow', wx, wz, 0, 0.7);
        if (hash > 0.95) return this.create3DModel('rock_snow', wx, wz, 0, 0.7);
        break;

      case 'plains':
        if (hash < 0.03) return this.create3DModel('oak_tree', wx, wz, 0, 0.8 + hash * 0.3);
        // Small chest out in the open plains
        if (hash > 0.50 && hash < 0.51) {
          return this.create3DModel('chest', wx, wz);
        }
        break;

      case 'savannah':
        if (hash < 0.08) return this.create3DModel('acacia_tree', wx, wz, 0, 0.8 + hash * 0.4);
        break;

      case 'desert':
        if (hash < 0.12) return this.create3DModel('cactus', wx, wz, 0, 0.7 + hash * 0.6);
        if (hash > 0.94) return this.create3DModel('rock_sandstone', wx, wz, 0, 0.8 + hash * 0.6);
        break;
    }

    return null;
  }

  // Model instantiation using Three.js geometries
  create3DModel(type, wx, wz, rotation = 0, scale = 1.0) {
    const group = new THREE.Group();
    group.name = `decor_${type}`;
    group.userData = { type, wx, wz, interactive: false, blocks: true, radius: 1.0 };

    switch (type) {
      case 'oak_tree': {
        group.userData.radius = 1.2 * scale;
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.2 * scale, 0.35 * scale, 3 * scale, 5);
        const trunk = new THREE.Mesh(trunkGeo, this.sharedMaterials.trunk);
        trunk.position.y = 1.5 * scale;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // Leaves (Low poly sphere)
        const leavesGeo = new THREE.DodecahedronGeometry(1.8 * scale, 1);
        const leaves = new THREE.Mesh(leavesGeo, this.sharedMaterials.oakLeaves);
        leaves.position.y = 3.5 * scale;
        leaves.castShadow = true;
        group.add(leaves);
        break;
      }

      case 'birch_tree': {
        group.userData.radius = 1.0 * scale;
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 3 * scale, 5);
        // Custom birch material (white trunk)
        const birchTrunkMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.85, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, birchTrunkMat);
        trunk.position.y = 1.5 * scale;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // Leaves
        const leavesGeo = new THREE.DodecahedronGeometry(1.5 * scale, 1);
        const leaves = new THREE.Mesh(leavesGeo, this.sharedMaterials.birchLeaves);
        leaves.position.y = 3.5 * scale;
        leaves.castShadow = true;
        group.add(leaves);
        break;
      }

      case 'pine_tree_snow': {
        group.userData.radius = 1.0 * scale;
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.3 * scale, 1.8 * scale, 5);
        const trunk = new THREE.Mesh(trunkGeo, this.sharedMaterials.trunk);
        trunk.position.y = 0.9 * scale;
        trunk.castShadow = true;
        group.add(trunk);

        // Pine cone levels (3 levels)
        const greenMat = this.sharedMaterials.pineLeaves;
        const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });

        for (let i = 0; i < 3; i++) {
          const coneSize = (1.5 - i * 0.35) * scale;
          const coneGeo = new THREE.ConeGeometry(coneSize, 1.5 * scale, 5);
          const leaves = new THREE.Mesh(coneGeo, greenMat);
          leaves.position.y = (1.8 + i * 1.0) * scale;
          leaves.castShadow = true;
          group.add(leaves);

          // Add a snow cap to each level
          const snowGeo = new THREE.ConeGeometry(coneSize * 0.7, 0.4 * scale, 5);
          const snow = new THREE.Mesh(snowGeo, snowMat);
          snow.position.y = (2.4 + i * 1.0) * scale;
          snow.castShadow = true;
          group.add(snow);
        }
        break;
      }

      case 'acacia_tree': {
        group.userData.radius = 1.4 * scale;
        // Gnarled Trunk (angled branches)
        const trunkGeo = new THREE.CylinderGeometry(0.2 * scale, 0.35 * scale, 2.2 * scale, 5);
        const trunk = new THREE.Mesh(trunkGeo, this.sharedMaterials.trunk);
        trunk.rotation.z = 0.15;
        trunk.position.y = 1.0 * scale;
        trunk.castShadow = true;
        group.add(trunk);

        // Secondary branching trunk
        const branchGeo = new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 1.8 * scale, 5);
        const branch = new THREE.Mesh(branchGeo, this.sharedMaterials.trunk);
        branch.rotation.z = -0.4;
        branch.position.set(0.5 * scale, 2.0 * scale, 0);
        branch.castShadow = true;
        group.add(branch);

        // Flat umbrella canopy
        const leavesGeo = new THREE.CylinderGeometry(2.0 * scale, 2.2 * scale, 0.6 * scale, 6);
        const leaves = new THREE.Mesh(leavesGeo, this.sharedMaterials.oakLeaves);
        leaves.position.set(0.7 * scale, 2.8 * scale, 0);
        leaves.castShadow = true;
        group.add(leaves);
        break;
      }

      case 'dead_tree': {
        group.userData.radius = 0.8 * scale;
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.15 * scale, 0.3 * scale, 2.5 * scale, 5);
        const trunk = new THREE.Mesh(trunkGeo, this.sharedMaterials.trunk);
        trunk.position.y = 1.25 * scale;
        trunk.castShadow = true;
        group.add(trunk);

        // 2 branches
        const b1Geo = new THREE.CylinderGeometry(0.08 * scale, 0.15 * scale, 1.5 * scale, 5);
        const b1 = new THREE.Mesh(b1Geo, this.sharedMaterials.trunk);
        b1.rotation.z = 0.6;
        b1.position.set(-0.4 * scale, 1.8 * scale, 0);
        b1.castShadow = true;
        group.add(b1);

        const b2Geo = new THREE.CylinderGeometry(0.08 * scale, 0.15 * scale, 1.2 * scale, 5);
        const b2 = new THREE.Mesh(b2Geo, this.sharedMaterials.trunk);
        b2.rotation.x = -0.5;
        b2.position.set(0.2 * scale, 1.6 * scale, 0.4 * scale);
        b2.castShadow = true;
        group.add(b2);
        break;
      }

      case 'cactus': {
        group.userData.radius = 0.6 * scale;
        // Main stem
        const mainGeo = new THREE.CylinderGeometry(0.18 * scale, 0.22 * scale, 2.0 * scale, 5);
        const stem = new THREE.Mesh(mainGeo, this.sharedMaterials.cactus);
        stem.position.y = 1.0 * scale;
        stem.castShadow = true;
        group.add(stem);

        // Left arm
        const lArmHGeo = new THREE.CylinderGeometry(0.12 * scale, 0.12 * scale, 0.8 * scale, 5);
        const lArmH = new THREE.Mesh(lArmHGeo, this.sharedMaterials.cactus);
        lArmH.rotation.z = Math.PI / 2;
        lArmH.position.set(-0.4 * scale, 1.1 * scale, 0);
        group.add(lArmH);
        
        const lArmVGeo = new THREE.CylinderGeometry(0.12 * scale, 0.12 * scale, 0.8 * scale, 5);
        const lArmV = new THREE.Mesh(lArmVGeo, this.sharedMaterials.cactus);
        lArmV.position.set(-0.8 * scale, 1.4 * scale, 0);
        group.add(lArmV);

        // Right arm
        const rArmH = new THREE.Mesh(lArmHGeo, this.sharedMaterials.cactus);
        rArmH.rotation.z = Math.PI / 2;
        rArmH.position.set(0.4 * scale, 0.7 * scale, 0);
        group.add(rArmH);

        const rArmV = new THREE.Mesh(lArmVGeo, this.sharedMaterials.cactus);
        rArmV.position.set(0.8 * scale, 1.0 * scale, 0);
        group.add(rArmV);
        break;
      }

      case 'rock_grey': {
        group.userData.radius = 1.2 * scale;
        const rockGeo = new THREE.DodecahedronGeometry(1.0 * scale, 0);
        const rock = new THREE.Mesh(rockGeo, this.sharedMaterials.rock);
        rock.scale.set(1.4, 0.8, 1.0);
        rock.position.y = 0.4 * scale;
        rock.castShadow = true;
        rock.receiveShadow = true;
        group.add(rock);
        break;
      }

      case 'rock_snow': {
        group.userData.radius = 1.0 * scale;
        const rockGeo = new THREE.DodecahedronGeometry(0.8 * scale, 0);
        const rock = new THREE.Mesh(rockGeo, this.sharedMaterials.rock);
        rock.scale.set(1.2, 0.8, 1.0);
        rock.position.y = 0.3 * scale;
        rock.castShadow = true;
        group.add(rock);

        // Snow Cap
        const snowGeo = new THREE.DodecahedronGeometry(0.7 * scale, 0);
        const snow = new THREE.Mesh(snowGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
        snow.scale.set(1.15, 0.3, 0.95);
        snow.position.y = 0.65 * scale;
        snow.castShadow = true;
        group.add(snow);
        break;
      }

      case 'rock_orange': {
        group.userData.radius = 1.0 * scale;
        const rockGeo = new THREE.DodecahedronGeometry(0.8 * scale, 0);
        const rock = new THREE.Mesh(rockGeo, this.sharedMaterials.orangeRock);
        rock.scale.set(1.4, 0.7, 1.0);
        rock.position.y = 0.3 * scale;
        rock.castShadow = true;
        group.add(rock);
        break;
      }

      case 'rock_sandstone': {
        group.userData.radius = 1.1 * scale;
        const rockGeo = new THREE.DodecahedronGeometry(0.9 * scale, 0);
        const rock = new THREE.Mesh(rockGeo, this.sharedMaterials.sandstone);
        rock.scale.set(1.3, 0.7, 1.0);
        rock.position.y = 0.3 * scale;
        rock.castShadow = true;
        group.add(rock);
        break;
      }

      case 'chest': {
        group.userData.radius = 0.8;
        group.userData.interactive = true;
        group.userData.action = 'openChest';
        group.userData.chestId = `${Math.floor(wx)},${Math.floor(wz)}`;
        
        // Base Box
        const boxGeo = new THREE.BoxGeometry(0.8, 0.5, 0.5);
        const box = new THREE.Mesh(boxGeo, this.sharedMaterials.chestWood);
        box.position.y = 0.25;
        box.castShadow = true;
        group.add(box);

        // Lid (Offset to allow open animation rotation if needed, or simple status change)
        const lidGeo = new THREE.BoxGeometry(0.84, 0.2, 0.54);
        const lid = new THREE.Mesh(lidGeo, this.sharedMaterials.chestWood);
        lid.name = 'lid';
        
        const isOpened = this.openedChests.has(group.userData.chestId);
        if (isOpened) {
          lid.position.set(0, 0.7, -0.2);
          lid.rotation.x = -Math.PI / 4;
        } else {
          lid.position.set(0, 0.6, 0);
        }
        lid.castShadow = true;
        group.add(lid);

        // Lock bands
        const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.52), this.sharedMaterials.chestIron);
        band1.position.set(-0.25, 0.3, 0);
        group.add(band1);

        const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.52), this.sharedMaterials.chestIron);
        band2.position.set(0.25, 0.3, 0);
        group.add(band2);

        // Golden Lock
        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.1), this.sharedMaterials.chestGold);
        lock.position.set(0, 0.45, 0.26);
        group.add(lock);
        break;
      }

      case 'campfire': {
        group.userData.radius = 0.7;
        group.userData.interactive = true;
        group.userData.action = 'interactCampfire';
        group.userData.campfireId = `${Math.floor(wx)},${Math.floor(wz)}`;

        // Crossed Logs
        const logMat = this.sharedMaterials.trunk;
        const logGeo = new THREE.BoxGeometry(0.8, 0.15, 0.15);
        
        const log1 = new THREE.Mesh(logGeo, logMat);
        log1.position.y = 0.08;
        log1.rotation.y = Math.PI / 4;
        group.add(log1);

        const log2 = new THREE.Mesh(logGeo, logMat);
        log2.position.y = 0.08;
        log2.rotation.y = -Math.PI / 4;
        group.add(log2);

        // Fire mesh group (only visible if lit)
        const fire = new THREE.Group();
        fire.name = 'fire';
        
        // Flickering fire particles (Cones)
        const flameGeo = new THREE.ConeGeometry(0.3, 0.7, 4);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.name = 'flame';
        flame.position.y = 0.4;
        fire.add(flame);
        
        // Inner yellow flame
        const innerGeo = new THREE.ConeGeometry(0.15, 0.45, 4);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9 });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        inner.name = 'innerFlame';
        inner.position.y = 0.3;
        fire.add(inner);

        // Add 3D Point Light source
        const fireLight = new THREE.PointLight(0xfd7e14, 1.8, 12);
        fireLight.name = 'light';
        fireLight.position.y = 0.8;
        fireLight.castShadow = true;
        fireLight.shadow.bias = -0.002;
        fire.add(fireLight);

        const campfireId = `${Math.floor(wx)},${Math.floor(wz)}`;
        const isLit = !this.litCampfires.has(campfireId); // lit by default unless Extinguished
        fire.visible = isLit;
        if (isLit) {
          this.litCampfires.add(campfireId);
        }

        group.add(fire);
        break;
      }

      case 'ruin_pillar': {
        group.userData.radius = 1.0;
        // Stacked stone block segments
        const blockGeo = new THREE.BoxGeometry(0.9, 1.2, 0.9);
        
        for (let i = 0; i < 3; i++) {
          const block = new THREE.Mesh(blockGeo, this.sharedMaterials.ruinStone);
          block.position.y = 0.6 + i * 1.25;
          // Random offset for weathered, broken ruins look
          block.position.x = (Math.random() - 0.5) * 0.06;
          block.position.z = (Math.random() - 0.5) * 0.06;
          block.rotation.y = (Math.random() - 0.5) * 0.1;
          block.castShadow = true;
          block.receiveShadow = true;
          group.add(block);
        }
        break;
      }

      case 'ruin_arch': {
        group.userData.radius = 1.4;
        // Left Column
        const colGeo = new THREE.BoxGeometry(0.5, 2.5, 0.5);
        const leftCol = new THREE.Mesh(colGeo, this.sharedMaterials.ruinStone);
        leftCol.position.set(-1.0, 1.25, 0);
        leftCol.castShadow = true;
        leftCol.receiveShadow = true;
        group.add(leftCol);

        // Right Column
        const rightCol = new THREE.Mesh(colGeo, this.sharedMaterials.ruinStone);
        rightCol.position.set(1.0, 1.25, 0);
        rightCol.castShadow = true;
        rightCol.receiveShadow = true;
        group.add(rightCol);

        // Lint arch top beam
        const lintelGeo = new THREE.BoxGeometry(2.8, 0.4, 0.7);
        const lintel = new THREE.Mesh(lintelGeo, this.sharedMaterials.ruinStone);
        lintel.position.set(0, 2.7, 0);
        lintel.rotation.z = 0.03; // angled slightly broken
        lintel.castShadow = true;
        group.add(lintel);
        break;
      }

      case 'log_seat': {
        group.userData.radius = 0.6;
        const logGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.4, 6);
        const log = new THREE.Mesh(logGeo, this.sharedMaterials.logSeat);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = rotation;
        log.position.y = 0.18;
        log.castShadow = true;
        group.add(log);
        break;
      }
    }

    return group;
  }
}
