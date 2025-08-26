import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { Slider } from '@react-native-community/slider';

interface WhiteboardToolbarProps {
  currentTool: 'pen' | 'eraser';
  onToolChange: (tool: 'pen' | 'eraser') => void;
  strokeColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onClear: () => void;
  onUndo: () => void;
  onSave?: () => void;
  canUndo: boolean;
  branch?: MilitaryBranch;
  style?: any;
}

const COLORS = [
  '#000000', // Black
  '#FF0000', // Red
  '#0000FF', // Blue
  '#008000', // Green
  '#FFA500', // Orange
  '#800080', // Purple
  '#A52A2A', // Brown
  '#808080', // Gray
];

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  currentTool,
  onToolChange,
  strokeColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onClear,
  onUndo,
  onSave,
  canUndo,
  branch,
  style,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const getToolIcon = (tool: 'pen' | 'eraser'): string => {
    switch (tool) {
      case 'pen': return 'create';
      case 'eraser': return 'remove';
      default: return 'create';
    }
  };

  const getToolName = (tool: 'pen' | 'eraser'): string => {
    switch (tool) {
      case 'pen': return 'PEN';
      case 'eraser': return 'ERASER';
      default: return 'PEN';
    }
  };

  return (
    <View style={[styles.container, { borderColor: branchColor }, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Tools Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: branchColor }]}>TOOLS</Text>
          <View style={styles.toolsContainer}>
            {(['pen', 'eraser'] as const).map((tool) => (
              <TouchableOpacity
                key={tool}
                style={[
                  styles.toolButton,
                  currentTool === tool && { backgroundColor: branchColor },
                ]}
                onPress={() => onToolChange(tool)}
              >
                <Ionicons
                  name={getToolIcon(tool)}
                  size={20}
                  color={currentTool === tool ? '#FFFFFF' : branchColor}
                />
                <Text
                  style={[
                    styles.toolText,
                    { color: currentTool === tool ? '#FFFFFF' : branchColor },
                  ]}
                >
                  {getToolName(tool)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stroke Width Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: branchColor }]}>SIZE</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>{Math.round(strokeWidth)}px</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={20}
              value={strokeWidth}
              onValueChange={onStrokeWidthChange}
              minimumTrackTintColor={branchColor}
              maximumTrackTintColor={theme.colors.KHAKI}
              thumbStyle={{ backgroundColor: branchColor }}
              trackStyle={{ backgroundColor: theme.colors.KHAKI }}
            />
          </View>
        </View>

        {/* Colors Section (only show for pen tool) */}
        {currentTool === 'pen' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: branchColor }]}>COLOR</Text>
            <View style={styles.colorsContainer}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    strokeColor === color && { borderColor: branchColor, borderWidth: 3 },
                  ]}
                  onPress={() => onColorChange(color)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: branchColor }]}>ACTIONS</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { opacity: canUndo ? 1 : 0.5 }]}
              onPress={onUndo}
              disabled={!canUndo}
            >
              <Ionicons name="arrow-undo" size={20} color={branchColor} />
              <Text style={[styles.actionText, { color: branchColor }]}>UNDO</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={onClear}
            >
              <Ionicons name="refresh" size={20} color={theme.colors.DANGER} />
              <Text style={[styles.actionText, { color: theme.colors.DANGER }]}>CLEAR</Text>
            </TouchableOpacity>

            {onSave && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onSave}
              >
                <Ionicons name="save" size={20} color={theme.colors.SUCCESS} />
                <Text style={[styles.actionText, { color: theme.colors.SUCCESS }]}>SAVE</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    padding: theme.spacing[3],
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
  },
  section: {
    alignItems: 'center',
    minWidth: 120,
  },
  sectionTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    marginBottom: theme.spacing[2],
  },
  toolsContainer: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: `${theme.colors.MILITARY_GREEN}30`,
    minWidth: 60,
  },
  toolText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    marginTop: theme.spacing[1],
  },
  sliderContainer: {
    alignItems: 'center',
    minWidth: 100,
  },
  sliderLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing[2],
  },
  slider: {
    width: 100,
    height: 20,
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[1],
    maxWidth: 120,
  },
  colorButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: `${theme.colors.MILITARY_GREEN}30`,
    minWidth: 60,
  },
  actionText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    marginTop: theme.spacing[1],
  },
});