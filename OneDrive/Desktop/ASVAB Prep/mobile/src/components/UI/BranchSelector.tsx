import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { theme } from '@/constants/theme';
import {
  MilitaryBranch,
  BRANCH_DISPLAY_NAMES,
  BRANCH_INFO,
} from '@asvab-prep/shared';

interface BranchSelectorProps {
  selectedBranch?: MilitaryBranch;
  onSelectBranch: (branch: MilitaryBranch) => void;
  disabled?: boolean;
}

interface BranchOption {
  branch: MilitaryBranch;
  name: string;
  motto: string;
  exclamation: string;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  selectedBranch,
  onSelectBranch,
  disabled = false,
}) => {
  const branches: BranchOption[] = Object.values(MilitaryBranch).map((branch) => ({
    branch,
    name: BRANCH_DISPLAY_NAMES[branch],
    motto: BRANCH_INFO[branch].motto,
    exclamation: BRANCH_INFO[branch].exclamation,
  }));

  const renderBranchItem = ({ item }: { item: BranchOption }) => {
    const isSelected = selectedBranch === item.branch;
    const branchColor = theme.branchColors[item.branch];

    return (
      <TouchableOpacity
        style={[
          styles.branchItem,
          isSelected && { 
            borderColor: branchColor,
            backgroundColor: `${branchColor}10`,
          },
        ]}
        onPress={() => onSelectBranch(item.branch)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <View style={styles.branchHeader}>
          <Text
            style={[
              styles.branchName,
              isSelected && { color: branchColor },
            ]}
          >
            {item.name.toUpperCase()}
          </Text>
          {isSelected && (
            <View style={[styles.selectedIndicator, { backgroundColor: branchColor }]} />
          )}
        </View>
        
        <Text style={styles.branchMotto}>
          {item.motto}
        </Text>
        
        <Text style={[styles.branchExclamation, { color: branchColor }]}>
          {item.exclamation}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SELECT YOUR BRANCH</Text>
      <Text style={styles.subtitle}>
        Choose your military branch to get personalized content and job information
      </Text>
      
      <FlatList
        data={branches}
        renderItem={renderBranchItem}
        keyExtractor={(item) => item.branch}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing[6],
  },
  title: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.DARK_OLIVE,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing[8],
    lineHeight: 24,
  },
  listContent: {
    paddingBottom: theme.spacing[6],
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing[4],
  },
  branchItem: {
    flex: 0.48,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    minHeight: 140,
    ...theme.shadows.base,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  branchName: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    flex: 1,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  branchMotto: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[2],
    lineHeight: 18,
  },
  branchExclamation: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    marginTop: 'auto',
  },
});