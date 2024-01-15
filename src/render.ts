/**
 * Handles conversion from our internal state to SVG elements.
 * This is what is rendered to the screen.
 * 
 * Most of this render code is taken from the original code provided for the assignment.
 */
import { Canvas, svg, preview } from "./canvas";
import { BlockSize } from "./block";
import { State } from "./state";


  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   * 
   */

export const render = (s: State) => {
    // Render the main display canvas
    updateDisplayedCanvas(s.canvas, svg);
    // Render the preview canvas
    updateDisplayedCanvas(s.previewCanvas, preview);
  };
/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
export const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible");
    elem.parentNode!.appendChild(elem);
  };
  
  /**
   * Hides a SVG element on the canvas.
   * @param elem SVG element to hide
   */
export const hide = (elem: SVGGraphicsElement) =>
    elem.setAttribute("visibility", "hidden");
  
  /**
   * Creates an SVG element with the given properties.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
   * element names and properties.
   *
   * @param namespace Namespace of the SVG element
   * @param name SVGElement name
   * @param props Properties to set on the SVG element
   * @returns SVG element
   */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {}
  ) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
  };
  
  /**
   * Transforms the canvas into a 2D array of SVG elements.
   * @param canvas Canvas to transform
   * @returns 2D array of SVG elements
   * 
  */
const transformCanvasToSVG = (canvas: Canvas, svg: SVGGraphicsElement & HTMLElement): SVGElement[][] => {
    // Create a 2D array of SVG elements
    const SVGElements: SVGElement[][] = canvas.map((row, index) => {// for each row in the input canvas
      return row.map((block, colIndex) => { // for each block in the row
        if (block) { // check if there is a block
          const cube = createSvgElement(svg.namespaceURI, "rect", { // create an element for the block
            height: `${BlockSize.HEIGHT}`,
            width: `${BlockSize.WIDTH}`,
            x: `${BlockSize.WIDTH * (colIndex)}`,
            y: `${BlockSize.HEIGHT * (index - 2)}`,
            style: "fill: " + block.colour,
          });
          return cube; // Return the created SVG element
        } else { // Create an empty SVG element for spaces in our canvas with no blocks, this makes TS happy
          const emptyCube = createSvgElement(svg.namespaceURI, "rect", {
            height: `${BlockSize.HEIGHT}`,
            width: `${BlockSize.WIDTH}`,
            x: `${BlockSize.WIDTH * (colIndex)}`,
            y: `${BlockSize.HEIGHT * (index)}`,
            style: "fill: black",
          });
          emptyCube.setAttribute("visibility", "hidden"); // Hide the empty SVG element
          return emptyCube; // Return empty SVG element
        }
      });
    });
    return SVGElements; // return matrix of SVG elements
  };
  
  /**
   * Updates the SVG canvas with a new canvas - impure function
   * @param canvas Canvas to update the SVG canvas with
  */
export const updateDisplayedCanvas = (canvas: Canvas, svg: SVGGraphicsElement & HTMLElement) => {
    // Clear the SVG canvas by removing all child nodes
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
  
    const svgElements = transformCanvasToSVG(canvas, svg); // Transform the canvas to SVG elements
  
    svgElements.forEach((row) => {
      row.forEach((block) => {
        if (block) {
          svg.appendChild(block); // Append each SVG element to the SVG canvas
        }
      });
    });
  };