
/**
 * Basic class to hold generic methods useful for creating overlays.
 */
class ULabelOverlay {
    canvas: HTMLCanvasElement

    constructor() {}

    public create_canvas(canvas_width, canvas_height) {
        // Create the canvas element
        this.canvas = document.createElement("canvas")

        // Overlays should on top of everything, so give it a reasonably large z-index
        this.canvas.style.zIndex = "101"

        // Set the width and height
        this.canvas.width = canvas_width
        this.canvas.height = canvas_height
    }

    public get_canvas() {
        return this.canvas
    }
}

export class FilterDistanceOverlay extends ULabelOverlay {
    constructor(canvas_width: number, canvas_height: number) {
        super()

        this.create_canvas(canvas_width, canvas_height)
    }

    /**
     * This is a test to draw to the canvas
     */
    public test_draw() {
        console.log(this.canvas)

        const context = this.canvas.getContext("2d")

        context.fillStyle = "FFFFFF"

        context.fillRect(100, 100, 500, 500)

        console.log("FillRect called")
    }
}