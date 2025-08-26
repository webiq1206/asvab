import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { Canvas, Path, Skia, TouchInfo, useTouchHandler } from '@shopify/react-native-skia';
import { theme } from '@/constants/theme';
import { MilitaryButton } from '../UI/MilitaryButton';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';

interface WhiteboardModalProps {
  visible: boolean;
  onClose: () => void;
  data: string;
  onSave: (data: string) => void;
  branch: MilitaryBranch;
}

const { width, height } = Dimensions.get('window');

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({
  visible,
  onClose,
  data,
  onSave,
  branch,
}) => {
  const [paths, setPaths] = useState<any[]>([]);
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const pathRef = useRef<any>();

  const branchColor = theme.branchColors[branch];

  const colors = [
    '#FFFFFF', // White
    branchColor, // Branch color
    theme.colors.TACTICAL_ORANGE,
    theme.colors.SUCCESS,
    theme.colors.DANGER,
    theme.colors.KHAKI,
  ];

  const strokeWidths = [1, 3, 5, 8];

  const touchHandler = useTouchHandler({
    onStart: (touchInfo: TouchInfo) => {
      const { x, y } = touchInfo;
      const newPath = Skia.Path.Make();
      newPath.moveTo(x, y);
      pathRef.current = {
        path: newPath,
        color: currentColor,
        strokeWidth,
      };
    },
    onActive: (touchInfo: TouchInfo) => {
      const { x, y } = touchInfo;
      if (pathRef.current) {
        pathRef.current.path.lineTo(x, y);
        setPaths(prevPaths => [...prevPaths.slice(0, -1), pathRef.current]);
      }
    },
    onEnd: () => {
      if (pathRef.current) {
        setPaths(prevPaths => [...prevPaths, pathRef.current]);
        pathRef.current = null;
      }
    },
  });

  const handleClear = () => {
    Alert.alert(
      'Clear Whiteboard',
      'Are you sure you want to clear all your work?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setPaths([]);
            onSave('');
          }
        },
      ]
    );
  };

  const handleSave = () => {
    // In a real implementation, you'd serialize the paths
    // For now, we'll just save a placeholder
    const serializedData = JSON.stringify({
      paths: paths.length,
      timestamp: Date.now(),
    });
    onSave(serializedData);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <MilitaryCard variant="command" branch={branch} style={styles.card}>
          <MilitaryCardHeader
            title="DIGITAL WHITEBOARD"
            subtitle="Premium scratch paper for calculations"
            variant="command"
            rightContent={
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.KHAKI}
                onPress={onClose}
              />
            }
          />

          <MilitaryCardContent style={styles.content}>
            {/* Toolbar */}
            <View style={styles.toolbar}>
              {/* Color Picker */}
              <View style={styles.colorSection}>
                <Text style={styles.toolLabel}>COLOR</Text>
                <View style={styles.colorPicker}>
                  {colors.map(color => (
                    <View
                      key={color}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        currentColor === color && styles.selectedColor,
                      ]}
                      onTouchEnd={() => setCurrentColor(color)}
                    />
                  ))}
                </View>
              </View>

              {/* Stroke Width Picker */}
              <View style={styles.strokeSection}>
                <Text style={styles.toolLabel}>SIZE</Text>
                <View style={styles.strokePicker}>
                  {strokeWidths.map(width => (
                    <View
                      key={width}
                      style={[
                        styles.strokeButton,
                        strokeWidth === width && styles.selectedStroke,
                      ]}
                      onTouchEnd={() => setStrokeWidth(width)}
                    >
                      <View
                        style={[
                          styles.strokePreview,
                          {
                            width: width * 2 + 4,
                            height: width * 2 + 4,
                            borderRadius: (width * 2 + 4) / 2,
                            backgroundColor: currentColor,
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Canvas */}
            <View style={styles.canvasContainer}>
              <Canvas
                style={styles.canvas}
                onTouch={touchHandler}
              >
                {paths.map((pathData, index) => (
                  <Path
                    key={index}
                    path={pathData.path}
                    color={pathData.color}
                    style="stroke"
                    strokeWidth={pathData.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                ))}
                {pathRef.current && (
                  <Path
                    path={pathRef.current.path}
                    color={pathRef.current.color}
                    style="stroke"
                    strokeWidth={pathRef.current.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                )}
              </Canvas>
              
              {/* Grid Background */}
              <View style={styles.gridBackground} pointerEvents="none">
                {Array.from({ length: 20 }, (_, i) => (
                  <View key={`h-${i}`} style={[styles.gridLine, styles.horizontalLine, { top: (i * 20) }]} />
                ))}
                {Array.from({ length: 15 }, (_, i) => (
                  <View key={`v-${i}`} style={[styles.gridLine, styles.verticalLine, { left: (i * 20) }]} />
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <MilitaryButton
                title="Clear All"
                onPress={handleClear}
                variant="secondary"
                style={styles.clearButton}
                icon="trash"
              />

              <View style={styles.saveButtons}>
                <MilitaryButton
                  title="Cancel"
                  onPress={onClose}
                  variant="secondary"
                  style={styles.cancelButton}
                />
                
                <MilitaryButton
                  title="Save & Close"
                  onPress={handleSave}
                  variant="primary"
                  branch={branch}
                  style={styles.saveButton}
                  icon="checkmark"
                />
              </View>
            </View>

            {/* Premium Badge */}
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={16} color={theme.colors.TACTICAL_ORANGE} />
              <Text style={styles.premiumText}>PREMIUM FEATURE</Text>
            </View>
          </MilitaryCardContent>
        </MilitaryCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DARK_OLIVE,
    padding: theme.spacing[2],
  },
  card: {
    flex: 1,
    margin: 0,
  },
  content: {
    flex: 1,
    padding: theme.spacing[4],
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: `${theme.colors.MILITARY_GREEN}40`,
    borderRadius: theme.borderRadius.base,
  },
  colorSection: {
    flex: 1,
    marginRight: theme.spacing[4],
  },
  strokeSection: {
    flex: 1,
  },
  toolLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: theme.colors.TACTICAL_ORANGE,
    borderWidth: 3,
  },
  strokePicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  strokeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStroke: {
    borderColor: theme.colors.TACTICAL_ORANGE,
  },
  strokePreview: {
    backgroundColor: '#FFFFFF',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: theme.borderRadius.base,
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  gridBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: `${theme.colors.KHAKI}20`,
  },
  horizontalLine: {
    left: 0,
    right: 0,
    height: 1,
  },
  verticalLine: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing[4],
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.DANGER,
    flex: 0.3,
  },
  saveButtons: {
    flexDirection: 'row',
    flex: 0.6,
    gap: theme.spacing[2],
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderColor: theme.colors.KHAKI,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.TACTICAL_ORANGE,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing[3],
    padding: theme.spacing[2],
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}20`,
    borderRadius: theme.borderRadius.sm,
  },
  premiumText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.TACTICAL_ORANGE,
    marginLeft: theme.spacing[2],
  },
});