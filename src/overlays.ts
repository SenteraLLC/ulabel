import { ULabelAnnotation } from "./annotation"
import { ULabelSpatialPayload2D } from "./geometric_utils"

/**
 * Basic class to hold generic methods useful for creating overlays.
 */
class ULabelOverlay {
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D

    constructor(canvas_width: number, canvas_height: number) {
        this.createCanvas(canvas_width, canvas_height)

        this.context = this.canvas.getContext("2d")
    }

    public createCanvas(canvas_width, canvas_height): void {
        // Create the canvas element
        this.canvas = document.createElement("canvas")

        // Add a class to identify created overlays
        this.canvas.setAttribute("class", "ulabel-overlay")

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
    public clearCanvas(): void {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draws a circle centered at (x_position, y_position) with a radius of the passed in radius.
     * Circle is filled in.
     * 
     * @param x_position x-position of the circle
     * @param y_position y-position of the circle
     * @param radius The radius of the circle
     */
    public drawCircle(x_position: number, y_position: number, radius: number): void {
        // Start the shape
        this.context.beginPath()

        // Draw the outline of a circle around the x and y positions with a radius of radius
        this.context.arc(x_position, y_position, radius, 0, 2 * Math.PI)

        // Fill the circle
        this.context.fill()

        // Actually apply the shape to the canvas
        this.context.stroke()
    }

    /**
     * A method to get a reference to this object's canvas
     * 
     * @returns A reference to this object's canvas
     */
    public getCanvas(): HTMLCanvasElement {
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
     * Given the x and y coordinate of two points, this returns a vector that is perpendicular to 
     * the line between the two points and has a magnitude of 1.
     * 
     * @param x1 Point 1's x coordinate
     * @param y1 Point 1's y coordinate
     * @param x2 Point 2's x coordinate
     * @param y2 Point 2's y coordinate
     * @returns 
     */
    private claculateNormalVector(x1: number, y1: number, x2: number, y2: number): [number, number] {
        // Calculate the x and y of the normal vector
        let normal_x: number = y1 - y2
        let normal_y: number = x2 - x1

        // Create a constant scalar value to divide the normal vector by to make its magnitude 1
        const scalar: number = Math.sqrt((normal_x ** 2) + (normal_y ** 2))

        // Prevent divide by 0 error
        if (scalar === 0) {
            // This will happen when point 1 and point 2 are the same point
            // In which case the concept of a normal vector doesn't really apply
            console.error("claculateNormalVector divide by 0 error")
            return null
        }

        // Set the magnitude equal to 1
        normal_x /= scalar
        normal_y /= scalar

        return [normal_x, normal_y]
    }

    /**
     * 
     * @param x1 
     * @param y1 
     * @param x2 
     * @param y2 
     * @param normal_x 
     * @param normal_y 
     * @param distance 
     */
    private drawParallelogramAroundLineSegment(
        x1: number, 
        y1: number, 
        x2: number, 
        y2: number, 
        normal_x: number, 
        normal_y: number, 
        distance: number
    ): void {
        // Calculate the change in x and y
        const dx = normal_x * distance
        const dy = normal_y * distance

        // Calculate the 4 corners of the parallelogram
        const corner1: [number, number] = [x1 - dx, y1 - dy]
        const corner2: [number, number] = [x1 + dx, y1 + dy]
        const corner3: [number, number] = [x2 + dx, y2 + dy]
        const corner4: [number, number] = [x2 - dx, y2 - dy]

        // Tell the context to begin a new path
        this.context.beginPath()

        this.context.moveTo(corner1[0], corner1[1])   
        this.context.lineTo(corner2[0], corner2[1])   
        this.context.lineTo(corner3[0], corner3[1])   
        this.context.lineTo(corner4[0], corner4[1])   

        this.context.fill()
    }

    /**
     * Handles updating the overlay when the filter is in single class mode.
     */
    private updateOverlay__single(polyline_annotations: ULabelAnnotation[], distance: number, zoom_val: number): void {
        console.log("updateOverlay__single")

        // Fill the entire canvas with the overlay that we'll subtract from
        this.context.globalCompositeOperation = "source-over" // Resetting default
        this.context.fillStyle = "#000000" 
        this.context.globalAlpha = 0.8 // So you can slightly see through the overlay
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height) // Draws the overlay

        // Set it so that all future shapes we draw subtract from the overlay
        this.context.globalCompositeOperation = "destination-out"

        // Reset defalut alpha
        this.context.globalAlpha = 1

        // Subtract from the overlay the parts that should be visible for each annotation
        polyline_annotations.forEach(annotation => {

            // We really don't care about anything in the annotation other than the spatial payload
            const spatial_payload: ULabelSpatialPayload2D = annotation.spatial_payload

            // length - 1 because the final endpoint doesn't have another endpoint to form a pair with
            for (let idx = 0; idx < spatial_payload.length - 1; idx++) {
                // Look at segment endpoints in pairs
                const endpoint_1: [number,number] = spatial_payload[idx]
                const endpoint_2: [number,number] = spatial_payload[idx + 1]

                // Scale each endpoint by the zoom_val
                const x1: number = endpoint_1[0] * zoom_val
                const y1: number = endpoint_1[1] * zoom_val
                const x2: number = endpoint_2[0] * zoom_val
                const y2: number = endpoint_2[1] * zoom_val

                // Get a vector that's perpendicular to endpoint_1 and endpoint_2 and has a magnitude of 1
                const normal_vector: [number, number] = this.claculateNormalVector(x1, y1, x2, y2)
                const normal_x: number = normal_vector[0]
                const normal_y: number = normal_vector[1]

                // Only on the first time through draw a circle around the first endpoint
                if (idx === 0) this.drawCircle(x1, y1, distance)
                
                // Draw an endpoint around the second endpoint
                this.drawCircle(x2, y2, distance)

                // Draw a parallelogram around the polyline segment
                this.drawParallelogramAroundLineSegment(x1, y1, x2, y2, normal_x, normal_y, distance)
            }
        })
    }

    /**
     * Handles updating the overlay when the filter is in multi class mode.
     */
    private updateOverlay__multi(polyline_annotations: ULabelAnnotation[], distance: number, zoom_val: number): void {
        console.log("updateOverlay__multi")
    }

    /**
     * Update the overlay to obscure the parts of the image that fall outside of the distance filter.
     */
    public updateOverlay(
        polyline_annotations: ULabelAnnotation[], 
        distance: number, 
        zoom_val: number, 
        multi_class_mode: boolean = null
    ): void {
        // Clear the canvas in order to have a clean slate to re-draw from
        this.clearCanvas()

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