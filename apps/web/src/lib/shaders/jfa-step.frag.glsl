precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_step_size;

varying vec2 v_texCoord;

vec2 decodeSeed(vec4 encoded) {
  float x = floor(encoded.r * 255.0 + 0.5) * 256.0 + floor(encoded.g * 255.0 + 0.5);
  float y = floor(encoded.b * 255.0 + 0.5) * 256.0 + floor(encoded.a * 255.0 + 0.5);
  return vec2(x, y);
}

vec4 encodeSeed(vec2 seed) {
  float xHi = floor(seed.x / 256.0);
  float xLo = seed.x - xHi * 256.0;
  float yHi = floor(seed.y / 256.0);
  float yLo = seed.y - yHi * 256.0;
  return vec4(xHi / 255.0, xLo / 255.0, yHi / 255.0, yLo / 255.0);
}

bool isNoSeed(vec4 encoded) {
  return encoded.r > 0.99 && encoded.g > 0.99 && encoded.b > 0.99 && encoded.a > 0.99;
}

void main() {
  vec2 pixelCoord = floor(v_texCoord * u_resolution);
  vec2 texelSize = 1.0 / u_resolution;

  float bestDist = 1e10;
  vec2 bestSeed = vec2(65535.0);

  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 offset = vec2(float(dx), float(dy)) * u_step_size;
      vec2 sampleUV = v_texCoord + offset * texelSize;

      if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0)
        continue;

      vec4 encoded = texture2D(u_texture, sampleUV);
      if (isNoSeed(encoded))
        continue;

      vec2 seed = decodeSeed(encoded);
      float dist = distance(pixelCoord, seed);
      if (dist < bestDist) {
        bestDist = dist;
        bestSeed = seed;
      }
    }
  }

  if (bestDist < 1e9) {
    gl_FragColor = encodeSeed(bestSeed);
  } else {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
}
