import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { offlineService } from '@/services/offlineService';

interface OfflineIndicatorProps {
  onSyncPress?: () => void;
  branch?: MilitaryBranch;
  style?: any;
}

interface OfflineStatus {
  isOnline: boolean;
  questionsCount: number;
  quizzesCount: number;
  lastSync: Date | null;
  pendingSyncItems: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  onSyncPress,
  branch,
  style,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: true,
    questionsCount: 0,
    quizzesCount: 0,
    lastSync: null,
    pendingSyncItems: 0,
  });
  const [showDetails, setShowDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadOfflineStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadOfflineStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOfflineStatus = async () => {
    try {
      const offlineStatus = await offlineService.getOfflineStatus();
      setStatus(offlineStatus);
    } catch (error) {
      console.error('Failed to load offline status:', error);
    }
  };

  const handleSync = async () => {
    if (syncing || !status.isOnline) return;

    try {
      setSyncing(true);
      const success = await offlineService.syncWithServer();
      
      if (success) {
        await loadOfflineStatus(); // Refresh status after sync
      }

      if (onSyncPress) {
        onSyncPress();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getMilitaryStatusText = (): string => {
    if (!status.isOnline) {
      switch (userBranch) {
        case MilitaryBranch.ARMY:
          return "OFFLINE OPERATIONS";
        case MilitaryBranch.NAVY:
          return "RADIO SILENCE";
        case MilitaryBranch.AIR_FORCE:
          return "NO SIGNAL";
        case MilitaryBranch.MARINES:
          return "COMM BLACKOUT";
        case MilitaryBranch.COAST_GUARD:
          return "NO CONTACT";
        case MilitaryBranch.SPACE_FORCE:
          return "ORBIT DARK";
        default:
          return "OFFLINE";
      }
    }

    return status.pendingSyncItems > 0 ? "SYNC PENDING" : "ONLINE";
  };

  const getStatusColor = (): string => {
    if (!status.isOnline) return theme.colors.DANGER;
    if (status.pendingSyncItems > 0) return theme.colors.TACTICAL_ORANGE;
    return theme.colors.SUCCESS;
  };

  const getStatusIcon = (): string => {
    if (syncing) return "sync";
    if (!status.isOnline) return "cloud-offline";
    if (status.pendingSyncItems > 0) return "cloud-upload";
    return "cloud-done";
  };

  const formatLastSync = (): string => {
    if (!status.lastSync) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - status.lastSync.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours >= 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
    if (diffHours >= 1) return `${diffHours}h ago`;
    if (diffMinutes >= 1) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  const statusColor = getStatusColor();

  return (
    <>
      <TouchableOpacity
        style={[
          styles.indicator,
          { backgroundColor: `${statusColor}20`, borderColor: statusColor },
          style,
        ]}
        onPress={() => setShowDetails(true)}
      >
        <Ionicons
          name={getStatusIcon()}
          size={16}
          color={statusColor}
          style={syncing && styles.syncingIcon}
        />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {getMilitaryStatusText()}
        </Text>
        
        {status.pendingSyncItems > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.colors.TACTICAL_ORANGE }]}>
            <Text style={styles.badgeText}>{status.pendingSyncItems}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.DARK_OLIVE }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: branchColor }]}>
            <TouchableOpacity onPress={() => setShowDetails(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: branchColor }]}>
              OFFLINE STATUS
            </Text>
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {/* Connection Status */}
            <View style={[styles.statusCard, { borderColor: statusColor }]}>
              <View style={styles.statusHeader}>
                <Ionicons name={getStatusIcon()} size={24} color={statusColor} />
                <Text style={[styles.statusTitle, { color: statusColor }]}>
                  {getMilitaryStatusText()}
                </Text>
              </View>
              
              <Text style={styles.statusDescription}>
                {status.isOnline 
                  ? "Connected to command center. All systems operational."
                  : "Operating in offline mode. Limited functionality available."
                }
              </Text>
            </View>

            {/* Offline Data Summary */}
            <View style={[styles.dataCard, { backgroundColor: `${branchColor}20` }]}>
              <Text style={[styles.cardTitle, { color: branchColor }]}>
                OFFLINE RESOURCES
              </Text>
              
              <View style={styles.dataStats}>
                <View style={styles.dataStat}>
                  <Ionicons name="help-circle" size={20} color={theme.colors.INFO} />
                  <Text style={styles.dataValue}>{status.questionsCount}</Text>
                  <Text style={styles.dataLabel}>Questions</Text>
                </View>
                
                <View style={styles.dataStat}>
                  <Ionicons name="document-text" size={20} color={theme.colors.WARNING} />
                  <Text style={styles.dataValue}>{status.quizzesCount}</Text>
                  <Text style={styles.dataLabel}>Quizzes</Text>
                </View>
                
                <View style={styles.dataStat}>
                  <Ionicons name="cloud-upload" size={20} color={theme.colors.TACTICAL_ORANGE} />
                  <Text style={styles.dataValue}>{status.pendingSyncItems}</Text>
                  <Text style={styles.dataLabel}>Pending Sync</Text>
                </View>
              </View>
            </View>

            {/* Sync Information */}
            <View style={[styles.syncCard, { backgroundColor: `${theme.colors.MILITARY_GREEN}20` }]}>
              <Text style={styles.syncTitle}>LAST SYNCHRONIZATION</Text>
              <Text style={styles.syncTime}>{formatLastSync()}</Text>
              
              {status.isOnline && (
                <TouchableOpacity
                  style={[
                    styles.syncButton,
                    { backgroundColor: theme.colors.SUCCESS },
                    syncing && { opacity: 0.6 },
                  ]}
                  onPress={handleSync}
                  disabled={syncing}
                >
                  <Ionicons 
                    name={syncing ? "sync" : "refresh"} 
                    size={16} 
                    color="#FFFFFF"
                    style={syncing && styles.syncingIcon}
                  />
                  <Text style={styles.syncButtonText}>
                    {syncing ? 'SYNCING...' : 'SYNC NOW'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Offline Tips */}
            <View style={[styles.tipsCard, { backgroundColor: `${theme.colors.INFO}20` }]}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb" size={20} color={theme.colors.INFO} />
                <Text style={[styles.tipsTitle, { color: theme.colors.INFO }]}>
                  OFFLINE TRAINING TIPS
                </Text>
              </View>
              
              <View style={styles.tipsList}>
                <Text style={styles.tipText}>
                  • Download questions before going offline for uninterrupted training
                </Text>
                <Text style={styles.tipText}>
                  • Completed quizzes and progress are saved locally and sync when online
                </Text>
                <Text style={styles.tipText}>
                  • Bookmarks and notes work offline and sync automatically
                </Text>
                <Text style={styles.tipText}>
                  • Premium features like whiteboard work offline once downloaded
                </Text>
              </View>
            </View>

            {/* Military Motivation */}
            {!status.isOnline && (
              <View style={[styles.motivationCard, { backgroundColor: `${theme.colors.DANGER}20` }]}>
                <Text style={[styles.motivationTitle, { color: theme.colors.DANGER }]}>
                  MAINTAIN OPERATIONAL READINESS
                </Text>
                <Text style={styles.motivationText}>
                  No comms with HQ, but the mission continues. Your offline training 
                  keeps you battle-ready until reconnection is established.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    gap: theme.spacing[2],
    position: 'relative',
  },
  statusText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
  },
  syncingIcon: {
    // Add rotation animation if needed
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 2,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: theme.spacing[4],
    padding: theme.spacing[2],
  },
  modalTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing[4],
    gap: theme.spacing[4],
  },
  statusCard: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  statusTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
  },
  statusDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    lineHeight: 20,
  },
  dataCard: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
  },
  cardTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  dataStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dataStat: {
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  dataValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xl,
    color: '#FFFFFF',
  },
  dataLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  syncCard: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  syncTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
  },
  syncTime: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.KHAKI,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing[2],
  },
  syncButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
  },
  tipsCard: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  tipsTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
  },
  tipsList: {
    gap: theme.spacing[2],
  },
  tipText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    lineHeight: 18,
  },
  motivationCard: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
  },
  motivationTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    marginBottom: theme.spacing[3],
    textAlign: 'center',
  },
  motivationText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});