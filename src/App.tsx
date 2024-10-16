import './App.css';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState('black');
  const [lineWidth, setLineWidth] = useState(5);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    console.log(newSocket, "Connected to socket");
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const drawOnCanvas = useCallback((data: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const image = new Image();
      image.src = data;
      image.onload = () => {
        ctx!.drawImage(image, 0, 0);
      };
    }
  }, []);

  const addTextToCanvas = useCallback((data: { text: string, x: number, y: number }) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx!.font = '16px Arial';
      ctx!.fillStyle = color;
      ctx!.fillText(data.text, data.x, data.y);
    }
  }, [color]);

  useEffect(() => {
    if (socket) {
      socket.on('canvasImage', drawOnCanvas);
      socket.on('addText', addTextToCanvas);

      return () => {
        socket.off('canvasImage', drawOnCanvas);
        socket.off('addText', addTextToCanvas);
      };
    }
  }, [socket, drawOnCanvas, addTextToCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas!.getContext('2d');
  
    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight * 0.8;
  
      const bufferCanvas = document.createElement('canvas');
      bufferCanvas.width = width;
      bufferCanvas.height = height;
      const bufferCtx = bufferCanvas.getContext('2d');
  
      if (bufferCtx) {
        bufferCtx.drawImage(canvas!, 0, 0);
        canvas!.width = width;
        canvas!.height = height;
        ctx!.drawImage(bufferCanvas, 0, 0);
      }
    };
  
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
  
    const startDrawing = (x: number, y: number) => {
      isDrawing = true;
      [lastX, lastY] = [x, y];
    };
  
    const draw = (x: number, y: number) => {
      if (!isDrawing) return;
  
      ctx!.beginPath();
      ctx!.moveTo(lastX, lastY);
      ctx!.lineTo(x, y);
      ctx!.strokeStyle = color;
      ctx!.lineWidth = lineWidth;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.stroke();
  
      const dataURL = canvas!.toDataURL();
      if (socket) {
        socket.emit('canvasImage', dataURL);
      }
      [lastX, lastY] = [x, y];
    };
  
    const endDrawing = () => {
      isDrawing = false;
    };
  
    const handleMouseDown = (e: MouseEvent) => startDrawing(e.offsetX, e.offsetY);
    const handleMouseMove = (e: MouseEvent) => draw(e.offsetX, e.offsetY);
    const handleTouchStart = (e: TouchEvent) => {
      const rect = canvas!.getBoundingClientRect();
      startDrawing(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    };
    const handleTouchMove = (e: TouchEvent) => {
      const rect = canvas!.getBoundingClientRect();
      draw(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    };
  
    // Add both mouse and touch event listeners
    canvas!.addEventListener('mousedown', handleMouseDown);
    canvas!.addEventListener('mousemove', handleMouseMove);
    canvas!.addEventListener('mouseup', endDrawing);
    canvas!.addEventListener('mouseout', endDrawing);
    canvas!.addEventListener('touchstart', handleTouchStart);
    canvas!.addEventListener('touchmove', handleTouchMove);
    canvas!.addEventListener('touchend', endDrawing);
  
    return () => {
      canvas!.removeEventListener('mousedown', handleMouseDown);
      canvas!.removeEventListener('mousemove', handleMouseMove);
      canvas!.removeEventListener('mouseup', endDrawing);
      canvas!.removeEventListener('mouseout', endDrawing);
      canvas!.removeEventListener('touchstart', handleTouchStart);
      canvas!.removeEventListener('touchmove', handleTouchMove);
      canvas!.removeEventListener('touchend', endDrawing);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [socket, color, lineWidth]);
  

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canvasRef.current && textInput) {
      addTextToCanvas({ text: textInput, x: textPosition.x, y: textPosition.y });
      
      if (socket) {
        socket.emit('addText', { text: textInput, x: textPosition.x, y: textPosition.y });
      }
      
      setIsTyping(false);
      setTextInput('');
    }
  };

  return (
    <div className="white-board-container">
      <canvas
        ref={canvasRef}
        style={{ backgroundColor: 'white', width: '100%', height: '80vh' }}
      />
      {isTyping && (
        <form onSubmit={handleTextSubmit} style={{ position: 'absolute', left: textPosition.x, top: textPosition.y }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            autoFocus
          />
          <button type="submit">Add Text</button>
        </form>
      )}
      <div className='features-container'>
        <div className='color'>
          <h1 className='color-h'>Color: </h1>
          <input 
            className='color-input'
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            title="Choose color"
          />
        </div>
        <div className='thick'>
          <h1 className='color-h'>Brush width: </h1>
          <input 
            className='width-input'
            type="range" 
            min="1" 
            max="20" 
            value={lineWidth} 
            onChange={(e) => setLineWidth(Number(e.target.value))} 
            title="Adjust line width"
          />
        </div>
      </div>
    </div>
  );
}

export default App;