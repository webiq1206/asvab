import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { 
  Flashcard, 
  FlashcardDifficulty, 
  FlashcardType, 
  QuestionCategory,
  MilitaryBranch 
} from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { flashcardService } from '../../services/flashcardService';
import { MilitaryHeader } from '../common/MilitaryHeader';
import { PremiumGate } from '../common/PremiumGate';

interface Props {
  flashcard?: Flashcard;
  deckId?: string;
  onSave?: (flashcard: Flashcard) => void;
  onCancel?: () => void;
}

export const CreateFlashcardScreen: React.FC<Props> = ({ 
  flashcard, 
  deckId,
  onSave, 
  onCancel 
}) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const queryClient = useQueryClient();

  const [question, setQuestion] = useState(flashcard?.question || '');
  const [answer, setAnswer] = useState(flashcard?.answer || '');
  const [category, setCategory] = useState<QuestionCategory>(
    flashcard?.category || QuestionCategory.GENERAL_SCIENCE
  );
  const [difficulty, setDifficulty] = useState<FlashcardDifficulty>(
    flashcard?.difficulty || FlashcardDifficulty.MEDIUM
  );
  const [type, setType] = useState<FlashcardType>(
    flashcard?.type || FlashcardType.BASIC
  );
  const [explanation, setExplanation] = useState(flashcard?.explanation || '');
  const [hint, setHint] = useState(flashcard?.hint || '');
  const [tags, setTags] = useState(flashcard?.tags?.join(', ') || '');
  const [choices, setChoices] = useState(flashcard?.choices || ['', '', '', '']);
  const [isPublic, setIsPublic] = useState(flashcard?.isPublic || false);

  const isEditing = !!flashcard;

  // Create flashcard mutation
  const createMutation = useMutation({
    mutationFn: flashcardService.createFlashcard,
    onSuccess: (newFlashcard) => {
      queryClient.invalidateQueries({ queryKey: ['userFlashcardDecks'] });
      queryClient.invalidateQueries({ queryKey: ['userFlashcards'] });
      Toast.show({
        type: 'success',
        text1: getMilitaryGreeting().exclamation,
        text2: 'Flashcard created successfully!',
      });
      onSave?.(newFlashcard);
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Mission Failed',
        text2: error.response?.data?.message || 'Failed to create flashcard.',
      });
    },
  });

  // Update flashcard mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      flashcardService.updateFlashcard(id, data),
    onSuccess: (updatedFlashcard) => {
      queryClient.invalidateQueries({ queryKey: ['userFlashcardDecks'] });
      queryClient.invalidateQueries({ queryKey: ['userFlashcards'] });
      Toast.show({
        type: 'success',
        text1: getMilitaryGreeting().exclamation,
        text2: 'Flashcard updated successfully!',
      });
      onSave?.(updatedFlashcard);
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.response?.data?.message || 'Failed to update flashcard.',
      });
    },
  });

  const handleSave = () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Invalid Input', 'Please fill in both question and answer fields.');
      return;
    }

    if (type === FlashcardType.MULTIPLE_CHOICE) {
      const validChoices = choices.filter(choice => choice.trim() !== '');
      if (validChoices.length < 2) {
        Alert.alert('Invalid Input', 'Multiple choice questions need at least 2 choices.');
        return;
      }
    }

    const flashcardData = {
      question: question.trim(),
      answer: answer.trim(),
      category,
      difficulty,
      type,
      explanation: explanation.trim() || undefined,
      hint: hint.trim() || undefined,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      choices: type === FlashcardType.MULTIPLE_CHOICE 
        ? choices.filter(choice => choice.trim() !== '')
        : [],
      deckId: deckId || flashcard?.deckId,
      branchRelevance: [user?.selectedBranch || MilitaryBranch.ARMY],
      isPublic,
    };

    if (isEditing) {
      updateMutation.mutate({ id: flashcard.id, data: flashcardData });
    } else {
      createMutation.mutate(flashcardData);
    }
  };

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const addChoice = () => {
    if (choices.length < 6) {
      setChoices([...choices, '']);
    }
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      const newChoices = choices.filter((_, i) => i !== index);
      setChoices(newChoices);
    }
  };

  const getDifficultyColor = (diff: FlashcardDifficulty) => {
    const colorMap = {
      [FlashcardDifficulty.EASY]: '#2ED573',
      [FlashcardDifficulty.MEDIUM]: '#FFA502',
      [FlashcardDifficulty.HARD]: '#FF4757',
    };
    return colorMap[diff];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader 
        title={isEditing ? 'Edit Flashcard' : 'Create Flashcard'} 
        onBack={onCancel}
      />
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="help-circle" size={20} color={colors.primary} /> Question
          </Text>
          <TextInput
            style={[
              styles.textInput, 
              styles.largeInput,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }
            ]}
            placeholder="Enter your question here..."
            placeholderTextColor={colors.textSecondary}
            value={question}
            onChangeText={setQuestion}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
            {question.length}/500 characters
          </Text>
        </View>

        {/* Answer Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.accent} /> Answer
          </Text>
          <TextInput
            style={[
              styles.textInput, 
              styles.largeInput,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }
            ]}
            placeholder="Enter the correct answer..."
            placeholderTextColor={colors.textSecondary}
            value={answer}
            onChangeText={setAnswer}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
            {answer.length}/500 characters
          </Text>
        </View>

        {/* Card Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="options" size={20} color={colors.primary} /> Card Type
          </Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Picker
              selectedValue={type}
              onValueChange={setType}
              style={[styles.picker, { color: colors.text }]}
            >
              <Picker.Item label="Basic Q&A" value={FlashcardType.BASIC} />
              <Picker.Item label="Multiple Choice" value={FlashcardType.MULTIPLE_CHOICE} />
              <Picker.Item label="True/False" value={FlashcardType.TRUE_FALSE} />
              <Picker.Item label="Fill in Blank" value={FlashcardType.FILL_IN_BLANK} />
            </Picker>
          </View>
        </View>

        {/* Multiple Choice Options */}
        {type === FlashcardType.MULTIPLE_CHOICE && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="list" size={20} color={colors.primary} /> Answer Choices
            </Text>
            {choices.map((choice, index) => (
              <View key={index} style={styles.choiceContainer}>
                <Text style={[styles.choiceLabel, { color: colors.textSecondary }]}>
                  {String.fromCharCode(65 + index)}.
                </Text>
                <TextInput
                  style={[
                    styles.textInput, 
                    styles.choiceInput,
                    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }
                  ]}
                  placeholder={`Choice ${String.fromCharCode(65 + index)}`}
                  placeholderTextColor={colors.textSecondary}
                  value={choice}
                  onChangeText={(value) => handleChoiceChange(index, value)}
                  maxLength={100}
                />
                {choices.length > 2 && (
                  <TouchableOpacity onPress={() => removeChoice(index)}>
                    <Ionicons name="remove-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {choices.length < 6 && (
              <TouchableOpacity 
                style={[styles.addChoiceButton, { borderColor: colors.primary }]}
                onPress={addChoice}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={[styles.addChoiceText, { color: colors.primary }]}>
                  Add Choice
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Category & Difficulty */}
        <View style={styles.row}>
          <View style={[styles.section, { flex: 1, marginRight: 10 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Category
            </Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={[styles.picker, { color: colors.text }]}
              >
                {Object.values(QuestionCategory).map((cat) => (
                  <Picker.Item 
                    key={cat} 
                    label={cat.replace(/_/g, ' ')} 
                    value={cat} 
                  />
                ))}
              </Picker>
            </View>
          </View>
          
          <View style={[styles.section, { flex: 1, marginLeft: 10 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Difficulty
            </Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Picker
                selectedValue={difficulty}
                onValueChange={setDifficulty}
                style={[styles.picker, { color: colors.text }]}
              >
                <Picker.Item label="Easy" value={FlashcardDifficulty.EASY} />
                <Picker.Item label="Medium" value={FlashcardDifficulty.MEDIUM} />
                <Picker.Item label="Hard" value={FlashcardDifficulty.HARD} />
              </Picker>
            </View>
            <View style={styles.difficultyIndicator}>
              <View 
                style={[
                  styles.difficultyDot, 
                  { backgroundColor: getDifficultyColor(difficulty) }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Explanation (Premium) */}
        <PremiumGate feature="flashcard-explanations">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="information-circle" size={20} color={colors.accent} /> 
              Explanation <Text style={[styles.premiumBadge, { color: colors.premium }]}>(Premium)</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput, 
                styles.largeInput,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }
              ]}
              placeholder="Optional detailed explanation..."
              placeholderTextColor={colors.textSecondary}
              value={explanation}
              onChangeText={setExplanation}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>
        </PremiumGate>

        {/* Hint */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="bulb" size={20} color={colors.warning} /> Hint (Optional)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }
            ]}
            placeholder="Add a helpful hint..."
            placeholderTextColor={colors.textSecondary}
            value={hint}
            onChangeText={setHint}
            maxLength={150}
          />
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="pricetags" size={20} color={colors.primary} /> Tags
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }
            ]}
            placeholder="Enter tags separated by commas..."
            placeholderTextColor={colors.textSecondary}
            value={tags}
            onChangeText={setTags}
            maxLength={100}
          />
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Tags help organize and find your flashcards
          </Text>
        </View>

        {/* Public Toggle */}
        <View style={styles.section}>
          <View style={styles.switchContainer}>
            <View style={styles.switchLabel}>
              <Ionicons name="globe" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
                Make Public
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={isPublic ? colors.primary : colors.textSecondary}
            />
          </View>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Public cards can be discovered and used by other users
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton, { backgroundColor: colors.textSecondary }]}
          onPress={onCancel}
        >
          <Text style={[styles.actionButtonText, { color: colors.background }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.saveButton, 
            { backgroundColor: colors.primary }
          ]}
          onPress={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          <Text style={[styles.actionButtonText, { color: colors.background }]}>
            {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save Card'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 25,
  },
  row: {
    flexDirection: 'row',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  largeInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  difficultyIndicator: {
    alignItems: 'center',
    marginTop: 5,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  choiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  choiceLabel: {
    fontSize: 16,
    fontWeight: '600',
    width: 30,
  },
  choiceInput: {
    flex: 1,
    marginHorizontal: 10,
  },
  addChoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 2,
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  addChoiceText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  premiumBadge: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 10,
  },
  saveButton: {
    marginLeft: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});