import * as THREE from 'three';
import { angularRadius, heliocentricPosition, planetaryOrbits, rotationInTurns, uranusOrbit } from './solar-orbits.js';

const skyDistance = 89;
const angularMagnification = 240;
const sun = { name: 'Sun', radius: 695700, spin: 25.38, tilt: 7.25 };
const bodies = [...planetaryOrbits, sun];
const earth = planetaryOrbits.find(planet => planet.name === 'Earth');
const jupiter = planetaryOrbits.find(planet => planet.name === 'Jupiter');
const atmospheres = {
  Venus: '#ffe1a3', Earth: '#62adff', Mars: '#edac80',
  Jupiter: '#efc5ad', Saturn: '#f0d9a5', Neptune: '#729dff',
};
const appearance = {
  Mercury: { tint: '#e7e1d6', saturation: .82, ambient: .12, halo: 0 },
  Venus: { tint: '#fff0d1', saturation: .72, ambient: .16, halo: .045 },
  Earth: { tint: '#f0f8ff', saturation: .92, ambient: .10, halo: .027 },
  Mars: { tint: '#f8dec8', saturation: .86, ambient: .11, halo: .018 },
  Jupiter: { tint: '#f8edda', saturation: .82, ambient: .14, halo: .018 },
  Saturn: { tint: '#fff1d7', saturation: .70, ambient: .16, halo: .023 },
  Neptune: { tint: '#c8e5ee', saturation: .76, ambient: .12, halo: .03 },
  Sun: { tint: '#fff0d4', saturation: .86, ambient: 0, halo: 0 },
};
const modelOrientation = { Neptune: Math.PI / 2, Sun: Math.PI / 2 };
const xAxis = new THREE.Vector3(1, 0, 0);
const yAxis = new THREE.Vector3(0, 1, 0);

async function loadGeometry(name, assets) {
  let bytes = assets?.buffer(`solar/${name}.bin`);
  if (!bytes) {
    const response = await fetch(`/space/textures/solar/${name}.bin`);
    if (!response.ok) throw new Error(`Could not load the ${name} model`);
    bytes = await response.arrayBuffer();
  }
  const [vertices, indices] = new Uint32Array(bytes, 0, 2);
  // Vertices retain the source glTF's face UVs. A spherical UV projection would
  // sample white gaps in the cube atlases.
  const data = new THREE.InterleavedBuffer(new Float32Array(bytes, 8, vertices * 8), 8);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(data, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(data, 3, 3));
  geometry.setAttribute('uv', new THREE.InterleavedBufferAttribute(data, 2, 6));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(bytes, 8 + vertices * 32, indices), 1));
  return geometry;
}

export async function loadSolarModels(texture, assets) {
  const models = bodies.map(async planet => {
    const file = planet.name.toLowerCase();
    const surfaceTask = texture(`solar/${file}.webp`, true, planet !== earth);
    const geometryTask = planet === earth
      // SphereGeometry's UVs follow Blue Marble's linear longitude and latitude.
      ? new THREE.SphereGeometry(1, 96, 64).scale(1, earth.flattening, 1)
      : loadGeometry(file, assets);
    const [geometry, surface] = await Promise.all([geometryTask, surfaceTask]);
    return { planet, geometry, surface };
  });
  const [planets, rings] = await Promise.all([Promise.all(models), texture('solar/saturn-rings.png', true, true)]);
  return { planets, rings };
}

const vertexShader = `
  varying vec3 vWorld, vNormal, vLocal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vLocal = position;
    vWorld = (modelMatrix * vec4(position, 1.)).xyz;
    vNormal = normalize((normalMatrix * normal) * mat3(viewMatrix));
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
  }
`;

const surfaceShader = `
  uniform sampler2D surface;
  uniform vec3 sunlight, atmosphere, tint;
  uniform float glow, opacity, textureBias, saturation, ambient;
  varying vec3 vWorld, vNormal;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 eye = normalize(cameraPosition - vWorld);
    float facing = clamp(dot(eye, n), 0., 1.);
    float daylight = max(dot(n, sunlight), 0.);
    float limb = pow(1. - facing, 3.);
    vec3 albedo = texture2D(surface, vUv, textureBias).rgb;
    float luminance = dot(albedo, vec3(.2126, .7152, .0722));
    albedo = mix(vec3(luminance), albedo, saturation) * tint;
    vec3 reflected = albedo * (ambient + .94 * pow(daylight, .78));
    reflected += atmosphere * limb * (.006 + .09 * sqrt(daylight));
    vec3 emitted = albedo * (1.65 + 1.5 * sqrt(facing)) * vec3(1.08, .96, .79);
    gl_FragColor = vec4(mix(reflected, emitted, glow), opacity);
  }
`;

const haloShader = `
  uniform vec3 atmosphere, sunlight;
  uniform float opacity;
  varying vec3 vWorld, vNormal;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 eye = normalize(cameraPosition - vWorld);
    float facing = abs(dot(eye, n));
    float rim = pow(1. - facing, 2.8);
    rim *= smoothstep(0., .12, facing);
    float daylight = max(dot(n, sunlight), 0.);
    float brightness = .035 + .30 * sqrt(daylight);
    gl_FragColor = vec4(atmosphere, rim * brightness * opacity);
  }
`;

const ringInner = 1.23221;
const ringOuter = 2.33073;

function saturnRings(texture, uniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, ringMap: { value: texture }, center: { value: new THREE.Vector3() } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader,
    fragmentShader: `
      uniform sampler2D ringMap;
      uniform vec3 sunlight, center;
      uniform float opacity;
      varying vec3 vLocal, vNormal, vWorld;
      void main() {
        float radius = length(vLocal.xy);
        vec4 band = texture2D(ringMap, vec2((radius - ${ringInner}) / ${ringOuter - ringInner}, .5));
        vec3 point = vWorld - center;
        float along = dot(point, sunlight);
        float miss = length(point - sunlight * along) * radius / length(point);
        float shadow = along < 0. ? smoothstep(.94, 1.06, miss) : 1.;
        float light = .12 + .82 * abs(dot(normalize(vNormal), sunlight));
        gl_FragColor = vec4(band.rgb * (light * shadow + .035), band.a * opacity);
      }
    `,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(ringInner, ringOuter, 192), material);
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 1;
  return ring;
}

export function createSolarSystem(scene) {
  let objects = [];
  const observer = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const skyRotation = new THREE.Quaternion();
  const sunDirection = new THREE.Vector3();
  const encounterTime = 75;
  const encounter = heliocentricPosition(jupiter, encounterTime).sub(heliocentricPosition(uranusOrbit, encounterTime));
  const yaw = new THREE.Quaternion().setFromAxisAngle(yAxis, Math.atan2(encounter.x, -encounter.z));
  const encounterAltitude = Math.atan2(encounter.y, Math.hypot(encounter.x, encounter.z));

  function addModels({ planets, rings }) {
    objects = planets.map(({ planet, geometry, surface }) => {
      const look = appearance[planet.name];
      const group = new THREE.Group();
      group.name = planet.name;
      group.visible = false;
      group.quaternion.copy(skyRotation);
      const skyPole = new THREE.Group();
      const spin = new THREE.Group();
      const uniforms = {
        surface: { value: surface },
        sunlight: { value: new THREE.Vector3() },
        atmosphere: { value: new THREE.Color(planet === sun ? '#f5c984' : atmospheres[planet.name] ?? '#000000') },
        tint: { value: new THREE.Color(look.tint) },
        saturation: { value: look.saturation },
        ambient: { value: look.ambient },
        glow: { value: Number(planet === sun) },
        opacity: { value: 0 },
        textureBias: { value: planet === earth ? 0 : Math.abs(planet.spin) < 2 ? .85 : .15 },
      };
      const body = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
        uniforms, vertexShader, fragmentShader: surfaceShader, transparent: true,
      }));
      body.rotation.x = modelOrientation[planet.name] ?? 0;
      // The NASA meshes already include each planet's polar flattening.
      spin.add(body);
      if (look.halo) {
        const halo = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
          uniforms, vertexShader, fragmentShader: haloShader,
          transparent: true, depthWrite: false, side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
        }));
        halo.rotation.copy(body.rotation);
        halo.scale.setScalar(1 + look.halo);
        spin.add(halo);
      }
      skyPole.rotation.z = THREE.MathUtils.degToRad(planet.tilt);
      skyPole.add(spin);
      const ring = planet.name === 'Saturn' ? saturnRings(rings, uniforms) : null;
      if (ring) skyPole.add(ring);
      group.add(skyPole);
      scene.add(group);
      return { planet, group, spin, ring, uniforms, position: new THREE.Vector3() };
    });
  }

  function frame(fov) {
    const revealAltitude = THREE.MathUtils.degToRad(fov / 2 + 2.8);
    skyRotation.setFromAxisAngle(xAxis, revealAltitude - encounterAltitude).multiply(yaw);
    for (const { group } of objects) group.quaternion.copy(skyRotation);
  }

  function update(seconds, camera, explored, delta) {
    heliocentricPosition(uranusOrbit, seconds, observer);
    sunDirection.copy(observer).negate().applyQuaternion(skyRotation).normalize();
    for (const { planet, group, position, spin, ring, uniforms } of objects) {
      const opacity = uniforms.opacity.value;
      uniforms.opacity.value = THREE.MathUtils.lerp(opacity, Number(explored), 1 - Math.exp(-delta * 4.5));
      group.visible = uniforms.opacity.value > .006;
      if (!group.visible) continue;
      if (planet !== sun) heliocentricPosition(planet, seconds, position);
      direction.subVectors(position, observer).applyQuaternion(skyRotation);
      const distance = direction.length();
      direction.divideScalar(distance);
      group.position.copy(camera.position).addScaledVector(direction, skyDistance);
      group.scale.setScalar(skyDistance * Math.tan(angularMagnification * angularRadius(planet.radius, distance)));
      spin.rotation.y = (rotationInTurns(planet, seconds) % 1) * Math.PI * 2;
      uniforms.sunlight.value.copy(position).negate().applyQuaternion(skyRotation).normalize();
      if (ring) ring.material.uniforms.center.value.copy(group.position);
    }
  }
  return { addModels, frame, update, sunDirection };
}
