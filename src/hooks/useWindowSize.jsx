// useWindow size
import { useState, useEffect } from "react";

// and  make this depend on scale and position



export default function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });

    

    useEffect(() => {
        function handleResize() {    
            setWindowSize({
                width: window.innerWidth,    
                height: window.innerHeight,
            });
        }
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowSize;
}   