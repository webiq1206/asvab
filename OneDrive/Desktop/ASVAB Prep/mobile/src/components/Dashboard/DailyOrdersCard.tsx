import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { MilitaryBranch } from '@asvab-prep/shared';
import { DailyOrder } from '@/services/dashboardService';
import { Ionicons } from '@expo/vector-icons';

interface DailyOrdersCardProps {
  orders: DailyOrder[];
  branch: MilitaryBranch;
  onOrderComplete: (orderId: string) => void;
  onOrderPress: (order: DailyOrder) => void;
}

export const DailyOrdersCard: React.FC<DailyOrdersCardProps> = ({
  orders,
  branch,
  onOrderComplete,
  onOrderPress,
}) => {
  const branchColor = theme.branchColors[branch];

  const getPriorityColor = (priority: DailyOrder['priority']) => {
    switch (priority) {
      case 'HIGH': return theme.colors.DANGER;
      case 'MEDIUM': return theme.colors.TACTICAL_ORANGE;
      case 'LOW': return theme.colors.KHAKI;
      default: return theme.colors.KHAKI;
    }
  };

  const getPriorityIcon = (priority: DailyOrder['priority']) => {
    switch (priority) {
      case 'HIGH': return 'alert-circle';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'information-circle';
      default: return 'information-circle';
    }
  };

  return (
    <MilitaryCard variant="intel" branch={branch} style={styles.card}>
      <MilitaryCardHeader
        title="DAILY ORDERS"
        subtitle="Your mission objectives for today"
        variant="intel"
        rightContent={
          <View style={styles.orderCounter}>
            <Text style={styles.counterText}>
              {orders.filter(o => !o.completed).length} / {orders.length}
            </Text>
          </View>
        }
      />

      <MilitaryCardContent>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={32} color={theme.colors.SUCCESS} />
            <Text style={styles.emptyTitle}>All Orders Complete!</Text>
            <Text style={styles.emptyMessage}>Outstanding work! Check back tomorrow for new missions.</Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order, index) => (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.orderItem,
                  order.completed && styles.completedOrder,
                ]}
                onPress={() => onOrderPress(order)}
                disabled={order.completed}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.priorityIndicator}>
                    <Ionicons
                      name={getPriorityIcon(order.priority)}
                      size={16}
                      color={getPriorityColor(order.priority)}
                    />
                    <Text style={[styles.priorityText, { color: getPriorityColor(order.priority) }]}>
                      {order.priority}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.checkButton,
                      order.completed && styles.completedCheckButton,
                    ]}
                    onPress={() => onOrderComplete(order.id)}
                  >
                    <Ionicons
                      name={order.completed ? 'checkmark-circle' : 'radio-button-off'}
                      size={20}
                      color={order.completed ? theme.colors.SUCCESS : theme.colors.KHAKI}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.orderTitle, order.completed && styles.completedText]}>
                  {order.title}
                </Text>

                <Text style={[styles.orderDescription, order.completed && styles.completedText]}>
                  {order.description}
                </Text>

                <View style={styles.orderFooter}>
                  <View style={styles.orderMeta}>
                    {order.dueTime && (
                      <View style={styles.metaItem}>
                        <Ionicons name="time" size={12} color={theme.colors.KHAKI} />
                        <Text style={styles.metaText}>Due: {order.dueTime}</Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={12} color={theme.colors.TACTICAL_ORANGE} />
                      <Text style={styles.metaText}>{order.points} pts</Text>
                    </View>
                  </View>

                  {!order.completed && (
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: branchColor }]}
                      onPress={() => onOrderPress(order)}
                    >
                      <Text style={styles.actionButtonText}>BEGIN</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {order.completed && (
                  <View style={styles.completedOverlay}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.SUCCESS} />
                    <Text style={styles.completedLabel}>MISSION COMPLETE</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Progress Bar */}
        {orders.length > 0 && (
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>DAILY MISSION PROGRESS</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(orders.filter(o => o.completed).length / orders.length) * 100}%`,
                    backgroundColor: branchColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {orders.filter(o => o.completed).length} of {orders.length} orders complete
            </Text>
          </View>
        )}
      </MilitaryCardContent>
    </MilitaryCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing[4],
  },
  orderCounter: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  counterText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing[6],
  },
  emptyTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  emptyMessage: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
  ordersList: {
    gap: theme.spacing[3],
  },
  orderItem: {
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.KHAKI,
    position: 'relative',
  },
  completedOrder: {
    opacity: 0.7,
    backgroundColor: `${theme.colors.SUCCESS}10`,
    borderColor: theme.colors.SUCCESS,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    marginLeft: theme.spacing[1],
  },
  checkButton: {
    padding: theme.spacing[1],
  },
  completedCheckButton: {
    backgroundColor: `${theme.colors.SUCCESS}20`,
    borderRadius: theme.borderRadius.sm,
  },
  orderTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    marginBottom: theme.spacing[2],
  },
  orderDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    lineHeight: 18,
    marginBottom: theme.spacing[3],
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderMeta: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    marginLeft: theme.spacing[1],
  },
  actionButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
  },
  actionButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  completedOverlay: {
    position: 'absolute',
    top: theme.spacing[2],
    right: theme.spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.SUCCESS}20`,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  completedLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.SUCCESS,
    marginLeft: theme.spacing[1],
  },
  progressSection: {
    marginTop: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}10`,
    borderRadius: theme.borderRadius.base,
  },
  progressLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: `${theme.colors.KHAKI}20`,
    borderRadius: 3,
    marginBottom: theme.spacing[2],
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
});