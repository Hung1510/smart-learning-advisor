// ghost.js (ADD-ON cho login3d)

(function () {
  if (!window.THREE || !window.scene) {
    console.warn("Ghost: thiếu THREE hoặc scene");
    return;
  }
  const LOGIN_3D_SCRIPTS =
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>' +
  '<script src="/js/login3d.js"></script>' +
  '<script src="/js/ghost.js"></script>';
  const scene = window.scene;

  // ===== GHOST =====
  const ghostGeometry = new THREE.SphereGeometry(1.5, 32, 32);

  const pos = ghostGeometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i);
    if (y < 0) {
      pos.setY(i, y - Math.sin(i * 0.5) * 0.3);
    }
  }

  const ghostMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a1a2f,
    emissive: 0x00ffff,
    emissiveIntensity: 4,
    transparent: true,
    opacity: 0.9,
  });

  const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
  ghost.position.set(0, 0, 0);
  scene.add(ghost);

  // ===== EYES =====
  function createEye(x) {
    const geo = new THREE.SphereGeometry(0.25, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
    });
    const eye = new THREE.Mesh(geo, mat);
    eye.position.set(x, 0.5, 1.4);
    return eye;
  }

  const leftEye = createEye(-0.5);
  const rightEye = createEye(0.5);
  ghost.add(leftEye, rightEye);

  // ===== HAT =====
  function createHat() {
    const group = new THREE.Group();

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.15, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    cap.position.y = 1.8;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.5, 32),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    base.position.y = 1.5;

    const tassel = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffcc00 })
    );
    tassel.position.set(1.0, 1.7, 0);

    group.add(cap, base, tassel);
    return group;
  }

  ghost.add(createHat());

  // ===== ANIMATION HOOK =====
  let time = 0;

  function animateGhost() {
    time += 0.02;

    ghost.position.y = Math.sin(time) * 0.5;
    ghost.rotation.y += 0.01;

    ghostMaterial.emissiveIntensity = 3 + Math.sin(time * 2) * 2;

    const eyeGlow = 0.5 + Math.abs(Math.sin(time * 3));
    leftEye.material.opacity = eyeGlow;
    rightEye.material.opacity = eyeGlow;

    requestAnimationFrame(animateGhost);
  }

  animateGhost();

  console.log("👻 Ghost loaded into login3d scene");
})();