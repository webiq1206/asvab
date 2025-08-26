import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/authStore';
import { theme } from '@/constants/theme';

// Import main screens
import { DashboardScreen } from '@/screens/Dashboard/DashboardScreen';
import { QuizSetupScreen } from '@/screens/Quiz/QuizSetupScreen';
import { QuizTakingScreen } from '@/screens/Quiz/QuizTakingScreen';
import { QuizResultsScreen } from '@/screens/Quiz/QuizResultsScreen';
import { QuizHistoryScreen } from '@/screens/Quiz/QuizHistoryScreen';

// Import new feature screens
import { AICoachingScreen } from '@/screens/AI/AICoachingScreen';
import { AdvancedAnalyticsScreen } from '@/screens/Analytics/AdvancedAnalyticsScreen';
import { GamificationDashboardScreen } from '@/screens/Gamification/GamificationDashboardScreen';
import { AchievementsScreen } from '@/screens/Gamification/AchievementsScreen';
import { LeaderboardScreen } from '@/screens/Gamification/LeaderboardScreen';
import { MEPSPreparationScreen } from '@/screens/MEPS/MEPSPreparationScreen';
import { MEPSDocumentsScreen } from '@/screens/MEPS/MEPSDocumentsScreen';
import { MEPSMedicalGuideScreen } from '@/screens/MEPS/MEPSMedicalGuideScreen';
import { PTTestScreen } from '@/screens/Fitness/PTTestScreen';
import { FlashcardStudyScreen } from '@/screens/Flashcards/FlashcardStudyScreen';
import { JobDetailScreen } from '@/screens/Military/JobDetailScreen';
import { NotificationSettingsScreen } from '@/screens/Settings/NotificationSettingsScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  QuizTaking: {
    quizId: string;
    questionIds: string[];
  };
  QuizResults: {
    quizId: string;
    score: number;
    totalQuestions: number;
  };
  // New feature screens
  AICoaching: undefined;
  AdvancedAnalytics: undefined;
  GamificationDashboard: undefined;
  Achievements: undefined;
  Leaderboard: undefined;
  MEPSPreparation: undefined;
  MEPSDocuments: undefined;
  MEPSMedicalGuide: undefined;
  PTTest: undefined;
  FlashcardStudy: { deckId?: string };
  JobDetail: { jobId: string };
  NotificationSettings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Quiz: undefined;
  History: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const { selectedBranch } = useAuth();
  const branchColor = selectedBranch ? theme.branchColors[selectedBranch] : theme.colors.MILITARY_GREEN;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Quiz') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: branchColor,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.DARK_OLIVE,
          borderTopColor: branchColor,
          borderTopWidth: 2,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.military.bold,
          fontSize: theme.fontSizes.xs,
        },
        headerStyle: {
          backgroundColor: theme.colors.DARK_OLIVE,
        },
        headerTitleStyle: {
          fontFamily: theme.fonts.military.bold,
          color: theme.colors.KHAKI,
        },
        headerTintColor: theme.colors.KHAKI,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'COMMAND CENTER',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Quiz" 
        component={QuizSetupScreen}
        options={{
          title: 'TRAINING',
        }}
      />
      <Tab.Screen 
        name="History" 
        component={QuizHistoryScreen}
        options={{
          title: 'MISSION LOG',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={DashboardScreen} // TODO: Create ProfileScreen
        options={{
          title: 'PERSONNEL FILE',
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.DESERT_SAND },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen 
        name="QuizTaking" 
        component={QuizTakingScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="QuizResults" component={QuizResultsScreen} />
      
      {/* New Feature Screens */}
      <Stack.Screen 
        name="AICoaching" 
        component={AICoachingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AdvancedAnalytics" 
        component={AdvancedAnalyticsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="GamificationDashboard" 
        component={GamificationDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Achievements" 
        component={AchievementsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MEPSPreparation" 
        component={MEPSPreparationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MEPSDocuments" 
        component={MEPSDocumentsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MEPSMedicalGuide" 
        component={MEPSMedicalGuideScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PTTest" 
        component={PTTestScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FlashcardStudy" 
        component={FlashcardStudyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="JobDetail" 
        component={JobDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};