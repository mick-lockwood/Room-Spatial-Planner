// view3d.ts
import * as THREE from "three";
import type { SceneState } from "./types.js";

export class View3D {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private roomMesh?: THREE.LineSegments;
  private objectGroup: THREE.Group;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 10, 100000);
    this.camera.position.set(8000, 6000, 8000);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5000, 8000, 5000);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    this.objectGroup = new THREE.Group();
    this.scene.add(this.objectGroup);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    window.addEventListener("resize", () => this.onResize());
    this.animate();
  }

  private onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update(state: SceneState) {
    // Room outline (wireframe)
    if (this.roomMesh) {
      this.scene.remove(this.roomMesh);
    }
    const hw = state.room.width / 2;
    const hl = state.room.length / 2;
    const h = state.room.height;

    const geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(state.room.length, h, state.room.width)
    );
    const material = new THREE.LineBasicMaterial({ color: 0x666666 });
    this.roomMesh = new THREE.LineSegments(geometry, material);
    this.roomMesh.position.set(0, h / 2, 0);
    this.scene.add(this.roomMesh);

    // Objects
    this.objectGroup.clear();
    const mat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
    state.objects.forEach(o => {
      const geom = new THREE.BoxGeometry(o.width, o.height, o.depth);
      const mesh = new THREE.Mesh(geom, mat.clone());
      mesh.position.set(o.position.x - hl, o.height / 2, o.position.y - hw);
      mesh.rotation.y = -o.rotation;
      this.objectGroup.add(mesh);
    });
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };
}
