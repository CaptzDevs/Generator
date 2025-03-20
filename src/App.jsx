import React, { useEffect, useState } from "react";
import { ShapesProvider, useShapes } from "@/context/ShapeContext";
import {
  Stage,
  Layer,
  Line,
  Circle,
  Rect,
  Transformer,
  Arrow,
  Text,
} from "react-konva";
import { Button } from "@/components/ui/button";
import { Circle as CircleShape, Eraser, Moon, RouteOff, Square, Sun } from "lucide-react";
import useWindowSize from "./hooks/useWindowSize";

const App = () => {
  return (
    <ShapesProvider>
      <MainContent />
    </ShapesProvider>
  );
};

// ✅ Main Content Component
const MainContent = () => {
  const { addCircle, addRectangle, clearCanvas, setLines } = useShapes();
  const clearLines = () => setLines([]);
  return (
<div className="flex flex-col items-start gap-2 w-full h-screen">
  <div className="flex items-center justify-center gap-2 p-3 w-full rounded-sm absolute bottom-2 left-0 z-50 ">
    <ThemeSwitch />
    <Button onClick={addCircle}><CircleShape /></Button>
    <Button onClick={addRectangle}><Square/></Button>
    <Button onClick={clearCanvas} className="bg-red-500 hover:bg-red-600">
      <Eraser />
    </Button>
    <Button onClick={clearLines} className="bg-red-500 hover:bg-red-600">
      <RouteOff/>
    </Button>
  </div>

  <div className="flex-1 w-full">
    <GridStage />
  </div>
</div>

  
  );
};

// ✅ Grid Stage with Shapes
const GridStage = () => {
  const { stageRef, miniMapRef, handleWheel, scale, position, setPosition  ,
    handleSelectionMouseDown,
    handleSelectionMouseMove,
    handleSelectionMouseUp,
   } = useShapes();
  const [isPanning, setIsPanning] = useState(false);
  const { width : screenWidth , height : screenHeight } = useWindowSize();

  // Detect when Ctrl or Space is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Control" || e.key === " ") setIsPanning(true);
    };
    const handleKeyUp = (e) => {
      if (e.key === "Control" || e.key === " ") setIsPanning(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Handle stage drag for panning
  const handleStageDragMove = (e) => {
    if (isPanning) {
      const stage = stageRef.current;
      setPosition({
        x: stage.x(),
        y: stage.y(),
      });
    }
  };

  // Sync mini-map position and scale with the main stage
  useEffect(() => {
    if (miniMapRef.current) {
      miniMapRef.current.x( position.x * (scale * 0.1)); // Scale down the position
      miniMapRef.current.y(position.y * (scale * 0.1)); // Scale down the position
      miniMapRef.current.batchDraw();
    }
  }, [position, scale]);

  return (
    <div className="relative">
      <Stage
        ref={stageRef}
        width={screenWidth}
        height={screenHeight}
        className="bg-neutral-100 dark:bg-neutral-900"
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={isPanning} // Enable panning only when Ctrl or Space is held

         onMouseDown = {(e)=> { handleSelectionMouseDown(e); }}
         onDragMove = {(e)=> { handleStageDragMove(e) }}
         onMouseMove={(e)=> handleSelectionMouseMove(e) }
         onMouseUp = {(e)=> { handleSelectionMouseUp(e) }}
      >
        
   {/*      <Grid width={screenWidth} height={screenHeight} gridSize={25}/> */}
        {/* <GridRect width={screenWidth} height={screenHeight} gridSize={25} /> */}
        <ShapesLayer />
      </Stage>

      {/* Mini-map preview */}
      <div
        className="rounded-md overflow-hidden"
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 150,
          height: 150,
          border: "1px solid black",
          background: "rgba(255, 255, 255, 0.8)",
          overflow: "hidden",
        }}
      >
        <Stage
          ref={miniMapRef}
          width={150}
          height={150}
          scaleX={scale * 0.1}  // Scale down to make mini-map smaller
          scaleY={scale * 0.1}  // Scale down to make mini-map smaller
          x={position.x * 0.1} // Sync mini-map x (scaled)
          y={position.y * 0.1} // Sync mini-map y (scaled)
        >
          <ShapesLayer />
        </Stage>
      </div>
    </div>
  );
};


// ✅ Render Shapes
const ShapesLayer = () => {
  const { elems, lines, handleDragEnd, startLine, _CONNECTION_POINT_OFFSET } =
    useShapes();

  const [hoveredShapeId, setHoveredShapeId] = useState(null);

  const handleShapeHover = (id) => {
    setHoveredShapeId(id);
  };
  // Function to render connection points
  const renderConnectionPoints = (shape) => {
    const { id, x, y, width = 60, height = 40, radius = 30, type } = shape;
    const size = 4; // Size of connection point
    const offset = _CONNECTION_POINT_OFFSET;
    let points = [];

    if (type === "Circle") {
      // For Circle: calculate points at the center of each side
      points = [
        { x: x, y: y - radius }, // Top
        { x: x, y: y + radius }, // Bottom
        { x: x - radius, y: y }, // Left
        { x: x + radius, y: y }, // Right
      ];
    } else if (type === "Rect") {
      // For Rect: calculate points at the center of each side
      points = [
        { position: "top", x: x + width / 2, y: y + offset }, // Top
        { position: "bottom", x: x + width / 2, y: y + height - offset }, // Bottom
        { position: "left", x: x + offset, y: y + height / 2 }, // Left
        { position: "right", x: x - offset + width, y: y + height / 2 }, // Left

        // add conner
        { position: "top-left", x: x + offset, y: y + offset },
        { position: "top-right", x: x + offset + width, y: y + offset },
        { position: "bottom-left", x: x + offset, y: y + offset + height },
        {
          position: "bottom-right",
          x: x + offset + width,
          y: y + offset + height,
        },
      ];
    }

    return points.map((point, index) => (
      <Circle
        key={`${id}-point-${index}`}
        x={point.x}
        y={point.y}
        radius={size}
        fill="oklch(0.708 0 0)"
        onClick={() => startLine(shape, id, point)}
        onMouseEnter={(e) => {
          document.body.style.cursor = "pointer";
          e.target.stroke("red");
        }}
        onMouseLeave={(e) => {
          document.body.style.cursor = "default";
          e.target.stroke("initial");
        }}
      />
    ));
  };

  const renderLines = () => {
    const { tempLine, removeLine } = useShapes();
    return [...lines, tempLine].filter(Boolean).map((line) => (
      <Arrow
        key={line.id}
        points={[
          line.points[0].x,
          line.points[0].y,
          line.points[1].x,
          line.points[1].y,
        ]}
        stroke="oklch(0.708 0 0)"
        strokeWidth={4}
        dash={line.id === "temp-line" ? [5, 5] : []} // Dashed style for temp line
        onClick={() => removeLine(line)}
        // change color when hover and  change curror when hover
        onMouseEnter={(e) => {
          document.body.style.cursor = "pointer";
          e.target.stroke("red");
        }}
        onMouseLeave={(e) => {
          document.body.style.cursor = "default";
          e.target.stroke("oklch(0.708 0 0)");
        }}
      />
    ));
  };

  return (
    <Layer>
      {renderLines()}
      {elems.map((shape) => (
        <React.Fragment key={shape.id}>
          {shape.type === "Circle" && (
            <Circle
              {...shape}
              onDragMove={(e) => handleDragEnd(shape.id, e)}
              onMouseEnter={() => handleShapeHover(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
            />
          ) 
        }
          {shape.type === "Rect"  && (
            <>
              <Rect
                {...shape}
                onDragMove={(e) => handleDragEnd(shape.id, e)}
                onMouseEnter={() => handleShapeHover(shape.id)}
                onMouseLeave={() => setHoveredShapeId(null)}
                onClick={() => console.log(shape)}
              />
              <Text
                text={shape.text}
                x={shape.x + shape.width/Math.max(shape.text.length,3.5)} // Positioning inside rectangle
                y={shape.y-8 + shape.height / 2}
                fontSize={14}
                fill="white"
                onDragMove={(e) => handleDragEnd(shape.id, e)}
                onMouseEnter={() => handleShapeHover(shape.id)}
                onMouseLeave={() => setHoveredShapeId(null)}
              />
            </>
          )}

        {shape.type === "selectionBox"  && (
           <Rect
                {...shape}
              />
        )}

          {renderConnectionPoints(shape)}
        </React.Fragment>
      ))}
    </Layer>
  );
};

// ✅ Grid
const Grid = ({ width, height, gridSize }) => {
  return (
    <Layer>
      {[...Array(Math.floor(width / gridSize))].map((_, i) => (
        <Line
          key={i}
          points={[i * gridSize, 0, i * gridSize, height]}
          stroke="gray"
          strokeWidth={0.5}
        />
      ))}
      {[...Array(Math.floor(height / gridSize))].map((_, i) => (
        <Line
          key={i}
          points={[0, i * gridSize, width, i * gridSize]}
          stroke="gray"
          strokeWidth={0.5}
        />
      ))}
    </Layer>
  );
};



const GridRect = ({ width, height, gridSize }) => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [characterPos, setCharacterPos] = useState({
    x: 0,
    y: 0,
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate the number of grid cells in both directions
  const cols = Math.floor(width / gridSize);
  const rows = Math.floor(height / gridSize);

  // Create an array of rectangles based on the grid size
  const gridRects = [...Array(cols)].map((_, i) =>
    [...Array(rows)].map((_, j) => ({
      x: i * gridSize,
      y: j * gridSize,
      index: i + j * cols, // Unique index for each grid cell
    }))
  ).flat(); // Flatten the 2D array into a 1D array of rects

  // Handle click event on the grid
  const handleClick = (rect) => {
    alert(`Clicked rect at x: ${rect.x}, y: ${rect.y}, index: ${rect.index}`);
  };

  // Handle character movement
  const moveCharacter = (direction) => {
    const newPosition = { ...characterPos };

    switch (direction) {
      case "up":
        newPosition.y = Math.max(0, newPosition.y - gridSize);
        break;
      case "down":
        newPosition.y = Math.min(windowSize.height - gridSize, newPosition.y + gridSize);
        break;
      case "left":
        newPosition.x = Math.max(0, newPosition.x - gridSize);
        break;
      case "right":
        newPosition.x = Math.min(windowSize.width - gridSize, newPosition.x + gridSize);
        break;
      default:
        break;
    }

    setCharacterPos(newPosition);
  };

  // Handle key presses for movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp") {
        moveCharacter("up");
      } else if (e.key === "ArrowDown") {
        moveCharacter("down");
      } else if (e.key === "ArrowLeft") {
        moveCharacter("left");
      } else if (e.key === "ArrowRight") {
        moveCharacter("right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [characterPos]);

  useEffect(()=>{
    console.log(characterPos)
  },[characterPos])

  return (
    <Layer>
      {/* Create grid rectangles */}
      {gridRects.map((rect) => (
        <Rect
          key={rect.index}
          x={rect.x}
          y={rect.y}
          width={gridSize}
          height={gridSize}
          fill="lightgray"
          stroke="gray"
          strokeWidth={0.5}
          onClick={() => handleClick(rect)} // Handle click to show x, y, and index
        />
      ))}
      
      {/* Character */}
      <Rect
        x={characterPos.x}
        y={characterPos.y}
        width={gridSize}
        height={gridSize}
        fill="red"
        stroke="black"
        strokeWidth={1}
      />
      
    </Layer>
  );
};



// ✅ Theme Switch
const ThemeSwitch = () => {
  const [theme, setTheme] = React.useState(
    localStorage.getItem("theme") || "light"
  );

  React.useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <Button onClick={toggleTheme}>
      {theme === "light" ?  <Sun /> :  <Moon />}
    </Button>
  );
};

export default App;
