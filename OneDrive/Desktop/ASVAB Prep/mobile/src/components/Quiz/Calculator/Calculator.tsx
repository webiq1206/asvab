import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

interface CalculatorProps {
  isVisible: boolean;
  onClose: () => void;
  mode: 'basic' | 'scientific';
  branch?: MilitaryBranch;
}

type CalculatorMode = 'basic' | 'scientific';

export const Calculator: React.FC<CalculatorProps> = ({
  isVisible,
  onClose,
  mode: initialMode,
  branch,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [mode, setMode] = useState<CalculatorMode>(initialMode);
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  const inputNumber = useCallback((num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  }, [display, waitingForNewValue]);

  const inputOperation = useCallback((nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  }, [display, previousValue, operation]);

  const calculate = useCallback((firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+': return firstValue + secondValue;
      case '-': return firstValue - secondValue;
      case '*': return firstValue * secondValue;
      case '/': return secondValue !== 0 ? firstValue / secondValue : 0;
      case '^': return Math.pow(firstValue, secondValue);
      case '%': return firstValue % secondValue;
      default: return secondValue;
    }
  }, []);

  const performCalculation = useCallback(() => {
    if (previousValue !== null && operation) {
      const inputValue = parseFloat(display);
      const newValue = calculate(previousValue, inputValue, operation);
      const calculation = `${previousValue} ${operation} ${inputValue} = ${newValue}`;
      
      setHistory(prev => [calculation, ...prev.slice(0, 9)]); // Keep last 10 calculations
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  }, [display, previousValue, operation, calculate]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay('0');
    setWaitingForNewValue(false);
  }, []);

  const inputDecimal = useCallback(() => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  }, [display, waitingForNewValue]);

  const backspace = useCallback(() => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display]);

  const scientificFunction = useCallback((func: string) => {
    const value = parseFloat(display);
    let result = 0;

    switch (func) {
      case 'sin': result = Math.sin(value * Math.PI / 180); break;
      case 'cos': result = Math.cos(value * Math.PI / 180); break;
      case 'tan': result = Math.tan(value * Math.PI / 180); break;
      case 'ln': result = Math.log(value); break;
      case 'log': result = Math.log10(value); break;
      case 'sqrt': result = Math.sqrt(value); break;
      case 'x²': result = value * value; break;
      case '1/x': result = value !== 0 ? 1 / value : 0; break;
      case 'π': result = Math.PI; break;
      case 'e': result = Math.E; break;
      case '!': 
        result = value >= 0 ? factorial(Math.floor(value)) : 0;
        break;
      default: result = value;
    }

    setDisplay(String(result));
    setWaitingForNewValue(true);
  }, [display]);

  const factorial = (n: number): number => {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  };

  const memoryOperation = useCallback((op: string) => {
    const value = parseFloat(display);
    
    switch (op) {
      case 'MC': setMemory(0); break;
      case 'MR': setDisplay(String(memory)); setWaitingForNewValue(true); break;
      case 'MS': setMemory(value); break;
      case 'M+': setMemory(memory + value); break;
      case 'M-': setMemory(memory - value); break;
    }
  }, [display, memory]);

  const getMilitaryTitle = (): string => {
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "TACTICAL CALCULATOR";
      case MilitaryBranch.NAVY:
        return "NAVIGATION CALCULATOR";
      case MilitaryBranch.AIR_FORCE:
        return "FLIGHT CALCULATOR";
      case MilitaryBranch.MARINES:
        return "COMBAT CALCULATOR";
      case MilitaryBranch.COAST_GUARD:
        return "RESCUE CALCULATOR";
      case MilitaryBranch.SPACE_FORCE:
        return "ORBITAL CALCULATOR";
      default:
        return "SCIENTIFIC CALCULATOR";
    }
  };

  const Button: React.FC<{
    title: string;
    onPress: () => void;
    color?: string;
    textColor?: string;
    flex?: number;
    disabled?: boolean;
  }> = ({ title, onPress, color, textColor, flex = 1, disabled = false }) => (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: color || `${theme.colors.MILITARY_GREEN}40`, flex },
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, { color: textColor || '#FFFFFF' }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderBasicButtons = () => (
    <>
      {/* Row 1 */}
      <View style={styles.row}>
        <Button title="C" onPress={clear} color={theme.colors.DANGER} />
        <Button title="CE" onPress={clearEntry} color={theme.colors.TACTICAL_ORANGE} />
        <Button title="⌫" onPress={backspace} color={theme.colors.TACTICAL_ORANGE} />
        <Button title="÷" onPress={() => inputOperation('/')} color={branchColor} />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        <Button title="7" onPress={() => inputNumber('7')} />
        <Button title="8" onPress={() => inputNumber('8')} />
        <Button title="9" onPress={() => inputNumber('9')} />
        <Button title="×" onPress={() => inputOperation('*')} color={branchColor} />
      </View>

      {/* Row 3 */}
      <View style={styles.row}>
        <Button title="4" onPress={() => inputNumber('4')} />
        <Button title="5" onPress={() => inputNumber('5')} />
        <Button title="6" onPress={() => inputNumber('6')} />
        <Button title="−" onPress={() => inputOperation('-')} color={branchColor} />
      </View>

      {/* Row 4 */}
      <View style={styles.row}>
        <Button title="1" onPress={() => inputNumber('1')} />
        <Button title="2" onPress={() => inputNumber('2')} />
        <Button title="3" onPress={() => inputNumber('3')} />
        <Button title="+" onPress={() => inputOperation('+')} color={branchColor} />
      </View>

      {/* Row 5 */}
      <View style={styles.row}>
        <Button title="±" onPress={() => setDisplay(String(-parseFloat(display)))} />
        <Button title="0" onPress={() => inputNumber('0')} />
        <Button title="." onPress={inputDecimal} />
        <Button title="=" onPress={performCalculation} color={theme.colors.SUCCESS} />
      </View>
    </>
  );

  const renderScientificButtons = () => (
    <>
      {/* Memory Row */}
      <View style={styles.row}>
        <Button title="MC" onPress={() => memoryOperation('MC')} color={theme.colors.INFO} />
        <Button title="MR" onPress={() => memoryOperation('MR')} color={theme.colors.INFO} />
        <Button title="MS" onPress={() => memoryOperation('MS')} color={theme.colors.INFO} />
        <Button title="M+" onPress={() => memoryOperation('M+')} color={theme.colors.INFO} />
        <Button title="M−" onPress={() => memoryOperation('M-')} color={theme.colors.INFO} />
      </View>

      {/* Scientific Row 1 */}
      <View style={styles.row}>
        <Button title="sin" onPress={() => scientificFunction('sin')} color={theme.colors.WARNING} />
        <Button title="cos" onPress={() => scientificFunction('cos')} color={theme.colors.WARNING} />
        <Button title="tan" onPress={() => scientificFunction('tan')} color={theme.colors.WARNING} />
        <Button title="ln" onPress={() => scientificFunction('ln')} color={theme.colors.WARNING} />
        <Button title="log" onPress={() => scientificFunction('log')} color={theme.colors.WARNING} />
      </View>

      {/* Scientific Row 2 */}
      <View style={styles.row}>
        <Button title="√" onPress={() => scientificFunction('sqrt')} color={theme.colors.WARNING} />
        <Button title="x²" onPress={() => scientificFunction('x²')} color={theme.colors.WARNING} />
        <Button title="xʸ" onPress={() => inputOperation('^')} color={theme.colors.WARNING} />
        <Button title="1/x" onPress={() => scientificFunction('1/x')} color={theme.colors.WARNING} />
        <Button title="n!" onPress={() => scientificFunction('!')} color={theme.colors.WARNING} />
      </View>

      {/* Constants Row */}
      <View style={styles.row}>
        <Button title="π" onPress={() => scientificFunction('π')} color={theme.colors.INFO} />
        <Button title="e" onPress={() => scientificFunction('e')} color={theme.colors.INFO} />
        <Button title="%" onPress={() => inputOperation('%')} color={branchColor} />
        <Button title="C" onPress={clear} color={theme.colors.DANGER} />
        <Button title="⌫" onPress={backspace} color={theme.colors.TACTICAL_ORANGE} />
      </View>

      {/* Basic operations integrated */}
      {renderBasicButtons()}
    </>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.DARK_OLIVE }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: branchColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: branchColor }]}>
              {getMilitaryTitle()}
            </Text>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === 'basic' && { backgroundColor: branchColor },
                ]}
                onPress={() => setMode('basic')}
              >
                <Text style={[
                  styles.modeButtonText,
                  { color: mode === 'basic' ? '#FFFFFF' : branchColor },
                ]}>
                  BASIC
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === 'scientific' && { backgroundColor: branchColor },
                ]}
                onPress={() => setMode('scientific')}
              >
                <Text style={[
                  styles.modeButtonText,
                  { color: mode === 'scientific' ? '#FFFFFF' : branchColor },
                ]}>
                  SCIENTIFIC
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Display */}
          <View style={[styles.display, { borderColor: branchColor }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.displayText}>{display}</Text>
            </ScrollView>
            {memory !== 0 && (
              <Text style={styles.memoryIndicator}>M: {memory}</Text>
            )}
          </View>

          {/* History */}
          {history.length > 0 && (
            <View style={styles.historySection}>
              <Text style={[styles.historyTitle, { color: branchColor }]}>RECENT CALCULATIONS</Text>
              <ScrollView style={styles.history} showsVerticalScrollIndicator={false}>
                {history.map((calc, index) => (
                  <Text key={index} style={styles.historyItem}>
                    {calc}
                  </Text>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {mode === 'basic' ? renderBasicButtons() : renderScientificButtons()}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
    zIndex: 2,
    padding: theme.spacing[2],
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    marginBottom: theme.spacing[3],
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing[1],
  },
  modeButton: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
  },
  modeButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
  },
  content: {
    flex: 1,
    padding: theme.spacing[4],
  },
  display: {
    backgroundColor: '#000000',
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    marginBottom: theme.spacing[4],
    minHeight: 80,
    justifyContent: 'center',
  },
  displayText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xxl,
    color: '#00FF00',
    textAlign: 'right',
    minWidth: 200,
  },
  memoryIndicator: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.TACTICAL_ORANGE,
    textAlign: 'left',
    marginTop: theme.spacing[2],
  },
  historySection: {
    marginBottom: theme.spacing[4],
  },
  historyTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    marginBottom: theme.spacing[2],
  },
  history: {
    maxHeight: 100,
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing[3],
  },
  historyItem: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[1],
  },
  buttonsContainer: {
    gap: theme.spacing[2],
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  button: {
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
  },
  disabledButton: {
    opacity: 0.5,
  },
});