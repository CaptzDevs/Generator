import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { Stage, Layer, Line, Circle, Rect } from "react-konva";

// Context for managing shapes
const ShapesContext = createContext();

export const ShapesProvider = ({ children }) => {
  const stageRef = useRef(null);
  const miniMapRef = useRef(null);

  const [elems, setElems] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [tempLine, setTempLine] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const [selectedShape, setSelectedShape] = useState([]);
  const _CONNECTION_POINT_OFFSET = 0;

  const [isSelecting, setIsSelecting] = useState(false); // Track if selection is happening
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 }); // Initial position

  // Save data to localStorage
  const saveData = useCallback((key, data) => localStorage.setItem(key, JSON.stringify(data)), []);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedShapes = localStorage.getItem("shapes");
    const savedLines = localStorage.getItem("lines");
    if (savedShapes) setElems(JSON.parse(savedShapes));
    if (savedLines) setLines(JSON.parse(savedLines));
  }, []);

  // Handle mouse wheel zooming
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };

    const newPosition = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setPosition(newPosition);
  };

  // Handle mouse move for drawing temporary lines
  const handleMouseMove = (event) => {
    if (selectedPoint) {
      const { clientX, clientY } = event;
  
      // Get stage position and scale
      const stage = stageRef.current;
      const scale = stage.scaleX(); // Assuming scaleX and scaleY are the same
      const stagePosition = stage.position();
  
      // Adjust the mouse position to account for stage position and scale
      const adjustedX = (clientX - stagePosition.x) / scale;
      const adjustedY = (clientY - stagePosition.y) / scale;
  
      setMousePos({ x: adjustedX, y: adjustedY });
  
      setTempLine({
        id: "temp-line",
        points: [
          { nodeId: selectedPoint.nodeId, position: selectedPoint.position, x: selectedPoint.x, y: selectedPoint.y },
          { nodeId: null, position: null, x: adjustedX, y: adjustedY },
        ],
      });
    }
  };
  
  // Handle right click to cancel line drawing
  const handleRightClick = (event) => {
    event.preventDefault();
    setTempLine(null);
    setSelectedPoint(null);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", () => setTempLine(null));
    window.addEventListener("contextmenu", handleRightClick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", () => setTempLine(null));
      window.removeEventListener("contextmenu", handleRightClick);
    };
  }, [selectedPoint,scale]);

  // Handle drag end to update element and line positions
  const handleDragEnd = (id, e) => {
    const { x, y } = e.target.attrs;

    const updatedElems = elems.map((elem) => (elem.id === id ? { ...elem, x, y } : elem));
    setElems(updatedElems);
    saveData("shapes", updatedElems);

    const updatedLines = lines.map((line) => ({
      ...line,
      points: line.points.map((p) => {
        if (p.nodeId === id) {
          const connectedElem = updatedElems.find((el) => el.id === id);
          if (!connectedElem) return p;

          const newPointerPos = {
            top: { x: connectedElem.x + connectedElem.width / 2, y: connectedElem.y + _CONNECTION_POINT_OFFSET },
            bottom: { x: connectedElem.x + connectedElem.width / 2, y: connectedElem.y + connectedElem.height - _CONNECTION_POINT_OFFSET },
            left: { x: connectedElem.x + _CONNECTION_POINT_OFFSET, y: connectedElem.y + connectedElem.height / 2 },
            right: { x: connectedElem.x + connectedElem.width - _CONNECTION_POINT_OFFSET, y: connectedElem.y + connectedElem.height / 2 },

            "top-left": { x: connectedElem.x + _CONNECTION_POINT_OFFSET, y: connectedElem.y + _CONNECTION_POINT_OFFSET },
            "top-right": { x: connectedElem.x + connectedElem.width + _CONNECTION_POINT_OFFSET, y: connectedElem.y + _CONNECTION_POINT_OFFSET },
            "bottom-left": { x: connectedElem.x + _CONNECTION_POINT_OFFSET, y: connectedElem.y + connectedElem.height + _CONNECTION_POINT_OFFSET },
            "bottom-right": { x: connectedElem.x + connectedElem.width + _CONNECTION_POINT_OFFSET, y: connectedElem.y + connectedElem.height + _CONNECTION_POINT_OFFSET },
          };

          return { ...p, x: newPointerPos[p.position].x, y: newPointerPos[p.position].y };
        }
        return p;
      }),
    }));

    setLines(updatedLines);
    saveData("lines", updatedLines);
  };

  // Add a new circle to the canvas
  const addCircle = () => {
    const newElem = {
      id: `circle-${elems.length}`,
      type: "Circle",
      x: 100 + elems.length * 20,
      y: 100,
      radius: 30,
      fill: "blue",
      draggable: true,
    };
    const updatedElems = [...elems, newElem];
    setElems(updatedElems);
    saveData("shapes", updatedElems);
  };

  // Add a new rectangle to the canvas
  const addRectangle = () => {
    const newElem = {
      id: `rect-${elems.length}`,
      type: "Rect",
      x: window.innerWidth / 2 + elems.length * 20,
      y: window.innerHeight / 2 + elems.length * 20,
      width: 200,
      height: 150,
      fill: "oklch(0.556 0 0)",
      cornerRadius: 20,
      draggable: true,
      text: "Editable Text",
      isEditing: false,
      shadowColor: "rgba(0, 0, 0, 0.5)", // Shadow color (black with 50% opacity)
      shadowBlur: 10, // Amount of blur
      shadowOffsetX: 5, // Horizontal offset
      shadowOffsetY: 5, // Vertical offse

      data : {
         // random uid
        uid: 'dasddaasdasada',
      }
    };

    const updatedElems = [...elems, newElem];
    setElems(updatedElems);
    saveData("shapes", updatedElems);
  };

  // Start drawing a line
  const startLine = (shape, nodeId, point) => {

    if (!selectedPoint) {
      setSelectedPoint({ nodeId, position: point.position, x: point.x, y: point.y });
    } else {
      if (selectedPoint.nodeId === nodeId && selectedPoint.position === point.position) {
        setSelectedPoint(null);
        return;
      }

      const newLine = {
        id: `line-${lines.length}`,
        points: [
          { nodeId: selectedPoint.nodeId, position: selectedPoint.position, x: selectedPoint.x, y: selectedPoint.y },
          { nodeId, position: point.position, x: point.x, y: point.y },
        ],
      };
      console.log(shape,'start')
      console.log(selectedPoint,'end')

      const updatedLines = [...lines, newLine];
      setLines(updatedLines);
      saveData("lines", updatedLines);
      setSelectedPoint(null);
      const updatedElems = elems.map((elem) => (elem.id === shape.id ? { ...elem, data : { ...elem.data, lines: updatedLines } } : elem));
      const updatedElems2 = updatedElems.map((elem) => (elem.id === selectedPoint.nodeId ? { ...elem, data : { ...elem.data, lines: updatedLines } } : elem));

      setElems(updatedElems2);
      saveData("shapes", updatedElems2);
    }
  };

  useEffect(()=>{
    console.log(elems,'elems')
  },[elems])

  // Remove a line from the canvas
  const removeLine = (selectedLine) => {
    const updatedLines = lines.filter((line) => line.id !== selectedLine.id);
    setLines(updatedLines);
    saveData("lines", updatedLines);
    document.body.style.cursor = "default";
  };

  // Clear the canvas
  const clearCanvas = () => {
    setElems([]);
    setLines([]);
    localStorage.removeItem("shapes");
    localStorage.removeItem("lines");
  };

  const updateShapeText = (shapeId, newText) =>  {
    const updatedElems = elems.map((elem) => (elem.id === shapeId ? { ...elem, text: newText } : elem));
    setElems(updatedElems);
    saveData("shapes", updatedElems);
  }


const handleSelectionMouseDown = (e) => {
  if (e.target !== e.target.getStage()) return; // Prevent selection when clicking on shapes

  const stage = stageRef.current;
  const pointerPos = stage.getPointerPosition(); // Get correct coordinates inside the stage

  // Create selection box
  const selectionBox = {
    id: "selectionBox",
    type: "selectionBox",
    x: pointerPos.x,
    y: pointerPos.y,
    width: 0,
    height: 0,
    stroke: "blue",
    strokeWidth: 2,
    draggable: false,
  };

  setStartPosition(pointerPos);
  setIsSelecting(true);
  setElems([...elems, selectionBox]);
};

const handleSelectionMouseMove = (e) => {
  if (!isSelecting) return; // Do nothing if we're not selecting

  const { clientX, clientY } = e.evt;
  const stage = stageRef.current;
  const pointerPos = stage.getPointerPosition();

  const newWidth = pointerPos.x - startPosition.x;
  const newHeight = pointerPos.y - startPosition.y;

  console.log(newWidth,newHeight)

  // Update the selection box size based on mouse position
  const updatedSelectionBox = {
    id: 'selectionBox',
    type: 'selectionBox',
    x: startPosition.x,
    y: startPosition.y,
    width: newWidth,
    height: newHeight,
    stroke: "blue",
    strokeWidth: 2,
    draggable: false,
  };

  const newElems = elems.map((elem) =>
    elem.id === 'selectionBox' ? updatedSelectionBox : elem
  );
  setElems(newElems);
  saveData("shapes", newElems);
};

const handleSelectionMouseUp = () => {
  setIsSelecting(false); // End the selection
  // remove selection box

  const removedSelectionBox = elems.filter((elem) =>     elem.id !== 'selectionBox' );

  setElems(removedSelectionBox);
  saveData("shapes", removedSelectionBox);
};


  const selectShape = () =>{
    setSelectedShape(elems[elems.length - 1].id);
  }
 
  const deleteSelectedShape = (selectedShapeId) => {
    const updatedElems = elems.filter((elem) => elem.id !== selectedShapeId);
    setElems(updatedElems);
    saveData("shapes", updatedElems);
  };

  return (
    <ShapesContext.Provider
      value={{
        _CONNECTION_POINT_OFFSET,
        elems,
        lines,
        handleDragEnd,
        addCircle,
        addRectangle,
        startLine,
        stageRef,
        setLines ,
        miniMapRef,
        clearCanvas,
        removeLine,
        tempLine,
        mousePos,
        handleWheel,
        scale,
        position,
        setPosition,
        updateShapeText,
        handleSelectionMouseDown,
        handleSelectionMouseMove,
        handleSelectionMouseUp,
      }}
    >
      {children}
    </ShapesContext.Provider>
  );
};

export const useShapes = () => useContext(ShapesContext);
