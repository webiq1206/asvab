import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { FlashcardDeck, QuestionCategory, MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { flashcardService } from '../../services/flashcardService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MilitaryHeader } from '../common/MilitaryHeader';
import { PremiumGate } from '../common/PremiumGate';

interface Props {
  onSelectDeck?: (deck: FlashcardDeck) => void;
  onCreateDeck?: () => void;
  onExit?: () => void;
}

export const FlashcardDecksScreen: React.FC<Props> = ({ 
  onSelectDeck, 
  onCreateDeck, 
  onExit 
}) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory>(QuestionCategory.GENERAL_SCIENCE);

  // Fetch user's flashcard decks
  const { data: userDecks = [], isLoading, error } = useQuery({
    queryKey: ['userFlashcardDecks'],
    queryFn: flashcardService.getUserDecks,
  });

  // Create deck mutation
  const createDeckMutation = useMutation({
    mutationFn: flashcardService.createDeck,
    onSuccess: (newDeck) => {
      queryClient.invalidateQueries({ queryKey: ['userFlashcardDecks'] });
      setShowCreateModal(false);
      setNewDeckName('');
      setNewDeckDescription('');
      Toast.show({
        type: 'success',
        text1: getMilitaryGreeting().exclamation,
        text2: 'Deck created successfully!',
      });
      if (onSelectDeck) {
        onSelectDeck(newDeck);
      }
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Mission Failed',
        text2: error.response?.data?.message || 'Failed to create deck.',
      });
    },
  });

  // Delete deck mutation
  const deleteDeckMutation = useMutation({
    mutationFn: flashcardService.deleteDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userFlashcardDecks'] });
      Toast.show({
        type: 'success',
        text1: 'Deck Deleted',
        text2: 'Flashcard deck removed successfully.',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Failed to delete deck. Please try again.',
      });
    },
  });

  const handleCreateDeck = () => {
    if (!newDeckName.trim()) {
      Alert.alert('Invalid Input', 'Please enter a deck name.');
      return;
    }

    createDeckMutation.mutate({
      name: newDeckName.trim(),
      description: newDeckDescription.trim(),
      category: selectedCategory,
      branchRelevance: [user?.selectedBranch || MilitaryBranch.ARMY],
      isPublic: false,
      tags: [],
    });
  };

  const handleDeleteDeck = (deck: FlashcardDeck) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${deck.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDeckMutation.mutate(deck.id),
        },
      ]
    );
  };

  const getDifficultyColor = (stats: any) => {
    if (!stats) return colors.textSecondary;
    const ratio = stats.masteredCards / Math.max(stats.totalCards, 1);
    if (ratio >= 0.8) return '#2ED573';
    if (ratio >= 0.6) return '#FFA502';
    return '#FF4757';
  };

  const getCategoryIcon = (category: QuestionCategory): string => {
    const icons = {
      GENERAL_SCIENCE: 'flask',
      ARITHMETIC_REASONING: 'calculator',
      WORD_KNOWLEDGE: 'book',
      PARAGRAPH_COMPREHENSION: 'document-text',
      MATHEMATICS_KNOWLEDGE: 'functions',
      ELECTRONICS_INFORMATION: 'hardware-chip',
      AUTO_SHOP: 'car',
      MECHANICAL_COMPREHENSION: 'cog',
      ASSEMBLING_OBJECTS: 'construct',
    };
    return icons[category] || 'folder';
  };

  const renderDeckItem = ({ item: deck }: { item: FlashcardDeck }) => (
    <TouchableOpacity
      style={[styles.deckCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onSelectDeck?.(deck)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[colors.primary + '20', colors.accent + '20']}
        style={styles.deckGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.deckHeader}>
          <View style={styles.deckTitleContainer}>
            <Ionicons 
              name={getCategoryIcon(deck.category) as any} 
              size={24} 
              color={colors.primary} 
            />
            <Text style={[styles.deckTitle, { color: colors.text }]}>
              {deck.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteDeck(deck)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.deckDescription, { color: colors.textSecondary }]}>
          {deck.description}
        </Text>

        <View style={styles.deckStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {deck.statistics?.totalCards || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Cards
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: getDifficultyColor(deck.statistics) }]}>
              {deck.statistics?.dueCards || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Due
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {deck.statistics?.masteredCards || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Mastered
            </Text>
          </View>
        </View>

        <View style={styles.deckFooter}>
          <View style={styles.tagContainer}>
            {deck.tags?.slice(0, 3).map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '30' }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
          
          <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
            {deck.category.replace(/_/g, ' ')}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Create New Deck
          </Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Deck Name"
            placeholderTextColor={colors.textSecondary}
            value={newDeckName}
            onChangeText={setNewDeckName}
            maxLength={50}
          />
          
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textSecondary}
            value={newDeckDescription}
            onChangeText={setNewDeckDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.background }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateDeck}
              disabled={createDeckMutation.isPending}
            >
              <Text style={[styles.modalButtonText, { color: colors.background }]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading decks..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader title="Flashcard Decks" onBack={onExit} />
      
      <View style={styles.content}>
        {userDecks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="library" size={80} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Decks Yet, {getBranchTitle(user?.selectedBranch)}!
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              Create your first flashcard deck to start building your knowledge arsenal.
            </Text>
          </View>
        ) : (
          <FlatList
            data={userDecks}
            keyExtractor={(item) => item.id}
            renderItem={renderDeckItem}
            contentContainerStyle={styles.deckList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <PremiumGate
        feature="unlimited-decks"
        fallbackLimit={3}
        currentUsage={userDecks.length}
      >
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={colors.background} />
          <Text style={[styles.createButtonText, { color: colors.background }]}>
            Create New Deck
          </Text>
        </TouchableOpacity>
      </PremiumGate>

      {renderCreateModal()}
    </SafeAreaView>
  );
};

const getBranchTitle = (branch?: MilitaryBranch): string => {
  const titles = {
    ARMY: 'Soldier',
    NAVY: 'Sailor', 
    AIR_FORCE: 'Airman',
    MARINES: 'Marine',
    COAST_GUARD: 'Coastie',
    SPACE_FORCE: 'Guardian',
  };
  return titles[branch || 'ARMY'];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  deckList: {
    paddingBottom: 100,
  },
  deckCard: {
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deckGradient: {
    padding: 20,
  },
  deckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deckTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deckTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
  },
  deleteButton: {
    padding: 5,
  },
  deckDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  deckStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  deckFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 5,
    marginBottom: 5,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  createButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});