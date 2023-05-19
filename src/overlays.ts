import { ULabelAnnotation } from "./annotation"
import { ULabelSpatialPayload2D } from "./geometric_utils"

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

    public drawCircle(x_position, y_position, radius) {
        // Start the shape
        this.context.beginPath()

        // Draw the outline of a circle around the x and y positions with a radius of radius
        this.context.arc(x_position, y_position, radius, 0, 2 * Math.PI)

        // Fill the circle
        this.context.fill()

        // Actually apply the shape to the canvas
        this.context.stroke()
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
    private updateOverlay__single(polyline_annotations: ULabelAnnotation[], distance: number, zoom_val: number) {
        console.log("updateOverlay__single")

        // Fill the entire canvas with the overlay that we'll subtract from
        this.context.globalCompositeOperation = "source-over" // Resetting default
        this.context.fillStyle = "#000000"
        this.context.globalAlpha = 0.8
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

        // Create a white square
        this.context.globalCompositeOperation = "destination-out"
        this.context.fillStyle = "#FFFFFF"
        this.context.globalAlpha = 1
        this.context.fillRect(150,150,200,200)

        //this.drawCircle(400, 300, 50)



        polyline_annotations.forEach(annotation => {

            const spatial_payload: ULabelSpatialPayload2D = annotation.spatial_payload

            for (let idx = 0; idx < spatial_payload.length - 1; idx++) {
                // Look at segment endpoints in pairs
                const endpoint_1: [number,number] = spatial_payload[idx]
                const endpoint_2: [number,number] = spatial_payload[idx + 1]

                // Scale each endpoint by the zoom_val
                let x1: number = endpoint_1[0] * zoom_val
                let y1: number = endpoint_1[1] * zoom_val
                let x2: number = endpoint_2[0] * zoom_val
                let y2: number = endpoint_2[1] * zoom_val

                // Only on the first time through draw a circle around the first endpoint
                if (idx === 0) this.drawCircle(x1, y1, distance)
                
                // Draw an endpoint around the second endpoint
                this.drawCircle(x2, y2, distance)
            }
        })
    }

    /**
     * Handles updating the overlay when the filter is in multi class mode.
     */
    private updateOverlay__multi(polyline_annotations: ULabelAnnotation[], distance: number, zoom_val: number) {
        console.log("updateOverlay__multi")
    }

    /**
     * Update the overlay to obscure the parts of the image that fall outside of the distance filter.
     */
    public updateOverlay(polyline_annotations: ULabelAnnotation[], distance: number = 50, zoom_val: number, multi_class_mode: boolean = null) {
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
        multi_class_mode ? this.updateOverlay__multi(polyline_annotations, distance, zoom_val) : this.updateOverlay__single(polyline_annotations, distance, zoom_val)
    }
}