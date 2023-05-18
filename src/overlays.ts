import { ULabelAnnotation } from "./annotation"

/**
 * Basic class to hold generic methods useful for creating overlays.
 */
class ULabelOverlay {
    canvas: HTMLCanvasElement

    constructor() {}

    public createCanvas(canvas_width, canvas_height) {
        // Create the canvas element
        this.canvas = document.createElement("canvas")

        // Overlays should on top of everything, so give it a reasonably large z-index
        this.canvas.style.zIndex = "101"
        this.canvas.style.position = "relative"

        // Set the width and height
        this.canvas.width = canvas_width
        this.canvas.height = canvas_height
    }

    public getCanvas() {
        return this.canvas
    }
}

export class FilterDistanceOverlay extends ULabelOverlay {
    constructor(canvas_width: number, canvas_height: number) {
        super()
        
        this.createCanvas(canvas_width, canvas_height)

        this.canvas.setAttribute("id","ulabel-filter-distance-overlay")
    }

    /**
     * Handles updating the overlay when the filter is in single class mode.
     */
    private updateOverlay__single() {
        console.log("updateOverlay__single")
    }
    /**
     * Handles updating the overlay when the filter is in multi class mode.
     */
    private updateOverlay__multi() {
        console.log("updateOverlay__multi")
    }

    /**
     * Update the overlay to obscure the parts of the image that fall outside of the distance filter.
     */
    public updateOverlay(polyline_annotations: ULabelAnnotation[], multi_class_mode: boolean = null) {

        if (multi_class_mode === null) {
            const multi_checkbox: HTMLInputElement = document.querySelector("#filter-slider-distance-multi-checkbox")
            
            // If the checkbox wasn't found log error
            if (multi_checkbox === null) {
                console.error("filter_points_distance_from_line could not find multi-class checkbox object")

                // If checkbox not found single class is default
                multi_class_mode = false
            }
            else {
                multi_class_mode = multi_checkbox.checked
            }
        }

        // Call the appropriate update_overlay method
        multi_class_mode ? this.updateOverlay__multi() : this.updateOverlay__single()
    }
}