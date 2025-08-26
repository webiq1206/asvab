import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { MilitaryHeader } from '../../components/common/MilitaryHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Document {
  id: string;
  category: string;
  name: string;
  description: string;
  required: boolean;
  alternatives?: string[];
  tips: string[];
  completed: boolean;
}

interface Props {
  onExit?: () => void;
}

export const MEPSDocumentsScreen: React.FC<Props> = ({ onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const getBranchTitle = (branch?: MilitaryBranch): string => {
    const titles = {
      ARMY: 'Soldier',
      NAVY: 'Sailor',
      AIR_FORCE: 'Airman',
      MARINES: 'Marine',
      COAST_GUARD: 'Guardian',
      SPACE_FORCE: 'Guardian',
    };
    return titles[branch || 'ARMY'];
  };

  const getBranchExclamation = (branch?: MilitaryBranch): string => {
    const exclamations = {
      ARMY: 'Hooah!',
      NAVY: 'Hooyah!',
      AIR_FORCE: 'Hoorah!',
      MARINES: 'Oorah!',
      COAST_GUARD: 'Hooyah!',
      SPACE_FORCE: 'Hoorah!',
    };
    return exclamations[branch || 'ARMY'];
  };

  const initialDocuments: Document[] = [
    // Identity Documents
    {
      id: 'photo-id',
      category: 'Identity',
      name: 'Government-Issued Photo ID',
      description: 'Valid driver\'s license, state ID card, or passport',
      required: true,
      alternatives: ['Driver\'s License', 'State ID Card', 'U.S. Passport', 'Military ID (if applicable)'],
      tips: [
        'Must be current and not expired',
        'Name on ID must match all other documents exactly',
        'If name has changed, bring legal documentation of change',
        'Photocopies are not acceptable - must be original'
      ],
      completed: false
    },
    {
      id: 'social-security',
      category: 'Identity',
      name: 'Social Security Card',
      description: 'Original Social Security card or certified copy',
      required: true,
      alternatives: ['Original Social Security Card', 'W-2 Form', '1099 Form', 'Pay Stub with full SSN'],
      tips: [
        'Card must be legible and not laminated',
        'If lost, obtain replacement from Social Security Administration',
        'W-2 or 1099 can substitute if they show full SSN',
        'Photocopies are not acceptable'
      ],
      completed: false
    },
    {
      id: 'birth-certificate',
      category: 'Identity',
      name: 'Birth Certificate',
      description: 'Certified copy of birth certificate',
      required: true,
      alternatives: ['Certified Birth Certificate', 'U.S. Passport', 'Certificate of Citizenship'],
      tips: [
        'Must be certified copy with raised seal',
        'Hospital-issued certificates are not acceptable',
        'If born abroad, bring Certificate of Birth Abroad',
        'If adopted, may need additional documentation'
      ],
      completed: false
    },

    // Education Documents
    {
      id: 'high-school-diploma',
      category: 'Education',
      name: 'High School Diploma/Transcript',
      description: 'Official high school diploma or transcript',
      required: true,
      alternatives: ['High School Diploma', 'Official Transcript', 'GED Certificate', 'HiSET/TASC'],
      tips: [
        'Must be official version from school or district',
        'If home schooled, provide state-recognized documentation',
        'College transcripts can supplement but don\'t replace',
        'Foreign credentials may need evaluation/translation'
      ],
      completed: false
    },
    {
      id: 'college-transcripts',
      category: 'Education',
      name: 'College Transcripts',
      description: 'Official transcripts from all colleges attended',
      required: false,
      alternatives: ['Official College Transcripts', 'Degree Certificates', 'Trade School Certificates'],
      tips: [
        'Brings all transcripts from every institution',
        'May qualify for advanced rank/pay grade',
        'Technical certifications are also valuable',
        'Foreign transcripts may need evaluation'
      ],
      completed: false
    },

    // Medical Documents
    {
      id: 'medical-records',
      category: 'Medical',
      name: 'Medical Records',
      description: 'Complete medical history and current prescriptions',
      required: true,
      alternatives: ['Complete Medical History', 'Recent Physical Exam', 'Prescription List', 'Specialist Reports'],
      tips: [
        'Include ALL medical conditions, even if minor',
        'Bring complete list of current medications',
        'Include any specialist reports or evaluations',
        'Be completely honest - lying can disqualify you'
      ],
      completed: false
    },
    {
      id: 'vision-hearing',
      category: 'Medical',
      name: 'Vision/Hearing Tests',
      description: 'Recent eye and hearing examinations if applicable',
      required: false,
      alternatives: ['Eye Exam Results', 'Hearing Test Results', 'Corrective Lens Prescription'],
      tips: [
        'Recent exams can expedite medical processing',
        'Include prescription details for glasses/contacts',
        'Hearing aid users bring all documentation',
        'Any corrective surgeries need detailed records'
      ],
      completed: false
    },

    // Legal Documents
    {
      id: 'legal-records',
      category: 'Legal',
      name: 'Legal Documentation',
      description: 'Any court records, arrests, or legal proceedings',
      required: true,
      alternatives: ['Court Records', 'Police Reports', 'Probation Documents', 'Traffic Citations'],
      tips: [
        'Include ALL legal issues, even dismissed cases',
        'Minor traffic tickets still need documentation',
        'Sealed records may still need to be disclosed',
        'Bring certified copies of all court documents'
      ],
      completed: false
    },

    // Financial Documents
    {
      id: 'financial-records',
      category: 'Financial',
      name: 'Financial Information',
      description: 'Information about debts, loans, and financial obligations',
      required: false,
      alternatives: ['Credit Report', 'Student Loan Documentation', 'Bankruptcy Papers', 'Tax Returns'],
      tips: [
        'Financial issues rarely disqualify completely',
        'Be honest about all debts and obligations',
        'Student loans are common and usually not problematic',
        'Payment plans can resolve many financial concerns'
      ],
      completed: false
    },

    // Immigration Documents (if applicable)
    {
      id: 'immigration-docs',
      category: 'Immigration',
      name: 'Immigration Documents',
      description: 'Green card, naturalization papers, or visa information',
      required: false,
      alternatives: ['Green Card', 'Certificate of Naturalization', 'Immigration Visa', 'I-94 Record'],
      tips: [
        'Required for non-U.S. citizens',
        'Permanent residents need green card',
        'Naturalized citizens bring naturalization certificate',
        'Some positions require U.S. citizenship'
      ],
      completed: false
    },

    // Marriage/Dependent Documents
    {
      id: 'marriage-docs',
      category: 'Family',
      name: 'Marriage/Divorce Documents',
      description: 'Marriage certificates and divorce decrees',
      required: false,
      alternatives: ['Marriage Certificate', 'Divorce Decree', 'Death Certificate (if widowed)'],
      tips: [
        'Affects benefits and allowances',
        'Need for dependent enrollment in DEERS',
        'Previous marriages require divorce documentation',
        'Common law marriages may need additional proof'
      ],
      completed: false
    },
    {
      id: 'dependent-docs',
      category: 'Family',
      name: 'Dependent Documentation',
      description: 'Birth certificates and custody papers for children',
      required: false,
      alternatives: ['Children\'s Birth Certificates', 'Custody Agreements', 'Adoption Papers'],
      tips: [
        'Required for family benefits enrollment',
        'Custody agreements affect dependent status',
        'Step-children may need additional documentation',
        'Affects housing allowances and family separation pay'
      ],
      completed: false
    }
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const saved = await AsyncStorage.getItem('meps_documents');
      if (saved) {
        setDocuments(JSON.parse(saved));
      } else {
        setDocuments(initialDocuments);
      }
    } catch (error) {
      setDocuments(initialDocuments);
    }
  };

  const saveDocuments = async (updatedDocuments: Document[]) => {
    try {
      await AsyncStorage.setItem('meps_documents', JSON.stringify(updatedDocuments));
    } catch (error) {
      console.error('Error saving documents:', error);
    }
  };

  const toggleDocument = (documentId: string) => {
    const updated = documents.map(doc => 
      doc.id === documentId ? { ...doc, completed: !doc.completed } : doc
    );
    setDocuments(updated);
    saveDocuments(updated);
  };

  const categories = ['all', ...Array.from(new Set(documents.map(doc => doc.category)))];
  
  const filteredDocuments = selectedCategory === 'all' 
    ? documents 
    : documents.filter(doc => doc.category === selectedCategory);

  const completedCount = documents.filter(doc => doc.completed).length;
  const requiredCount = documents.filter(doc => doc.required).length;
  const requiredCompletedCount = documents.filter(doc => doc.required && doc.completed).length;

  const renderProgressCard = () => (
    <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.primary + '25', colors.accent + '25']}
        style={styles.progressGradient}
      >
        <View style={styles.progressHeader}>
          <Ionicons name="clipboard" size={28} color={colors.primary} />
          <View style={styles.progressInfo}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Document Preparation Status
            </Text>
            <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
              {getBranchTitle(user?.selectedBranch)} document readiness assessment
            </Text>
          </View>
        </View>

        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <Text style={[styles.progressValue, { color: colors.success }]}>
              {requiredCompletedCount}/{requiredCount}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Required
            </Text>
          </View>

          <View style={styles.progressStat}>
            <Text style={[styles.progressValue, { color: colors.primary }]}>
              {completedCount}/{documents.length}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Total
            </Text>
          </View>

          <View style={styles.progressStat}>
            <Text style={[styles.progressValue, { color: colors.accent }]}>
              {Math.round((requiredCompletedCount / requiredCount) * 100)}%
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Ready
            </Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <LinearGradient
              colors={[colors.success, colors.primary]}
              style={[
                styles.progressBarFill,
                { width: `${(requiredCompletedCount / requiredCount) * 100}%` }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Document preparation progress
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderCategoryTabs = () => (
    <View style={styles.categoryContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              selectedCategory === category && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryText,
              { color: selectedCategory === category ? colors.background : colors.text }
            ]}>
              {category === 'all' ? 'All Documents' : category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDocumentCard = (document: Document) => (
    <TouchableOpacity
      key={document.id}
      style={[
        styles.documentCard,
        { 
          backgroundColor: colors.surface,
          borderLeftColor: document.required ? colors.error : colors.info,
          opacity: document.completed ? 0.8 : 1
        }
      ]}
      onPress={() => toggleDocument(document.id)}
      activeOpacity={0.7}
    >
      <View style={styles.documentHeader}>
        <View style={styles.documentLeft}>
          <View style={[
            styles.checkboxContainer,
            { 
              backgroundColor: document.completed ? colors.success : colors.border,
              borderColor: document.completed ? colors.success : colors.border
            }
          ]}>
            <Ionicons 
              name={document.completed ? "checkmark" : "square-outline"} 
              size={18} 
              color={document.completed ? colors.background : colors.textSecondary} 
            />
          </View>

          <View style={styles.documentInfo}>
            <Text style={[
              styles.documentName,
              { 
                color: colors.text,
                textDecorationLine: document.completed ? 'line-through' : 'none'
              }
            ]}>
              {document.name}
            </Text>
            <Text style={[styles.documentDescription, { color: colors.textSecondary }]}>
              {document.description}
            </Text>
          </View>
        </View>

        <View style={styles.documentRight}>
          <View style={[
            styles.priorityBadge,
            { backgroundColor: document.required ? colors.error + '20' : colors.info + '20' }
          ]}>
            <Text style={[
              styles.priorityText,
              { color: document.required ? colors.error : colors.info }
            ]}>
              {document.required ? 'REQUIRED' : 'OPTIONAL'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.documentDetails}>
        {document.alternatives && document.alternatives.length > 0 && (
          <View style={styles.alternativesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="copy" size={14} color={colors.primary} /> Acceptable Documents:
            </Text>
            {document.alternatives.map((alt, index) => (
              <Text key={index} style={[styles.alternativeText, { color: colors.textSecondary }]}>
                • {alt}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.tipsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="bulb" size={14} color={colors.warning} /> Important Tips:
          </Text>
          {document.tips.map((tip, index) => (
            <Text key={index} style={[styles.tipText, { color: colors.textSecondary }]}>
              • {tip}
            </Text>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.success }]}
        onPress={() => {
          const allRequired = documents.filter(doc => doc.required);
          const updated = documents.map(doc => 
            doc.required ? { ...doc, completed: true } : doc
          );
          setDocuments(updated);
          saveDocuments(updated);
          Alert.alert('Documents Updated', 'All required documents marked as complete!');
        }}
      >
        <Ionicons name="checkmark-done" size={20} color={colors.background} />
        <Text style={[styles.actionText, { color: colors.background }]}>
          Mark Required Complete
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.warning }]}
        onPress={() => {
          const updated = documents.map(doc => ({ ...doc, completed: false }));
          setDocuments(updated);
          saveDocuments(updated);
          Alert.alert('Documents Reset', 'All document checkboxes have been cleared.');
        }}
      >
        <Ionicons name="refresh" size={20} color={colors.background} />
        <Text style={[styles.actionText, { color: colors.background }]}>
          Reset All
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader title="MEPS Documents" onBack={onExit} />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Overview */}
        {renderProgressCard()}

        {/* Category Filters */}
        {renderCategoryTabs()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Documents List */}
        <View style={styles.documentsContainer}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
            Document Checklist
          </Text>
          <Text style={[styles.sectionHeaderSubtitle, { color: colors.textSecondary }]}>
            Tap each document to mark as completed when gathered
          </Text>

          {filteredDocuments.map(renderDocumentCard)}
        </View>

        {/* Additional Information */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.info + '20', colors.primary + '20']}
            style={styles.infoGradient}
          >
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color={colors.info} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Important Reminders
              </Text>
            </View>

            <View style={styles.infoList}>
              <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                • Bring originals, not photocopies - MEPS will make copies for you
              </Text>
              <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                • Names must match exactly across all documents
              </Text>
              <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                • Be completely honest - background checks will verify everything
              </Text>
              <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                • Organize documents in a folder for easy access
              </Text>
              <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                • Contact your recruiter if any documents are missing or problematic
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Success Message */}
        {requiredCompletedCount === requiredCount && (
          <View style={[styles.successCard, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={[colors.success + '25', colors.primary + '25']}
              style={styles.successGradient}
            >
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={[styles.successTitle, { color: colors.text }]}>
                Documents Ready!
              </Text>
              <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
                Outstanding work, {getBranchTitle(user?.selectedBranch)}! You've gathered all required 
                documents for MEPS processing. Double-check everything is organized and easily accessible. 
                You're prepared for successful MEPS completion! {getBranchExclamation(user?.selectedBranch)}
              </Text>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  progressCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  progressGradient: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressInfo: {
    flex: 1,
    marginLeft: 15,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  actionButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  documentsContainer: {
    marginBottom: 25,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionHeaderSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  documentCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  documentLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  documentRight: {
    marginLeft: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  documentDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  alternativesSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  alternativeText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  tipsSection: {
    marginBottom: 10,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  infoCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  infoGradient: {
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  successCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  successGradient: {
    padding: 20,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});