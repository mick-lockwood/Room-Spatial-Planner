// src/view3d.js
// Uses global THREE from the CDN script in index.html

export class View3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

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
    this.roomMesh = null;

    this.animate();
  }

  onResize() {
    const width = this.container.clientWidth || 400;
    const height = this.container.clientHeight || 400;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update(state) {
    if (this.roomMesh) {
      this.scene.remove(this.roomMesh);
    }

    const h = state.room.height;

    const geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(state.room.length, h, state.room.width)
    );
    const material = new THREE.LineBasicMaterial({ color: 0x666666 });
    this.roomMesh = new THREE.LineSegments(geometry, material);
    this.roomMesh.position.set(0, h / 2, 0);
    this.scene.add(this.roomMesh);

    this.objectGroup.clear();
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });

    const halfL = state.room.length / 2;
    const halfW = state.room.width / 2;

    state.objects.forEach(o => {
      const geom = new THREE.BoxGeometry(o.width, o.height, o.depth);
      const mat = baseMat.clone();
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(o.position.x - halfL, o.height / 2, o.position.y - halfW);
      mesh.rotation.y = -o.rotation;
      this.objectGroup.add(mesh);
    });
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };
}
