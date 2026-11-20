import { EventDispatcher, Euler, Quaternion, Vector2 } from 'three';

export class ViewControls extends EventDispatcher {
  constructor(camera, surface) {
    super();
    this.camera = camera;
    this.surface = surface;
    this.enabled = false;
    this.distance = 0;
    this.rotateSpeed = .35;
    this.dampingFactor = .065;
    this.pending = new Vector2();
    this.pointer = new Vector2();
    this.pointerId = null;
    this.rotation = new Quaternion();
    this.angles = new Euler(0, 0, 0, 'YXZ');

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    surface.addEventListener('pointerdown', this.onPointerDown);
    surface.addEventListener('pointermove', this.onPointerMove);
    surface.addEventListener('pointerup', this.onPointerUp);
    surface.addEventListener('pointercancel', this.onPointerUp);
  }

  onPointerDown(event) {
    if (!this.enabled || !event.isPrimary || event.button !== 0) return;
    this.pointerId = event.pointerId;
    this.pointer.set(event.clientX, event.clientY);
    this.surface.setPointerCapture(event.pointerId);
    this.dispatchEvent({ type: 'start' });
  }

  onPointerMove(event) {
    if (!this.enabled || event.pointerId !== this.pointerId) return;
    const sensitivity = 2 * Math.PI * this.rotateSpeed / innerHeight;
    this.pending.x -= (event.clientX - this.pointer.x) * sensitivity;
    this.pending.y -= (event.clientY - this.pointer.y) * sensitivity;
    this.pointer.set(event.clientX, event.clientY);
  }

  onPointerUp(event) {
    if (event.pointerId !== this.pointerId) return;
    if (this.surface.hasPointerCapture(event.pointerId)) this.surface.releasePointerCapture(event.pointerId);
    this.pointerId = null;
    this.dispatchEvent({ type: 'end' });
  }

  clearInertia() {
    this.pending.set(0, 0);
  }

  update(delta) {
    const fraction = 1 - Math.pow(1 - this.dampingFactor, delta * 60);
    this.angles.set(this.pending.y * fraction, this.pending.x * fraction, 0, 'YXZ');
    this.rotation.setFromEuler(this.angles);
    // Local quaternion rotations have no pole or turn limit.
    this.camera.quaternion.multiply(this.rotation).normalize();
    this.camera.position.set(0, 0, this.distance).applyQuaternion(this.camera.quaternion);
    this.camera.up.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
    this.pending.multiplyScalar(1 - fraction);
  }
}
