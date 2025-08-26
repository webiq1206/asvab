import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch, Question } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

interface QuestionBookmarkProps {
  question: Question;
  isBookmarked: boolean;
  onToggleBookmark: (questionId: string, note?: string) => void;
  onAddNote?: (questionId: string, note: string) => void;
  existingNote?: string;
  branch?: MilitaryBranch;
}

export const QuestionBookmark: React.FC<QuestionBookmarkProps> = ({
  question,
  isBookmarked,
  onToggleBookmark,
  onAddNote,
  existingNote = '',
  branch,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState(existingNote);

  const handleBookmarkPress = () => {
    if (!isBookmarked) {
      // If not bookmarked, show note modal for optional note
      setShowNoteModal(true);
    } else {
      // If already bookmarked, toggle off
      onToggleBookmark(question.id);
    }
  };

  const handleSaveNote = () => {
    if (onAddNote && noteText.trim()) {
      onAddNote(question.id, noteText.trim());
    }
    onToggleBookmark(question.id, noteText.trim());
    setShowNoteModal(false);
  };

  const handleCancelNote = () => {
    if (!isBookmarked) {
      // If wasn't bookmarked before, just bookmark without note
      onToggleBookmark(question.id);
    }
    setShowNoteModal(false);
  };

  const getMilitaryPrompt = (): string => {
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "Mark this question for tactical review, Soldier?";
      case MilitaryBranch.NAVY:
        return "Chart this question for navigation review, Sailor?";
      case MilitaryBranch.AIR_FORCE:
        return "Flag this question for flight review, Airman?";
      case MilitaryBranch.MARINES:
        return "Target this question for combat review, Marine?";
      case MilitaryBranch.COAST_GUARD:
        return "Signal this question for rescue review, Coastie?";
      case MilitaryBranch.SPACE_FORCE:
        return "Lock onto this question for mission review, Guardian?";
      default:
        return "Bookmark this question for review?";
    }
  };

  const getNotePlaceholder = (): string => {
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "Add tactical notes for review...";
      case MilitaryBranch.NAVY:
        return "Add navigation notes for review...";
      case MilitaryBranch.AIR_FORCE:
        return "Add flight notes for review...";
      case MilitaryBranch.MARINES:
        return "Add combat notes for review...";
      case MilitaryBranch.COAST_GUARD:
        return "Add rescue notes for review...";
      case MilitaryBranch.SPACE_FORCE:
        return "Add mission notes for review...";
      default:
        return "Add notes for review...";
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.bookmarkButton,
          isBookmarked && { backgroundColor: `${branchColor}20`, borderColor: branchColor },
        ]}
        onPress={handleBookmarkPress}
      >
        <Ionicons
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          size={20}
          color={isBookmarked ? branchColor : theme.colors.KHAKI}
        />
        {existingNote && (
          <View style={[styles.noteIndicator, { backgroundColor: theme.colors.TACTICAL_ORANGE }]}>
            <Ionicons name="document-text" size={10} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.DARK_OLIVE }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: branchColor }]}>
            <TouchableOpacity onPress={handleCancelNote} style={styles.cancelButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={[styles.modalTitle, { color: branchColor }]}>
                QUESTION REVIEW NOTES
              </Text>
              <Text style={styles.modalSubtitle}>
                {getMilitaryPrompt()}
              </Text>
            </View>

            <TouchableOpacity onPress={handleSaveNote} style={styles.saveButton}>
              <Ionicons name="checkmark" size={24} color={theme.colors.SUCCESS} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {/* Question Preview */}
            <View style={[styles.questionPreview, { borderColor: branchColor }]}>
              <Text style={styles.questionCategory}>
                {question.category.replace(/_/g, ' ')}
              </Text>
              <Text style={styles.questionText} numberOfLines={3}>
                {question.content}
              </Text>
            </View>

            {/* Note Input */}
            <View style={styles.noteSection}>
              <Text style={[styles.noteLabel, { color: branchColor }]}>
                TACTICAL NOTES (Optional)
              </Text>
              <TextInput
                style={[styles.noteInput, { borderColor: branchColor }]}
                placeholder={getNotePlaceholder()}
                placeholderTextColor={theme.colors.KHAKI}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.bookmarkOnlyButton, { borderColor: branchColor }]}
                onPress={handleCancelNote}
              >
                <Ionicons name="bookmark" size={20} color={branchColor} />
                <Text style={[styles.actionButtonText, { color: branchColor }]}>
                  BOOKMARK ONLY
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.saveWithNoteButton, { backgroundColor: branchColor }]}
                onPress={handleSaveNote}
              >
                <Ionicons name="create" size={20} color="#FFFFFF" />
                <Text style={styles.saveWithNoteText}>
                  SAVE WITH NOTES
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tips */}
            <View style={[styles.tips, { backgroundColor: `${theme.colors.INFO}20` }]}>
              <Ionicons name="bulb" size={16} color={theme.colors.INFO} />
              <Text style={styles.tipsText}>
                <Text style={{ fontWeight: 'bold' }}>Pro Tip:</Text> Use notes to record why you 
                missed this question, key concepts to remember, or solution strategies for review.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bookmarkButton: {
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  noteIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 2,
  },
  cancelButton: {
    padding: theme.spacing[2],
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  saveButton: {
    padding: theme.spacing[2],
  },
  modalTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    marginBottom: theme.spacing[1],
  },
  modalSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing[4],
    gap: theme.spacing[4],
  },
  questionPreview: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
  },
  questionCategory: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.TACTICAL_ORANGE,
    marginBottom: theme.spacing[2],
  },
  questionText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  noteSection: {},
  noteLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    marginBottom: theme.spacing[3],
  },
  noteInput: {
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    borderWidth: 2,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing[4],
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    minHeight: 100,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing[2],
  },
  bookmarkOnlyButton: {
    borderWidth: 2,
  },
  saveWithNoteButton: {},
  actionButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
  },
  saveWithNoteText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
  },
  tips: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing[2],
  },
  tipsText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    flex: 1,
    lineHeight: 18,
  },
});