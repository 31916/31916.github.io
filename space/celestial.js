import * as THREE from 'three';

export function createCelestialEffects({ system, streakScene, orbitalPlane, moons, radius, orbit, uniforms }) {
  const gravity = .063 ** 2 * orbit ** 3;
  const recoveryTime = 6000;
  const streakLifetime = 2.6;
  const impactInterval = 10 * 60 * 1000;
  const approachDuration = 3000;
  const asteroidSize = .15;
  const approachStart = new THREE.Vector3(7.8, 4.4, 7.2);
  const approachDirection = new THREE.Vector3(1.3, .45, 1.5).sub(approachStart).normalize();
  const contact = new THREE.Ray(approachStart, approachDirection)
    .intersectSphere(new THREE.Sphere(new THREE.Vector3(), radius + asteroidSize), new THREE.Vector3());
  const impactPoint = contact.clone().setLength(radius);
  let nextImpact = null, incomingRock = null;
  let seed = 24131916, nextStreak = 6, nextCollision = 13;
  let lastImpact = -Infinity, lastFlash = -Infinity, flashStrength = 0, streakBorn = -Infinity;
  const rocks = [], pairs = [], bursts = [];
  const streakVelocity = new THREE.Vector3();
  const acceleration = new THREE.Vector3();
  const inversePlane = orbitalPlane.quaternion.clone().invert();
  const rockGeometry = new THREE.IcosahedronGeometry(1, 2);
  const attribute = rockGeometry.attributes.position;
  for (let i = 0; i < attribute.count; i++) {
    const x = attribute.getX(i), y = attribute.getY(i), z = attribute.getZ(i);
    const irregularity = .86 + .10 * Math.sin(x * 17 + y * 13) + .07 * Math.cos(z * 21 - x * 11);
    attribute.setXYZ(i, x * irregularity, y * irregularity, z * irregularity);
  }
  rockGeometry.computeVertexNormals();
  const rockMaterial = new THREE.MeshStandardMaterial({ map: moons[0].mesh.material.map, normalMap: moons[0].mesh.material.normalMap, roughness: .98, color: '#8a8580' });
  // Keep the number of shader lights fixed throughout impacts.
  const flash = new THREE.PointLight('#ffb773', 0, 8, 2);
  system.add(flash);
  const trailMaterial = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 }, viewportHeight: { value: 1 }, tint: { value: new THREE.Color('#b6dcf6') } },
    vertexShader: `
      uniform float viewportHeight;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 point = modelViewMatrix * vec4(position.x, 0., 0., 1.);
        float unitsPerPixel = 2. * max(.01, -point.z) / (projectionMatrix[1][1] * viewportHeight);
        point.xyz += normalize(modelViewMatrix[1].xyz) * position.y * 3.5 * unitsPerPixel;
        gl_Position = projectionMatrix * point;
      }
    `,
    fragmentShader: `
      uniform float opacity;
      uniform vec3 tint;
      varying vec2 vUv;
      void main() {
        float across = (vUv.y - .5) * 6.;
        float along = pow(max(vUv.x, 0.), 1.8) * (1. - smoothstep(.9, 1., vUv.x));
        gl_FragColor = vec4(tint, .65 * along * exp(-across * across) * opacity);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 1), trailMaterial);
  trail.visible = false;
  streakScene.add(trail);
  const transform = new THREE.Object3D();
  function random() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
  function gravityAt(position, target) {
    const distance = Math.max(position.length(), radius * .8);
    return target.copy(position).multiplyScalar(-gravity / distance ** 3);
  }
  function event(name) {
    document.body.dataset.celestialEvent = name;
    document.body.dataset.celestialEventCount = String(Number(document.body.dataset.celestialEventCount || 0) + 1);
  }
  function rockMesh(position, size) {
    const mesh = new THREE.Mesh(rockGeometry, rockMaterial.clone());
    mesh.scale.setScalar(size);
    mesh.position.copy(position);
    mesh.castShadow = true;
    system.add(mesh);
    return mesh;
  }
  function rock(position, velocity, size) {
    const item = { mesh: rockMesh(position, size), velocity, size, previous: position.clone(), age: 0, dead: false };
    rocks.push(item);
    return item;
  }
  function debris(position, time, now, atmospheric = false) {
    const count = atmospheric ? 130 : 90;
    const material = rockMaterial.clone();
    material.transparent = true;
    const mesh = new THREE.InstancedMesh(rockGeometry, material, count);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const pieces = [];
    for (let i = 0; i < count; i++) {
      const direction = new THREE.Vector3(random() - .5, random() - .5, random() - .5).normalize();
      if (atmospheric) direction.addScaledVector(position.clone().normalize(), 1.4).normalize();
      pieces.push({ position: position.clone(), velocity: direction.multiplyScalar(.35 + random() * 1.15), size: .012 + random() ** 2 * .048, spin: new THREE.Vector3(random() * 3, random() * 3, random() * 3) });
    }
    system.add(mesh);
    bursts.push({ mesh, pieces, born: time, lifetime: atmospheric ? 7 : 12 });
    flash.color.set(atmospheric ? '#ffb773' : '#cde1ff');
    flash.position.copy(position);
    lastFlash = now;
    flashStrength = atmospheric ? 14 : 3;
  }
  function kickMoons(impactPosition) {
    const localImpact = impactPosition.clone().applyQuaternion(inversePlane).normalize();
    for (const moon of moons) {
      const offset = moon.impactOffset.copy(moon.basePosition).setLength(1.9).sub(localImpact);
      offset.z += (random() - .5) * 1.7;
      offset.setLength(orbit * (1.75 + random() * .40));
    }
  }
  function streak(time) {
    const fromLeft = random() > .5;
    streakVelocity.set(fromLeft ? 16 : -16, -5 - random() * 3, 0);
    trail.position.set(fromLeft ? -16 : 16, 6 + random() * 6, -22 - random() * 10);
    trail.rotation.z = Math.atan2(streakVelocity.y, streakVelocity.x);
    streakBorn = time;
    trail.visible = true;
    event('streak');
  }
  function backgroundCollision() {
    const target = new THREE.Vector3(-4.5, 3.0 + random() * .8, -4.5);
    const a = new THREE.Vector3(-11, 5.5, -4.5);
    const b = new THREE.Vector3(3.5, 5.7, -4.5);
    pairs.push([rock(a, target.clone().sub(a).divideScalar(3.2), .23), rock(b, target.clone().sub(b).divideScalar(3.2), .19)]);
  }
  function updatePlanetaryImpact(time, now) {
    nextImpact ??= now + impactInterval;
    const remaining = nextImpact - now;
    if (remaining > approachDuration) return;

    if (remaining > 0) {
      incomingRock ??= rockMesh(approachStart, asteroidSize);
      const approach = 1 - remaining / approachDuration;
      incomingRock.position.lerpVectors(approachStart, contact, approach);
      incomingRock.rotation.set(2.4 * approach, 0, 1.71 * approach);
      const distance = incomingRock.position.length();
      const heat = THREE.MathUtils.smoothstep(radius * 1.35 - distance, 0, radius * .35);
      incomingRock.material.emissive.setRGB(1, .23, .035).multiplyScalar(heat * 6);
      return;
    }
    if (incomingRock) {
      system.remove(incomingRock);
      incomingRock.material.dispose();
      incomingRock = null;
    }
    lastImpact = now;
    nextImpact = now + impactInterval;
    uniforms.impactDirection.value.copy(impactPoint).normalize();
    debris(impactPoint, time, now, true);
    kickMoons(impactPoint);
    event('planet-impact');
  }

  function updateEvents(time, delta, now) {
    if (time >= nextStreak) { streak(time); nextStreak = time + 19 + random() * 18; }
    if (time >= nextCollision) { backgroundCollision(); nextCollision = time + 48 + random() * 34; }
    updatePlanetaryImpact(time, now);
    for (const item of rocks) {
      if (item.dead) continue;
      item.age += delta;
      item.previous.copy(item.mesh.position);
      item.velocity.addScaledVector(gravityAt(item.mesh.position, acceleration), delta);
      item.mesh.position.addScaledVector(item.velocity, delta);
      item.mesh.rotation.x += delta * .8;
      item.mesh.rotation.z += delta * .57;
      if (item.age > 14) item.dead = true;
    }
    for (let i = pairs.length - 1; i >= 0; i--) {
      const [a, b] = pairs[i];
      if (a.dead || b.dead) { pairs.splice(i, 1); continue; }
      const relativeStart = a.previous.clone().sub(b.previous);
      const relativeTravel = a.mesh.position.clone().sub(a.previous).sub(b.mesh.position.clone().sub(b.previous));
      const hitTime = THREE.MathUtils.clamp(-relativeStart.dot(relativeTravel) / Math.max(relativeTravel.lengthSq(), 1e-10), 0, 1);
      const closest = relativeStart.addScaledVector(relativeTravel, hitTime).length();
      if (closest < a.size + b.size) {
        const impactPoint = a.previous.clone().lerp(a.mesh.position, hitTime).add(b.previous.clone().lerp(b.mesh.position, hitTime)).multiplyScalar(.5);
        debris(impactPoint, time, now);
        a.dead = b.dead = true;
        pairs.splice(i, 1);
        event('rock-collision');
      }
    }
    for (let i = rocks.length - 1; i >= 0; i--) if (rocks[i].dead) {
      system.remove(rocks[i].mesh); rocks[i].mesh.material.dispose(); rocks.splice(i, 1);
    }
    if (trail.visible) {
      const age = time - streakBorn;
      trail.position.addScaledVector(streakVelocity, delta);
      trailMaterial.uniforms.opacity.value = Math.min(1, age * 5) * (1 - THREE.MathUtils.smoothstep(age, 1.4, streakLifetime));
      trail.visible = age < streakLifetime;
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const burst = bursts[i], age = time - burst.born;
      for (let j = 0; j < burst.pieces.length; j++) {
        const piece = burst.pieces[j];
        piece.velocity.addScaledVector(gravityAt(piece.position, acceleration), delta);
        piece.position.addScaledVector(piece.velocity, delta);
        transform.position.copy(piece.position);
        transform.rotation.set(piece.spin.x * age, piece.spin.y * age, piece.spin.z * age);
        transform.scale.setScalar(piece.size);
        transform.updateMatrix();
        burst.mesh.setMatrixAt(j, transform.matrix);
      }
      burst.mesh.instanceMatrix.needsUpdate = true;
      burst.mesh.material.opacity = 1 - THREE.MathUtils.smoothstep(age, burst.lifetime * .6, burst.lifetime);
      if (age > burst.lifetime) { system.remove(burst.mesh); burst.mesh.material.dispose(); bursts.splice(i, 1); }
    }
  }

  return {
    get streakVisible() { return trail.visible; },
    get needsFrame() { return flash.intensity > .001 || performance.now() - lastImpact < recoveryTime; },
    resize(height) {
      trailMaterial.uniforms.viewportHeight.value = height;
      streakScene.position.copy(system.position);
      streakScene.scale.copy(system.scale);
    },
    update(time, delta, now) {
      if (delta > 0) updateEvents(time, delta, now);
      flash.intensity = flashStrength * Math.exp(-.006 * (now - lastFlash));
      const age = now - lastImpact;
      uniforms.impactAge.value = Math.min(age * .001, 100);
      if (age >= recoveryTime) return 0;
      const progress = age / recoveryTime;
      // Keep the return visible until the final few frames, then match orbital velocity.
      const arrival = 1 - THREE.MathUtils.smoothstep(age, recoveryTime - 120, recoveryTime);
      return 4 * progress * (1 - progress) * arrival;
    },
  };
}
