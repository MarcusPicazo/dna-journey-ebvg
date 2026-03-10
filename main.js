const RADIUS = 4.2;
const HEIGHT = 140;
const TWISTS = 16;
const OFFSET = Math.PI * 0.75;

let scene,
  camera,
  renderer,
  dnaGroup,
  currentPoi = null;
let markers = [];
let isInspecting = false;
let isTransitioning = false;
let scrollY = 0;
let targetScrollY = 0;
let autoSpinTime = 0;

const pointsData = [
  {
    id: 1,
    ratio: 0.88,
    strand: 1,
    title: "Surco Mayor",
    text: "Es el canal principal donde las proteínas reconocen el ADN. Su amplitud geométrica permite que las moléculas interactúen directamente con las bases.",
    fact: "REF: Reconocimiento proteico Clase A",
    camOffset: { x: 6, y: 0, z: 8 },
  },
  {
    id: 2,
    ratio: 0.75,
    strand: 0,
    title: "Bases Nitrogenadas",
    text: "El núcleo de la información genética. Pares A-T y C-G que forman el código binario de la vida a través de puentes de hidrógeno.",
    fact: "CONST: 0.34nm entre pares de bases",
    camOffset: { x: 5, y: 0, z: 7 },
  },
  {
    id: 3,
    ratio: 0.62,
    strand: 2,
    title: "Surco Menor",
    text: "Hendidura estrecha y compacta. Es vital para la estabilidad estructural y es el sitio objetivo para muchos fármacos antivirales.",
    fact: "DIM: 1.2nm de apertura media",
    camOffset: { x: -6, y: 0, z: 8 },
  },
  {
    id: 4,
    ratio: 0.48,
    strand: 1,
    title: "Extremo 3' OH",
    text: "El punto de terminación química donde se encuentra el grupo hidroxilo libre, esencial para la adición de nuevos nucleótidos.",
    fact: "DIRECCIÓN: Crecimiento 5' a 3'",
    camOffset: { x: 5, y: 0, z: 8 },
  },
  {
    id: 5,
    ratio: 0.34,
    strand: 1,
    title: "Esqueleto Fosfato",
    text: "La armadura hidrofílica externa. Su carga negativa estabiliza la hélice y protege la información genética interior.",
    fact: "POLARIDAD: Repulsión electrostática protectora",
    camOffset: { x: 7, y: 0, z: 8 },
  },
];

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 400, 600);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document
    .getElementById("canvas-container")
    .appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const pLight = new THREE.PointLight(0xc27b46, 6, 180);
  pLight.position.set(40, 50, 40);
  scene.add(pLight);

  dnaGroup = new THREE.Group();
  buildDNA();
  scene.add(dnaGroup);

  buildEnvironment();

  window.addEventListener("resize", onResize);
  window.addEventListener("wheel", onWheel, { passive: false });

  animate();
}

function buildDNA() {
  const points = 5000;
  const atomGeom = new THREE.SphereGeometry(0.22, 10, 10);
  const copperMat = new THREE.MeshPhongMaterial({
    color: 0xc27b46,
    shininess: 80,
  });
  const cianMat = new THREE.MeshPhongMaterial({
    color: 0x2a4e59,
    opacity: 0.6,
    transparent: true,
  });
  const glowTex = createGlowTexture();

  for (let i = 0; i < points; i++) {
    const r = i / points;
    const angle = r * Math.PI * 2 * TWISTS;
    const y = (r - 0.5) * HEIGHT;

    const p1 = new THREE.Vector3(
      Math.cos(angle) * RADIUS,
      y,
      Math.sin(angle) * RADIUS
    );
    const p2 = new THREE.Vector3(
      Math.cos(angle + OFFSET) * RADIUS,
      y,
      Math.sin(angle + OFFSET) * RADIUS
    );

    if (i % 24 === 0) {
      const a1 = new THREE.Mesh(atomGeom, copperMat);
      a1.position.copy(p1);
      dnaGroup.add(a1);

      const a2 = new THREE.Mesh(atomGeom, copperMat);
      a2.position.copy(p2);
      dnaGroup.add(a2);

      const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, p1.distanceTo(p2)),
        cianMat
      );
      cylinder.position.lerpVectors(p1, p2, 0.5);
      cylinder.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        p2.clone().sub(p1).normalize()
      );
      dnaGroup.add(cylinder);
    }
  }

  pointsData.forEach((poi) => {
    const angle = poi.ratio * Math.PI * 2 * TWISTS;
    const y = (poi.ratio - 0.5) * HEIGHT;
    let pos;
    if (poi.strand === 0)
      pos = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(
          Math.cos(angle) * RADIUS,
          y,
          Math.sin(angle) * RADIUS
        ),
        new THREE.Vector3(
          Math.cos(angle + OFFSET) * RADIUS,
          y,
          Math.sin(angle + OFFSET) * RADIUS
        ),
        0.5
      );
    else if (poi.strand === 1)
      pos = new THREE.Vector3(
        Math.cos(angle) * RADIUS,
        y,
        Math.sin(angle) * RADIUS
      );
    else
      pos = new THREE.Vector3(
        Math.cos(angle + OFFSET * 0.5) * RADIUS,
        y,
        Math.sin(angle + OFFSET * 0.5) * RADIUS
      );

    poi.worldPos = pos;
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    marker.position.copy(pos);
    dnaGroup.add(marker);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      })
    );
    halo.scale.set(4, 4, 1);
    marker.add(halo);
    markers.push({ mesh: marker, halo: halo });
  });

  createInterfaceNodes();
}

function buildEnvironment() {
  const count = 3000;
  const pos = [];
  for (let i = 0; i < count; i++) {
    pos.push(
      (Math.random() - 0.5) * 400,
      (Math.random() - 0.5) * 400,
      (Math.random() - 0.5) * 400
    );
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(
    geom,
    new THREE.PointsMaterial({
      size: 0.05,
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
    })
  );
  scene.add(p);
}

function createInterfaceNodes() {
  const container = document.getElementById("nodes-container");
  pointsData.forEach((poi) => {
    const el = document.createElement("div");
    el.className = "dna-node";
    el.innerHTML = `<div class="scanner-ring"></div>`;
    el.onclick = (e) => {
      e.stopPropagation();
      inspectPOI(poi);
    };
    container.appendChild(el);
    poi.element = el;
  });
}

function getExpectedRotation() {
  const progress = scrollY / 1000;
  return progress * Math.PI * 10 + autoSpinTime;
}

function inspectPOI(poi) {
  if (isTransitioning) return;
  isTransitioning = true;
  isInspecting = true;
  currentPoi = poi;

  // Calculamos posición exacta del mundo
  const targetWorldPos = poi.worldPos
    .clone()
    .applyMatrix4(dnaGroup.matrixWorld);
  const camPos = new THREE.Vector3(
    targetWorldPos.x + poi.camOffset.x,
    targetWorldPos.y + poi.camOffset.y,
    targetWorldPos.z + poi.camOffset.z
  );

  document.getElementById("info-popup").classList.remove("active");

  const tl = gsap.timeline({
    onComplete: () => {
      isTransitioning = false;
      document.getElementById("info-popup").classList.add("active");
    },
  });

  // Zoom directo y centrado
  tl.to(camera.position, {
    x: camPos.x,
    y: camPos.y,
    z: camPos.z,
    duration: 1.5,
    ease: "power3.inOut",
  });
  tl.to(
    dnaGroup.rotation,
    {
      y: dnaGroup.rotation.y + Math.PI * 1.5,
      duration: 1.5,
      ease: "power3.inOut",
    },
    0
  );

  document.getElementById("card-title").innerText = poi.title;
  document.getElementById("card-text").innerText = poi.text;
  document.getElementById("card-fact").innerText = poi.fact;
}

function closeInspector() {
  if (isTransitioning) return;
  isTransitioning = true;
  document.getElementById("info-popup").classList.remove("active");

  const progress = scrollY / 1000;
  const targetY = 55 - progress * 130;
  const targetZ = 80 + Math.sin(progress * 4) * 12;
  const targetRot = getExpectedRotation();

  const tl = gsap.timeline({
    onComplete: () => {
      isInspecting = false;
      isTransitioning = false;
    },
  });

  tl.to(camera.position, {
    x: 0,
    y: targetY,
    z: targetZ,
    duration: 1.4,
    ease: "expo.inOut",
  });

  const currentRot = dnaGroup.rotation.y;
  const diff = targetRot - currentRot;
  const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));

  tl.to(
    dnaGroup.rotation,
    {
      y: currentRot + normalizedDiff,
      duration: 1.4,
      ease: "expo.inOut",
    },
    0
  );
}

function onWheel(e) {
  if (isInspecting || isTransitioning) return;
  e.preventDefault();
  targetScrollY += e.deltaY * 0.2;
  targetScrollY = Math.max(0, Math.min(targetScrollY, 1000));
}

function updateScrollPosition() {
  if (isInspecting || isTransitioning) return;

  const progress = scrollY / 1000;
  const targetY = 55 - progress * 130;
  const targetZ = 80 + Math.sin(progress * 4) * 12;

  camera.position.y += (targetY - camera.position.y) * 0.08;
  camera.position.z += (targetZ - camera.position.z) * 0.08;
  camera.lookAt(0, camera.position.y - 10, 0);

  const expectedRot = getExpectedRotation();
  dnaGroup.rotation.y += (expectedRot - dnaGroup.rotation.y) * 0.08;

  document.getElementById("val-x").innerText =
    (progress * 100).toFixed(0) + "%";
  document.getElementById("val-y").innerText = targetY.toFixed(1);
  document.getElementById("scroll-fill").style.width =
    progress * 100 + "%";
}

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;

  if (!isInspecting && !isTransitioning) {
    autoSpinTime += 0.003;
    scrollY += (targetScrollY - scrollY) * 0.05;
    dnaGroup.position.y = Math.sin(time * 1.6) * 0.45;
    updateScrollPosition();
  }

  markers.forEach((m, i) => {
    const pulse = Math.sin(time * 3 + i) * 0.5 + 0.5;
    m.halo.scale.setScalar(3.5 + pulse * 2.5);
    m.halo.material.opacity = 0.1 + pulse * 0.25;
  });

  pointsData.forEach((poi) => {
    const v = poi.worldPos.clone().applyMatrix4(dnaGroup.matrixWorld);
    v.project(camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;

    if (v.z < 1) {
      poi.element.style.display = "flex";
      poi.element.style.left = `${x}px`;
      poi.element.style.top = `${y}px`;

      if (isInspecting && currentPoi === poi) {
        const pop = document.getElementById("info-popup");
        const isRightSide = x > window.innerWidth * 0.5;

        // Ajuste lateral para no tapar el ADN centrado
        pop.style.left = `${isRightSide ? x - 420 : x + 60}px`;
        pop.style.top = `${y}px`;
        pop.style.transform = `translateY(-50%)`;

        // Mirada clavada al punto de interés
        const wp = poi.worldPos
          .clone()
          .applyMatrix4(dnaGroup.matrixWorld);
        camera.lookAt(wp);
      }
      const dist = camera.position.distanceTo(v);
      poi.element.style.opacity = isInspecting
        ? currentPoi === poi
          ? 1
          : 0
        : Math.max(0, 1 - dist / 85);
    } else {
      poi.element.style.display = "none";
    }
  });

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function startApp() {
  const tl = gsap.timeline();
  tl.to("#start-content", {
    scale: 35,
    opacity: 0,
    duration: 2.2,
    ease: "power4.in",
  });
  tl.to(
    camera.position,
    { y: 55, z: 80, duration: 2.2, ease: "expo.inOut" },
    0.2
  );
  tl.to(
    "#start-screen",
    {
      opacity: 0,
      duration: 1.5,
      ease: "power2.inOut",
      onComplete: () => {
        document.getElementById("start-screen").style.display = "none";
        gsap.to(["#hud", "#scroll-tracker"], {
          opacity: 1,
          duration: 1.5,
        });
      },
    },
    1.2
  );
}

window.onload = init;