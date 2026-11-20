import * as THREE from 'three';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { createCelestialEffects } from './celestial.js?v=20261121-posts-performance';
import { ViewControls } from './view-controls.js';
import { createSolarSystem, loadSolarModels } from './solar-system.js?v=20261121-posts-performance';

const RADIUS = 2.2;
const ORBIT = RADIUS * 51149 / 25559;
const FLATTENING = 24973 / 25559;
const OBLIQUITY = THREE.MathUtils.degToRad(97.77);
const AZIMUTH = THREE.MathUtils.degToRad(33);
const AXIS = new THREE.Vector3(Math.sin(OBLIQUITY) * Math.cos(AZIMUTH), Math.cos(OBLIQUITY), Math.sin(OBLIQUITY) * Math.sin(AZIMUTH));

const vertex = `
  varying vec3 vNormal, vWorld, vLocal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vLocal = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const ringDensity = `
  float band(float r, float at, float width) {
    float aa = max(fwidth(r) * .65, .0005);
    float coverage = 1. - smoothstep(max(0., width - aa), width + aa, abs(r - at));
    return coverage * min(1., width / aa * 1.4);
  }
  float ringDensity(float r) {
    float density = .82 * band(r, ${ORBIT.toFixed(5)}, .024);
    ${[41837, 42234, 42571, 44718, 45661, 47176, 47627, 48300, 50024].map((km, i) => `density += ${(.065 + i * .014).toFixed(3)} * band(r, ${(RADIUS * km / 25559).toFixed(5)}, .006);`).join('\n    ')}
    density += .008 * smoothstep(3.34, 3.60, r) * (1. - smoothstep(4.40, 4.46, r));
    return clamp(density, 0., .91);
  }
`;

export async function createUniverse({ canvas, sections, getState, onOpen, onTop, onFallback }) {
  // Scene edges are antialiased in the multisample render target. The canvas receives a full-screen pass.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 700 ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const loader = new THREE.TextureLoader();
  async function texture(name, color = false, atlas = false) {
    const url = `/space/textures/${name}`;
    let bitmap;
    if (typeof createImageBitmap === 'function') {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load texture ${name}`);
      const blob = await response.blob();
      // Prepare the bitmap before WebGL's first synchronous texture upload.
      bitmap = await createImageBitmap(blob, {
        imageOrientation: atlas ? 'from-image' : 'flipY',
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      }).catch(() => null);
    }
    const map = bitmap ? new THREE.Texture(bitmap) : await loader.loadAsync(url);
    map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    map.flipY = !atlas && !bitmap;
    if (!atlas) map.wrapS = THREE.RepeatWrapping;
    if (bitmap) map.needsUpdate = true;
    return map;
  }
  const [clouds, space, solarModels, ...moonMaps] = await Promise.all([
    texture('uranus-clouds.webp', true), texture('deep-space.webp', true), loadSolarModels(texture),
    ...[0, 1, 2, 3].flatMap(index => [texture(`moon-${index}-color.webp`, true), texture(`moon-${index}-normal.webp`), texture(`moon-${index}-height.webp`)]),
  ]);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10181b');
  const streakScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 220);
  const homeLook = new THREE.Vector3();
  const homeCamera = new THREE.Vector3();
  const system = new THREE.Group();
  scene.add(system);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(125, 48, 32), new THREE.ShaderMaterial({
    uniforms: { dustMap: { value: space } },
    vertexShader: vertex,
    fragmentShader: `
      uniform sampler2D dustMap;
      varying vec2 vUv;
      varying vec3 vLocal;
      void main() {
        vec2 dx = vec2(.008, 0.), dy = vec2(0., .008);
        vec3 dust = texture2D(dustMap, vUv).rgb * .40;
        dust += (texture2D(dustMap, vUv + dx).rgb + texture2D(dustMap, vUv - dx).rgb
          + texture2D(dustMap, vUv + dy).rgb + texture2D(dustMap, vUv - dy).rgb) * .15;
        vec3 direction = normalize(vLocal);
        float haze = .5 + .5 * dot(direction, normalize(vec3(.40, .21, -.73)));
        vec3 color = mix(vec3(.011, .018, .020), vec3(.022, .031, .034), haze);
        gl_FragColor = vec4(color + dust * vec3(.40, .62, .70), 1.);
      }
    `,
    side: THREE.BackSide, depthWrite: false,
  }));
  sky.rotation.z = -.3;
  sky.renderOrder = -100;
  scene.add(sky);
  const solarSky = createSolarSystem(scene);
  solarSky.addModels(solarModels);
  const SUN = solarSky.sunDirection;

  const sunlight = new THREE.DirectionalLight('#fff5e7', 2.0);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  sunlight.shadow.bias = -.00015;
  sunlight.shadow.normalBias = .014;
  sunlight.shadow.radius = 2;
  scene.add(sunlight, sunlight.target);
  scene.add(new THREE.HemisphereLight('#e0fff0', '#79778b', 1.43));
  const planetShine = new THREE.PointLight('#4c9eaa', 1.5, 12, 2);
  system.add(planetShine);

  const center = new THREE.Vector3();
  const planetUniforms = {
    cloudMap: { value: clouds }, time: { value: 0 }, sun: { value: SUN },
    planetCenter: { value: center }, worldRadius: { value: RADIUS }, ringAxis: { value: AXIS },
    impactDirection: { value: new THREE.Vector3(0, 0, 1) }, impactAge: { value: 100 },
    moonCenters: { value: [] }, moonRadii: { value: new Float32Array(4) },
  };
  const gas = new THREE.ShaderMaterial({
    uniforms: planetUniforms,
    vertexShader: vertex,
    fragmentShader: `
      uniform sampler2D cloudMap;
      uniform float time, worldRadius;
      uniform vec3 sun, planetCenter, ringAxis;
      uniform vec3 impactDirection;
      uniform float impactAge;
      uniform vec3 moonCenters[4];
      uniform float moonRadii[4];
      varying vec3 vNormal, vWorld;
      varying vec2 vUv;
      ${ringDensity}
      void main() {
        vec3 n = normalize(vNormal), eye = normalize(cameraPosition - vWorld);
        vec3 viewNormal = mat3(viewMatrix) * n;
        vec2 uv = vUv + vec2(time * .0008, 0.);
        float clouds = texture2D(cloudMap, uv).g;
        // Reference colors expressed as linear light for the final ACES pass.
        // Use the viewing angle so the teal and slate blend holds as the camera orbits.
        float across = viewNormal.x;
        vec3 palette = mix(vec3(.002, .660, .430), vec3(.127, .357, .378), smoothstep(-.49, .04, across));
        palette = mix(palette, vec3(.158, .228, .275), smoothstep(-.04, .50, across));
        palette = mix(palette, vec3(.113, .139, .168), smoothstep(.30, .87, across));
        float daylight = max(dot(n, sun), 0.);
        float denominator = dot(sun, ringAxis);
        float safeDenominator = (denominator < 0. ? -1. : 1.) * max(abs(denominator), .001);
        float hit = -dot(vWorld - planetCenter, ringAxis) / safeDenominator;
        float radius = length(vWorld - planetCenter + sun * hit) * ${RADIUS.toFixed(1)} / worldRadius;
        // Ring antialiasing samples neighboring fragments, including those outside the shadow.
        float ringShadow = ringDensity(radius) * step(0., hit) * smoothstep(.001, .004, abs(denominator));
        float facing = max(dot(n, eye), 0.);
        float volume = .73 + .19 * smoothstep(-.91, .38, viewNormal.y) + .12 * sqrt(facing);
        float cloudDetail = 1. + (clouds - .397) * 1.25;
        vec3 color = palette * volume * cloudDetail * (.98 + .04 * daylight) * (1. - .069 * ringShadow);
        float moonShade = 0.;
        for (int i = 0; i < 4; i++) {
          vec3 toMoon = moonCenters[i] - vWorld;
          float along = dot(toMoon, sun);
          float distance = length(toMoon - sun * along);
          float penumbra = moonRadii[i] * .40 + max(along, 0.) * .019;
          float cover = 1. - smoothstep(moonRadii[i] * .55, moonRadii[i] + penumbra, distance);
          moonShade = max(moonShade, cover * step(.01, along));
        }
        color *= 1. - moonShade * daylight * .24;
        float impactDistance = length(normalize(vWorld - planetCenter) - impactDirection);
        float hot = exp(-impactDistance * impactDistance / (.003 + min(impactAge, 5.) * .003));
        color += vec3(5., 1.4, .24) * hot * exp(-impactAge * 1.9);
        gl_FragColor = vec4(color, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const planetAxis = new THREE.Group();
  planetAxis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), AXIS);
  const planetGeometry = new THREE.SphereGeometry(RADIUS, 256, 192);
  planetGeometry.scale(1, FLATTENING, 1);
  const planet = new THREE.Mesh(planetGeometry, gas);
  planet.castShadow = true;
  planetAxis.add(planet);
  system.add(planetAxis);

  // A single plane owns both the visible rings and the satellites' circular orbits.
  const orbitalPlane = new THREE.Group();
  orbitalPlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), AXIS);
  system.add(orbitalPlane);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.32, 4.46, 768, 2), new THREE.ShaderMaterial({
    uniforms: { sun: { value: SUN }, planetCenter: { value: center }, worldRadius: { value: RADIUS }, axis: { value: AXIS } },
    vertexShader: vertex,
    fragmentShader: `
      uniform vec3 sun, planetCenter, axis;
      uniform float worldRadius;
      varying vec3 vWorld, vLocal;
      ${ringDensity}
      void main() {
        float radius = length(vLocal.xy);
        float density = ringDensity(radius);
        vec3 p = vWorld - planetCenter;
        float along = dot(p, sun), closest = length(p - sun * along);
        float shadow = along < 0. ? smoothstep(worldRadius * .97, worldRadius * 1.025, closest) : 1.;
        vec3 eye = normalize(cameraPosition - vWorld);
        float forward = .70 + .50 * pow(max(dot(-sun, eye), 0.), 6.);
        float facing = .28 + .55 * abs(dot(axis, sun));
        float grit = fract(sin(dot(vLocal.xy, vec2(873.27, 127.18))) * 43928.24);
        vec3 color = vec3(.30, .31, .32) * forward * facing * (.035 + shadow * 1.8);
        color *= .85 + grit * .25;
        gl_FragColor = vec4(color, density);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  }));
  ring.renderOrder = 20;
  orbitalPlane.add(ring);

  let seed = 31916;
  function random() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
  const dustPositions = [];
  for (let i = 0; i < 6000; i++) {
    const angle = random() * Math.PI * 2;
    const radius = ORBIT + (random() + random() - 1) * .065;
    dustPositions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, (random() - .5) * .014);
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
  const ringDust = new THREE.Points(dustGeometry, new THREE.ShaderMaterial({
    vertexShader: `varying float coverage; void main() { vec4 p = modelViewMatrix * vec4(position, 1.); float size = .65 / max(-p.z, .5); gl_PointSize = max(size, 1.); coverage = min(1., size * size); gl_Position = projectionMatrix * p; }`,
    fragmentShader: `varying float coverage; void main() { float dot = 1. - smoothstep(.1, .5, length(gl_PointCoord - .5)); gl_FragColor = vec4(.30, .34, .39, dot * coverage * .12); }`,
    transparent: true, depthWrite: false,
  }));
  ringDust.renderOrder = 21;
  orbitalPlane.add(ringDust);

  // Instanced solid geometry stays detailed when the camera approaches the rings.
  const rubbleMaterial = new THREE.MeshStandardMaterial({ color: '#8e9892', normalMap: moonMaps[1], roughness: .96 });
  const rubble = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), rubbleMaterial, 8192);
  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), rubbleMaterial, 128);
  const pebbleTransform = new THREE.Object3D();
  for (const field of [rubble, pebbles]) {
    field.receiveShadow = true;
    field.frustumCulled = false;
    for (let i = 0; i < field.count; i++) {
      const angle = random() * Math.PI * 2;
      const radius = field === pebbles || random() < .65 ? ORBIT + (random() - .5) * .12 : 3.34 + random() * (ORBIT - 3.34);
      const size = field === pebbles ? .018 + random() * .030 : .002 + random() ** 2 * .010;
      pebbleTransform.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (random() - .5) * .025);
      pebbleTransform.rotation.set(random() * 6.28, random() * 6.28, random() * 6.28);
      pebbleTransform.scale.set(size * (1 + random()), size * .6, size);
      pebbleTransform.updateMatrix();
      field.setMatrixAt(i, pebbleTransform.matrix);
    }
    orbitalPlane.add(field);
  }

  const moons = Object.entries(sections).map(([id, info], index) => {
    const [map, normalMap, displacementMap] = moonMaps.slice(index * 3, index * 3 + 3);
    const geometry = new THREE.SphereGeometry(info.size, 96, 64);
    const material = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: .09, map, normalMap, displacementMap, normalScale: new THREE.Vector2(.85, .85), displacementScale: .018, displacementBias: -.009, roughness: .72, metalness: .035 });
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 detail = texture2D(map, vMapUv);
          diffuseColor.rgb *= .84 + dot(detail.rgb, vec3(.3333)) * .70;
          diffuseColor.a *= detail.a;
        #endif
      `);
    };
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.section = id;
    orbitalPlane.add(mesh);
    const button = document.querySelector(`.satellite[data-section='${id}']`);
    return { id, ...info, mesh, world: new THREE.Vector3(), basePosition: new THREE.Vector3(), impactOffset: new THREE.Vector3(), button };
  });
  planetUniforms.moonCenters.value = moons.map(moon => moon.world);
  const effects = createCelestialEffects({ system, streakScene, orbitalPlane, moons, radius: RADIUS, orbit: ORBIT, uniforms: planetUniforms });

  const atmosphereUniforms = {
    center: { value: center }, radius: { value: RADIUS }, sun: { value: SUN }, axis: { value: AXIS },
    moonCenters: planetUniforms.moonCenters, moonRadii: planetUniforms.moonRadii,
  };
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.065, 128, 96), new THREE.ShaderMaterial({
    uniforms: atmosphereUniforms,
    vertexShader: vertex,
    fragmentShader: `
      uniform vec3 center, sun, moonCenters[4];
      uniform vec3 axis;
      uniform float radius, moonRadii[4];
      varying vec3 vWorld;
      vec2 sphere(vec3 origin, vec3 direction, float r) {
        float a = dot(direction, direction), b = dot(origin, direction), c = dot(origin, origin) - r * r;
        float d = b * b - a * c;
        if (d < 0.) return vec2(1e6, -1e6);
        return vec2(-b - sqrt(d), -b + sqrt(d)) / a;
      }
      vec3 oblate(vec3 point) { return point + axis * dot(point, axis) * ${(1 / FLATTENING - 1).toFixed(8)}; }
      void main() {
        vec3 ray = normalize(vWorld - cameraPosition), origin = cameraPosition - center;
        float outer = radius * 1.065;
        vec2 limits = sphere(oblate(origin), oblate(ray), outer);
        float start = max(limits.x, 0.), end = limits.y;
        vec2 ground = sphere(oblate(origin), oblate(ray), radius);
        if (ground.x > 0.) end = min(end, ground.x);
        for (int i = 0; i < 4; i++) {
          vec2 moon = sphere(cameraPosition - moonCenters[i], ray, moonRadii[i]);
          if (moon.x > 0.) end = min(end, moon.x);
        }
        if (end <= start) discard;
        float stepSize = (end - start) / 12.;
        float scaleHeight = radius * .012, opticalDepth = 0.;
        vec3 beta = vec3(3.2, 5.2, 6.0) / radius;
        vec3 light = vec3(0.);
        for (int i = 0; i < 12; i++) {
          vec3 point = origin + ray * (start + (float(i) + .5) * stepSize);
          float h = max(length(oblate(point)) - radius, 0.);
          float density = exp(-h / scaleHeight);
          opticalDepth += density * stepSize;
          vec2 sunGround = sphere(oblate(point), oblate(sun), radius);
          float direct = sunGround.x > .001 ? .003 : 1.;
          float mu = dot(normalize(point), sun);
          float sunDepth = density * scaleHeight / sqrt(mu * mu + .012);
          light += exp(-beta * (opticalDepth + sunDepth)) * density * stepSize * direct;
        }
        float angle = dot(ray, sun);
        float phase = .0596831 * (1. + angle * angle);
        float alpha = clamp(1. - exp(-opticalDepth * 4.3 / radius), 0., .86);
        vec3 radiance = light * beta * vec3(.79, .97, 1.) * phase * 5.3;
        gl_FragColor = vec4(radiance / max(alpha, .001), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, side: THREE.BackSide, depthWrite: false, depthTest: false,
  }));
  atmosphere.renderOrder = 10;
  atmosphere.geometry.scale(1, FLATTENING, 1);
  atmosphere.quaternion.copy(planetAxis.quaternion);
  system.add(atmosphere);

  const starCount = innerWidth < 701 ? 6500 : 12500;
  const starPositions = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starColors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const distance = 46 + random() * 75;
    const vertical = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const horizontal = Math.sqrt(1 - vertical * vertical) * distance;
    starPositions.set([Math.cos(angle) * horizontal, vertical * distance, Math.sin(angle) * horizontal], i * 3);
    starSizes[i] = .48 + Math.pow(random(), 7) * 2.55;
    const temperature = random();
    starColors.set(temperature < .2 ? [1., .75, .48] : temperature > .72 ? [.58, .76, 1.] : [.83, .89, 1.], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.ShaderMaterial({
    uniforms: { pixelRatio: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float size; attribute vec3 color; uniform float pixelRatio; varying vec3 starColor; varying float brightness; void main() { starColor = color; brightness = .085 + size * size * .092; vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_PointSize = (size + .8) * pixelRatio; }`,
    fragmentShader: `varying vec3 starColor; varying float brightness; void main() { float r = length(gl_PointCoord - .5); float core = exp(-r * r * 16.) * (1. - smoothstep(.26, .5, r)); gl_FragColor = vec4(starColor * brightness, core * .66); }`,
    transparent: true, depthWrite: false,
  })));

  const renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: innerWidth <= 700 ? 2 : 4 });
  const composer = new EffectComposer(renderer, renderTarget);
  // The final pass writes directly to the canvas. Its scratch buffer needs no depth or MSAA.
  composer.writeBuffer.samples = 0;
  composer.writeBuffer.depthBuffer = false;
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .24, .52, 1.15);
  for (const target of [bloom.renderTargetBright, ...bloom.renderTargetsHorizontal, ...bloom.renderTargetsVertical]) {
    target.depthBuffer = false;
  }
  composer.addPass(bloom);
  // Keep the streak out of the full-frame glow pass while preserving scene depth.
  const streakPass = new RenderPass(streakScene, camera);
  streakPass.clear = false;
  streakPass.enabled = false;
  composer.addPass(streakPass);
  const finish = new OutputPass();
  finish.needsSwap = false;
  finish.uniforms.resolution = { value: new THREE.Vector2() };
  finish.material.fragmentShader = finish.material.fragmentShader
    .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse; uniform vec2 resolution;')
    .replace('gl_FragColor = texture2D( tDiffuse, vUv );', `
      gl_FragColor = texture2D(tDiffuse, vUv);
      vec2 p = vUv - .5;
      gl_FragColor.rgb *= 1. - .22 * dot(p, p);
      float grain = fract(sin(dot(vUv * resolution, vec2(12.9898, 78.233))) * 43758.5453);
      gl_FragColor.rgb += (grain - .5) * .00065;
      gl_FragColor.a = 1.;
    `);
  composer.addPass(finish);

  let width = 0, height = 0, mobile = innerWidth <= 700, resizePending = false;
  let elapsed = 0, lastTime = 0, firstTime = null, hasEntered = false;
  let visible = !document.hidden, userControlled = false, interacting = false;
  const dragSurface = document.body;
  const dragStart = new THREE.Vector2();
  let dragged = false, pressedSatellite = null;
  let viewReturnStart = null;
  const returnOrientation = new THREE.Quaternion();
  const homeOrientation = new THREE.Quaternion();
  const homeLookMatrix = new THREE.Matrix4();
  const upright = new THREE.Vector3(0, 1, 0);

  // Filter UI controls before the scene receives the bubbling pointer event.
  dragSurface.addEventListener('pointerdown', event => {
    const state = getState();
    controls.enabled = state.entered && !state.selected && viewReturnStart === null &&
      !event.target.closest('a, select, input, textarea, label, dialog, button:not(.satellite)');
    if (!event.isPrimary) { dragged = true; return; }
    dragged = false;
    dragStart.set(event.clientX, event.clientY);
    pressedSatellite = controls.enabled ? event.target.closest('.satellite') : null;
  });
  const trackDrag = event => {
    if (event.isPrimary && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 6) dragged = true;
  };
  dragSurface.addEventListener('pointermove', trackDrag);
  dragSurface.addEventListener('pointerup', trackDrag);
  dragSurface.addEventListener('pointercancel', () => { dragged = true; pressedSatellite = null; });
  dragSurface.addEventListener('click', event => {
    if (event.detail && dragged) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  const controls = new ViewControls(camera, dragSurface);
  const projected = new THREE.Vector3();
  const languagePicker = document.querySelector('.masthead');
  let languageBounds;
  for (const moon of moons) moon.labelNudge = new THREE.Vector2();
  function measureLabels() {
    for (const moon of moons) {
      moon.halfWidth = moon.button.offsetWidth / 2;
      moon.halfHeight = moon.button.offsetHeight / 2;
    }
    languageBounds = languagePicker.getBoundingClientRect();
  }
  const labelObserver = new ResizeObserver(() => { measureLabels(); resizePending = true; });
  labelObserver.observe(languagePicker);
  for (const moon of moons) labelObserver.observe(moon.button);
  controls.addEventListener('start', () => {
    userControlled = true; interacting = true;
  });
  controls.addEventListener('end', () => { interacting = false; });

  function resetView() {
    returnOrientation.copy(camera.quaternion);
    controls.clearInertia();
    controls.enabled = false;
    userControlled = false;
    interacting = false;
    viewReturnStart = performance.now();
  }

  const fitCamera = new THREE.PerspectiveCamera();
  const fitPoint = new THREE.Vector3();
  function fitOrbit() {
    const margin = Math.max(24, Math.min(48, width * .06));
    const headerBottom = document.querySelector('.masthead').getBoundingClientRect().bottom;
    const top = Math.min(height * .4, headerBottom + 20);
    const availableHeight = Math.max(1, height - top - margin);
    const centerY = top + availableHeight / 2;
    camera.setViewOffset(width, height, 0, height / 2 - centerY, width, height);
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const usableRatio = Math.min((width - margin * 2) / height, availableHeight / height);
    const halfAngle = Math.atan(Math.tan(halfFov) * usableRatio);
    fitCamera.projectionMatrix.copy(camera.projectionMatrix);
    orbitalPlane.updateWorldMatrix(true, false);
    const radius = Math.max(...moons.map(moon => moon.size)) * system.scale.x;
    const samples = Array.from({ length: 72 }, (_, index) => orbitalPlane.localToWorld(
      new THREE.Vector3(ORBIT * Math.cos(index * Math.PI / 36), ORBIT * Math.sin(index * Math.PI / 36), 0),
    ));
    let near = 8;
    let far = (ORBIT * system.scale.x + radius + system.position.length()) / Math.sin(halfAngle) + 12;
    const edgeX = 1 - margin * 2 / width;
    const bottomY = margin * 2 / height - 1;
    const topY = 1 - top * 2 / height;
    for (let iteration = 0; iteration < 18; iteration++) {
      const distance = (near + far) / 2;
      fitCamera.position.set(homeCamera.x, homeCamera.y, distance);
      fitCamera.lookAt(homeLook);
      fitCamera.updateMatrixWorld();
      const fits = samples.every(position => {
        fitPoint.copy(position).project(fitCamera);
        const depth = Math.max(1, distance - position.z - radius);
        const padding = radius / (depth * Math.tan(halfFov));
        return Math.abs(fitPoint.x) + padding / camera.aspect <= edgeX &&
          fitPoint.y - padding >= bottomY && fitPoint.y + padding <= topY;
      });
      if (fits) far = distance;
      else near = distance;
    }
    return far;
  }

  function resize() {
    resizePending = false;
    if (innerWidth !== width || innerHeight !== height) {
      width = innerWidth; height = innerHeight; mobile = width <= 700;
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      finish.uniforms.resolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
    }
    camera.aspect = width / height;
    camera.fov = mobile ? 44 : 38;
    camera.updateProjectionMatrix();
    measureLabels();
    solarSky.frame(camera.fov);
    homeCamera.set(0, mobile ? .1 : .25, 0);
    system.position.set(0, mobile ? -.15 : .10, 0);
    system.scale.setScalar(mobile ? .91 : 1.10);
    effects.resize(height);
    homeCamera.z = fitOrbit();
    controls.distance = homeCamera.length();
    system.getWorldPosition(center);
    planetUniforms.worldRadius.value = RADIUS * system.scale.x;
    ring.material.uniforms.worldRadius.value = RADIUS * system.scale.x;
    atmosphereUniforms.radius.value = RADIUS * system.scale.x;
    atmosphereUniforms.moonRadii.value.set(moons.map(moon => moon.size * system.scale.x));
    sunlight.target.position.copy(center);
    if (userControlled || viewReturnStart !== null) camera.position.setLength(controls.distance);
    else { camera.position.copy(homeCamera); camera.up.copy(upright); }
    camera.lookAt(homeLook);
  }
  resize();
  // Resize the canvas only when a new frame is about to be drawn.
  const scheduleResize = () => { resizePending = true; };
  addEventListener('resize', scheduleResize);
  document.addEventListener('fullscreenchange', scheduleResize);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; lastTime = 0; });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function setPointerRay(event) {
    pointer.set(event.clientX / width * 2 - 1, 1 - event.clientY / height * 2);
    raycaster.setFromCamera(pointer, camera);
  }
  canvas.addEventListener('pointermove', event => {
    if (!getState().entered || interacting || event.pointerType === 'touch') return;
    setPointerRay(event);
    canvas.dataset.overPlanet = String(raycaster.ray.distanceSqToPoint(center) < (RADIUS * system.scale.x) ** 2);
  });
  dragSurface.addEventListener('click', event => {
    if (event.target !== canvas && event.target !== dragSurface) return;
    if (event.detail && dragged) return;
    if (!getState().entered || getState().selected) return;
    // Pointer capture sends a label's click to the shared drag surface.
    if (pressedSatellite) {
      onOpen(pressedSatellite.dataset.section, pressedSatellite);
      pressedSatellite = null;
      return;
    }
    setPointerRay(event);
    const first = raycaster.intersectObjects([planet, ...moons.map(moon => moon.mesh)])[0];
    if (first?.object === planet) onTop();
    else if (first?.object.userData.section) {
      const moon = moons.find(item => item.id === first.object.userData.section);
      onOpen(moon.id, moon.button);
    }
  });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); renderer.setAnimationLoop(null); onFallback(); });

  function placeLabels(dt, reduced) {
    const clamp = THREE.MathUtils.clamp;
    const centerX = width / 2, centerY = height / 2;
    const projection = camera.projectionMatrix.elements;
    const layout = moons.map(moon => {
      projected.copy(moon.world).applyMatrix4(camera.matrixWorldInverse);
      // Keep the projected direction on the same side when a moon passes the near plane.
      const depth = Math.max(-projected.z, camera.near);
      const moonX = centerX * (1 + projected.x * projection[0] / depth);
      const moonY = centerY * (1 - projected.y * projection[5] / depth);
      const inDepth = -projected.z >= camera.near && -projected.z <= camera.far;
      const edgeDistance = Math.min(moonX, width - moonX, moonY, height - moonY);
      const { halfWidth, halfHeight } = moon;
      const insetX = Math.min(centerX, halfWidth + 6);
      const insetY = Math.min(centerY, halfHeight + 6);
      const rangeX = [insetX, width - insetX], rangeY = [insetY, height - insetY];
      const dx = moonX - centerX;
      let dy = moonY - centerY + (inDepth ? 34 * THREE.MathUtils.smoothstep(edgeDistance, 0, 65) : 0);
      if (!inDepth && dx === 0 && dy === 0) dy = -1;
      // Intersect the direction from the center with this label's safe rectangle.
      const stepX = dx === 0 ? Infinity : (centerX - insetX) / Math.abs(dx);
      const stepY = dy === 0 ? Infinity : (centerY - insetY) / Math.abs(dy);
      const step = Math.min(inDepth ? 1 : Infinity, stepX, stepY);
      const pin = step < 1 || !inDepth ? (stepX < stepY ? 'x' : 'y') : null;
      const x = centerX + dx * step, y = centerY + dy * step;
      return { moon, x, y, baseX: x, baseY: y, halfWidth, halfHeight, rangeX, rangeY, pin };
    });
    const menu = {
      x: languageBounds.x + languageBounds.width / 2,
      y: languageBounds.y + languageBounds.height / 2,
      halfWidth: languageBounds.width / 2,
      halfHeight: languageBounds.height / 2,
    };
    function separate(a, b) {
      const gapX = a.halfWidth + b.halfWidth + 4;
      const gapY = a.halfHeight + b.halfHeight + 4;
      if (Math.abs(a.x - b.x) >= gapX || Math.abs(a.y - b.y) >= gapY) return;
      const axes = a.pin === 'y' || b.pin === 'y' ? ['x', 'y'] : ['y', 'x'];
      for (const axis of axes) {
        const moveA = a.pin !== axis, moveB = b !== menu && b.pin !== axis;
        if (!moveA && !moveB) continue;
        const [range, gap] = axis === 'x' ? ['rangeX', gapX] : ['rangeY', gapY];
        const direction = b === menu ? (axis === 'x' ? -1 : 1) : a[axis] < b[axis] ? -1 : 1;
        const overlap = gap - direction * (a[axis] - b[axis]);
        const shift = overlap / (Number(moveA) + Number(moveB));
        const start = a[axis] - b[axis];
        if (moveA) a[axis] = clamp(a[axis] + direction * shift, ...a[range]);
        if (moveB) b[axis] = clamp(b[axis] - direction * shift, ...b[range]);
        if (Math.abs(a[axis] - b[axis] - start) > .01) break;
      }
    }
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < layout.length; i++) {
        for (let j = i + 1; j < layout.length; j++) separate(layout[i], layout[j]);
        separate(layout[i], menu);
      }
    }
    const easing = reduced ? 1 : 1 - Math.exp(-16 * dt);
    for (const { moon, x: targetX, y: targetY, baseX, baseY, rangeX, rangeY, pin } of layout) {
      const nudge = moon.labelNudge;
      nudge.x = pin === 'x' ? 0 : THREE.MathUtils.lerp(nudge.x, targetX - baseX, easing);
      nudge.y = pin === 'y' ? 0 : THREE.MathUtils.lerp(nudge.y, targetY - baseY, easing);
      const x = clamp(baseX + nudge.x, ...rangeX), y = clamp(baseY + nudge.y, ...rangeY);
      moon.button.style.left = `${x.toFixed(2)}px`;
      moon.button.style.top = `${y.toFixed(2)}px`;
    }
  }

  function draw(milliseconds) {
    if (!visible) return;
    const state = getState();
    if (!state.entered && document.body.classList.contains('ready')) return;
    // The moons are paused while reading. Keep drawing until the view and impact fade settle.
    if (state.selected && viewReturnStart === null && !resizePending && !effects.needsFrame) {
      lastTime = milliseconds / 1000;
      return;
    }
    const now = milliseconds / 1000;
    if (firstTime === null) firstTime = now;
    if (state.entered && !hasEntered) { hasEntered = true; firstTime = now; lastTime = now; }
    const rawDelta = lastTime ? now - lastTime : 1 / 60;
    const stable = !interacting && now - firstTime > 3;
    if (resizePending) resize();
    else if (lastTime && ((state.paused && stable && rawDelta < 1 / 20) || (mobile && rawDelta < 1 / 40))) return;
    const dt = Math.min(rawDelta, .2);
    lastTime = now;
    const moving = state.entered && !state.paused && !state.selected;
    if (moving) elapsed += dt;
    for (const moon of moons) {
      const angle = moon.phase + elapsed * .063;
      moon.basePosition.set(Math.cos(angle) * ORBIT, Math.sin(angle) * ORBIT, 0);
      moon.mesh.rotation.set(.08, elapsed * .045 + moon.phase, .15);
    }
    const scatter = effects.update(elapsed, moving ? dt : 0, performance.now());
    for (const moon of moons) {
      moon.mesh.position.copy(moon.basePosition).addScaledVector(moon.impactOffset, state.reduced ? 0 : scatter);
    }
    planet.rotation.y = elapsed * .018;
    rubble.rotation.z = elapsed * .048;
    pebbles.rotation.z = elapsed * .048;
    planetUniforms.time.value = elapsed;
    system.updateMatrixWorld(true);
    for (const moon of moons) moon.world.setFromMatrixPosition(moon.mesh.matrixWorld);

    if (viewReturnStart !== null) {
      const progress = state.reduced ? 1 : Math.min(1, (milliseconds - viewReturnStart) / 650);
      const eased = progress * progress * (3 - 2 * progress);
      homeLookMatrix.lookAt(homeCamera, homeLook, upright);
      homeOrientation.setFromRotationMatrix(homeLookMatrix);
      camera.quaternion.slerpQuaternions(returnOrientation, homeOrientation, eased);
      camera.position.set(0, 0, homeCamera.length()).applyQuaternion(camera.quaternion);
      camera.up.copy(upright).applyQuaternion(camera.quaternion);
      if (progress === 1) {
        camera.position.copy(homeCamera);
        camera.up.copy(upright);
        camera.lookAt(homeLook);
        viewReturnStart = null;
      }
    }
    controls.enabled = state.entered && !state.selected && viewReturnStart === null;
    if (controls.enabled && userControlled) controls.update(dt);
    camera.updateMatrixWorld();
    solarSky.update(state.paused ? 0 : now - firstTime, camera, controls.enabled && userControlled, dt);
    sunlight.position.copy(center).addScaledVector(SUN, 16);
    placeLabels(dt, state.reduced);
    streakPass.enabled = effects.streakVisible;
    composer.render();
    if (!document.body.classList.contains('ready')) {
      document.body.classList.add('ready');
      document.querySelector('#render-status').textContent = '';
    }
  }
  await new Promise(resolve => setTimeout(resolve, 0));
  // Warm the dormant streak shader separately. The first frame prepares the visible scene.
  renderer.setRenderTarget(composer.readBuffer);
  renderer.compile(streakScene, camera);
  renderer.setRenderTarget(null);
  draw(performance.now());
  renderer.setAnimationLoop(draw);
  return { resetView };
}
