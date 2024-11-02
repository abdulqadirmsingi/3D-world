const SIMPLIFIED_COUNTRIES_DATA = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "United States",
        code: "USA",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-125, 48],
            [-125, 25],
            [-65, 25],
            [-65, 48],
            [-125, 48],
          ],
        ],
      },
    },
    // Add more countries as needed
  ],
};
const Globe = {
  markers: [],
  borders: [],
  countryLabels: [],
  minZoom: 2,
  maxZoom: 10,
  currentZoom: 3,
  autoRotate: true,
  textures: {
    map: "https://unpkg.com/three-globe/example/img/earth-dark.jpg",
    bumpMap: "https://unpkg.com/three-globe/example/img/earth-topology.png",
    specularMap: "https://unpkg.com/three-globe/example/img/earth-water.png",
    cloudsMap: "https://unpkg.com/three-globe/example/img/earth-clouds.png",
    earth:
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg",
    borders:
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_borders.png",
    water:
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_water.png",

    countriesData:
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
    waterBodiesData:
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_ocean.geojson",
  },
  alternativeTextures: {
    satellite:
      "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
    night: "https://unpkg.com/three-globe/example/img/earth-night.jpg",
    terrain: "https://unpkg.com/three-globe/example/img/earth-topology.png",
  },

  async addCountryBorders() {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
      );
      const data = await response.json();

      this.countryData = data; // Store for later use

      data.features.forEach((feature) => {
        if (feature.geometry.type === "Polygon") {
          this.drawCountryBorder(
            feature.geometry.coordinates[0],
            feature.properties.NAME
          );
        } else if (feature.geometry.type === "MultiPolygon") {
          feature.geometry.coordinates.forEach((polygon) => {
            this.drawCountryBorder(polygon[0], feature.properties.NAME);
          });
        }
      });
    } catch (error) {
      console.error("Error loading borders:", error);
    }
  },

  drawCountryBorder(coordinates, countryName) {
    const points = [];
    coordinates.forEach((coord) => {
      const [lon, lat] = coord;
      points.push(this.latLonToVector3(lat, lon, 1.001));
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      linewidth: 2,
    });

    const border = new THREE.Line(geometry, material);
    this.scene.add(border);
    this.borders.push({ name: countryName, line: border });
  },

  // Helper method to calculate polygon center
  getPolygonCenter(coordinates) {
    let lat = 0,
      lon = 0;
    coordinates.forEach((coord) => {
      lon += coord[0];
      lat += coord[1];
    });
    return [lon / coordinates.length, lat / coordinates.length];
  },

  // Method to add country labels
  addCountryLabel(name, lat, lon) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 64;

    context.font = "bold 24px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.fillText(name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
    });

    const sprite = new THREE.Sprite(material);
    const position = this.latLonToVector3(lat, lon, 1.02);
    sprite.position.copy(position);
    sprite.scale.set(0.5, 0.125, 1);

    this.scene.add(sprite);
  },

  async changeGlobeTexture(type) {
    const textureLoader = new THREE.TextureLoader();

    try {
      this.showStatus("Loading texture...");
      const texture = await new Promise((resolve, reject) => {
        textureLoader.load(
          this.alternativeTextures[type],
          resolve,
          undefined,
          reject
        );
      });

      this.globe.material.map = texture;
      this.globe.material.needsUpdate = true;
      this.showStatus("View updated!");
    } catch (error) {
      console.error("Error loading texture:", error);
      this.showStatus("Error changing view");
    }
  },
  async addWaterBodies() {
    try {
      const response = await fetch(this.textures.waterBodiesData);
      const data = await response.json();

      data.features.forEach((feature) => {
        if (feature.properties.name) {
          // Only add major water bodies
          const coordinates = feature.geometry.coordinates[0];
          const center = this.getPolygonCenter(coordinates);

          // Add water body label
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = 256;
          canvas.height = 64;

          context.font = "italic 20px Arial";
          context.fillStyle = "#add8e6"; // Light blue
          context.textAlign = "center";
          context.fillText(feature.properties.name, 128, 32);

          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.7,
          });

          const sprite = new THREE.Sprite(material);
          const position = this.latLonToVector3(center[1], center[0], 1.01);
          sprite.position.copy(position);
          sprite.scale.set(0.4, 0.1, 1);

          this.scene.add(sprite);
        }
      });
    } catch (error) {
      console.error("Error loading water bodies:", error);
    }
  },

  async init() {
    this.setupScene();
    this.createGlobe();
    this.createAtmosphere();
    this.createClouds();
    this.setupLighting();
    this.setupControls();
    this.animate();
  },

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = this.currentZoom;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
  },

  async createGlobe() {
    const textureLoader = new THREE.TextureLoader();

    try {
      this.showStatus("Loading Earth...");
      // Load earth texture
      const earthTexture = await new Promise((resolve) =>
        textureLoader.load(this.textures.earth, resolve)
      );

      // Create the globe
      const geometry = new THREE.SphereGeometry(1, 64, 64);
      const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpScale: 0.05,
        specular: new THREE.Color("grey"),
        shininess: 5,
      });

      this.globe = new THREE.Mesh(geometry, material);
      this.scene.add(this.globe);

      // Initialize country borders but keep them hidden initially
      await this.initializeBorders();

      this.showStatus("Earth loaded successfully!");
    } catch (error) {
      console.error("Error creating globe:", error);
      this.showStatus("Error loading Earth");
    }
  },

  // Add this new method
  async initializeBorders() {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
      );
      const data = await response.json();

      data.features.forEach((feature) => {
        if (feature.geometry) {
          this.createCountryBorder(feature);
        }
      });
    } catch (error) {
      console.error("Error initializing borders:", error);
    }
  },

  // Add this helper method
  createCountryBorder(feature) {
    if (feature.geometry.type === "Polygon") {
      this.addBorderGeometry(
        feature.geometry.coordinates[0],
        feature.properties.name
      );
    } else if (feature.geometry.type === "MultiPolygon") {
      feature.geometry.coordinates.forEach((polygon) => {
        this.addBorderGeometry(polygon[0], feature.properties.name);
      });
    }
  },

  // Add this helper method
  addBorderGeometry(coordinates, countryName) {
    const points = [];
    coordinates.forEach((coord) => {
      const [lon, lat] = coord;
      points.push(this.latLonToVector3(lat, lon, 1.001));
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });

    const border = new THREE.Line(geometry, material);
    border.visible = false; // Initially hidden
    this.scene.add(border);
    this.borders.push(border);

    // Add country label
    this.addCountryLabel(countryName, points);
  },

  addContinentLabel(name, lat, lon) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 128;

    context.font = "bold 48px Arial";
    context.fillStyle = "rgba(255, 255, 255, 0.7)";
    context.textAlign = "center";
    context.fillText(name, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6,
    });

    const sprite = new THREE.Sprite(material);
    const position = this.latLonToVector3(lat, lon, 1.03);
    sprite.position.copy(position);
    sprite.scale.set(1, 0.25, 1);

    this.scene.add(sprite);
  },
  getSuggestions(searchTerm) {
    const commonCountries = [
      "United States",
      "United Kingdom",
      "Canada",
      "Australia",
      "Germany",
      "France",
      "Italy",
      "Spain",
      "China",
      "Japan",
      "India",
      "Brazil",
      // Add more countries as needed
    ];

    return commonCountries.filter((country) =>
      country.toLowerCase().includes(searchTerm)
    );
  },

  // Add this method to show suggestions
  showSuggestions(suggestions) {
    let suggestionsDiv = document.getElementById("searchSuggestions");
    if (!suggestionsDiv) {
      suggestionsDiv = document.createElement("div");
      suggestionsDiv.id = "searchSuggestions";
      suggestionsDiv.style.position = "absolute";
      suggestionsDiv.style.top = "60px";
      suggestionsDiv.style.left = "20px";
      suggestionsDiv.style.background = "white";
      suggestionsDiv.style.borderRadius = "4px";
      suggestionsDiv.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
      document.body.appendChild(suggestionsDiv);
    }

    suggestionsDiv.innerHTML = "";
    suggestions.forEach((suggestion) => {
      const div = document.createElement("div");
      div.textContent = suggestion;
      div.style.padding = "8px";
      div.style.cursor = "pointer";
      div.addEventListener("click", () => {
        document.getElementById("searchInput").value = suggestion;
        suggestionsDiv.innerHTML = "";
        this.handleSearch();
      });
      suggestionsDiv.appendChild(div);
    });
  },
  // Add this to your Globe object after createGlobe() method:
  createTerminator() {
    const terminatorMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
    });

    const updateTerminatorPosition = () => {
      const now = new Date();
      const julianDay = now.getTime() / 86400000 + 2440587.5;
      const century = (julianDay - 2451545.0) / 36525;

      // Calculate solar position
      const meanLongitude =
        (280.46646 + century * (36000.76983 + century * 0.0003032)) % 360;
      const meanAnomaly =
        357.52911 + century * (35999.05029 - 0.0001537 * century);
      const eccentricity =
        0.016708634 - century * (0.000042037 + 0.0000001267 * century);

      // Calculate Sun's position
      let sunLong =
        meanLongitude +
        (1.914602 - century * (0.004817 + 0.000014 * century)) *
          Math.sin((meanAnomaly * Math.PI) / 180);
      let sunLat = 0;

      // Create terminator line
      const points = [];
      for (let i = 0; i <= 360; i++) {
        const phi = ((i - 180) * Math.PI) / 180;
        const theta = (-sunLat * Math.PI) / 180;

        const x = Math.cos(phi) * Math.cos(theta);
        const y = Math.sin(phi);
        const z = Math.cos(phi) * Math.sin(theta);

        points.push(new THREE.Vector3(x, y, z));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return new THREE.Line(geometry, terminatorMaterial);
    };

    this.terminator = updateTerminatorPosition();
    this.scene.add(this.terminator);

    // Update terminator position every minute
    setInterval(() => {
      this.scene.remove(this.terminator);
      this.terminator = updateTerminatorPosition();
      this.scene.add(this.terminator);
    }, 60000);
  },
  // Add this method to your Globe object:
  addFlightPath(startLat, startLon, endLat, endLon) {
    const curve = new THREE.CubicBezierCurve3(
      this.latLonToVector3(startLat, startLon),
      this.latLonToVector3(startLat, startLon).multiplyScalar(2),
      this.latLonToVector3(endLat, endLon).multiplyScalar(2),
      this.latLonToVector3(endLat, endLon)
    );

    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });

    const flightPath = new THREE.Line(geometry, material);
    this.scene.add(flightPath);

    // Animate a point along the path
    const animatedPoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    this.scene.add(animatedPoint);

    let progress = 0;
    const animate = () => {
      if (progress <= 1) {
        const point = curve.getPoint(progress);
        animatedPoint.position.copy(point);
        progress += 0.002;
        requestAnimationFrame(animate);
      }
    };
    animate();
  },
  // Helper method for converting lat/lon to Vector3
  latLonToVector3(lat, lon) {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;

    return new THREE.Vector3(
      -Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );
  },

  createAtmosphere() {
    const geometry = new THREE.SphereGeometry(1.02, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0x0077ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    this.atmosphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.atmosphere);
  },

  createClouds() {
    const geometry = new THREE.SphereGeometry(1.01, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    this.clouds = new THREE.Mesh(geometry, material);
    this.scene.add(this.clouds);
  },

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(5, 3, 5);
    this.scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  },
  // Add this method to your Globe object:
  addWeatherEffect(lat, lon, type = "rain") {
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = [];

    const center = this.latLonToVector3(lat, lon);
    const radius = 0.2; // Area of effect

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rad = Math.random() * radius;

      positions.push(
        center.x + rad * Math.cos(angle),
        center.y + Math.random() * 0.2,
        center.z + rad * Math.sin(angle)
      );
    }

    particles.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const material =
      type === "rain"
        ? new THREE.PointsMaterial({
            color: 0x99ccff,
            size: 0.01,
            transparent: true,
            opacity: 0.6,
          })
        : new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.02,
            transparent: true,
            opacity: 0.8,
          });

    const particleSystem = new THREE.Points(particles, material);
    this.scene.add(particleSystem);

    // Animate particles
    const animate = () => {
      const positions = particles.attributes.position.array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.01; // Fall speed

        if (positions[i + 1] < center.y - radius) {
          positions[i + 1] = center.y + radius;
        }
      }

      particles.attributes.position.needsUpdate = true;
      requestAnimationFrame(animate);
    };
    animate();
  },
  setupControls() {
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    // Add in setupControls
    document.getElementById("toggleBorders").addEventListener("click", () => {
      const isVisible = !this.borders[0]?.visible;
      this.borders.forEach((border) => (border.visible = isVisible));
      document.getElementById("toggleBorders").classList.toggle("active");
    });
    document.getElementById("searchInput").addEventListener("input", (e) => {
      // Auto-complete country names
      const searchTerm = e.target.value.toLowerCase();
      if (searchTerm.length >= 2) {
        const suggestions = this.getSuggestions(searchTerm);
        this.showSuggestions(suggestions);
      }
    });

    document
      .getElementById("toggleCountryLabels")
      .addEventListener("click", () => {
        const isVisible = !this.countryLabels[0]?.visible;
        this.countryLabels.forEach((label) => (label.visible = isVisible));
        document
          .getElementById("toggleCountryLabels")
          .classList.toggle("active");
      });

    document
      .getElementById("toggleTerminator")
      .addEventListener("click", () => {
        Globe.createTerminator();
      });

    document.getElementById("addFlightPath").addEventListener("click", () => {
      // Example: New York to London
      Globe.addFlightPath(40.7128, -74.006, 51.5074, -0.1278);
    });

    document.getElementById("toggleWeather").addEventListener("click", () => {
      Globe.addWeatherEffect(47.6062, -122.3321, "rain");
    });
    // Mouse controls
    document.addEventListener("mousedown", (e) => {
      this.isDragging = true;
    });

    document.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        const deltaMove = {
          x: e.offsetX - this.previousMousePosition.x,
          y: e.offsetY - this.previousMousePosition.y,
        };

        this.globe.rotation.y += deltaMove.x * 0.005;
        this.globe.rotation.x += deltaMove.y * 0.005;

        this.updateAuxiliaryObjects();
      }

      this.previousMousePosition = {
        x: e.offsetX,
        y: e.offsetY,
      };
    });

    document.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    // Zoom control
    window.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const zoomSpeed = 0.1;
        const delta = -Math.sign(event.deltaY) * zoomSpeed;

        this.currentZoom = Math.max(
          this.minZoom,
          Math.min(this.maxZoom, this.currentZoom - delta)
        );
        this.camera.position.z = this.currentZoom;
      },
      { passive: false }
    );

    // Button controls
    document.getElementById("toggleClouds").addEventListener("click", () => {
      this.clouds.visible = !this.clouds.visible;
      document.getElementById("toggleClouds").classList.toggle("active");
    });

    document
      .getElementById("toggleAtmosphere")
      .addEventListener("click", () => {
        this.atmosphere.visible = !this.atmosphere.visible;
        document.getElementById("toggleAtmosphere").classList.toggle("active");
      });

    document.getElementById("toggleRotation").addEventListener("click", () => {
      this.autoRotate = !this.autoRotate;
      document.getElementById("toggleRotation").classList.toggle("active");
    });

    document.getElementById("resetView").addEventListener("click", () => {
      this.resetView();
    });

    // Search controls
    document
      .getElementById("searchButton")
      .addEventListener("click", () => this.handleSearch());
    document.getElementById("searchInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleSearch();
    });
    // Add these after Globe initialization
    document.getElementById("satelliteView").addEventListener("click", () => {
      Globe.changeGlobeTexture("satellite");
    });

    document.getElementById("nightView").addEventListener("click", () => {
      Globe.changeGlobeTexture("night");
    });

    document.getElementById("terrainView").addEventListener("click", () => {
      Globe.changeGlobeTexture("terrain");
    });

    // Window resize
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  },

  updateAuxiliaryObjects() {
    // Update clouds, grid, and atmosphere rotations
    if (this.clouds) {
      this.clouds.rotation.x = this.globe.rotation.x;
      this.clouds.rotation.y = this.globe.rotation.y;
    }
    if (this.grid) {
      this.grid.rotation.x = this.globe.rotation.x;
      this.grid.rotation.y = this.globe.rotation.y;
    }
    if (this.atmosphere) {
      this.atmosphere.rotation.x = this.globe.rotation.x;
      this.atmosphere.rotation.y = this.globe.rotation.y;
    }
    // Update markers
    this.markers.forEach((marker) => {
      marker.rotation.x = this.globe.rotation.x;
      marker.rotation.y = this.globe.rotation.y;
    });
  },

  resetView() {
    this.globe.rotation.x = 0;
    this.globe.rotation.y = 0;
    this.camera.position.z = 3;
    this.currentZoom = 3;
    this.updateAuxiliaryObjects();
  },

  // Add this method to your Globe object
  async handleSearch() {
    const searchInput = document.getElementById("searchInput");
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) return;

    this.showStatus("Searching...");

    try {
      // First try Nominatim geocoding with country type
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchTerm
        )}&countrycodes=*&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const coords = {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
        };

        // Create marker
        this.addMarker(coords.lat, coords.lon);

        // Zoom to location
        this.zoomToLocation(coords.lat, coords.lon);

        // Show information
        this.showStatus(`Found: ${result.display_name}`);

        // Highlight borders if it's a country
        if (result.type === "country") {
          this.highlightCountry(result.display_name);
        }
      } else {
        this.showStatus("Location not found");
      }
    } catch (error) {
      console.error("Search error:", error);
      this.showStatus("Error searching location");
    }
  },

  // Add this method for better zooming
  zoomToLocation(lat, lon) {
    // Convert to radians
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    // Calculate target rotation
    const targetRotationX = phi - Math.PI / 2;
    const targetRotationY = -theta;

    // Store current position
    const startRotationX = this.globe.rotation.x;
    const startRotationY = this.globe.rotation.y;
    const startZoom = this.camera.position.z;

    // Set target zoom based on type
    const targetZoom = 2; // Closer zoom for better view

    // Animate to position
    const animationDuration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Use easing function for smooth animation
      const easeProgress = progress * (2 - progress);

      // Update rotation
      this.globe.rotation.x =
        startRotationX + (targetRotationX - startRotationX) * easeProgress;
      this.globe.rotation.y =
        startRotationY + (targetRotationY - startRotationY) * easeProgress;

      // Update zoom
      this.camera.position.z =
        startZoom + (targetZoom - startZoom) * easeProgress;

      // Update auxiliary objects
      this.updateAuxiliaryObjects();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  },

  // Add this method for highlighting countries
  highlightCountry(countryName) {
    // Reset all borders to default style
    if (this.borders) {
      this.borders.forEach((border) => {
        if (border.line) {
          border.line.material.color.setHex(0xffffff);
          border.line.material.opacity = 0.5;
        }
      });

      // Find and highlight the searched country
      const countryBorder = this.borders.find(
        (b) => b.name.toLowerCase() === countryName.toLowerCase()
      );

      if (countryBorder && countryBorder.line) {
        countryBorder.line.material.color.setHex(0xff0000);
        countryBorder.line.material.opacity = 1;
        countryBorder.line.material.linewidth = 2;
      }
    }
  },

  // Add these helper methods for better location handling
  getCountryCode(countryName) {
    // Add common country names and their codes
    const countryMappings = {
      "united states": "US",
      usa: "US",
      "united kingdom": "GB",
      uk: "GB",
      // Add more country mappings as needed
    };

    return (
      countryMappings[countryName.toLowerCase()] || countryName.toUpperCase()
    );
  },

  // Add this to improve country name matching
  normalizeCountryName(name) {
    // Add common variations of country names
    const countryAliases = {
      usa: "united states",
      uk: "united kingdom",
      uae: "united arab emirates",
      // Add more aliases as needed
    };

    const normalized = name.toLowerCase();
    return countryAliases[normalized] || normalized;
  },
  async geocodeLocation(location) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        location
      )}`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    throw new Error("Location not found");
  },
  findCountry(searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    return this.countryData.features.find((feature) =>
      feature.properties.NAME.toLowerCase().includes(searchTerm)
    );
  },
  highlightCountry(countryFeature) {
    // Reset previous highlights
    this.borders.forEach((border) => {
      border.line.material.color.setHex(0xffffff);
      border.line.material.opacity = 0.5;
    });

    // Highlight the searched country
    const countryBorder = this.borders.find(
      (b) => b.name === countryFeature.properties.NAME
    );
    if (countryBorder) {
      countryBorder.line.material.color.setHex(0xff0000);
      countryBorder.line.material.opacity = 1;

      // Calculate country center for camera focus
      const bounds = this.calculateCountryBounds(countryFeature);
      this.focusOnLocation(bounds.center.lat, bounds.center.lon);

      this.showStatus(`Found country: ${countryFeature.properties.NAME}`);
    }
  },
  calculateCountryBounds(feature) {
    let minLat = 90,
      maxLat = -90,
      minLon = 180,
      maxLon = -180;

    const processCoordinates = (coords) => {
      coords.forEach((coord) => {
        const [lon, lat] = coord;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      });
    };

    if (feature.geometry.type === "Polygon") {
      processCoordinates(feature.geometry.coordinates[0]);
    } else if (feature.geometry.type === "MultiPolygon") {
      feature.geometry.coordinates.forEach((polygon) => {
        processCoordinates(polygon[0]);
      });
    }

    return {
      center: {
        lat: (minLat + maxLat) / 2,
        lon: (minLon + maxLon) / 2,
      },
      size: Math.max(maxLat - minLat, maxLon - minLon),
    };
  },

  addMarker(lat, lon) {
    // Remove existing markers
    this.markers.forEach((marker) => this.scene.remove(marker));
    this.markers = [];

    // Create marker with glow effect
    const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const markerMaterial = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);

    // Position marker
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    marker.position.x = -Math.sin(phi) * Math.cos(theta);
    marker.position.y = Math.cos(phi);
    marker.position.z = Math.sin(phi) * Math.sin(theta);

    this.scene.add(marker);
    this.markers.push(marker);
  },

  showStatus(message) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.style.display = "block";
    setTimeout(() => {
      status.style.display = "none";
    }, 3000);
  },

  goToLocation(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const targetRotationX = phi - Math.PI / 2;
    const targetRotationY = -theta;

    this.animateToRotation(targetRotationX, targetRotationY);
  },

  animateToRotation(targetX, targetY) {
    const animationDuration = 1000;
    const startRotationX = this.globe.rotation.x;
    const startRotationY = this.globe.rotation.y;
    const startTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      const easeProgress = progress * (2 - progress);

      this.globe.rotation.x = startRotationX + (targetX - startRotationX);
      this.globe.rotation.x =
        startRotationX + (targetX - startRotationX) * easeProgress;
      this.globe.rotation.y =
        startRotationY + (targetY - startRotationY) * easeProgress;

      this.updateAuxiliaryObjects();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  },
  focusOnLocation(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const targetRotationX = phi - Math.PI / 2;
    const targetRotationY = -theta;

    // Animate to the location
    const animationDuration = 1000;
    const startRotationX = this.globe.rotation.x;
    const startRotationY = this.globe.rotation.y;
    const startTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      const easeProgress = progress * (2 - progress);

      this.globe.rotation.x =
        startRotationX + (targetRotationX - startRotationX) * easeProgress;
      this.globe.rotation.y =
        startRotationY + (targetRotationY - startRotationY) * easeProgress;

      this.updateAuxiliaryObjects();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  },

  animate() {
    requestAnimationFrame(() => this.animate());

    // Auto-rotation when not dragging
    if (!this.isDragging && this.autoRotate) {
      this.globe.rotation.y += 0.001;
      this.updateAuxiliaryObjects();
    }

    // Animate clouds slightly faster than the globe
    if (this.clouds && this.clouds.visible) {
      this.clouds.rotation.y += 0.0002;
    }

    this.renderer.render(this.scene, this.camera);
  },

  addStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];

    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starPositions.push(x, y, z);
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3)
    );

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      sizeAttenuation: true,
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  },

  changeMaterialType(type) {
    switch (type) {
      case "political":
        this.globe.material.color.setHex(0x4b0082);
        this.globe.material.shininess = 10;
        break;
      case "satellite":
        this.globe.material.color.setHex(0x1e4d2b);
        this.globe.material.shininess = 5;
        break;
      default:
        this.globe.material.color.setHex(0x2233ff);
        this.globe.material.shininess = 25;
    }
    this.globe.material.needsUpdate = true;
  },
};

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", () => {
  Globe.init();
  Globe.addStars();

  // Add view type handlers
  document.getElementById("defaultView").addEventListener("click", () => {
    Globe.changeMaterialType("default");
    document
      .querySelectorAll("#controls-panel button")
      .forEach((btn) => btn.classList.remove("active"));
    document.getElementById("defaultView").classList.add("active");
  });

  document.getElementById("politicalView").addEventListener("click", () => {
    Globe.changeMaterialType("political");
    document
      .querySelectorAll("#controls-panel button")
      .forEach((btn) => btn.classList.remove("active"));
    document.getElementById("politicalView").classList.add("active");
  });

  document.getElementById("satelliteView").addEventListener("click", () => {
    Globe.changeMaterialType("satellite");
    document
      .querySelectorAll("#controls-panel button")
      .forEach((btn) => btn.classList.remove("active"));
    document.getElementById("satelliteView").classList.add("active");
  });
});
