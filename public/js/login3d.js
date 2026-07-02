(function () {
    'use strict';

    // ── CONFIG ───────────────
    const SHAPE_COUNT   = 14;
    const PARTICLE_COUNT = 600;
    const COLORS = [
        0x4f8cff, // blue
        0x6c5ce7, // purple
        0x00cec9, // teal
        0xfd79a8, // pink
        0xffeaa7, // gold
        0x55efc4, // mint
    ];

    // ── STATE ────────────────
    let scene, camera, renderer, clock;
    let shapes = [];
    let particles;
    let mouse = { x: 0, y: 0 };
    let targetMouse = { x: 0, y: 0 };
    let animationId;

    // ── INIT ─────────────────
    function init() {
        const canvas = document.getElementById('login-3d-canvas');
        if (!canvas) return;

        // Scene
        scene = new THREE.Scene();
        window.scene = scene;
        scene.fog = new THREE.FogExp2(0x0a0e1a, 0.035);

        // Camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 18);

        // Renderer
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x0a0e1a, 1);

        clock = new THREE.Clock();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x4f8cff, 0.3);
        scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(0x4f8cff, 1.2, 50);
        pointLight1.position.set(10, 10, 10);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x6c5ce7, 0.8, 50);
        pointLight2.position.set(-10, -5, 8);
        scene.add(pointLight2);

        const pointLight3 = new THREE.PointLight(0x00cec9, 0.6, 40);
        pointLight3.position.set(0, 8, -5);
        scene.add(pointLight3);

        createShapes();
        createParticles();
        bindEvents();
        animate();
    }

    // ── SHAPES ───────────────
    function createShapes() {
        const geometries = [
            () => new THREE.IcosahedronGeometry(1, 0),
            () => new THREE.OctahedronGeometry(1, 0),
            () => new THREE.TetrahedronGeometry(1, 0),
            () => new THREE.DodecahedronGeometry(0.8, 0),
            () => new THREE.TorusGeometry(0.7, 0.25, 8, 16),
            () => new THREE.BoxGeometry(1, 1, 1),
        ];

        for (let i = 0; i < SHAPE_COUNT; i++) {
            const geomFn = geometries[Math.floor(Math.random() * geometries.length)];
            const color  = COLORS[Math.floor(Math.random() * COLORS.length)];
            const scale  = 0.3 + Math.random() * 1.0;

            // Each shape is a group: solid inner + wireframe outer
            const group = new THREE.Group();

            // Solid (translucent)
            const solidMat = new THREE.MeshPhongMaterial({
                color: color,
                transparent: true,
                opacity: 0.08,
                shininess: 80,
            });
            const solidMesh = new THREE.Mesh(geomFn(), solidMat);
            group.add(solidMesh);

            // Wireframe
            const wireMat = new THREE.MeshBasicMaterial({
                color: color,
                wireframe: true,
                transparent: true,
                opacity: 0.35,
            });
            const wireMesh = new THREE.Mesh(geomFn(), wireMat);
            group.add(wireMesh);

            // Position: spread in a wide area around camera
            group.position.set(
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20 - 5
            );
            group.scale.setScalar(scale);

            // Store animation data
            group.userData = {
                rotSpeed: {
                    x: (Math.random() - 0.5) * 0.008,
                    y: (Math.random() - 0.5) * 0.008,
                    z: (Math.random() - 0.5) * 0.005,
                },
                bobSpeed:  0.3 + Math.random() * 0.6,
                bobAmount: 0.3 + Math.random() * 0.8,
                bobOffset: Math.random() * Math.PI * 2,
                orbitRadius: 0.5 + Math.random() * 1.5,
                orbitSpeed:  0.1 + Math.random() * 0.3,
                orbitOffset: Math.random() * Math.PI * 2,
                baseY: group.position.y,
                baseX: group.position.x,
            };

            shapes.push(group);
            scene.add(group);
        }
    }

    // ── PARTICLES ────────────
    function createParticles() {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const sizes     = new Float32Array(PARTICLE_COUNT);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
            sizes[i] = Math.random() * 2 + 0.5;
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Simple circular particle via canvas texture
        const canvas2d = document.createElement('canvas');
        canvas2d.width = 32;
        canvas2d.height = 32;
        const ctx = canvas2d.getContext('2d');
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(200,220,255,0.6)');
        gradient.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas2d);

        const mat = new THREE.PointsMaterial({
            map: texture,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        particles = new THREE.Points(geom, mat);
        scene.add(particles);
    }

    // ── ANIMATION LOOP ───────
    function animate() {
        animationId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();

        // Smooth mouse follow
        mouse.x += (targetMouse.x - mouse.x) * 0.05;
        mouse.y += (targetMouse.y - mouse.y) * 0.05;

        // Camera parallax
        camera.position.x = mouse.x * 2;
        camera.position.y = mouse.y * 1.5;
        camera.lookAt(0, 0, 0);

        // Animate shapes
        shapes.forEach(function (group) {
            const d = group.userData;

            // Rotation
            group.rotation.x += d.rotSpeed.x;
            group.rotation.y += d.rotSpeed.y;
            group.rotation.z += d.rotSpeed.z;

            // Bobbing
            group.position.y = d.baseY + Math.sin(elapsed * d.bobSpeed + d.bobOffset) * d.bobAmount;

            // Gentle orbit drift
            group.position.x = d.baseX + Math.sin(elapsed * d.orbitSpeed + d.orbitOffset) * d.orbitRadius;
        });

        // Slow particle rotation
        if (particles) {
            particles.rotation.y = elapsed * 0.015;
            particles.rotation.x = Math.sin(elapsed * 0.01) * 0.1;
        }

        renderer.render(scene, camera);
    }

    // ── EVENTS ───────────────
    function bindEvents() {
        window.addEventListener('mousemove', function (e) {
            targetMouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
            targetMouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
        });

        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Touch parallax for mobile
        window.addEventListener('touchmove', function (e) {
            if (e.touches.length > 0) {
                targetMouse.x = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
                targetMouse.y = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
            }
        }, { passive: true });
    }

    // ── CLEANUP (if page navigates away via SPA) ────────
    window._login3dCleanup = function () {
        if (animationId) cancelAnimationFrame(animationId);
        if (renderer) renderer.dispose();
        shapes = [];
    };

    // ── START ────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();