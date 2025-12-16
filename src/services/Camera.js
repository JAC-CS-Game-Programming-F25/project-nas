import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

export default class Camera {
    constructor(state) {
        this.state = state;
        this.x = 0;
        this.y = 0;
        this.zoom = 1.6;
        this.minZoom = 1.6;
        this.maxZoom = 3.0;
        this.handleWheel = null;
        
        // Screen shake properties
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1.6;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
    }

    /**
     * Trigger a screen shake effect
     * @param {number} intensity - How violent the shake is (pixels)
     * @param {number} duration - How long the shake lasts (seconds)
     */
    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    setupZoomControls() {
        this.handleWheel = (event) => {
            // //console.log("Wheel event detected!", event.deltaY);
            event.preventDefault();
            event.stopPropagation();
            
            // Zoom in/out based on wheel direction
            const zoomSpeed = 0.1;
            const zoomDelta = event.deltaY > 0 ? -zoomSpeed : zoomSpeed;
            
            const oldZoom = this.zoom;
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + zoomDelta));
            
            // //console.log("Zoom changed from", oldZoom.toFixed(2), "to", this.zoom.toFixed(2));
        };
        
        // Add event listener to window for broader capture
        window.addEventListener('wheel', this.handleWheel, { passive: false });
        //console.log("Zoom controls set up!");
    }

    cleanup() {
        if (this.handleWheel) {
            window.removeEventListener('wheel', this.handleWheel);
        }
    }

    update(dt) {
        if (!this.state.player) return;

        const playerCenter = this.state.player.getCenterPosition();
        
        // Update shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt || 0.016; // Default to 60fps if dt missing
            if (this.shakeTimer <= 0) {
                this.shakeTimer = 0;
                this.shakeOffsetX = 0;
                this.shakeOffsetY = 0;
            } else {
                // Calculate shake offset
                const progress = this.shakeTimer / this.shakeDuration;
                const currentIntensity = this.shakeIntensity * progress;
                
                this.shakeOffsetX = (Math.random() * 2 - 1) * currentIntensity;
                this.shakeOffsetY = (Math.random() * 2 - 1) * currentIntensity;
            }
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }
        
        // Center camera on player with shake
        this.x = playerCenter.x - CANVAS_WIDTH / 2 + this.shakeOffsetX;
        this.y = playerCenter.y - CANVAS_HEIGHT / 2 + this.shakeOffsetY;
    }

    applyTransform(context) {
        // Save context for camera and zoom transformation
        context.save();
        
        // Apply zoom from center of screen
        context.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        context.scale(this.zoom, this.zoom);
        context.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
        
        // Apply camera offset
        context.translate(-this.x, -this.y);
    }

    restoreTransform(context) {
        context.restore();
    }

    getViewportDimensions() {
        const zoomMultiplier = 1 / this.zoom;
        // Much larger viewport to ensure entire visible area loads at any zoom level
        const viewWidth = CANVAS_WIDTH * zoomMultiplier * 8; 
        const viewHeight = CANVAS_HEIGHT * zoomMultiplier * 8;
        return { width: viewWidth, height: viewHeight };
    }
}
