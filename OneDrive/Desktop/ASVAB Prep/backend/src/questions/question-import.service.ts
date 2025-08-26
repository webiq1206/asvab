import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuestionCategory, QuestionDifficulty } from '@prisma/client';

interface QuestionData {
  content: string;
  options: string[];
  correctAnswer: number;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  explanationBasic: string;
  explanationPremium?: string;
  tags?: string[];
}

@Injectable()
export class QuestionImportService {
  constructor(private prisma: PrismaService) {}

  async importQuestions() {
    console.log('📚 Starting question import...');
    
    const questionsToImport = this.generateASVABQuestions();
    
    let importedCount = 0;
    for (const questionData of questionsToImport) {
      try {
        await this.prisma.question.create({
          data: questionData,
        });
        importedCount++;
      } catch (error) {
        console.error('Error importing question:', error);
      }
    }

    console.log(`✅ Imported ${importedCount} questions successfully`);
    return { imported: importedCount, total: questionsToImport.length };
  }

  private generateASVABQuestions(): QuestionData[] {
    const questions: QuestionData[] = [];

    // General Science Questions
    questions.push(...this.getGeneralScienceQuestions());
    
    // Arithmetic Reasoning Questions
    questions.push(...this.getArithmeticReasoningQuestions());
    
    // Word Knowledge Questions
    questions.push(...this.getWordKnowledgeQuestions());
    
    // Paragraph Comprehension Questions
    questions.push(...this.getParagraphComprehensionQuestions());
    
    // Mathematics Knowledge Questions
    questions.push(...this.getMathematicsKnowledgeQuestions());
    
    // Electronics Information Questions
    questions.push(...this.getElectronicsInformationQuestions());
    
    // Auto & Shop Information Questions
    questions.push(...this.getAutoShopQuestions());
    
    // Mechanical Comprehension Questions
    questions.push(...this.getMechanicalComprehensionQuestions());
    
    // Assembling Objects Questions
    questions.push(...this.getAssemblingObjectsQuestions());

    return questions;
  }

  private getGeneralScienceQuestions(): QuestionData[] {
    return [
      {
        content: 'What is the chemical symbol for gold?',
        options: ['Go', 'Au', 'Ag', 'Gd'],
        correctAnswer: 1,
        category: QuestionCategory.GENERAL_SCIENCE,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'The chemical symbol for gold is Au, derived from the Latin word "aurum."',
        explanationPremium: 'The chemical symbol for gold is Au, derived from the Latin word "aurum" meaning "shining dawn." Gold is a precious metal with atomic number 79, prized for its resistance to corrosion and excellent electrical conductivity.',
        tags: ['chemistry', 'elements', 'metals'],
      },
      {
        content: 'Which planet is closest to the Sun?',
        options: ['Venus', 'Mercury', 'Earth', 'Mars'],
        correctAnswer: 1,
        category: QuestionCategory.GENERAL_SCIENCE,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'Mercury is the planet closest to the Sun in our solar system.',
        explanationPremium: 'Mercury is the planet closest to the Sun, with an average distance of about 36 million miles. Understanding planetary positions is crucial for military navigation, satellite operations, and space force missions.',
        tags: ['astronomy', 'planets', 'solar system'],
      },
      {
        content: 'What is the basic unit of life?',
        options: ['Tissue', 'Organ', 'Cell', 'Molecule'],
        correctAnswer: 2,
        category: QuestionCategory.GENERAL_SCIENCE,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'The cell is considered the basic unit of life.',
        explanationPremium: 'The cell is the basic unit of life, the smallest structural and functional unit of living organisms. Understanding cellular biology is important for military medical personnel and biological warfare defense.',
        tags: ['biology', 'cells', 'life'],
      },
      {
        content: 'What causes ocean tides?',
        options: ['Wind patterns', 'Earth\'s rotation', 'Gravitational pull of the Moon', 'Temperature changes'],
        correctAnswer: 2,
        category: QuestionCategory.GENERAL_SCIENCE,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'Ocean tides are primarily caused by the gravitational pull of the Moon.',
        explanationPremium: 'Ocean tides are primarily caused by the gravitational pull of the Moon, with the Sun having a secondary effect. Understanding tides is crucial for naval operations, amphibious landings, and coastal navigation.',
        tags: ['oceanography', 'tides', 'moon', 'gravity'],
      },
      {
        content: 'Which gas makes up approximately 78% of Earth\'s atmosphere?',
        options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'],
        correctAnswer: 2,
        category: QuestionCategory.GENERAL_SCIENCE,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'Nitrogen makes up about 78% of Earth\'s atmosphere.',
        explanationPremium: 'Nitrogen makes up about 78% of Earth\'s atmosphere, with oxygen at 21% and other gases at 1%. Understanding atmospheric composition is vital for aviation, space operations, and environmental warfare considerations.',
        tags: ['atmosphere', 'gases', 'nitrogen'],
      },
      // Add more General Science questions...
    ];
  }

  private getArithmeticReasoningQuestions(): QuestionData[] {
    return [
      {
        content: 'A military convoy travels 180 miles in 3 hours. What is their average speed?',
        options: ['50 mph', '55 mph', '60 mph', '65 mph'],
        correctAnswer: 2,
        category: QuestionCategory.ARITHMETIC_REASONING,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'Speed = Distance ÷ Time. 180 miles ÷ 3 hours = 60 mph.',
        explanationPremium: 'Speed = Distance ÷ Time. 180 miles ÷ 3 hours = 60 mph. This type of calculation is essential for military logistics, convoy planning, and mission timing. Understanding speed, distance, and time relationships is crucial for tactical operations.',
        tags: ['speed', 'distance', 'time', 'convoy'],
      },
      {
        content: 'If 5 soldiers can complete a task in 8 hours, how long would it take 10 soldiers to complete the same task?',
        options: ['4 hours', '6 hours', '12 hours', '16 hours'],
        correctAnswer: 0,
        category: QuestionCategory.ARITHMETIC_REASONING,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'This is inverse proportion. If you double the workers, you halve the time: 8 ÷ 2 = 4 hours.',
        explanationPremium: 'This is an inverse proportion problem. Total work = 5 soldiers × 8 hours = 40 soldier-hours. With 10 soldiers: 40 soldier-hours ÷ 10 soldiers = 4 hours. This type of calculation is used in military workforce planning and resource allocation.',
        tags: ['work rate', 'proportion', 'manpower'],
      },
      {
        content: 'A supply depot has 2,400 MREs (Meals Ready to Eat). If each soldier consumes 3 MREs per day, how many soldiers can be fed for 5 days?',
        options: ['120 soldiers', '140 soldiers', '160 soldiers', '180 soldiers'],
        correctAnswer: 2,
        category: QuestionCategory.ARITHMETIC_REASONING,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'Total consumption per soldier for 5 days = 3 × 5 = 15 MREs. Number of soldiers = 2,400 ÷ 15 = 160.',
        explanationPremium: 'First calculate total MREs per soldier for 5 days: 3 MREs/day × 5 days = 15 MREs per soldier. Then divide total supply: 2,400 MREs ÷ 15 MREs per soldier = 160 soldiers. This type of supply calculation is critical for military logistics and mission planning.',
        tags: ['supply', 'rations', 'logistics'],
      },
      {
        content: 'A military aircraft flies at 450 mph. How far will it travel in 2.5 hours?',
        options: ['1,025 miles', '1,125 miles', '1,225 miles', '1,325 miles'],
        correctAnswer: 1,
        category: QuestionCategory.ARITHMETIC_REASONING,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'Distance = Speed × Time. 450 mph × 2.5 hours = 1,125 miles.',
        explanationPremium: 'Distance = Speed × Time. 450 mph × 2.5 hours = 1,125 miles. This calculation is fundamental for flight planning, fuel requirements, and mission range determination in military aviation operations.',
        tags: ['aircraft', 'distance', 'flight planning'],
      },
      {
        content: 'If ammunition costs $3.50 per round and a training exercise uses 240 rounds, what is the total cost?',
        options: ['$740', '$820', '$840', '$860'],
        correctAnswer: 2,
        category: QuestionCategory.ARITHMETIC_REASONING,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'Total cost = Price per round × Number of rounds. $3.50 × 240 = $840.',
        explanationPremium: 'Total cost = Price per round × Number of rounds. $3.50 × 240 = $840. Understanding ammunition costs is important for military budget planning and training resource allocation.',
        tags: ['ammunition', 'cost', 'budget'],
      },
      // Add more Arithmetic Reasoning questions...
    ];
  }

  private getWordKnowledgeQuestions(): QuestionData[] {
    return [
      {
        content: 'TACTICAL most nearly means:',
        options: ['Strategic', 'Dangerous', 'Quick', 'Loud'],
        correctAnswer: 0,
        category: QuestionCategory.WORD_KNOWLEDGE,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'Tactical means relating to or constituting actions carefully planned to gain a specific military end.',
        explanationPremium: 'Tactical means relating to or constituting actions carefully planned to gain a specific military end. It\'s derived from the Greek "taktikos" meaning "fit for arranging." In military contexts, tactical refers to short-term, immediate battlefield decisions as opposed to strategic long-term planning.',
        tags: ['military terms', 'strategy'],
      },
      {
        content: 'RECONNAISSANCE most nearly means:',
        options: ['Attack', 'Survey', 'Retreat', 'Supply'],
        correctAnswer: 1,
        category: QuestionCategory.WORD_KNOWLEDGE,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'Reconnaissance means preliminary surveying or research, especially to gain military intelligence.',
        explanationPremium: 'Reconnaissance means preliminary surveying or research, especially to gain military intelligence about enemy forces or territory. From French "reconnaître" meaning "to recognize." Recon is essential for tactical planning and mission success.',
        tags: ['military terms', 'intelligence'],
      },
      {
        content: 'FORTIFY most nearly means:',
        options: ['Weaken', 'Strengthen', 'Move', 'Hide'],
        correctAnswer: 1,
        category: QuestionCategory.WORD_KNOWLEDGE,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'Fortify means to strengthen or secure a place with defensive works.',
        explanationPremium: 'Fortify means to strengthen or secure a place with defensive works, or to make something stronger. From Latin "fortis" meaning strong. Military fortification has been crucial throughout history for defensive positions and strategic advantage.',
        tags: ['military terms', 'defense'],
      },
      {
        content: 'VIGILANT most nearly means:',
        options: ['Tired', 'Alert', 'Angry', 'Confused'],
        correctAnswer: 1,
        category: QuestionCategory.WORD_KNOWLEDGE,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'Vigilant means keeping careful watch for possible danger or difficulties.',
        explanationPremium: 'Vigilant means keeping careful watch for possible danger or difficulties. From Latin "vigilare" meaning "to keep awake." Vigilance is a fundamental military virtue, essential for security and mission success.',
        tags: ['alertness', 'security'],
      },
      {
        content: 'LOGISTICS most nearly means:',
        options: ['Combat', 'Supply management', 'Communication', 'Navigation'],
        correctAnswer: 1,
        category: QuestionCategory.WORD_KNOWLEDGE,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'Logistics refers to the detailed coordination of complex operations involving people, facilities, and supplies.',
        explanationPremium: 'Logistics refers to the detailed coordination of complex operations involving people, facilities, and supplies. In military terms, it encompasses the procurement, maintenance, and transportation of military materiel, facilities, and personnel. Strong logistics wins wars.',
        tags: ['military terms', 'supply'],
      },
      // Add more Word Knowledge questions...
    ];
  }

  private getParagraphComprehensionQuestions(): QuestionData[] {
    return [
      {
        content: 'Military communications must be clear, concise, and accurate. Ambiguous messages can lead to mission failure, friendly fire incidents, or loss of life. Radio protocols exist to ensure message clarity under stress. Standard phrases and phonetic alphabet usage reduces misunderstandings in noisy environments.\n\nAccording to the passage, military communications protocols are designed to:',
        options: ['Speed up transmission', 'Prevent misunderstandings', 'Save battery power', 'Maintain secrecy'],
        correctAnswer: 1,
        category: QuestionCategory.PARAGRAPH_COMPREHENSION,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'The passage states that protocols "ensure message clarity" and "reduces misunderstandings."',
        explanationPremium: 'The passage explicitly mentions that radio protocols exist to "ensure message clarity under stress" and that "standard phrases and phonetic alphabet usage reduces misunderstandings in noisy environments." This directly supports preventing misunderstandings as the primary purpose.',
        tags: ['communications', 'reading comprehension'],
      },
      {
        content: 'The chain of command is fundamental to military organization. Orders flow down from higher to lower ranks, while reports flow up. This system ensures accountability, maintains discipline, and provides clear authority structures during operations. Breaking the chain of command can result in chaos and mission compromise.\n\nWhat is the main idea of this paragraph?',
        options: ['Orders are important', 'Military has ranks', 'Chain of command provides structure', 'Reports go upward'],
        correctAnswer: 2,
        category: QuestionCategory.PARAGRAPH_COMPREHENSION,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'The paragraph focuses on how the chain of command provides structure and organization.',
        explanationPremium: 'The main idea encompasses the entire purpose of the chain of command system - providing structure through accountability, discipline, and clear authority. The other options are supporting details rather than the central theme.',
        tags: ['military organization', 'reading comprehension'],
      },
      // Add more Paragraph Comprehension questions...
    ];
  }

  private getMathematicsKnowledgeQuestions(): QuestionData[] {
    return [
      {
        content: 'What is the value of x in the equation: 3x + 12 = 27?',
        options: ['3', '5', '7', '9'],
        correctAnswer: 1,
        category: QuestionCategory.MATHEMATICS_KNOWLEDGE,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'Subtract 12 from both sides: 3x = 15, then divide by 3: x = 5.',
        explanationPremium: 'To solve 3x + 12 = 27: First, subtract 12 from both sides: 3x = 15. Then divide both sides by 3: x = 5. This type of linear equation solving is used in ballistics calculations and engineering applications in military systems.',
        tags: ['algebra', 'linear equations'],
      },
      {
        content: 'If a circle has a radius of 8 inches, what is its circumference? (Use π ≈ 3.14)',
        options: ['25.12 inches', '50.24 inches', '100.48 inches', '201.06 inches'],
        correctAnswer: 1,
        category: QuestionCategory.MATHEMATICS_KNOWLEDGE,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'Circumference = 2πr = 2 × 3.14 × 8 = 50.24 inches.',
        explanationPremium: 'Circumference = 2πr = 2 × 3.14 × 8 = 50.24 inches. Understanding circular measurements is important for radar systems, satellite orbits, and navigation calculations in military applications.',
        tags: ['geometry', 'circles', 'circumference'],
      },
      {
        content: 'What is 15% of 240?',
        options: ['36', '24', '48', '60'],
        correctAnswer: 0,
        category: QuestionCategory.MATHEMATICS_KNOWLEDGE,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: '15% of 240 = 0.15 × 240 = 36.',
        explanationPremium: '15% of 240 = 0.15 × 240 = 36. Percentage calculations are essential for military logistics, casualty rates, equipment readiness percentages, and budget allocations.',
        tags: ['percentages', 'basic math'],
      },
      // Add more Mathematics Knowledge questions...
    ];
  }

  private getElectronicsInformationQuestions(): QuestionData[] {
    return [
      {
        content: 'Which component in an electrical circuit opposes the flow of current?',
        options: ['Capacitor', 'Resistor', 'Inductor', 'Diode'],
        correctAnswer: 1,
        category: QuestionCategory.ELECTRONICS_INFORMATION,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'A resistor opposes or resists the flow of electrical current through a circuit.',
        explanationPremium: 'A resistor opposes or resists the flow of electrical current through a circuit. Resistors are measured in ohms and are fundamental components in military electronics, used to control current flow and protect sensitive equipment in radar, communications, and weapon systems.',
        tags: ['electronics', 'resistor', 'current'],
      },
      {
        content: 'What does AC stand for in electrical terms?',
        options: ['Alternating Current', 'Advanced Circuit', 'Auxiliary Control', 'Active Component'],
        correctAnswer: 0,
        category: QuestionCategory.ELECTRONICS_INFORMATION,
        difficulty: QuestionDifficulty.EASY,
        explanationBasic: 'AC stands for Alternating Current, which periodically reverses direction.',
        explanationPremium: 'AC stands for Alternating Current, which periodically reverses direction, typically at 60 Hz in North America. AC power is used in most military base electrical systems, while DC is common in vehicles and portable equipment.',
        tags: ['electronics', 'AC', 'current'],
      },
      // Add more Electronics Information questions...
    ];
  }

  private getAutoShopQuestions(): QuestionData[] {
    return [
      {
        content: 'Which tool is used to measure the thickness of a brake rotor?',
        options: ['Caliper', 'Micrometer', 'Feeler gauge', 'Torque wrench'],
        correctAnswer: 1,
        category: QuestionCategory.AUTO_SHOP,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'A micrometer provides precise measurements needed for brake rotor thickness.',
        explanationPremium: 'A micrometer provides the precise measurements (typically to 0.001 inch) needed to measure brake rotor thickness and determine if it meets minimum specifications. This is crucial for military vehicle safety and maintenance.',
        tags: ['automotive', 'tools', 'brakes'],
      },
      // Add more Auto Shop questions...
    ];
  }

  private getMechanicalComprehensionQuestions(): QuestionData[] {
    return [
      {
        content: 'If gear A has 20 teeth and gear B has 40 teeth, and gear A turns 4 complete revolutions, how many revolutions will gear B make?',
        options: ['2 revolutions', '4 revolutions', '8 revolutions', '16 revolutions'],
        correctAnswer: 0,
        category: QuestionCategory.MECHANICAL_COMPREHENSION,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'Gear ratio is 20:40 or 1:2. When A turns 4 times, B turns 2 times.',
        explanationPremium: 'Gear ratio is 20:40 or 1:2. The smaller gear (A) turns twice for each turn of the larger gear (B). So 4 revolutions of A equals 2 revolutions of B. This principle is used in military vehicle transmissions and aircraft engines.',
        tags: ['mechanical', 'gears', 'ratios'],
      },
      // Add more Mechanical Comprehension questions...
    ];
  }

  private getAssemblingObjectsQuestions(): QuestionData[] {
    return [
      {
        content: 'Which shape would result from folding the given pattern? [This would typically have visual diagrams]',
        options: ['Cube', 'Pyramid', 'Cylinder', 'Cone'],
        correctAnswer: 0,
        category: QuestionCategory.ASSEMBLING_OBJECTS,
        difficulty: QuestionDifficulty.MEDIUM,
        explanationBasic: 'The pattern shows a cube net - six squares arranged to form a cube when folded.',
        explanationPremium: 'This type of spatial visualization is crucial for mechanical assembly, equipment maintenance, and understanding technical diagrams in military operations.',
        tags: ['spatial reasoning', 'assembly'],
      },
      // Add more Assembling Objects questions...
    ];
  }
}