precision mediump float;

uniform sampler2D u_texture;
uniform sampler2D u_jfa_outside;
uniform vec2 u_resolution;
uniform float u_feather_half;

varying vec2 v_texCoord;

vec2 decodeSeed(vec4 encoded) {
  float x = floor(encoded.r * 255.0 + 0.5) * 256.0 + floor(encoded.g * 255.0 + 0.5);
  float y = floor(encoded.b * 255.0 + 0.5) * 256.0 + floor(encoded.a * 255.0 + 0.5);
  return vec2(x, y);
}

bool isNoSeed(vec4 encoded) {
  return encoded.r > 0.99 && encoded.g > 0.99 && encoded.b > 0.99 && encoded.a > 0.99;
}

void main() {
  vec2 pixelCoord = floor(v_texCoord * u_resolution);

  vec4 insideEncoded = texture2D(u_texture, v_texCoord);
  vec4 outsideEncoded = texture2D(u_jfa_outside, v_texCoord);

  bool hasInside = !isNoSeed(insideEncoded);
  bool hasOutside = !isNoSeed(outsideEncoded);

  float distToInside = hasInside ? distance(pixelCoord, decodeSeed(insideEncoded)) : 1e5;
  float distToOutside = hasOutside ? distance(pixelCoord, decodeSeed(outsideEncoded)) : 1e5;

  float signedDist = distToOutside - distToInside;
  float alpha = smoothstep(-u_feather_half, u_feather_half, signedDist);

  gl_FragColor = vec4(alpha, alpha, alpha, alpha);
}
