import React, { useState } from 'react';
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
import { MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { MilitaryHeader } from '../../components/common/MilitaryHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MedicalStation {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: string;
  procedures: string[];
  tips: string[];
  requirements: string[];
}

interface Props {
  onExit?: () => void;
}

export const MEPSMedicalGuideScreen: React.FC<Props> = ({ onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [selectedStation, setSelectedStation] = useState<string>('overview');

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

  const medicalStations: MedicalStation[] = [
    {
      id: 'intake',
      name: 'Medical Intake & History',
      description: 'Complete medical questionnaire and history review',
      duration: '20-30 minutes',
      icon: 'document-text',
      procedures: [
        'Complete comprehensive medical history form',
        'Review all previous medical conditions',
        'List all current medications and supplements',
        'Discuss any surgeries or hospitalizations',
        'Review family medical history',
        'Complete allergy and reaction documentation'
      ],
      tips: [
        'Be completely honest about all medical conditions',
        'Include even minor conditions or injuries',
        'Bring complete medication list with dosages',
        'Remember childhood conditions and treatments',
        'Include mental health history if applicable'
      ],
      requirements: [
        'Completed medical history forms',
        'List of all medications (prescription and over-the-counter)',
        'Previous medical records if available',
        'Insurance information'
      ]
    },
    {
      id: 'vital-signs',
      name: 'Vital Signs & Measurements',
      description: 'Basic health measurements and vital signs assessment',
      duration: '10-15 minutes',
      icon: 'pulse',
      procedures: [
        'Height and weight measurement',
        'Blood pressure reading (multiple if needed)',
        'Heart rate and pulse assessment',
        'Temperature check',
        'Basic physical measurements',
        'BMI calculation and assessment'
      ],
      tips: [
        'Avoid caffeine before blood pressure check',
        'Wear lightweight clothing for accurate weight',
        'Stay calm and relaxed during measurements',
        'Follow examiner instructions carefully',
        'Ask questions if you don\'t understand'
      ],
      requirements: [
        'Comfortable, removable clothing',
        'Avoid heavy meals before examination',
        'Be prepared to remove shoes for height/weight'
      ]
    },
    {
      id: 'vision-hearing',
      name: 'Vision & Hearing Tests',
      description: 'Comprehensive vision and hearing assessments',
      duration: '30-45 minutes',
      icon: 'eye',
      procedures: [
        'Visual acuity test (eye chart reading)',
        'Color vision test (color blindness screening)',
        'Depth perception assessment',
        'Peripheral vision test',
        'Audiometric hearing test (multiple frequencies)',
        'Hearing threshold assessment'
      ],
      tips: [
        'Bring glasses/contacts if you wear them',
        'Get plenty of rest for clear vision',
        'Avoid loud environments before hearing test',
        'Clean ears gently (no Q-tips day of exam)',
        'Inform examiner of any vision/hearing concerns'
      ],
      requirements: [
        'Corrective lenses if worn regularly',
        'Information about previous eye/ear surgeries',
        'Hearing aid documentation if applicable'
      ]
    },
    {
      id: 'blood-urine',
      name: 'Laboratory Tests',
      description: 'Blood and urine sample collection and analysis',
      duration: '15-20 minutes',
      icon: 'medical',
      procedures: [
        'Blood sample collection (multiple tubes)',
        'Complete blood count (CBC)',
        'Blood chemistry panel',
        'Drug screening test',
        'Urine sample collection',
        'Urinalysis testing'
      ],
      tips: [
        'Stay hydrated but don\'t over-drink water',
        'Avoid alcohol 24-48 hours before',
        'Follow all medication instructions',
        'Eat a light meal before blood draw',
        'Inform staff of needle sensitivity'
      ],
      requirements: [
        'Photo ID for sample verification',
        'List of any medications taken recently',
        'Fasting not typically required'
      ]
    },
    {
      id: 'physical-exam',
      name: 'Physical Examination',
      description: 'Comprehensive physical assessment by medical officer',
      duration: '20-30 minutes',
      icon: 'fitness',
      procedures: [
        'General appearance assessment',
        'Cardiovascular examination',
        'Respiratory system check',
        'Abdominal examination',
        'Musculoskeletal assessment',
        'Neurological function tests',
        'Skin and lymph node examination'
      ],
      tips: [
        'Wear comfortable, easily removable clothing',
        'Practice basic movements (duck walk, etc.)',
        'Inform examiner of any pain or limitations',
        'Stay relaxed and follow all instructions',
        'Ask for clarification if confused'
      ],
      requirements: [
        'Hospital gown (provided)',
        'Comfortable underwear',
        'Disclosure of any physical limitations'
      ]
    },
    {
      id: 'consultation',
      name: 'Medical Consultation',
      description: 'Review results and discuss any medical issues',
      duration: '10-20 minutes',
      icon: 'chatbubbles',
      procedures: [
        'Review all test results',
        'Discuss any abnormal findings',
        'Evaluate medical qualification status',
        'Consider waivers if needed',
        'Provide medical recommendations',
        'Schedule follow-up if required'
      ],
      tips: [
        'Ask questions about any concerns',
        'Understand any limitations or waivers',
        'Get copies of important results',
        'Follow all medical recommendations',
        'Maintain professional demeanor'
      ],
      requirements: [
        'Full disclosure of all medical history',
        'Willingness to discuss sensitive topics',
        'Understanding of military medical standards'
      ]
    }
  ];

  const renderOverviewCard = () => (
    <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.primary + '25', colors.accent + '25']}
        style={styles.overviewGradient}
      >
        <View style={styles.overviewHeader}>
          <Ionicons name="medical" size={32} color={colors.success} />
          <View style={styles.overviewInfo}>
            <Text style={[styles.overviewTitle, { color: colors.text }]}>
              MEPS Medical Examination
            </Text>
            <Text style={[styles.overviewSubtitle, { color: colors.textSecondary }]}>
              Comprehensive medical qualification assessment for {getBranchTitle(user?.selectedBranch)}
            </Text>
          </View>
        </View>

        <Text style={[styles.overviewDescription, { color: colors.text }]}>
          The medical examination at MEPS determines your physical qualification for military service. 
          This comprehensive assessment ensures you meet the health standards required for your chosen 
          military branch and career field. Complete honesty throughout the process is crucial for your 
          success and safety. {getBranchExclamation(user?.selectedBranch)}
        </Text>

        <View style={styles.overviewStats}>
          <View style={styles.overviewStat}>
            <Ionicons name="time" size={18} color={colors.info} />
            <Text style={[styles.statText, { color: colors.info }]}>
              2-4 Hours
            </Text>
          </View>

          <View style={styles.overviewStat}>
            <Ionicons name="people" size={18} color={colors.accent} />
            <Text style={[styles.statText, { color: colors.accent }]}>
              6 Stations
            </Text>
          </View>

          <View style={styles.overviewStat}>
            <Ionicons name="shield-checkmark" size={18} color={colors.success} />
            <Text style={[styles.statText, { color: colors.success }]}>
              Health Standards
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderStationCard = (station: MedicalStation, index: number) => (
    <TouchableOpacity
      key={station.id}
      style={[styles.stationCard, { backgroundColor: colors.surface }]}
      onPress={() => setSelectedStation(station.id)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={selectedStation === station.id 
          ? [colors.success + '25', colors.primary + '25']
          : [colors.surface, colors.surface]
        }
        style={styles.stationGradient}
      >
        <View style={styles.stationHeader}>
          <View style={[styles.stationIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name={station.icon as any} size={24} color={colors.success} />
          </View>

          <View style={styles.stationInfo}>
            <Text style={[styles.stationName, { color: colors.text }]}>
              {station.name}
            </Text>
            <Text style={[styles.stationDescription, { color: colors.textSecondary }]}>
              {station.description}
            </Text>
            <View style={styles.stationDuration}>
              <Ionicons name="time" size={14} color={colors.accent} />
              <Text style={[styles.durationText, { color: colors.accent }]}>
                {station.duration}
              </Text>
            </View>
          </View>

          <View style={styles.stationNumber}>
            <Text style={[styles.stationNumberText, { color: colors.primary }]}>
              {index + 1}
            </Text>
          </View>
        </View>

        {selectedStation === station.id && (
          <View style={styles.stationDetails}>
            <View style={styles.proceduresSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="list" size={16} color={colors.primary} /> Procedures
              </Text>
              {station.procedures.map((procedure, procIndex) => (
                <View key={procIndex} style={styles.procedureItem}>
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                  <Text style={[styles.procedureText, { color: colors.textSecondary }]}>
                    {procedure}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.tipsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="bulb" size={16} color={colors.warning} /> Success Tips
              </Text>
              {station.tips.map((tip, tipIndex) => (
                <View key={tipIndex} style={styles.tipItem}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    {tip}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.requirementsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="clipboard" size={16} color={colors.error} /> Requirements
              </Text>
              {station.requirements.map((req, reqIndex) => (
                <View key={reqIndex} style={styles.requirementItem}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                    {req}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderMedicalStandards = () => (
    <View style={[styles.standardsCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.info + '20', colors.primary + '20']}
        style={styles.standardsGradient}
      >
        <View style={styles.standardsHeader}>
          <Ionicons name="shield-checkmark" size={24} color={colors.info} />
          <Text style={[styles.standardsTitle, { color: colors.text }]}>
            Medical Standards Overview
          </Text>
        </View>

        <Text style={[styles.standardsDescription, { color: colors.textSecondary }]}>
          Key medical standards that must be met for military service qualification
        </Text>

        <View style={styles.standardsList}>
          {[
            { category: 'Vision', standard: '20/20 correctable, color vision normal', icon: 'eye' },
            { category: 'Hearing', standard: 'Normal hearing thresholds across frequencies', icon: 'ear' },
            { category: 'Blood Pressure', standard: '90-139/60-89 mmHg (may vary slightly)', icon: 'pulse' },
            { category: 'Weight', standard: 'Within acceptable range for height/age', icon: 'fitness' },
            { category: 'Cardiovascular', standard: 'Normal heart function and rhythm', icon: 'heart' },
            { category: 'Respiratory', standard: 'Clear lung function, no chronic conditions', icon: 'flower' },
            { category: 'Musculoskeletal', standard: 'Full range of motion, structural integrity', icon: 'body' },
            { category: 'Mental Health', standard: 'Psychological stability and adaptability', icon: 'happy' }
          ].map((standard, index) => (
            <View key={index} style={styles.standardItem}>
              <View style={[styles.standardIcon, { backgroundColor: colors.info + '20' }]}>
                <Ionicons name={standard.icon as any} size={16} color={colors.info} />
              </View>
              <View style={styles.standardContent}>
                <Text style={[styles.standardCategory, { color: colors.text }]}>
                  {standard.category}
                </Text>
                <Text style={[styles.standardText, { color: colors.textSecondary }]}>
                  {standard.standard}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );

  const renderDisqualificationInfo = () => (
    <View style={[styles.disqualCard, { backgroundColor: colors.surface }]}>
      <View style={styles.disqualHeader}>
        <Ionicons name="warning" size={20} color={colors.warning} />
        <Text style={[styles.disqualTitle, { color: colors.text }]}>
          Common Disqualifying Conditions
        </Text>
      </View>

      <Text style={[styles.disqualDescription, { color: colors.textSecondary }]}>
        Conditions that may require medical waivers or could result in disqualification
      </Text>

      <View style={styles.disqualSections}>
        <View style={styles.disqualSection}>
          <Text style={[styles.disqualSectionTitle, { color: colors.error }]}>
            Often Disqualifying (Waiver Possible)
          </Text>
          {[
            'Significant vision problems (not correctable to 20/20)',
            'Hearing loss beyond acceptable thresholds',
            'Heart conditions or irregular rhythms',
            'Chronic respiratory conditions (asthma, etc.)',
            'Severe allergies or autoimmune disorders',
            'Significant mental health conditions',
            'Major orthopedic injuries or surgeries',
            'Certain medications or treatments'
          ].map((condition, index) => (
            <Text key={index} style={[styles.disqualItem, { color: colors.textSecondary }]}>
              • {condition}
            </Text>
          ))}
        </View>

        <View style={styles.disqualSection}>
          <Text style={[styles.disqualSectionTitle, { color: colors.success }]}>
            Usually Waiverable
          </Text>
          {[
            'Correctable vision problems',
            'Minor hearing loss',
            'Controlled blood pressure',
            'Well-managed diabetes',
            'Previous fractures (healed properly)',
            'Controlled thyroid conditions',
            'History of minor surgeries',
            'Resolved mental health issues'
          ].map((condition, index) => (
            <Text key={index} style={[styles.disqualItem, { color: colors.textSecondary }]}>
              • {condition}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.waiverInfo}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={[styles.waiverText, { color: colors.info }]}>
          Medical waivers may be available for many conditions. Always be honest about your medical 
          history - lying can result in permanent disqualification.
        </Text>
      </View>
    </View>
  );

  const renderPreparationTips = () => (
    <View style={[styles.tipsCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.success + '20', colors.primary + '20']}
        style={styles.tipsGradient}
      >
        <View style={styles.tipsHeader}>
          <Ionicons name="bulb" size={24} color={colors.success} />
          <Text style={[styles.tipsTitle, { color: colors.text }]}>
            Medical Exam Preparation
          </Text>
        </View>

        <Text style={[styles.tipsDescription, { color: colors.textSecondary }]}>
          Essential preparation steps for MEPS medical examination success
        </Text>

        <View style={styles.preparationList}>
          <View style={styles.timeframeSection}>
            <Text style={[styles.timeframeTitle, { color: colors.primary }]}>
              1-2 Weeks Before MEPS
            </Text>
            {[
              'Gather all medical records and documentation',
              'Schedule any needed medical appointments',
              'Obtain copies of prescription records',
              'Complete medical history forms thoroughly',
              'Research medical waiver processes if needed'
            ].map((item, index) => (
              <View key={index} style={styles.preparationItem}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.preparationText, { color: colors.textSecondary }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.timeframeSection}>
            <Text style={[styles.timeframeTitle, { color: colors.accent }]}>
              Night Before MEPS
            </Text>
            {[
              'Get 7-8 hours of quality sleep',
              'Avoid alcohol and excessive caffeine',
              'Eat a nutritious, balanced dinner',
              'Organize all medical documents',
              'Set multiple alarms for early wake-up'
            ].map((item, index) => (
              <View key={index} style={styles.preparationItem}>
                <Ionicons name="moon" size={14} color={colors.accent} />
                <Text style={[styles.preparationText, { color: colors.textSecondary }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.timeframeSection}>
            <Text style={[styles.timeframeTitle, { color: colors.warning }]}>
              Day of MEPS
            </Text>
            {[
              'Eat a light, healthy breakfast',
              'Stay well hydrated (but not excessive)',
              'Arrive early and bring all documents',
              'Wear comfortable, removable clothing',
              'Maintain calm, professional demeanor'
            ].map((item, index) => (
              <View key={index} style={styles.preparationItem}>
                <Ionicons name="sunny" size={14} color={colors.warning} />
                <Text style={[styles.preparationText, { color: colors.textSecondary }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader title="MEPS Medical Guide" onBack={onExit} />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Section */}
        {renderOverviewCard()}

        {/* Station Selection Tabs */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedStation === 'overview' && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
              onPress={() => setSelectedStation('overview')}
            >
              <Text style={[
                styles.tabText,
                { color: selectedStation === 'overview' ? colors.background : colors.text }
              ]}>
                Stations
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                selectedStation === 'standards' && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
              onPress={() => setSelectedStation('standards')}
            >
              <Text style={[
                styles.tabText,
                { color: selectedStation === 'standards' ? colors.background : colors.text }
              ]}>
                Standards
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                selectedStation === 'preparation' && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
              onPress={() => setSelectedStation('preparation')}
            >
              <Text style={[
                styles.tabText,
                { color: selectedStation === 'preparation' ? colors.background : colors.text }
              ]}>
                Preparation
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content Based on Selected Tab */}
        {selectedStation === 'overview' && (
          <View style={styles.stationsContainer}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
              Medical Examination Stations
            </Text>
            <Text style={[styles.sectionHeaderSubtitle, { color: colors.textSecondary }]}>
              Tap each station for detailed procedures and tips
            </Text>
            
            {medicalStations.map((station, index) => renderStationCard(station, index))}
          </View>
        )}

        {selectedStation === 'standards' && (
          <>
            {renderMedicalStandards()}
            {renderDisqualificationInfo()}
          </>
        )}

        {selectedStation === 'preparation' && renderPreparationTips()}

        {/* Success Message */}
        <View style={[styles.successCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.success + '20', colors.primary + '20']}
            style={styles.successGradient}
          >
            <Ionicons name="medical" size={32} color={colors.success} />
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Medical Readiness Achieved!
            </Text>
            <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
              You now have comprehensive knowledge of the MEPS medical examination process, 
              {getBranchTitle(user?.selectedBranch)}. With proper preparation and complete honesty, 
              you're ready to successfully complete your medical qualification for military service. 
              Stay confident and professional throughout the process. {getBranchExclamation(user?.selectedBranch)}
            </Text>
          </LinearGradient>
        </View>
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
  overviewCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  overviewGradient: {
    padding: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  overviewInfo: {
    flex: 1,
    marginLeft: 15,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  overviewDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabContainer: {
    marginBottom: 20,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stationsContainer: {
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
  stationCard: {
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  stationGradient: {
    padding: 15,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  stationDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  stationDuration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  stationNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stationDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  proceduresSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  procedureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  procedureText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  tipsSection: {
    marginBottom: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  requirementsSection: {
    marginBottom: 10,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  standardsCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  standardsGradient: {
    padding: 20,
  },
  standardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  standardsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  standardsDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  standardsList: {
    gap: 12,
  },
  standardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  standardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  standardContent: {
    flex: 1,
  },
  standardCategory: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  standardText: {
    fontSize: 13,
    lineHeight: 18,
  },
  disqualCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  disqualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  disqualTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  disqualDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  disqualSections: {
    marginBottom: 20,
  },
  disqualSection: {
    marginBottom: 20,
  },
  disqualSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  disqualItem: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  waiverInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  waiverText: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  tipsCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  tipsGradient: {
    padding: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  tipsDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  preparationList: {
    gap: 20,
  },
  timeframeSection: {
    marginBottom: 15,
  },
  timeframeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  preparationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  preparationText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
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