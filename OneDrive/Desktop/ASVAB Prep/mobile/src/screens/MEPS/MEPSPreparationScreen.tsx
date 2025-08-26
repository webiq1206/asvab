import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { MilitaryHeader } from '../../components/common/MilitaryHeader';
import { SubscriptionGate } from '../../components/Premium/SubscriptionGate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MEPSPhase {
  id: string;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
  requirements: string[];
  tips: string[];
}

interface Props {
  onExit?: () => void;
}

export const MEPSPreparationScreen: React.FC<Props> = ({ onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [selectedPhase, setSelectedPhase] = useState<string>('overview');

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

  const mepsPhases: MEPSPhase[] = [
    {
      id: 'arrival',
      title: 'Arrival & Check-In',
      description: 'Initial processing and documentation review',
      duration: '30-60 minutes',
      completed: false,
      requirements: [
        'Valid government-issued photo ID',
        'Social Security card or W-2',
        'Birth certificate (certified copy)',
        'High school diploma/transcript or GED',
        'Medical records and prescription list',
        'Any legal documents (court records, etc.)'
      ],
      tips: [
        'Arrive 15 minutes early for check-in',
        'Bring all required documents in original form',
        'Dress professionally (business casual)',
        'Get plenty of rest the night before',
        'Eat a light breakfast before arrival'
      ]
    },
    {
      id: 'asvab',
      title: 'ASVAB Testing',
      description: 'Armed Services Vocational Aptitude Battery',
      duration: '3-4 hours',
      completed: false,
      requirements: [
        'Valid photo identification',
        'Complete concentration and focus',
        'Basic math and reading comprehension skills',
        'General knowledge across multiple subjects'
      ],
      tips: [
        'Review all ASVAB subject areas beforehand',
        'Use process of elimination on difficult questions',
        'Manage your time effectively (don\'t spend too long on one question)',
        'Stay calm and confident throughout the test',
        'Double-check your answers if time permits'
      ]
    },
    {
      id: 'medical',
      title: 'Medical Examination',
      description: 'Comprehensive medical and physical evaluation',
      duration: '2-4 hours',
      completed: false,
      requirements: [
        'Complete medical history form',
        'All prescription medications list',
        'Previous medical/surgical records',
        'Vision and hearing within standards',
        'Physical fitness for military service'
      ],
      tips: [
        'Be honest about all medical history',
        'Bring complete list of medications and doses',
        'Follow all examiner instructions carefully',
        'Ask questions if you don\'t understand something',
        'Maintain professional demeanor throughout'
      ]
    },
    {
      id: 'job-selection',
      title: 'Job Selection & Contract',
      description: 'Choose your Military Occupational Specialty (MOS)',
      duration: '1-2 hours',
      completed: false,
      requirements: [
        'Qualifying ASVAB scores for desired jobs',
        'Medical qualification for chosen field',
        'Security clearance eligibility (if required)',
        'Understanding of military commitment'
      ],
      tips: [
        'Research job options before arriving at MEPS',
        'Consider both interest and career transferability',
        'Understand the length of commitment for each job',
        'Ask about training locations and timelines',
        'Don\'t rush - this decision affects your entire military career'
      ]
    },
    {
      id: 'oath',
      title: 'Oath of Enlistment',
      description: 'Official commitment ceremony to military service',
      duration: '15-30 minutes',
      completed: false,
      requirements: [
        'Completion of all previous MEPS phases',
        'Final contract review and signing',
        'Understanding of military obligations',
        'Commitment to serve with honor'
      ],
      tips: [
        'Understand the weight and significance of this moment',
        'Review your contract one final time before signing',
        'Take pride in your commitment to serve',
        'Remember this moment throughout your military career',
        'Congratulations - you are now a future service member!'
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
          <Ionicons name="business" size={32} color={colors.primary} />
          <View style={styles.overviewInfo}>
            <Text style={[styles.overviewTitle, { color: colors.text }]}>
              MEPS Mission Brief
            </Text>
            <Text style={[styles.overviewSubtitle, { color: colors.textSecondary }]}>
              Military Entrance Processing Station preparation for {getBranchTitle(user?.selectedBranch)}
            </Text>
          </View>
        </View>

        <Text style={[styles.overviewDescription, { color: colors.text }]}>
          MEPS is your gateway to military service. This comprehensive guide will prepare you for every 
          phase of the process, from arrival to taking your oath of enlistment. Proper preparation 
          ensures a smooth transition from civilian to military life. {getBranchExclamation(user?.selectedBranch)}
        </Text>

        <View style={styles.overviewStats}>
          <View style={styles.overviewStat}>
            <Ionicons name="time" size={20} color={colors.info} />
            <Text style={[styles.statText, { color: colors.info }]}>
              Full Day Process
            </Text>
          </View>

          <View style={styles.overviewStat}>
            <Ionicons name="people" size={20} color={colors.accent} />
            <Text style={[styles.statText, { color: colors.accent }]}>
              Group Processing
            </Text>
          </View>

          <View style={styles.overviewStat}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.statText, { color: colors.success }]}>
              5 Key Phases
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderPhaseCard = (phase: MEPSPhase, index: number) => (
    <TouchableOpacity
      key={phase.id}
      style={[styles.phaseCard, { backgroundColor: colors.surface }]}
      onPress={() => setSelectedPhase(phase.id)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={selectedPhase === phase.id 
          ? [colors.primary + '25', colors.accent + '25']
          : [colors.surface, colors.surface]
        }
        style={styles.phaseGradient}
      >
        <View style={styles.phaseHeader}>
          <View style={styles.phaseNumber}>
            <Text style={[styles.phaseNumberText, { color: colors.primary }]}>
              {index + 1}
            </Text>
          </View>

          <View style={styles.phaseInfo}>
            <Text style={[styles.phaseTitle, { color: colors.text }]}>
              {phase.title}
            </Text>
            <Text style={[styles.phaseDescription, { color: colors.textSecondary }]}>
              {phase.description}
            </Text>
          </View>

          <View style={styles.phaseDuration}>
            <Ionicons name="time" size={16} color={colors.accent} />
            <Text style={[styles.durationText, { color: colors.accent }]}>
              {phase.duration}
            </Text>
          </View>
        </View>

        {selectedPhase === phase.id && (
          <View style={styles.phaseDetails}>
            <View style={styles.requirementsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="document-text" size={16} color={colors.primary} /> Requirements
              </Text>
              {phase.requirements.map((req, reqIndex) => (
                <View key={reqIndex} style={styles.requirementItem}>
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                  <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                    {req}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.tipsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="bulb" size={16} color={colors.warning} /> Tips for Success
              </Text>
              {phase.tips.map((tip, tipIndex) => (
                <View key={tipIndex} style={styles.tipItem}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    {tip}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderTimelineView = () => (
    <View style={styles.timelineContainer}>
      <Text style={[styles.timelineTitle, { color: colors.text }]}>
        MEPS Day Timeline
      </Text>
      <Text style={[styles.timelineSubtitle, { color: colors.textSecondary }]}>
        Typical processing schedule (times may vary)
      </Text>

      <View style={styles.timeline}>
        {[
          { time: '0530', activity: 'Report to recruiter/liaison', icon: 'alarm' },
          { time: '0600', activity: 'Arrive at MEPS facility', icon: 'business' },
          { time: '0630', activity: 'Check-in and documentation', icon: 'document-text' },
          { time: '0730', activity: 'Initial briefing and orientation', icon: 'people' },
          { time: '0800', activity: 'ASVAB testing (if required)', icon: 'school' },
          { time: '1200', activity: 'Lunch break', icon: 'restaurant' },
          { time: '1300', activity: 'Medical examination', icon: 'medical' },
          { time: '1500', activity: 'Job selection and counseling', icon: 'briefcase' },
          { time: '1630', activity: 'Contract review and signing', icon: 'create' },
          { time: '1700', activity: 'Oath of Enlistment ceremony', icon: 'flag' },
          { time: '1730', activity: 'Final out-processing', icon: 'checkmark-circle' }
        ].map((item, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <Text style={[styles.timelineTime, { color: colors.primary }]}>
                {item.time}
              </Text>
              <View style={[styles.timelineIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name={item.icon as any} size={12} color={colors.background} />
              </View>
              {index < 10 && (
                <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />
              )}
            </View>
            <Text style={[styles.timelineActivity, { color: colors.text }]}>
              {item.activity}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderPreparationChecklist = () => (
    <View style={[styles.checklistCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.success + '20', colors.primary + '20']}
        style={styles.checklistGradient}
      >
        <View style={styles.checklistHeader}>
          <Ionicons name="checkmark-done" size={24} color={colors.success} />
          <Text style={[styles.checklistTitle, { color: colors.text }]}>
            Pre-MEPS Checklist
          </Text>
        </View>

        <Text style={[styles.checklistDescription, { color: colors.textSecondary }]}>
          Complete these preparations 1-2 weeks before your MEPS date
        </Text>

        {[
          { task: 'Gather all required documents', category: 'Documents', priority: 'HIGH' },
          { task: 'Review ASVAB study materials', category: 'Academic', priority: 'HIGH' },
          { task: 'Complete medical history forms', category: 'Medical', priority: 'HIGH' },
          { task: 'Research potential military jobs', category: 'Career', priority: 'MEDIUM' },
          { task: 'Plan transportation to MEPS', category: 'Logistics', priority: 'HIGH' },
          { task: 'Prepare professional attire', category: 'Appearance', priority: 'MEDIUM' },
          { task: 'Get adequate rest (7-8 hours)', category: 'Health', priority: 'HIGH' },
          { task: 'Eat nutritious breakfast', category: 'Health', priority: 'MEDIUM' },
          { task: 'Review oath of enlistment', category: 'Knowledge', priority: 'LOW' },
          { task: 'Inform family of MEPS process', category: 'Personal', priority: 'LOW' }
        ].map((item, index) => {
          const priorityColor = item.priority === 'HIGH' ? colors.error :
                               item.priority === 'MEDIUM' ? colors.warning :
                               colors.info;

          return (
            <TouchableOpacity
              key={index}
              style={styles.checklistItem}
              onPress={() => {
                Alert.alert(
                  'Checklist Item',
                  `Mark "${item.task}" as completed?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Mark Complete', onPress: () => {} }
                  ]
                );
              }}
            >
              <View style={[styles.checklistIcon, { backgroundColor: colors.border }]}>
                <Ionicons name="square-outline" size={18} color={colors.textSecondary} />
              </View>
              
              <View style={styles.checklistContent}>
                <Text style={[styles.checklistTask, { color: colors.text }]}>
                  {item.task}
                </Text>
                <View style={styles.checklistMeta}>
                  <Text style={[styles.checklistCategory, { color: colors.textSecondary }]}>
                    {item.category}
                  </Text>
                  <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
                    <Text style={[styles.priorityText, { color: priorityColor }]}>
                      {item.priority}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );

  return (
    <SubscriptionGate
      feature="meps-preparation"
      title="MEPS Preparation Command Center"
      description={`Mission-critical intelligence for Military Entrance Processing Station success. Get comprehensive preparation guides, detailed phase breakdowns, and strategic insights to ensure flawless MEPS processing. ${getBranchExclamation(user?.selectedBranch)}`}
      benefits={[
        'Complete MEPS day timeline and phase guide',
        'Required documents checklist with reminders',
        'Medical examination preparation tips',
        'Job selection strategy and MOS guidance',
        'Professional appearance and conduct standards',
        'Day-of logistics and transportation planning',
        'Oath of enlistment preparation and significance',
        'Post-MEPS next steps and expectations'
      ]}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <MilitaryHeader title="MEPS Preparation" onBack={onExit} />
        
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Overview Section */}
          {renderOverviewCard()}

          {/* Phase Selection Tabs */}
          <View style={styles.tabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  selectedPhase === 'overview' && { backgroundColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => setSelectedPhase('overview')}
              >
                <Text style={[
                  styles.tabText,
                  { color: selectedPhase === 'overview' ? colors.background : colors.text }
                ]}>
                  Overview
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  selectedPhase === 'timeline' && { backgroundColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => setSelectedPhase('timeline')}
              >
                <Text style={[
                  styles.tabText,
                  { color: selectedPhase === 'timeline' ? colors.background : colors.text }
                ]}>
                  Timeline
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  selectedPhase === 'checklist' && { backgroundColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => setSelectedPhase('checklist')}
              >
                <Text style={[
                  styles.tabText,
                  { color: selectedPhase === 'checklist' ? colors.background : colors.text }
                ]}>
                  Checklist
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Content Based on Selected Phase */}
          {selectedPhase === 'overview' && (
            <View style={styles.phasesContainer}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
                MEPS Processing Phases
              </Text>
              <Text style={[styles.sectionHeaderSubtitle, { color: colors.textSecondary }]}>
                Tap each phase for detailed requirements and success tips
              </Text>
              
              {mepsPhases.map((phase, index) => renderPhaseCard(phase, index))}
            </View>
          )}

          {selectedPhase === 'timeline' && renderTimelineView()}

          {selectedPhase === 'checklist' && renderPreparationChecklist()}

          {/* Emergency Contacts & Resources */}
          <View style={[styles.resourcesCard, { backgroundColor: colors.surface }]}>
            <View style={styles.resourcesHeader}>
              <Ionicons name="call" size={20} color={colors.info} />
              <Text style={[styles.resourcesTitle, { color: colors.text }]}>
                Important Contacts & Resources
              </Text>
            </View>

            <View style={styles.contactsList}>
              <View style={styles.contactItem}>
                <Ionicons name="person" size={16} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  Your recruiter (primary contact)
                </Text>
              </View>

              <View style={styles.contactItem}>
                <Ionicons name="business" size={16} color={colors.accent} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  MEPS facility main number
                </Text>
              </View>

              <View style={styles.contactItem}>
                <Ionicons name="medical" size={16} color={colors.success} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  Medical liaison officer
                </Text>
              </View>

              <View style={styles.contactItem}>
                <Ionicons name="help-circle" size={16} color={colors.warning} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  MEPS guidance counselor
                </Text>
              </View>
            </View>

            <Text style={[styles.resourcesNote, { color: colors.textSecondary }]}>
              Your recruiter will provide specific contact numbers for your MEPS location.
              Keep these numbers easily accessible on MEPS day.
            </Text>
          </View>

          {/* Success Message */}
          <View style={[styles.successCard, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={[colors.success + '20', colors.primary + '20']}
              style={styles.successGradient}
            >
              <Ionicons name="flag" size={32} color={colors.success} />
              <Text style={[styles.successTitle, { color: colors.text }]}>
                You're Ready for MEPS!
              </Text>
              <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
                With proper preparation and the right mindset, you'll successfully complete 
                MEPS processing and take the first official step in your military career. 
                Stay confident, be honest, and remember - this is the beginning of an 
                honorable journey of service. {getBranchExclamation(user?.selectedBranch)}
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SubscriptionGate>
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
  phasesContainer: {
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
  phaseCard: {
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  phaseGradient: {
    padding: 15,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  phaseNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  phaseInfo: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  phaseDescription: {
    fontSize: 13,
  },
  phaseDuration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  phaseDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  requirementsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
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
  tipsSection: {
    marginBottom: 10,
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
  timelineContainer: {
    marginBottom: 25,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  timelineSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  timeline: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 15,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineConnector: {
    width: 2,
    height: 20,
    marginTop: 5,
  },
  timelineActivity: {
    fontSize: 14,
    flex: 1,
    marginTop: 12,
  },
  checklistCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  checklistGradient: {
    padding: 20,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  checklistDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checklistIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checklistContent: {
    flex: 1,
  },
  checklistTask: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  checklistMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checklistCategory: {
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  resourcesCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  resourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  resourcesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  contactsList: {
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 14,
    marginLeft: 10,
  },
  resourcesNote: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
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