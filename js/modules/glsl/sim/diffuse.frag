precision highp float;
uniform sampler2D density;
uniform sampler2D density_new;
uniform float v;
uniform vec2 px;
uniform float dt;

varying vec2 uv;

void main(){
    // poisson equation
    float old = texture2D(density, uv).r;
    float new0 = texture2D(density_new, uv + vec2(px.x , 0)).r;
    float new1 = texture2D(density_new, uv - vec2(px.x , 0)).r;
    float new2 = texture2D(density_new, uv + vec2(0, px.y )).r;
    float new3 = texture2D(density_new, uv - vec2(0, px.y )).r;

    float new = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
    new /= 4.0 * (1.0 + v * dt);
    
    gl_FragColor = vec4(new, 0.0, 0.0, 1.0);
}
