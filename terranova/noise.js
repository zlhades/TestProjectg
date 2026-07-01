/**
 * A seedable 2D Simplex Noise implementation.
 * Based on the classic paper by Ken Perlin and popular Simplex Noise implementations.
 */

// A simple seedable PRNG (Mulberry32)
function createPRNG(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class SimplexNoise {
  constructor(seed = Math.random()) {
    // Convert string seed to numeric if necessary
    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      seed = hash;
    }

    const random = createPRNG(seed);

    // Skewing and unskewing factors for 2 dimensions
    this.F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    this.G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    // Permutation table (256 values, duplicated to avoid buffer overflow)
    this.p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    // Shuffle permutation table using the seedable PRNG
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const temp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = temp;
    }

    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = (this.perm[i] % 12);
    }

    // Gradients for 2D Simplex Noise (12 directions)
    this.grad3 = new Float32Array([
      1, 1,  -1, 1,  1,-1,  -1,-1,
      1, 0,  -1, 0,  1, 0,  -1, 0,
      0, 1,   0,-1,  0, 1,   0,-1
    ]);
  }

  // Calculate 2D Simplex Noise at coordinates (xin, yin)
  // Returns values in the range [-1, 1]
  noise2D(xin, yin) {
    let n0, n1, n2; // Noise contributions from the three corners

    // Skew the input space to determine which simplex cell we're in
    const s = (xin + yin) * this.F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);

    const t = (i + j) * this.G2;
    const X0 = i - t; // Unskew the cell origin back to (x,y) space
    const Y0 = j - t;
    const x0 = xin - X0; // The x,y distances from the cell origin
    const y0 = yin - Y0;

    // For 2D, the simplex shape is an equilateral triangle.
    // Determine which simplex we are in.
    let i1, j1; // Offsets for second corner of simplex in (i,j) coords
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else { // x0 <= y0
      i1 = 0;
      j1 = 1;
    }

    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where c = G2
    const x1 = x0 - i1 + this.G2; // Offsets for middle corner in (x,y) unskewed coords
    const y1 = y0 - j1 + this.G2;
    const x2 = x0 - 1.0 + 2.0 * this.G2; // Offsets for last corner in (x,y) unskewed coords
    const y2 = y0 - 1.0 + 2.0 * this.G2;

    // Work out the hashed gradient indices of the three simplex corners
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    // Calculate the contribution from the three corners
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * (this.grad3[gi0 * 2] * x0 + this.grad3[gi0 * 2 + 1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * (this.grad3[gi1 * 2] * x1 + this.grad3[gi1 * 2 + 1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * (this.grad3[gi2 * 2] * x2 + this.grad3[gi2 * 2 + 1] * y2);
    }

    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1, 1].
    return 70.0 * (n0 + n1 + n2);
  }

  // Fractional Brownian Motion (fBm) for multi-octave noise
  fBm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0; // Used for normalizing the result

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}
