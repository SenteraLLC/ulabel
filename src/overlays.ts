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
     * Update the overlay to obscure the parts of the image that fall outside of the distance filter.
     */
    public updateOverlay(polyline_annotations: ULabelAnnotation[]) {

    }
}