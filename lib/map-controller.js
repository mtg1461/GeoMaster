(function () {
window.GeoMaster = window.GeoMaster || {};

const DEFAULT_VIEW_BOX = {
  x: 0,
  y: 0,
  width: 2000,
  height: 857,
};

const CAMERA = {
  normalPadding: 3.4,
  tinyPadding: 10,
  minWidth: 150,
  minHeight: 105,
  tinyMinWidth: 260,
  tinyMinHeight: 180,
  zoomOutDuration: 720,
  zoomInDuration: 1250,
  softZoomSize: 44,
  tinyTargetSize: 10,
  microTargetSize: 3,
  scatteredDensityThreshold: 0.16,
  scatteredMinPathCount: 2,
  clusterRadiusMultiplier: 8,
  clusterMinRadius: 24,
  idleDriftPeriod: 9000,
  idleDriftX: 0.018,
  idleDriftY: 0.012,
};

function getCombinedBoxFromBoxes(boxes) {
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getBoxArea(box) {
  return Math.max(box.width, 0) * Math.max(box.height, 0);
}

function getSoftZoomProgress(box) {
  const effectiveSize = Math.sqrt(Math.max(getBoxArea(box), 1));
  const rawProgress = 1 - (effectiveSize / CAMERA.softZoomSize);

  return smoothstep(rawProgress);
}

function getBoxCenter(box) {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

function getDistance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getFocusBox(boxes, combinedBox) {
  const totalBoxArea = boxes.reduce((sum, box) => sum + getBoxArea(box), 0);
  const density = totalBoxArea / Math.max(getBoxArea(combinedBox), 1);

  if (boxes.length < CAMERA.scatteredMinPathCount || density >= CAMERA.scatteredDensityThreshold) {
    return combinedBox;
  }

  const largestBox = boxes.reduce((largest, box) => (getBoxArea(box) > getBoxArea(largest) ? box : largest), boxes[0]);
  const largestCenter = getBoxCenter(largestBox);
  const clusterRadius = Math.max(
    CAMERA.clusterMinRadius,
    Math.max(largestBox.width, largestBox.height) * CAMERA.clusterRadiusMultiplier,
  );
  const clusterBoxes = boxes.filter((box) => getDistance(getBoxCenter(box), largestCenter) <= clusterRadius);

  return getCombinedBoxFromBoxes(clusterBoxes.length ? clusterBoxes : [largestBox]);
}

function formatViewBox(box) {
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

function parseViewBox(svg) {
  const values = svg
    .getAttribute("viewBox")
    .split(/\s+/)
    .map(Number);

  return {
    x: values[0],
    y: values[1],
    width: values[2],
    height: values[3],
  };
}

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function mix(start, end, progress) {
  return start + (end - start) * progress;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function smoothstep(progress) {
  const clamped = clamp(progress, 0, 1);
  return clamped * clamped * (3 - (2 * clamped));
}

function boxesAreClose(first, second) {
  return Math.abs(first.x - second.x) < 0.01
    && Math.abs(first.y - second.y) < 0.01
    && Math.abs(first.width - second.width) < 0.01
    && Math.abs(first.height - second.height) < 0.01;
}

function getCountryName(path) {
  return path.getAttribute("id") || path.dataset.country || "";
}

class MapController {
  constructor(mapContainer, markerElement) {
    this.mapContainer = mapContainer;
    this.markerElement = markerElement;
    this.svg = null;
    this.countryPaths = new Map();
    this.activeCountry = null;
    this.animationFrame = 0;
    this.idleAnimationFrame = 0;
    this.markerPoint = null;
  }

  async ready() {
    this.setupMap();
    return this;
  }

  setupMap() {
    this.svg = this.mapContainer.querySelector("svg");

    if (!this.svg) {
      throw new Error("World map SVG could not be loaded.");
    }

    this.svg.setAttribute("viewBox", formatViewBox(DEFAULT_VIEW_BOX));
    this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    this.countryPaths.clear();

    [...this.svg.querySelectorAll("path")].forEach((path) => {
      const country = getCountryName(path).trim();

      if (!country) {
        return;
      }

      const key = country.toLowerCase();
      const group = this.countryPaths.get(key) || [];
      group.push(path);
      this.countryPaths.set(key, group);
    });
  }

  hasCountry(country) {
    return this.countryPaths.has(country.toLowerCase());
  }

  resetZoom() {
    this.cancelAnimation();
    this.svg.setAttribute("viewBox", formatViewBox(DEFAULT_VIEW_BOX));
    this.clearActive();
    this.hideMarker();
  }

  cancelAnimation() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    this.stopIdleDrift();
  }

  stopIdleDrift() {
    if (this.idleAnimationFrame) {
      window.cancelAnimationFrame(this.idleAnimationFrame);
      this.idleAnimationFrame = 0;
    }
  }

  getMarkerScreenPoint(point) {
    const viewBox = parseViewBox(this.svg);
    const svgRect = this.svg.getBoundingClientRect();
    const stageRect = this.markerElement.offsetParent.getBoundingClientRect();
    const scale = Math.min(svgRect.width / viewBox.width, svgRect.height / viewBox.height);
    const renderedWidth = viewBox.width * scale;
    const renderedHeight = viewBox.height * scale;
    const offsetX = (svgRect.width - renderedWidth) / 2;
    const offsetY = (svgRect.height - renderedHeight) / 2;

    return {
      x: (svgRect.left - stageRect.left) + offsetX + ((point.x - viewBox.x) * scale),
      y: (svgRect.top - stageRect.top) + offsetY + ((point.y - viewBox.y) * scale),
    };
  }

  updateMarkerPosition(point = this.markerPoint) {
    if (!point || this.markerElement.hidden) {
      return;
    }

    const screenPoint = this.getMarkerScreenPoint(point);
    this.markerElement.style.left = `${screenPoint.x}px`;
    this.markerElement.style.top = `${screenPoint.y}px`;
  }

  startIdleDrift(baseBox, markerPoint = this.markerPoint) {
    this.stopIdleDrift();

    const amplitudeX = baseBox.width * CAMERA.idleDriftX;
    const amplitudeY = baseBox.height * CAMERA.idleDriftY;
    const startTime = performance.now();

    const drift = (now) => {
      const angle = ((now - startTime) / CAMERA.idleDriftPeriod) * Math.PI * 2;
      const nextBox = {
        x: baseBox.x + (Math.sin(angle) * amplitudeX),
        y: baseBox.y + (Math.sin(angle * 2) * amplitudeY),
        width: baseBox.width,
        height: baseBox.height,
      };

      this.svg.setAttribute("viewBox", formatViewBox(nextBox));
      this.updateMarkerPosition(markerPoint);
      this.idleAnimationFrame = window.requestAnimationFrame(drift);
    };

    this.idleAnimationFrame = window.requestAnimationFrame(drift);
  }

  hideMarker() {
    this.markerPoint = null;
    this.markerElement.hidden = true;
    this.markerElement.classList.remove("is-ultra-tiny");
    this.markerElement.style.left = "50%";
    this.markerElement.style.top = "50%";
  }

  animateViewBox(toBox, duration) {
    this.cancelAnimation();

    const fromBox = parseViewBox(this.svg);

    if (boxesAreClose(fromBox, toBox)) {
      this.svg.setAttribute("viewBox", formatViewBox(toBox));
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const startTime = performance.now();

      const tick = (now) => {
        const rawProgress = Math.min((now - startTime) / duration, 1);
        const progress = easeInOutCubic(rawProgress);
        const nextBox = {
          x: mix(fromBox.x, toBox.x, progress),
          y: mix(fromBox.y, toBox.y, progress),
          width: mix(fromBox.width, toBox.width, progress),
          height: mix(fromBox.height, toBox.height, progress),
        };

        this.svg.setAttribute("viewBox", formatViewBox(nextBox));

        if (rawProgress < 1) {
          this.animationFrame = window.requestAnimationFrame(tick);
          return;
        }

        this.animationFrame = 0;
        resolve();
      };

      this.animationFrame = window.requestAnimationFrame(tick);
    });
  }

  clearActive() {
    if (!this.activeCountry) {
      return;
    }

    this.getPaths(this.activeCountry).forEach((path) => {
      path.classList.remove("is-active");
      path.classList.remove("is-micro-active");
      path.classList.remove("is-tiny-active");
    });

    this.activeCountry = null;
  }

  markFound(country) {
    this.getPaths(country).forEach((path) => {
      path.classList.remove("is-active");
      path.classList.remove("is-micro-active");
      path.classList.remove("is-tiny-active");
      path.classList.add("is-found");
    });
  }

  clearFound() {
    [...this.svg.querySelectorAll(".is-found")].forEach((path) => {
      path.classList.remove("is-found");
    });
  }

  getPaths(country) {
    return this.countryPaths.get(country.toLowerCase()) || [];
  }

  getCountryViewBox(country) {
    const paths = this.getPaths(country);

    if (!paths.length) {
      return null;
    }

    const boxes = paths.map((path) => path.getBBox()).filter((pathBox) => pathBox.width || pathBox.height);

    if (!boxes.length) {
      return null;
    }

    const combinedBox = getCombinedBoxFromBoxes(boxes);
    const box = getFocusBox(boxes, combinedBox);
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const viewportRatio = window.innerWidth / window.innerHeight;
    const targetRatio = Math.max(box.width, 1) / Math.max(box.height, 1);
    const isTinyTarget = box.width < CAMERA.tinyTargetSize || box.height < CAMERA.tinyTargetSize;
    const isMicroTarget = box.width < CAMERA.microTargetSize || box.height < CAMERA.microTargetSize;
    const softZoom = getSoftZoomProgress(box);
    const padding = mix(CAMERA.normalPadding, CAMERA.tinyPadding, softZoom);
    const minWidth = mix(CAMERA.minWidth, CAMERA.tinyMinWidth, softZoom);
    const minHeight = mix(CAMERA.minHeight, CAMERA.tinyMinHeight, softZoom);

    let viewWidth = Math.max(box.width * padding, minWidth);
    let viewHeight = Math.max(box.height * padding, minHeight);

    if (targetRatio < viewportRatio) {
      viewWidth = Math.max(viewWidth, viewHeight * viewportRatio);
    } else {
      viewHeight = Math.max(viewHeight, viewWidth / viewportRatio);
    }

    return {
      box,
      combinedBox,
      markerPoint: {
        x: centerX,
        y: centerY,
      },
      isTinyTarget,
      isMicroTarget,
      viewBox: {
        x: centerX - viewWidth / 2,
        y: centerY - viewHeight / 2,
        width: viewWidth,
        height: viewHeight,
      },
    };
  }

  async zoomToCountry(country) {
    const target = this.getCountryViewBox(country);

    if (!target) {
      return null;
    }

    this.clearActive();
    this.hideMarker();
    await this.animateViewBox(DEFAULT_VIEW_BOX, CAMERA.zoomOutDuration);

    this.getPaths(country).forEach((path) => {
      path.classList.add("is-active");

      if (target.isTinyTarget) {
        path.classList.add("is-tiny-active");
      }

      if (target.isMicroTarget) {
        path.classList.add("is-micro-active");
      }
    });
    this.activeCountry = country;
    await this.animateViewBox(target.viewBox, CAMERA.zoomInDuration);
    this.markerElement.classList.toggle("is-ultra-tiny", target.isMicroTarget);
    this.markerElement.hidden = !target.isTinyTarget;
    this.markerPoint = target.isTinyTarget ? target.markerPoint : null;
    this.updateMarkerPosition();
    this.startIdleDrift(target.viewBox, target.markerPoint);

    return target;
  }
}

window.GeoMaster.MapController = MapController;
})();
