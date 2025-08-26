import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, PanResponder } from 'react-native';
import { Canvas, Path, Skia, SkPath, useDrawCallback } from '@shopify/react-native-skia';
import { theme } from '@/constants/theme';

interface DrawingPath {
  path: SkPath;
  color: string;
  strokeWidth: number;
  tool: 'pen' | 'eraser';
}

interface WhiteboardCanvasProps {
  isEnabled: boolean;
  currentTool: 'pen' | 'eraser';
  strokeColor: string;
  strokeWidth: number;
  onPathsChange?: (paths: DrawingPath[]) => void;
  initialPaths?: DrawingPath[];
  style?: any;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CANVAS_WIDTH = screenWidth - (theme.spacing[4] * 2);
const CANVAS_HEIGHT = Math.min(screenHeight * 0.4, 300);

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  isEnabled = true,
  currentTool,
  strokeColor,
  strokeWidth,
  onPathsChange,
  initialPaths = [],
  style,
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>(initialPaths);
  const currentPathRef = useRef<SkPath | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (onPathsChange) {
      onPathsChange(paths);
    }
  }, [paths, onPathsChange]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => isEnabled,
      onMoveShouldSetPanResponderCapture: () => isEnabled,
      onPanResponderGrant: (event) => {
        if (!isEnabled) return;

        const { locationX, locationY } = event.nativeEvent;
        
        // Create new path
        const newPath = Skia.Path.Make();
        newPath.moveTo(locationX, locationY);
        currentPathRef.current = newPath;
        setIsDrawing(true);
      },
      onPanResponderMove: (event) => {
        if (!isEnabled || !currentPathRef.current) return;

        const { locationX, locationY } = event.nativeEvent;
        currentPathRef.current.lineTo(locationX, locationY);
        
        // Force re-render by creating new paths array
        setPaths(prev => [...prev]);
      },
      onPanResponderRelease: () => {
        if (!isEnabled || !currentPathRef.current) return;

        // Add completed path to paths array
        const newDrawingPath: DrawingPath = {
          path: currentPathRef.current,
          color: currentTool === 'eraser' ? 'transparent' : strokeColor,
          strokeWidth: currentTool === 'eraser' ? strokeWidth * 2 : strokeWidth,
          tool: currentTool,
        };

        setPaths(prev => [...prev, newDrawingPath]);
        currentPathRef.current = null;
        setIsDrawing(false);
      },
      onPanResponderTerminate: () => {
        if (currentPathRef.current) {
          currentPathRef.current = null;
          setIsDrawing(false);
        }
      },
    })
  ).current;

  const onDraw = useDrawCallback((canvas, info) => {
    // Clear canvas with white background
    canvas.clear(Skia.Color('#FFFFFF'));

    // Draw all completed paths
    paths.forEach((drawingPath) => {
      const paint = Skia.Paint();
      
      if (drawingPath.tool === 'eraser') {
        paint.setBlendMode(5); // Clear blend mode
        paint.setStrokeWidth(drawingPath.strokeWidth);
        paint.setStyle(1); // Stroke style
      } else {
        paint.setColor(Skia.Color(drawingPath.color));
        paint.setStrokeWidth(drawingPath.strokeWidth);
        paint.setStyle(1); // Stroke style
        paint.setStrokeCap(1); // Round cap
        paint.setStrokeJoin(1); // Round join
        paint.setAntiAlias(true);
      }

      canvas.drawPath(drawingPath.path, paint);
    });

    // Draw current path being drawn
    if (currentPathRef.current && isDrawing) {
      const paint = Skia.Paint();
      
      if (currentTool === 'eraser') {
        paint.setBlendMode(5); // Clear blend mode
        paint.setStrokeWidth(strokeWidth * 2);
        paint.setStyle(1); // Stroke style
      } else {
        paint.setColor(Skia.Color(strokeColor));
        paint.setStrokeWidth(strokeWidth);
        paint.setStyle(1); // Stroke style
        paint.setStrokeCap(1); // Round cap
        paint.setStrokeJoin(1); // Round join
        paint.setAntiAlias(true);
      }

      canvas.drawPath(currentPathRef.current, paint);
    }
  }, [paths, isDrawing, currentTool, strokeColor, strokeWidth]);

  const clearCanvas = useCallback(() => {
    setPaths([]);
    currentPathRef.current = null;
    setIsDrawing(false);
  }, []);

  const undoLastPath = useCallback(() => {
    setPaths(prev => prev.slice(0, -1));
  }, []);

  // Expose methods to parent component
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    clear: clearCanvas,
    undo: undoLastPath,
    getPaths: () => paths,
    setPaths: (newPaths: DrawingPath[]) => setPaths(newPaths),
  }));

  return (
    <View style={[styles.container, style]} {...panResponder.panHandlers}>
      <Canvas
        style={styles.canvas}
        onDraw={onDraw}
      />
      
      {/* Visual feedback for disabled state */}
      {!isEnabled && (
        <View style={styles.disabledOverlay}>
          {/* Overlay is handled by parent component */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    borderColor: theme.colors.KHAKI,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});