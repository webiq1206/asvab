import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Modal, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { purchaseService } from '@/services/purchaseService';

interface WhiteboardProps {
  isVisible: boolean;
  onClose: () => void;
  onUpgradeRequired?: () => void;
  branch?: MilitaryBranch;
  savedData?: string; // Base64 encoded drawing data
  onSaveData?: (data: string) => void;
}

interface DrawingPath {
  path: any;
  color: string;
  strokeWidth: number;
  tool: 'pen' | 'eraser';
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  isVisible,
  onClose,
  onUpgradeRequired,
  branch,
  savedData,
  onSaveData,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    if (isVisible) {
      checkAccess();
      loadSavedData();
    }
  }, [isVisible]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const access = await purchaseService.checkSubscriptionGate('whiteboard');
      setHasAccess(access);
      
      if (!access && onUpgradeRequired) {
        onUpgradeRequired();
        return;
      }
    } catch (error) {
      console.error('Failed to check whiteboard access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedData = () => {
    if (savedData) {
      try {
        // TODO: Implement loading of saved drawing data
        console.log('Loading saved drawing data:', savedData);
      } catch (error) {
        console.error('Failed to load saved drawing:', error);
      }
    }
  };

  const handleSave = useCallback(() => {
    if (!onSaveData) return;

    try {
      // TODO: Implement saving of drawing data to base64
      const drawingData = JSON.stringify(paths);
      const base64Data = btoa(drawingData);
      onSaveData(base64Data);
      
      Alert.alert(
        'Drawing Saved',
        'Your whiteboard has been saved successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to save drawing:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save your drawing. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [paths, onSaveData]);

  const handleClear = useCallback(() => {
    Alert.alert(
      'Clear Whiteboard',
      'Are you sure you want to clear all your work? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setPaths([]);
            if (canvasRef.current?.clear) {
              canvasRef.current.clear();
            }
          }
        },
      ]
    );
  }, []);

  const handleUndo = useCallback(() => {
    if (canvasRef.current?.undo) {
      canvasRef.current.undo();
    }
  }, []);

  const getMilitaryTitle = (): string => {
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "TACTICAL PLANNING BOARD";
      case MilitaryBranch.NAVY:
        return "NAVIGATION PLOTTING BOARD";
      case MilitaryBranch.AIR_FORCE:
        return "FLIGHT PLANNING BOARD";
      case MilitaryBranch.MARINES:
        return "COMBAT OPERATIONS BOARD";
      case MilitaryBranch.COAST_GUARD:
        return "RESCUE PLANNING BOARD";
      case MilitaryBranch.SPACE_FORCE:
        return "MISSION CONTROL BOARD";
      default:
        return "DIGITAL WHITEBOARD";
    }
  };

  const getMilitarySubtitle = (): string => {
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "Plan your tactical approach, Soldier";
      case MilitaryBranch.NAVY:
        return "Chart your course, Sailor";
      case MilitaryBranch.AIR_FORCE:
        return "Map your flight path, Airman";
      case MilitaryBranch.MARINES:
        return "Strategize your mission, Marine";
      case MilitaryBranch.COAST_GUARD:
        return "Plan your rescue operation, Coastie";
      case MilitaryBranch.SPACE_FORCE:
        return "Plot your trajectory, Guardian";
      default:
        return "Work out your solutions";
    }
  };

  if (!hasAccess) {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.DARK_OLIVE }]}>
          <View style={[styles.header, { borderBottomColor: branchColor }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={[styles.title, { color: branchColor }]}>
              PREMIUM REQUIRED
            </Text>
            <Text style={styles.subtitle}>
              Whiteboard access is classified
            </Text>
          </View>

          <View style={styles.premiumContent}>
            <View style={[styles.lockIcon, { backgroundColor: `${branchColor}20` }]}>
              <Ionicons name="lock-closed" size={48} color={branchColor} />
            </View>
            
            <Text style={styles.premiumTitle}>
              Digital Whiteboard Requires Premium Access
            </Text>
            
            <Text style={styles.premiumMessage}>
              The tactical planning board is available to premium subscribers only. 
              Upgrade to access the digital whiteboard for working out complex problems 
              and mathematical calculations.
            </Text>

            {onUpgradeRequired && (
              <TouchableOpacity
                style={[styles.upgradeButton, { backgroundColor: branchColor }]}
                onPress={onUpgradeRequired}
              >
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>UPGRADE TO PREMIUM</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.DARK_OLIVE }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: branchColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: branchColor }]}>
              {getMilitaryTitle()}
            </Text>
            <Text style={styles.subtitle}>
              {getMilitarySubtitle()}
            </Text>
          </View>

          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Ionicons name="save" size={20} color={theme.colors.SUCCESS} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Whiteboard Canvas */}
          <View style={styles.canvasContainer}>
            <WhiteboardCanvas
              ref={canvasRef}
              isEnabled={!loading}
              currentTool={currentTool}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              onPathsChange={setPaths}
              initialPaths={paths}
            />
          </View>

          {/* Toolbar */}
          <WhiteboardToolbar
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            strokeColor={strokeColor}
            onColorChange={setStrokeColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            onClear={handleClear}
            onUndo={handleUndo}
            onSave={handleSave}
            canUndo={paths.length > 0}
            branch={userBranch}
          />

          {/* Instructions */}
          <View style={[styles.instructions, { backgroundColor: `${branchColor}10` }]}>
            <Ionicons name="information-circle" size={16} color={branchColor} />
            <Text style={styles.instructionsText}>
              Use your finger to draw, take notes, or work out calculations. 
              Your work is automatically saved during the quiz session.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 2,
  },
  closeButton: {
    padding: theme.spacing[2],
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    marginBottom: theme.spacing[1],
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  saveButton: {
    padding: theme.spacing[2],
  },
  content: {
    flex: 1,
    padding: theme.spacing[4],
    gap: theme.spacing[4],
  },
  canvasContainer: {
    alignItems: 'center',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing[2],
  },
  instructionsText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    flex: 1,
    lineHeight: 18,
  },
  premiumContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[6],
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  premiumTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xl,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  premiumMessage: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing[6],
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing[2],
  },
  upgradeButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
  },
});