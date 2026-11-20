import { Vector3, MathUtils } from 'three';

const AU_KM = 149597870.7;
const URANUS_PERIOD_YEARS = 84.016846;
const SIMULATION_DAYS_PER_SECOND = URANUS_PERIOD_YEARS * 365.25 / 3600;
const TAU = 2 * Math.PI;

// JPL J2000 elements: semimajor axis (AU), eccentricity, inclination,
// mean longitude, longitude of perihelion, longitude of ascending node.
// Radii and sidereal periods are from the JPL planetary physical parameters.
export const planetaryOrbits = [
  { name: 'Mercury', radius: 2440.53, year: .2408467, spin: 58.6462, tilt: .034, elements: [.38709927, .20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593] },
  { name: 'Venus', radius: 6051.8, year: .61519726, spin: -243.018, tilt: 2.6, elements: [.72333566, .00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255] },
  { name: 'Earth', radius: 6378.1366, year: 1.0000174, spin: .99726968, tilt: 23.44, flattening: .99665, elements: [1.00000261, .01671123, -.00001531, 100.46457166, 102.93768193, 0] },
  { name: 'Mars', radius: 3396.19, year: 1.8808476, spin: 1.02595676, tilt: 25.19, elements: [1.52371034, .09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891] },
  { name: 'Jupiter', radius: 71492, year: 11.862615, spin: .41354, tilt: 3.13, elements: [5.20288700, .04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909] },
  { name: 'Saturn', radius: 60268, year: 29.447498, spin: .44401, tilt: 26.73, elements: [9.53667594, .05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448] },
  { name: 'Neptune', radius: 24764, year: 164.79132, spin: .67125, tilt: 28.32, elements: [30.06992276, .00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574] },
];

export const uranusOrbit = {
  year: URANUS_PERIOD_YEARS,
  elements: [19.18916464, .04725744, .77263783, 313.23810451, 170.95427630, 74.01692503],
};

export const orbitalSeconds = orbit => 3600 * orbit.year / URANUS_PERIOD_YEARS;

export function heliocentricPosition(orbit, seconds, target = new Vector3()) {
  const [a, e, inclination, longitude, perihelion, node] = orbit.elements;
  const meanAnomaly = MathUtils.degToRad(longitude - perihelion) + TAU * ((seconds / orbitalSeconds(orbit)) % 1);
  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < 6; i++) {
    eccentricAnomaly -= (eccentricAnomaly - e * Math.sin(eccentricAnomaly) - meanAnomaly) / (1 - e * Math.cos(eccentricAnomaly));
  }
  const x = a * (Math.cos(eccentricAnomaly) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly);
  const [cosPeri, sinPeri] = trig(perihelion - node);
  const [cosNode, sinNode] = trig(node);
  const [cosTilt, sinTilt] = trig(inclination);
  const orbitalX = cosPeri * x - sinPeri * y;
  const orbitalY = sinPeri * x + cosPeri * y;
  return target.set(
    cosNode * orbitalX - sinNode * cosTilt * orbitalY,
    sinTilt * orbitalY,
    -(sinNode * orbitalX + cosNode * cosTilt * orbitalY),
  );
}

function trig(degrees) {
  const radians = MathUtils.degToRad(degrees);
  return [Math.cos(radians), Math.sin(radians)];
}

export function angularRadius(radiusKm, distanceAu) {
  return Math.asin(Math.min(1, radiusKm / (distanceAu * AU_KM)));
}

export function rotationInTurns(planet, seconds) {
  return seconds * SIMULATION_DAYS_PER_SECOND / planet.spin;
}
