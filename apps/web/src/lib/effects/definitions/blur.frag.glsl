precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_sigma;
uniform float u_step;
uniform vec2 u_direction;

varying vec2 v_texCoord;

void main() {
  vec2 texelSize = 1.0 / u_resolution;

  vec4 color = vec4(0.0);
  float totalWeight = 0.0;

  for (int i = -30; i <= 30; i++) {
    float pos = float(i) * u_step;
    float weight = exp(-(pos * pos) / (2.0 * u_sigma * u_sigma));
    color += texture2D(u_texture, v_texCoord + texelSize * u_direction * pos) * weight;
    totalWeight += weight;
  }

  gl_FragColor = color / totalWeight;
}