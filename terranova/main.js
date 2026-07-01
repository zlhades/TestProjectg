// Setup seed and world variables (deferred instantiation on load)
const seed = Math.floor(Math.random() * 999999);
let world;
let player;
let sound;

// Game state variables
let canvas, renderer, scene, camera3D;
let ambientLight, sunLight, playerLantern;
let playerGroup, playerBodyMesh, cloudsGroup;
let lastTime = 0;
let keys = {};
let gameTime = 720; // Starts at 12:00 PM
const TIME_SPEED = 0.55; // ticks speed

// Cinematic camera drift variables
let gameStarted = false;
let startScreenTime = 0;
let isDraggingCamera = false;
let prevMouseX = 0;
let prevMouseY = 0;

// Systems lists
let particles3D = [];
let animals3D = [];

// Full Map Interaction State
let mapOpen = false;
let mapScale = 1.0;
let mapOffset = { x: 0, y: 0 };
let isDraggingMap = false;
let dragStart = { x: 0, y: 0 };

// Find starting coordinates on safe land (avoiding water)
function findSafeStartLocation() {
  let attempts = 0;
  let wx = 0;
  let wz = 0;

  while (attempts < 1000) {
    const height = world.getHeight(wx, wz);
    const info = world.getBiomeAt(wx, wz, height);
    if (!info.isWater && info.biome !== BIOMES.DEEP_OCEAN && info.biome !== BIOMES.SHALLOW_OCEAN) {
      player.x = wx;
      player.z = wz;
      player.y = height;
      player.activeBiome = info.biome;
      player.discoveredBiomes.add(info.biome.id);
      break;
    }
    // Spiral outwards
    attempts++;
    wx += Math.floor(Math.sin(attempts) * attempts * 2.2);
    wz += Math.floor(Math.cos(attempts) * attempts * 2.2);
  }

  // Emergency backup grid scan if seed generates massive ocean near spawn
  if (attempts >= 1000) {
    let found = false;
    for (let gridX = -1200; gridX <= 1200 && !found; gridX += 28) {
      for (let gridZ = -1200; gridZ <= 1200 && !found; gridZ += 28) {
        const height = world.getHeight(gridX, gridZ);
        const info = world.getBiomeAt(gridX, gridZ, height);
        if (!info.isWater && info.biome !== BIOMES.DEEP_OCEAN && info.biome !== BIOMES.SHALLOW_OCEAN) {
          player.x = gridX;
          player.z = gridZ;
          player.y = height;
          player.activeBiome = info.biome;
          player.discoveredBiomes.add(info.biome.id);
          found = true;
        }
      }
    }
    
    // Hard fallback to origin if absolutely nothing found
    if (!found) {
      player.x = 0;
      player.z = 0;
      player.y = Math.max(0.0, world.getHeight(0, 0));
    }
  }
}

// Window load callback
window.addEventListener('load', () => {
  canvas = document.getElementById('game-canvas');
  
  try {
    // 1. Instantiate controllers now that Three.js is loaded
    world = new WorldGenerator(seed);
    player = new Player(0, 0);
    sound = new SoundController();

    // 2. Initialize Three.js WebGL Scene
    init3DScene();
    
    // 3. Find starting location
    findSafeStartLocation();
    
    // 4. Create Player 3D Mesh
    createPlayerMesh();
  } catch (err) {
    console.error("3D WebGL initialization failed:", err);
    document.getElementById('title-banner').innerText = "LOAD ERROR";
    document.querySelector('.start-subtitle').innerText = "WebGL is not supported or is disabled";
    document.getElementById('start-btn').innerText = "Cannot Start Game";
    document.getElementById('start-btn').disabled = true;
    return; // Stop initialization
  }

  // Resize Listener
  window.addEventListener('resize', onWindowResize);

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    if (key === 'm') toggleFullMap();
    if (key === 'j') toggleJournal();
    if (key === 'e') handleInteraction();
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Mouse Drag Camera Orbit controls
  canvas.addEventListener('mousedown', (e) => {
    if (!gameStarted) return;
    isDraggingCamera = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingCamera && gameStarted) {
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      player.cameraYaw -= deltaX * 0.005;
      player.cameraPitch = Math.max(-0.15, Math.min(1.2, player.cameraPitch + deltaY * 0.005));
    }
  });

  window.addEventListener('mouseup', () => {
    isDraggingCamera = false;
  });

  // Zoom distance with scroll
  canvas.addEventListener('wheel', (e) => {
    if (!gameStarted) return;
    player.cameraDistance = Math.max(3.5, Math.min(18.0, player.cameraDistance + e.deltaY * 0.01));
  });

  // Start Screen Button
  document.getElementById('start-btn').addEventListener('click', () => {
    gameStarted = true;
    document.querySelector('.hud-layer').classList.add('show');
    document.getElementById('start-screen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('start-screen').style.display = 'none';
    }, 800);
    // Enable audio
    try {
      sound.setMute(false);
      updateAudioBtnUI();
    } catch (err) {
      console.warn("Audio failed:", err);
    }
  });

  // Audio Toggle Button
  document.getElementById('audio-toggle').addEventListener('click', () => {
    sound.setMute(!sound.muted);
    updateAudioBtnUI();
  });

  // Panel overlays controls
  document.getElementById('journal-btn').addEventListener('click', toggleJournal);
  document.getElementById('journal-close').addEventListener('click', toggleJournal);
  document.getElementById('fullmap-close').addEventListener('click', toggleFullMap);

  // Setup tabs inside Journal
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const paneId = tab.dataset.tab;
      document.querySelectorAll('.journal-tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      document.getElementById(`${paneId}-pane`).classList.add('active');

      if (paneId === 'relics') populateRelicsUI();
      if (paneId === 'discoveries') populateDiscoveriesUI();
      if (paneId === 'stats') populateStatsUI();
    });
  });

  // Full Map Mouse/Touch Panning
  const mapCanvas = document.getElementById('fullmap-canvas');
  mapCanvas.addEventListener('mousedown', (e) => {
    isDraggingMap = true;
    dragStart.x = e.clientX - mapOffset.x;
    dragStart.y = e.clientY - mapOffset.y;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingMap || !mapOpen) return;
    mapOffset.x = e.clientX - dragStart.x;
    mapOffset.y = e.clientY - dragStart.y;
    renderFullMap();
  });

  window.addEventListener('mouseup', () => {
    isDraggingMap = false;
  });

  mapCanvas.addEventListener('wheel', (e) => {
    if (!mapOpen) return;
    e.preventDefault();
    const zoomIntensity = 0.1;
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    
    const xs = (mouseX - mapOffset.x) / mapScale;
    const ys = (mouseY - mapOffset.y) / mapScale;
    
    if (e.deltaY < 0) {
      mapScale = Math.min(3.0, mapScale + zoomIntensity);
    } else {
      mapScale = Math.max(0.4, mapScale - zoomIntensity);
    }
    
    mapOffset.x = mouseX - xs * mapScale;
    mapOffset.y = mouseY - ys * mapScale;
    renderFullMap();
  }, { passive: false });

  // Custom Event for Biome Discovery Pop-up
  window.addEventListener('biome-discovered', (e) => {
    const biome = e.detail;
    showBiomePopup(biome);
  });

  // Start Loop
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
});

// Setup Scene, WebGLRenderer, Fog, and dynamic lighting
function init3DScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#030712');
  // exponential fog
  scene.fog = new THREE.FogExp2('#030712', 0.015);

  camera3D = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Lights Setup
  ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  // Directional Sun Light
  sunLight = new THREE.DirectionalLight(0xfff7e6, 0.85);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 160;
  const d = 40;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0006;
  scene.add(sunLight);

  // Player Lantern Light (warm glowing spot)
  playerLantern = new THREE.PointLight(0xfd7e14, 0.0, 16);
  playerLantern.castShadow = true;
  playerLantern.shadow.bias = -0.002;
  scene.add(playerLantern);

  // 3D Genshin Impact-style drifting fluffy clouds group
  cloudsGroup = new THREE.Group();
  cloudsGroup.name = "clouds";

  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    flatShading: true
  });

  // Spawn 12 cloud clusters distributed randomly in the sky
  for (let i = 0; i < 12; i++) {
    const cluster = new THREE.Group();
    cluster.position.set(
      -250 + Math.random() * 500,
      68.0 + Math.random() * 15.0,
      -250 + Math.random() * 500
    );

    // Each cluster is composed of 4-6 overlapping fluffy box volumes
    const numPuffs = 4 + Math.floor(Math.random() * 3);
    for (let p = 0; p < numPuffs; p++) {
      const w = 10 + Math.random() * 18;
      const h = 5 + Math.random() * 5;
      const d = 10 + Math.random() * 18;
      const puff = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cloudMat);
      puff.position.set(
        -6 + Math.random() * 12,
        -1.5 + Math.random() * 3,
        -6 + Math.random() * 12
      );
      cluster.add(puff);
    }
    cloudsGroup.add(cluster);
  }
  scene.add(cloudsGroup);
}

// Assemble Player 3D low poly mesh group
function createPlayerMesh() {
  playerGroup = new THREE.Group();
  playerGroup.name = "player";

  // Backpack
  const packGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
  const packMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
  const backpack = new THREE.Mesh(packGeo, packMat);
  backpack.position.set(0, 0.8, -0.32);
  backpack.castShadow = true;
  playerGroup.add(backpack);

  // Torso
  const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.9, 6);
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.7, flatShading: true });
  playerBodyMesh = new THREE.Mesh(bodyGeo, coatMat);
  playerBodyMesh.position.y = 0.75;
  playerBodyMesh.castShadow = true;
  playerBodyMesh.receiveShadow = true;
  playerGroup.add(playerBodyMesh);

  // Belt
  const beltGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.08, 6);
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.position.y = 0.45;
  playerGroup.add(belt);

  // Head
  const headGeo = new THREE.SphereGeometry(0.28, 6, 6);
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.8 });
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.35;
  head.castShadow = true;
  playerGroup.add(head);

  // Explorer Hat
  const hatBrimGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.04, 8);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
  const brim = new THREE.Mesh(hatBrimGeo, hatMat);
  brim.position.y = 1.48;
  playerGroup.add(brim);

  const hatTopGeo = new THREE.ConeGeometry(0.28, 0.3, 6);
  const hatTop = new THREE.Mesh(hatTopGeo, hatMat);
  hatTop.position.y = 1.62;
  playerGroup.add(hatTop);

  // Legs / Feet
  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 5);
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.name = "left_leg";
  leftLeg.position.set(-0.16, 0.2, 0);
  leftLeg.castShadow = true;
  playerGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.name = "right_leg";
  rightLeg.position.set(0.16, 0.2, 0);
  rightLeg.castShadow = true;
  playerGroup.add(rightLeg);

  scene.add(playerGroup);
}

// Window resizing
function onWindowResize() {
  camera3D.aspect = window.innerWidth / window.innerHeight;
  camera3D.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update game loop (60 fps)
function gameLoop(now) {
  const dt = now - lastTime;
  lastTime = now;

  if (!mapOpen) {
    // 1. Advance Day/Night time (clamped to daytime: 9 AM to 3 PM via sine wave)
    gameTime = 720 + Math.sin(performance.now() * 0.00005) * 180;

    // 2. Physics & Player updates
    if (gameStarted) {
      player.update(keys, world);
      
      // Update player 3D mesh position and rotations
      playerGroup.position.set(player.x, player.y, player.z);
      playerGroup.rotation.y = player.angle;

      // Animate explorer body & legs walking
      const bounce = player.moving ? Math.abs(Math.sin(performance.now() * 0.015)) * 0.12 : 0;
      playerBodyMesh.position.y = 0.75 + bounce;
      
      const leftLeg = playerGroup.getObjectByName("left_leg");
      const rightLeg = playerGroup.getObjectByName("right_leg");
      if (leftLeg && rightLeg) {
        if (player.moving) {
          const legSwing = Math.sin(performance.now() * 0.016) * 0.5;
          leftLeg.rotation.x = legSwing;
          rightLeg.rotation.x = -legSwing;
        } else {
          leftLeg.rotation.x = 0;
          rightLeg.rotation.x = 0;
        }
      }

      // Update spot/point lantern position
      playerLantern.position.set(player.x, player.y + 1.2, player.z);

      // Sound update
      if (player.activeBiome) {
        sound.updateBiomeSounds(player.activeBiome.id);
      }
      
      updateInteractionPrompt();
    } else {
      // cinematic start-screen drift
      startScreenTime += 0.0016;
      const orbitRadius = 15.0;
      const startX = player.x + Math.sin(startScreenTime) * orbitRadius;
      const startZ = player.z + Math.cos(startScreenTime) * orbitRadius;
      
      camera3D.position.set(startX, player.y + 12.0, startZ);
      camera3D.lookAt(player.x, player.y, player.z);
    }

    // 3. Dynamic 3D Chunk Loading around player
    updateChunks();

    // 4. Update dynamic lighting & fog based on time
    updateSkyLighting();

    // 5. Update systems
    updateParticles3D();
    updateAnimals3D();

    // Drift clouds slowly (Genshin Impact style wind effect)
    if (cloudsGroup) {
      cloudsGroup.children.forEach(cloud => {
        cloud.position.x += 0.025; // Slow horizontal drift
        if (cloud.position.x > 320) {
          cloud.position.x = -320;
          cloud.position.z = -250 + Math.random() * 500; // randomize Z depth on wrap
        }
      });
    }

    // 6. Camera Orbit following player
    if (gameStarted) {
      // Calculate target camera coords relative to player position
      const targetCamX = player.x - Math.sin(player.cameraYaw) * Math.cos(player.cameraPitch) * player.cameraDistance;
      const targetCamZ = player.z - Math.cos(player.cameraYaw) * Math.cos(player.cameraPitch) * player.cameraDistance;
      const targetCamY = player.y + Math.sin(player.cameraPitch) * player.cameraDistance + 1.2; // vertical look height

      // Smoothly lerp camera position
      camera3D.position.x += (targetCamX - camera3D.position.x) * 0.1;
      camera3D.position.y += (targetCamY - camera3D.position.y) * 0.1;
      camera3D.position.z += (targetCamZ - camera3D.position.z) * 0.1;
      camera3D.lookAt(player.x, player.y + 0.8, player.z);
    }

    // 7. Render WebGL
    renderer.render(scene, camera3D);

    // 8. HUD & Mini map updates
    if (gameStarted) {
      renderMiniMap();
      updateHUD();
    }
  }

  requestAnimationFrame(gameLoop);
}

// Orbit the sun, change sky color, fog, and enable lantern at night
function updateSkyLighting() {
  const angle = (gameTime / 1440) * Math.PI * 2;
  
  // Orbit Sun in vertical circle
  sunLight.position.x = player.x + Math.sin(angle) * 80;
  sunLight.position.y = Math.cos(angle) * 80;
  sunLight.position.z = player.z + 20;

  // Determine light phase intensities
  let lightIntensity = 0;
  let skyColor = new THREE.Color('#030712');
  let fogColor = new THREE.Color('#030712');
  let sunColor = new THREE.Color('#fff7e6');
  
  let nightVal = 0;

  if (gameTime >= 360 && gameTime < 420) { // Dawn: 6am - 7am
    const factor = (gameTime - 360) / 60;
    lightIntensity = factor * 0.85;
    skyColor.setHSL(0.55, 0.6, 0.05 + factor * 0.15); // fade blue
    fogColor.setHSL(0.04, 0.6, 0.05 + factor * 0.1);  // fade warm orange
    sunColor.setHSL(0.08, 0.9, 0.7);
    nightVal = 1.0 - factor;
  }
  else if (gameTime >= 420 && gameTime < 1020) { // Day: 7am - 5pm
    lightIntensity = 1.15;
    skyColor.setRGB(0.14, 0.32, 0.52); // Brighter Sky Blue
    fogColor.setRGB(0.18, 0.4, 0.58);
    sunColor.setRGB(1.0, 0.99, 0.96);
    nightVal = 0;
  }
  else if (gameTime >= 1020 && gameTime < 1140) { // Dusk: 5pm - 7pm
    const factor = (gameTime - 1020) / 120;
    lightIntensity = 0.85 * (1.0 - factor);
    skyColor.setHSL(0.60, 0.5, 0.2 - factor * 0.18);
    fogColor.setHSL(0.02, 0.8, 0.15 - factor * 0.13); // Deep red/orange sunset
    sunColor.setRGB(1.0, 0.45, 0.15);
    nightVal = factor;
  }
  else { // Night: 7pm - 6am
    lightIntensity = 0;
    skyColor.setRGB(0.015, 0.015, 0.03); // Dark night
    fogColor.setRGB(0.015, 0.015, 0.03);
    nightVal = 1.0;
  }

  // Apply lighting details
  sunLight.intensity = lightIntensity;
  sunLight.color.copy(sunColor);
  scene.background.copy(skyColor);
  
  if (scene.fog) {
    scene.fog.color.copy(fogColor);
  }

  // Adjust point lantern source at night
  playerLantern.intensity = nightVal * 1.8;
  ambientLight.intensity = 0.2 + (1.0 - nightVal) * 0.45;

  // Animate Campfire flame mesh scale to flicker
  scene.traverse(child => {
    if (child.name === 'decor_campfire') {
      const fire = child.getObjectByName('fire');
      if (fire && fire.visible) {
        const flame = fire.getObjectByName('flame');
        const inner = fire.getObjectByName('innerFlame');
        const light = fire.getObjectByName('light');
        const flicker = 1.0 + Math.sin(performance.now() * 0.02 + child.position.x) * 0.08;
        
        if (flame) flame.scale.set(flicker, flicker, flicker);
        if (inner) inner.scale.set(flicker, flicker, flicker);
        if (light) light.intensity = flicker * 1.8;
      }
    }
  });
}

// Dynamically load chunks in a grid around player, disposing far ones
function updateChunks() {
  const worldSize = world.chunkWorldSize;
  const px = player.x;
  const pz = player.z;

  const currentCx = Math.floor(px / worldSize);
  const currentCz = Math.floor(pz / worldSize);

  const radius = 2; // radius chunks grid
  const loadedKeys = new Set();

  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const cx = currentCx + dx;
      const cz = currentCz + dz;
      
      const key = `${cx},${cz}`;
      loadedKeys.add(key);

      // Load chunk
      world.getChunk(cx, cz, scene);
    }
  }

  // Dispose far chunks to prevent WebGL memory limits
  world.chunkCache.forEach((chunk, key) => {
    if (!loadedKeys.has(key)) {
      const [cx, cz] = key.split(',').map(Number);
      // Remove mesh from scene
      if (chunk.group) {
        scene.remove(chunk.group);
        // Traverse and dispose geometries/materials
        chunk.group.traverse(child => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (child.material && child.material !== world.sharedMaterials[child.name]) {
              child.material.dispose();
            }
          }
        });
      }
      world.chunkCache.delete(key);
    }
  });
}

// 3D Particles updates
function updateParticles3D() {
  const bid = player.activeBiome ? player.activeBiome.id : 'plains';
  const countLimit = 120;

  // 1. Spawn particles around camera viewport frustum
  if (Math.random() < 0.35 && particles3D.length < countLimit) {
    let type = null;
    let color = 0xffffff;
    let size = 0.08;
    let vx = -0.05 + Math.random() * 0.1;
    let vy = -0.15;
    let vz = -0.05 + Math.random() * 0.1;

    if (bid === 'snowy_peak' || bid === 'tundra_forest' || bid === 'tundra_plain') {
      type = 'snow';
      size = 0.05 + Math.random() * 0.12;
      vy = -0.06 - Math.random() * 0.08;
    } else if (bid === 'desert' || bid === 'plateau') {
      type = 'dust';
      color = bid === 'desert' ? 0xdfc072 : 0xc96a3c;
      size = 0.04 + Math.random() * 0.06;
      vx = 0.15 + Math.random() * 0.15;
      vy = -0.02;
    } else if (bid === 'forest' || bid === 'dense_forest') {
      type = 'pollen';
      color = 0xa3e635; // lime green glow
      size = 0.04 + Math.random() * 0.04;
      vy = 0.02 + Math.random() * 0.04; // float upwards
      vx = -0.04 + Math.random() * 0.08;
      vz = -0.04 + Math.random() * 0.08;
    } else {
      type = 'firefly';
      color = 0xfef08a; // warm gold glow
      size = 0.03 + Math.random() * 0.04;
      vy = 0.01 + Math.random() * 0.03; // float upwards
      vx = -0.03 + Math.random() * 0.06;
      vz = -0.03 + Math.random() * 0.06;
    }

    if (type) {
      // Spawn particles around player
      const px = player.x - 15 + Math.random() * 30;
      const pz = player.z - 15 + Math.random() * 30;
      
      // Spawn falling weather high up, but rising pollen/fireflies near ground level
      let py = player.y + 12 + Math.random() * 6;
      if (type === 'pollen' || type === 'firefly') {
        py = player.y + 0.2 + Math.random() * 5.0;
      }

      // Simple low-poly sphere representing particle
      const pGeom = new THREE.BoxGeometry(size, size, size);
      const pMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.75 });
      const pMesh = new THREE.Mesh(pGeom, pMat);
      pMesh.position.set(px, py, pz);
      scene.add(pMesh);

      particles3D.push({
        mesh: pMesh,
        vx,
        vy,
        vz,
        type,
        timer: 160 + Math.random() * 120
      });
    }
  }

  // Campfire sparks particles
  scene.traverse(child => {
    if (child.name === 'decor_campfire') {
      const fire = child.getObjectByName('fire');
      if (fire && fire.visible && Math.random() < 0.15) {
        const px = child.position.x - 0.2 + Math.random() * 0.4;
        const pz = child.position.z - 0.2 + Math.random() * 0.4;
        const py = child.position.y + 0.4;

        const size = 0.04 + Math.random() * 0.05;
        const sparkGeom = new THREE.BoxGeometry(size, size, size);
        const sparkMat = new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xef4444 : 0xf97316 });
        const spark = new THREE.Mesh(sparkGeom, sparkMat);
        spark.position.set(px, py, pz);
        scene.add(spark);

        particles3D.push({
          mesh: spark,
          vx: -0.02 + Math.random() * 0.04,
          vy: 0.08 + Math.random() * 0.06,
          vz: -0.02 + Math.random() * 0.04,
          type: 'spark',
          timer: 30 + Math.random() * 30
        });
      }
    }
  });

  // Update existing particles
  for (let i = particles3D.length - 1; i >= 0; i--) {
    const p = particles3D[i];
    p.timer--;

    p.mesh.position.x += p.vx;
    p.mesh.position.y += p.vy;
    p.mesh.position.z += p.vz;

    if (p.type === 'leaf') {
      p.mesh.rotation.y += 0.03;
      p.mesh.rotation.x += 0.01;
    }

    if (p.timer <= 0 || p.mesh.position.y < world.getHeight(p.mesh.position.x, p.mesh.position.z)) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      particles3D.splice(i, 1);
    }
  }
}

// 3D Animals wander loops
function updateAnimals3D() {
  const targetCount = 10;
  
  // Filter out far ones
  animals3D = animals3D.filter(a => {
    const dist = Math.hypot(a.mesh.position.x - player.x, a.mesh.position.z - player.z);
    const keep = dist < 60;
    if (!keep) {
      scene.remove(a.mesh);
      a.mesh.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }
    return keep;
  });

  // Spawn new animals
  if (animals3D.length < targetCount && player.activeBiome) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 25 + Math.random() * 25;
    const sx = player.x + Math.sin(angle) * dist;
    const sz = player.z + Math.cos(angle) * dist;
    const sy = world.getHeight(sx, sz);

    // Determine type
    const info = world.getBiomeAt(sx, sz, sy);
    let type = 'deer';
    if (info.isWater) {
      type = 'fish';
    } else if (info.biome.id === 'desert') {
      type = 'camel';
    } else if (info.biome.id === 'snowy_peak' || info.biome.id === 'tundra_plain' || info.biome.id === 'tundra_forest') {
      type = Math.random() < 0.5 ? 'fox' : 'penguin';
    } else {
      // In plains, forests, plateaus, spawn cute capybaras!
      type = Math.random() < 0.6 ? 'capybara' : 'deer';
    }

    // Build 3D mesh model for animal
    const aMesh = create3DAnimalMesh(type);
    aMesh.position.set(sx, type === 'fish' ? -0.5 : sy, sz);
    scene.add(aMesh);

    animals3D.push({
      mesh: aMesh,
      type,
      targetX: sx,
      targetZ: sz,
      speed: type === 'fish' ? 0.05 : type === 'camel' ? 0.03 : type === 'penguin' ? 0.02 : type === 'capybara' ? 0.032 : 0.07,
      state: 'idle',
      timer: 60 + Math.random() * 180,
      frame: Math.random() * 100
    });
  }

  // Update AI movements
  animals3D.forEach(a => {
    a.timer--;
    a.frame += 0.15;

    if (a.state === 'idle') {
      if (a.timer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 12;
        a.targetX = a.mesh.position.x + Math.sin(angle) * dist;
        a.targetZ = a.mesh.position.z + Math.cos(angle) * dist;
        a.state = 'walk';
        a.timer = 120 + Math.random() * 180;
      }
    } else {
      const dx = a.targetX - a.mesh.position.x;
      const dz = a.targetZ - a.mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.5 || a.timer <= 0) {
        a.state = 'idle';
        a.timer = 60 + Math.random() * 120;
      } else {
        // Move towards target
        a.mesh.position.x += (dx / dist) * a.speed;
        a.mesh.position.z += (dz / dist) * a.speed;

        // Angle body towards movement heading
        a.mesh.rotation.y = Math.atan2(dx, dz);

        // Clamp height
        const gy = world.getHeight(a.mesh.position.x, a.mesh.position.z);
        a.mesh.position.y = a.type === 'fish' ? -0.5 : gy;

        // Bouncing walking anim
        if (a.type !== 'fish') {
          const bounce = Math.abs(Math.sin(a.frame * 0.8)) * 0.15;
          a.mesh.position.y += bounce;
        }
      }
    }
  });
}

// Assemble simple low poly animal models in 3D
function create3DAnimalMesh(type) {
  const group = new THREE.Group();
  group.name = `animal_${type}`;

  const mat = new THREE.MeshStandardMaterial({ flatShading: true });

  switch (type) {
    case 'deer': {
      mat.color.setHex(0xb45309);
      // body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.8), mat);
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);
      
      // neck/head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), mat);
      head.position.set(0, 0.85, 0.35);
      head.rotation.x = -0.3;
      head.castShadow = true;
      group.add(head);

      // horns
      const hornMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });
      const leftHorn = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), hornMat);
      leftHorn.position.set(-0.1, 1.1, 0.35);
      leftHorn.rotation.z = -0.35;
      group.add(leftHorn);
      
      const rightHorn = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), hornMat);
      rightHorn.position.set(0.1, 1.1, 0.35);
      rightHorn.rotation.z = 0.35;
      group.add(rightHorn);
      break;
    }
    case 'camel': {
      mat.color.setHex(0xd97706);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.9), mat);
      body.position.y = 0.6;
      body.castShadow = true;
      group.add(body);

      // hump
      const hump = new THREE.Mesh(new THREE.SphereGeometry(0.25, 4, 4), mat);
      hump.position.set(0, 0.9, 0);
      group.add(hump);

      // neck
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), mat);
      neck.position.set(0, 1.0, 0.42);
      neck.rotation.x = -0.5;
      group.add(neck);
      break;
    }
    case 'fox': {
      mat.color.setHex(0xea580c);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.6), mat);
      body.position.y = 0.3;
      body.castShadow = true;
      group.add(body);

      // tail
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.3), mat);
      tail.position.set(0, 0.35, -0.4);
      tail.rotation.x = -0.2;
      group.add(tail);
      break;
    }
    case 'penguin': {
      // black and white torso
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x0f172a, flatShading: true }));
      body.position.y = 0.25;
      group.add(body);

      const belly = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.35, 0.05), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
      belly.position.set(0, 0.2, 0.155);
      group.add(belly);

      const beak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.1), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
      beak.position.set(0, 0.42, 0.18);
      group.add(beak);
      break;
    }
    case 'capybara': {
      mat.color.setHex(0x854d0e); // Golden Brown
      
      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.65), mat);
      body.position.y = 0.26;
      body.castShadow = true;
      group.add(body);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.28), mat);
      head.position.set(0, 0.43, 0.31);
      head.castShadow = true;
      group.add(head);

      // Snout (slightly darker brown)
      const snoutMat = new THREE.MeshStandardMaterial({ color: 0x451a03, flatShading: true });
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.12), snoutMat);
      snout.position.set(0, 0.38, 0.47);
      group.add(snout);

      // Small Ears
      const earGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
      const leftEar = new THREE.Mesh(earGeo, mat);
      leftEar.position.set(-0.11, 0.52, 0.22);
      group.add(leftEar);
      
      const rightEar = new THREE.Mesh(earGeo, mat);
      rightEar.position.set(0.11, 0.52, 0.22);
      group.add(rightEar);
      break;
    }
    case 'fish': {
      mat.color.setHex(0x38bdf8);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.4), mat);
      group.add(body);
      break;
    }
  }

  return group;
}

// 2D Mini-map Rendering (preserves retro-compass overlay look)
function renderMiniMap() {
  const mapCanvas = document.getElementById('minimap-canvas');
  const mctx = mapCanvas.getContext('2d');
  
  if (mapCanvas.width !== 130) {
    mapCanvas.width = 130;
    mapCanvas.height = 130;
  }
  const cx = mapCanvas.width / 2;
  const cy = mapCanvas.height / 2;

  mctx.fillStyle = '#020617';
  mctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

  mctx.save();
  // Clip circular mini map
  mctx.beginPath();
  mctx.arc(cx, cy, 62, 0, Math.PI * 2);
  mctx.clip();

  const scale = 2.8; // px scale per unit
  const searchRadius = 22; // coordinates search radius

  // Convert player 3D coordinates to mini-map values
  const px = player.x;
  const pz = player.z;

  for (let dz = -searchRadius; dz <= searchRadius; dz += 2) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
      const wx = px + dx;
      const wz = pz + dz;

      const height = world.getHeight(wx, wz);
      const info = world.getBiomeAt(wx, wz, height);

      const mapX = cx + (wx - px) * scale;
      const mapY = cy + (wz - pz) * scale;

      mctx.fillStyle = info.biome.color;
      mctx.fillRect(mapX, mapY, scale * 2.1, scale * 2.1);
    }
  }

  // Blinking player dot in center
  mctx.fillStyle = '#ffffff';
  mctx.shadowColor = '#0ea5e9';
  mctx.shadowBlur = 4;
  mctx.beginPath();
  const blink = (performance.now() % 800) < 400;
  mctx.arc(cx, cy, blink ? 3 : 2, 0, Math.PI * 2);
  mctx.fill();

  mctx.restore();
}

// Interactive 2D Full Map Modal Panel
function renderFullMap() {
  const mCanvas = document.getElementById('fullmap-canvas');
  const mctx = mCanvas.getContext('2d');

  mctx.fillStyle = '#05070f';
  mctx.fillRect(0, 0, mCanvas.width, mCanvas.height);

  mctx.save();
  mctx.translate(mapOffset.x, mapOffset.y);
  mctx.scale(mapScale, mapScale);

  const fullTileSize = 6;
  const searchRadius = 120; // local rendering limits

  const px = Math.floor(player.x);
  const pz = Math.floor(player.z);

  for (let dz = -searchRadius; dz <= searchRadius; dz += 4) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += 4) {
      const wx = px + dx;
      const wz = pz + dz;

      const height = world.getHeight(wx, wz);
      const info = world.getBiomeAt(wx, wz, height);

      const x = (wx / 4) * fullTileSize;
      const y = (wz / 4) * fullTileSize;

      mctx.fillStyle = info.biome.color;
      mctx.fillRect(x, y, fullTileSize, fullTileSize);
    }
  }

  // Draw player marker
  const pMapX = (px / 4) * fullTileSize + fullTileSize / 2;
  const pMapY = (pz / 4) * fullTileSize + fullTileSize / 2;
  mctx.fillStyle = '#ffffff';
  mctx.shadowColor = '#0ea5e9';
  mctx.shadowBlur = 6;
  mctx.beginPath();
  const blink = (performance.now() % 600) < 300;
  mctx.arc(pMapX, pMapY, blink ? 4.5 : 3.0, 0, Math.PI * 2);
  mctx.fill();

  mctx.restore();
}

// Check if player stands next to interactive campsite campfires or chests
function updateInteractionPrompt() {
  const px = player.x;
  const pz = player.z;

  let nearInteractive = null;
  let nearMesh = null;

  // Query nearby active chunks mesh groups for interaction userData
  const cx = Math.floor(px / world.chunkWorldSize);
  const cz = Math.floor(pz / world.chunkWorldSize);

  for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      const chunk = world.chunkCache.get(`${cx + offsetX},${cz + offsetZ}`);
      if (!chunk || !chunk.group) continue;

      chunk.group.children.forEach(child => {
        if (child.name.startsWith('decor_') && child.userData.interactive) {
          const data = child.userData;
          const dist = Math.hypot(px - data.wx, pz - data.wz);
          if (dist < 2.0) {
            nearInteractive = data;
            nearMesh = child;
          }
        }
      });
    }
  }

  const prompt = document.getElementById('interaction-prompt');
  if (nearInteractive) {
    if (nearInteractive.action === 'openChest' && !world.openedChests.has(nearInteractive.chestId)) {
      prompt.innerHTML = `<strong>E</strong> Open Chest`;
      prompt.classList.add('show');
      
      // Hook keypress to update model mesh lid immediately
      if (keys['e']) {
        world.openedChests.add(nearInteractive.chestId);
        // Animate lid tilting
        const lid = nearMesh.getObjectByName('lid');
        if (lid) {
          lid.position.set(0, 0.7, -0.2);
          lid.rotation.x = -Math.PI / 4;
        }
        
        const relic = player.collectRelic();
        if (relic) {
          triggerNotification(`✨ Found Relic: ${relic.name}!`);
        } else {
          triggerNotification(`🪙 The chest was empty...`);
        }
      }
    } else if (nearInteractive.action === 'interactCampfire') {
      const lit = world.litCampfires.has(nearInteractive.campfireId);
      prompt.innerHTML = `<strong>E</strong> ${lit ? 'Extinguish' : 'Light'} Fire`;
      prompt.classList.add('show');

      if (keys['e']) {
        // Prevent key spamming by adding delay or checking keys releases, let's toggle state
        keys['e'] = false; // consume input
        const fire = nearMesh.getObjectByName('fire');
        if (lit) {
          world.litCampfires.delete(nearInteractive.campfireId);
          if (fire) fire.visible = false;
          triggerNotification(`🔥 Extinguished the campfire.`);
        } else {
          world.litCampfires.add(nearInteractive.campfireId);
          if (fire) fire.visible = true;
          triggerNotification(`🔥 Ignited the campfire.`);
        }
      }
    }
  } else {
    if (prompt.innerText.includes('E ')) {
      prompt.classList.remove('show');
    }
  }
}

// Interaction check on E trigger (backup fallback)
function handleInteraction() {
  // handled inside updateInteractionPrompt in 3D to keep model updates simple
}

// In-game text notifications
function triggerNotification(text) {
  let prompt = document.getElementById('interaction-prompt');
  prompt.innerHTML = text;
  prompt.classList.add('show');
  setTimeout(() => {
    prompt.classList.remove('show');
  }, 3500);
}

// HUD panel UI details
function updateHUD() {
  const clock = document.getElementById('clock-time');
  const hours = Math.floor(gameTime / 60);
  const mins = Math.floor(gameTime % 60);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMins = mins < 10 ? '0' + mins : mins;
  clock.innerText = `${displayHours}:${displayMins} ${ampm}`;
  
  const timeIcon = document.getElementById('time-icon');
  if (gameTime >= 360 && gameTime < 1020) { // Day
    timeIcon.style.backgroundColor = '#fbbf24';
    timeIcon.style.boxShadow = '0 0 8px #fbbf24';
  } else { // Night
    timeIcon.style.backgroundColor = '#818cf8';
    timeIcon.style.boxShadow = '0 0 8px #818cf8';
  }

  // Coordinates
  const pX = Math.floor(player.x);
  const pZ = Math.floor(player.z);
  document.getElementById('coords-text').innerText = `${pX} X, ${pZ} Z`;

  // Biome name
  if (player.activeBiome) {
    document.getElementById('biome-value').innerText = player.activeBiome.name;
    document.getElementById('biome-value').style.color = player.activeBiome.color;
  }
}

// Open / Close Journal Overlay
function toggleJournal() {
  if (mapOpen) toggleFullMap();
  const journal = document.getElementById('journal-screen');
  journal.classList.toggle('active');
  
  if (journal.classList.contains('active')) {
    const activeTab = document.querySelector('.tab-btn.active');
    const tabName = activeTab ? activeTab.dataset.tab : 'relics';
    if (tabName === 'relics') populateRelicsUI();
    if (tabName === 'discoveries') populateDiscoveriesUI();
    if (tabName === 'stats') populateStatsUI();
  }
}

// Open / Close Full screen Map
function toggleFullMap() {
  const overlay = document.getElementById('fullmap-screen');
  mapOpen = !mapOpen;
  
  if (mapOpen) {
    if (document.getElementById('journal-screen').classList.contains('active')) {
      toggleJournal();
    }
    overlay.classList.add('active');
    mapScale = 1.0;
    
    // Center map around player
    mapOffset.x = window.innerWidth * 0.85 / 2 - (player.x / 4) * 6 * mapScale;
    mapOffset.y = window.innerHeight * 0.8 / 2 - (player.z / 4) * 6 * mapScale;
    
    const mapCanvas = document.getElementById('fullmap-canvas');
    mapCanvas.width = mapCanvas.parentElement.clientWidth;
    mapCanvas.height = mapCanvas.parentElement.clientHeight;
    
    renderFullMap();
  } else {
    overlay.classList.remove('active');
  }
}

// Populate journal: Relics list
function populateRelicsUI() {
  const grid = document.querySelector('.relics-grid');
  grid.innerHTML = '';
  player.relicPool.forEach(relic => {
    const isCollected = player.relics.some(r => r.id === relic.id);
    const slot = document.createElement('div');
    slot.className = `relic-slot ${isCollected ? 'discovered' : ''}`;
    
    const icons = {
      compass: '🧭',
      sunstone: '☀️',
      fossil: '🌿',
      scarab: '🪲',
      acorn: '🌰',
      hourglass: '⏳',
      tablet: '📜',
      trident: '🔱',
      amethyst: '🔮',
      diary: '📔'
    };

    slot.innerHTML = `
      <div class="relic-icon-wrap">${isCollected ? icons[relic.id] : '❓'}</div>
      <div class="relic-name">${isCollected ? relic.name : 'Unknown Artifact'}</div>
      ${isCollected ? `<div class="tooltip"><strong>${relic.name}</strong><br>${relic.desc}</div>` : ''}
    `;
    grid.appendChild(slot);
  });
}

// Populate journal: Biome checklist
function populateDiscoveriesUI() {
  const list = document.querySelector('.discoveries-list');
  list.innerHTML = '';
  Object.values(BIOMES).forEach(biome => {
    if (biome.id === 'river' || biome.id === 'lake') return;
    const isDiscovered = player.discoveredBiomes.has(biome.id);
    const item = document.createElement('div');
    item.className = `discovery-item ${isDiscovered ? '' : 'undiscovered'}`;
    item.innerHTML = `
      <div class="discovery-color" style="background-color: ${isDiscovered ? biome.color : '#1e293b'}"></div>
      <div class="discovery-name">${isDiscovered ? biome.name : 'Unexplored Terrain'}</div>
      <div class="discovery-status">${isDiscovered ? 'Discovered' : 'Locked'}</div>
    `;
    list.appendChild(item);
  });
}

// Populate journal: Stats
function populateStatsUI() {
  document.getElementById('stat-steps').innerText = player.totalSteps.toLocaleString();
  document.getElementById('stat-relics').innerText = `${player.relics.length} / ${player.relicPool.length}`;
  document.getElementById('stat-biomes').innerText = `${player.discoveredBiomes.size} / ${Object.keys(BIOMES).length - 2}`;
  
  const coordinateText = `${Math.floor(player.x)} X, ${Math.floor(player.z)} Z`;
  document.getElementById('stat-coords').innerText = coordinateText;
}

// Toggle sound control button styling
function updateAudioBtnUI() {
  const btn = document.getElementById('audio-toggle');
  if (sound.muted) {
    btn.innerHTML = '🔇';
    btn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    btn.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.2)';
  } else {
    btn.innerHTML = '🔊';
    btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    btn.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.2)';
  }
}

// Biome Discovery Pop-up banner
function showBiomePopup(biome) {
  const popup = document.getElementById('biome-popup');
  const nameSpan = popup.querySelector('.popup-name');
  nameSpan.innerText = biome.name;
  nameSpan.style.color = biome.color;
  popup.style.borderColor = biome.color;
  popup.style.boxShadow = `0 10px 25px rgba(0, 0, 0, 0.4), 0 0 20px ${biome.color}50`;
  popup.classList.add('show');
  
  setTimeout(() => {
    popup.classList.remove('show');
  }, 4000);
}
