import { ULabelAnnotation } from "./annotation"

/**
 * Basic class to hold generic methods useful for creating overlays.
 */
class ULabelOverlay {
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D

    constructor(canvas_width, canvas_height) {
        this.createCanvas(canvas_width, canvas_height)

        this.context = this.canvas.getContext("2d")
    }

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

    /**
     * Clears everything drawn to the canvas. Useful for re-drawing.
     */
    public clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public getCanvas() {
        return this.canvas
    }
}

export class FilterDistanceOverlay extends ULabelOverlay {
    constructor(canvas_width: number, canvas_height: number) {
        super(canvas_width, canvas_height)

        // Set the canvas id so it can be referenced easily outside this class
        this.canvas.setAttribute("id","ulabel-filter-distance-overlay")
    }

    /**
     * Handles updating the overlay when the filter is in single class mode.
     */
    private updateOverlay__single(polyline_annotations: ULabelAnnotation[], distance: number) {
        console.log("updateOverlay__single")

        // Fill the entire canvas with the overlay that we'll subtract from
        this.context.globalCompositeOperation = "source-over" // Resetting default
        this.context.fillStyle = "#000000"
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

        // Create a white square
        this.context.globalCompositeOperation = "destination-out"
        this.context.fillStyle = "#FFFFFF"
        this.context.fillRect(150,150,200,200)

        polyline_annotations.forEach(annotation => {
            const spatial_payload = annotation.spatial_payload
        })
    }

    /**
     * Handles updating the overlay when the filter is in multi class mode.
     */
    private updateOverlay__multi(polyline_annotations: ULabelAnnotation[], distance: number) {
        console.log("updateOverlay__multi")
    }

    /**
     * Update the overlay to obscure the parts of the image that fall outside of the distance filter.
     */
    public updateOverlay(polyline_annotations: ULabelAnnotation[], distance: number = 50, multi_class_mode: boolean = null) {
        // Clear the canvas in order to have a clean slate to re-draw from
        this.clearCanvas()


        // TESTING
        distance = 50


        // If the mode isn't passed in, try to get the current filtering mode from the dom
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
        multi_class_mode ? this.updateOverlay__multi(polyline_annotations, distance) : this.updateOverlay__single(polyline_annotations, distance)
    }
}