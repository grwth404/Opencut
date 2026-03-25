precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_invert;

varying vec2 v_texCoord;

void main() {
  float mask = texture2D(u_texture, v_texCoord).r;
  bool isSeed = u_invert > 0.5 ? mask < 0.5 : mask > 0.5;

  if (isSeed) {
    vec2 pixelCoord = floor(v_texCoord * u_resolution);
    float x = pixelCoord.x;
    float y = pixelCoord.y;
    float xHi = floor(x / 256.0);
    float xLo = x - xHi * 256.0;
    float yHi = floor(y / 256.0);
    float yLo = y - yHi * 256.0;
    gl_FragColor = vec4(xHi / 255.0, xLo / 255.0, yHi / 255.0, yLo / 255.0);
  } else {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
}
