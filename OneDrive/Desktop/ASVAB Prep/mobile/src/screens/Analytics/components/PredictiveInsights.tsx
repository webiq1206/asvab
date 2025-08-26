import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBranchTheme } from '../../../hooks/useBranchTheme';
import { PredictiveInsights, analyticsService } from '../../../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  data: PredictiveInsights;
}

export const PredictiveInsights: React.FC<Props> = ({ data }) => {
  const { colors } = useBranchTheme();

  const renderProjectionCard = () => (
    <View style={[styles.projectionCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.primary + '25', colors.accent + '25']}
        style={styles.projectionGradient}
      >
        <View style={styles.projectionHeader}>
          <Ionicons name="trending-up" size={28} color={colors.primary} />
          <View style={styles.projectionInfo}>
            <Text style={[styles.projectionTitle, { color: colors.text }]}>
              AFQT Score Projection
            </Text>
            <Text style={[styles.projectionSubtitle, { color: colors.textSecondary }]}>
              AI-powered performance forecasting
            </Text>
          </View>
        </View>

        <View style={styles.projectionScores}>
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
              Current
            </Text>
            <Text style={[styles.scoreValue, { color: colors.primary }]}>
              {data.estimatedAFQT.current}
            </Text>
          </View>

          <View style={styles.scoreArrow}>
            <Ionicons name="arrow-forward" size={20} color={colors.accent} />
          </View>

          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
              30 Days
            </Text>
            <Text style={[styles.scoreValue, { color: colors.accent }]}>
              {data.estimatedAFQT.projected30}
            </Text>
          </View>

          <View style={styles.scoreArrow}>
            <Ionicons name="arrow-forward" size={20} color={colors.success} />
          </View>

          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
              90 Days
            </Text>
            <Text style={[styles.scoreValue, { color: colors.success }]}>
              {data.estimatedAFQT.projected90}
            </Text>
          </View>
        </View>

        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceBar}>
            <View style={[styles.confidenceBarBg, { backgroundColor: colors.border }]}>
              <LinearGradient
                colors={[colors.success, colors.success + '80']}
                style={[
                  styles.confidenceBarFill,
                  { width: `${data.estimatedAFQT.confidence * 100}%` }
                ]}
              />
            </View>
          </View>
          <Text style={[styles.confidenceText, { color: colors.textSecondary }]}>
            {Math.round(data.estimatedAFQT.confidence * 100)}% Confidence Level
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderReadinessCard = () => (
    <View style={[styles.readinessCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.success + '20', colors.primary + '20']}
        style={styles.readinessGradient}
      >
        <View style={styles.readinessHeader}>
          <Ionicons name="calendar-check" size={24} color={colors.success} />
          <Text style={[styles.readinessTitle, { color: colors.text }]}>
            Mission Readiness Estimate
          </Text>
        </View>

        <View style={styles.readinessContent}>
          <View style={styles.readinessDate}>
            <Text style={[styles.readinessDateText, { color: colors.success }]}>
              {new Date(data.readinessDate.estimatedDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
            <Text style={[styles.readinessDateSubtext, { color: colors.textSecondary }]}>
              Estimated readiness date
            </Text>
          </View>

          <View style={styles.readinessStats}>
            <View style={styles.readinessStat}>
              <Text style={[styles.readinessStatValue, { color: colors.primary }]}>
                {data.readinessDate.daysRemaining}
              </Text>
              <Text style={[styles.readinessStatLabel, { color: colors.textSecondary }]}>
                Days Remaining
              </Text>
            </View>

            <View style={styles.readinessStat}>
              <Text style={[styles.readinessStatValue, { color: colors.success }]}>
                {Math.round(data.readinessDate.confidence * 100)}%
              </Text>
              <Text style={[styles.readinessStatLabel, { color: colors.textSecondary }]}>
                Confidence
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderRiskFactors = () => (
    <View style={[styles.riskCard, { backgroundColor: colors.surface }]}>
      <View style={styles.riskHeader}>
        <Ionicons name="warning" size={20} color={colors.warning} />
        <Text style={[styles.riskTitle, { color: colors.text }]}>
          Risk Assessment
        </Text>
      </View>

      <View style={styles.riskList}>
        {data.riskFactors.map((risk, index) => {
          const riskColor = risk.severity === 'HIGH' ? colors.error :
                           risk.severity === 'MEDIUM' ? colors.warning :
                           colors.info;

          return (
            <View key={index} style={[styles.riskItem, { borderLeftColor: riskColor }]}>
              <View style={styles.riskItemHeader}>
                <Text style={[styles.riskFactor, { color: colors.text }]}>
                  {risk.factor}
                </Text>
                <View style={[styles.severityBadge, { backgroundColor: riskColor + '20' }]}>
                  <Text style={[styles.severityText, { color: riskColor }]}>
                    {risk.severity}
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.riskImpact, { color: colors.textSecondary }]}>
                Impact: {risk.impact}
              </Text>
              
              <Text style={[styles.riskRecommendation, { color: colors.info }]}>
                💡 {risk.recommendation}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderOpportunities = () => (
    <View style={[styles.opportunitiesCard, { backgroundColor: colors.surface }]}>
      <View style={styles.opportunitiesHeader}>
        <Ionicons name="trending-up" size={20} color={colors.success} />
        <Text style={[styles.opportunitiesTitle, { color: colors.text }]}>
          Improvement Opportunities
        </Text>
      </View>

      <View style={styles.opportunitiesList}>
        {data.opportunities.map((opportunity, index) => {
          const effortColor = opportunity.effort === 'LOW' ? colors.success :
                             opportunity.effort === 'MEDIUM' ? colors.warning :
                             colors.error;

          return (
            <View key={index} style={[styles.opportunityItem, { backgroundColor: colors.background }]}>
              <LinearGradient
                colors={[colors.success + '10', colors.success + '05']}
                style={styles.opportunityGradient}
              >
                <View style={styles.opportunityHeader}>
                  <Text style={[styles.opportunityArea, { color: colors.text }]}>
                    {opportunity.area}
                  </Text>
                  <View style={styles.opportunityPotential}>
                    <Text style={[styles.potentialText, { color: colors.success }]}>
                      +{opportunity.potential} pts
                    </Text>
                  </View>
                </View>

                <View style={styles.opportunityDetails}>
                  <View style={styles.opportunityDetail}>
                    <Ionicons name="fitness" size={14} color={effortColor} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {opportunity.effort} effort
                    </Text>
                  </View>

                  <View style={styles.opportunityDetail}>
                    <Ionicons name="time" size={14} color={colors.info} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {opportunity.timeline}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* AFQT Projections */}
      {renderProjectionCard()}

      {/* Readiness Estimate */}
      {renderReadinessCard()}

      {/* Risk Factors */}
      {data.riskFactors.length > 0 && renderRiskFactors()}

      {/* Improvement Opportunities */}
      {data.opportunities.length > 0 && renderOpportunities()}

      {/* AI Insights Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '15', colors.accent + '15']}
          style={styles.summaryGradient}
        >
          <View style={styles.summaryHeader}>
            <Ionicons name="bulb" size={20} color={colors.primary} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              AI Strategic Assessment
            </Text>
          </View>

          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            Based on your current performance trajectory and study patterns, our AI projects a 
            {data.estimatedAFQT.projected90 > data.estimatedAFQT.current ? ' positive' : ' challenging'} 
            path forward. Focus on the identified opportunities while mitigating risk factors to 
            maximize your AFQT improvement potential.
          </Text>

          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Ionicons name="trending-up" size={16} color={colors.success} />
              <Text style={[styles.summaryMetricText, { color: colors.success }]}>
                {data.estimatedAFQT.projected90 - data.estimatedAFQT.current > 0 ? '+' : ''}
                {data.estimatedAFQT.projected90 - data.estimatedAFQT.current} pts potential
              </Text>
            </View>

            <View style={styles.summaryMetric}>
              <Ionicons name="warning" size={16} color={colors.warning} />
              <Text style={[styles.summaryMetricText, { color: colors.warning }]}>
                {data.riskFactors.length} risk factor{data.riskFactors.length !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.summaryMetric}>
              <Ionicons name="star" size={16} color={colors.info} />
              <Text style={[styles.summaryMetricText, { color: colors.info }]}>
                {data.opportunities.length} improvement area{data.opportunities.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  projectionCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  projectionGradient: {
    padding: 20,
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  projectionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  projectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  projectionSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  projectionScores: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  scoreArrow: {
    marginHorizontal: 10,
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceBar: {
    width: '100%',
    marginBottom: 8,
  },
  confidenceBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  readinessCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  readinessGradient: {
    padding: 20,
  },
  readinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  readinessTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  readinessContent: {
    alignItems: 'center',
  },
  readinessDate: {
    alignItems: 'center',
    marginBottom: 15,
  },
  readinessDateText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  readinessDateSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  readinessStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  readinessStat: {
    alignItems: 'center',
  },
  readinessStatValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  readinessStatLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  riskCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  riskList: {
    gap: 12,
  },
  riskItem: {
    borderLeftWidth: 4,
    paddingLeft: 15,
    paddingVertical: 10,
  },
  riskItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  riskFactor: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  riskImpact: {
    fontSize: 13,
    marginBottom: 4,
  },
  riskRecommendation: {
    fontSize: 13,
    lineHeight: 18,
  },
  opportunitiesCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  opportunitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  opportunitiesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  opportunitiesList: {
    gap: 12,
  },
  opportunityItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  opportunityGradient: {
    padding: 15,
  },
  opportunityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  opportunityArea: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  opportunityPotential: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  potentialText: {
    fontSize: 12,
    fontWeight: '700',
  },
  opportunityDetails: {
    flexDirection: 'row',
    gap: 15,
  },
  opportunityDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  summaryCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMetricText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});