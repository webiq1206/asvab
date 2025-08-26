import { apiClient } from './api';
import { 
  MilitaryBranch, 
  QuestionCategory, 
  AFQTScore,
  LineScores,
  MilitaryJobDetails,
  JobMatchResult,
  JobRecommendations
} from '@asvab-prep/shared';

export type MilitaryJob = MilitaryJobDetails;
export { AFQTScore, LineScores, JobMatchResult, JobRecommendations };

class MilitaryJobsService {
  async getJobsByBranch(
    branch: MilitaryBranch,
    limit = 50,
    offset = 0,
    searchTerm?: string
  ): Promise<{
    jobs: MilitaryJobDetails[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (searchTerm) {
      params.append('search', searchTerm);
    }

    const response = await apiClient.get(`/military/jobs/branch/${branch}?${params}`);
    return response.data;
  }

  async getJobById(jobId: string): Promise<MilitaryJobDetails> {
    const response = await apiClient.get(`/military/jobs/${jobId}`);
    return response.data;
  }

  async calculateAFQTScore(scores: {
    wordKnowledge: number;
    paragraphComprehension: number;
    arithmeticReasoning: number;
    mathematicsKnowledge: number;
  }): Promise<AFQTScore> {
    const response = await apiClient.post('/military/jobs/calculate-afqt', scores);
    return response.data;
  }

  async findMatchingJobs(
    afqtScore: AFQTScore,
    allScores: Record<QuestionCategory, number>,
    branch: MilitaryBranch,
    options?: {
      limit?: number;
      includePartialMatches?: boolean;
      sortBy?: 'match' | 'afqt' | 'title';
    }
  ): Promise<JobMatchResult[]> {
    const response = await apiClient.post('/military/jobs/match-jobs', {
      afqtScore,
      allScores,
      branch,
      options,
    });
    return response.data;
  }

  async getPersonalizedRecommendations(
    branch: MilitaryBranch,
    interests?: string[],
    userProgress?: Record<QuestionCategory, number>
  ): Promise<JobRecommendations> {
    const response = await apiClient.get('/military/jobs/recommendations/personalized', {
      params: {
        branch,
        interests: interests?.join(','),
      },
      data: userProgress,
    });
    return response.data;
  }

  async addJobToFavorites(jobId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/military/jobs/favorites/${jobId}`);
    return response.data;
  }

  async removeJobFromFavorites(jobId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/military/jobs/favorites/${jobId}`);
    return response.data;
  }

  async getUserFavoriteJobs(): Promise<MilitaryJobDetails[]> {
    const response = await apiClient.get('/military/jobs/favorites/my-jobs');
    return response.data;
  }

  async checkJobQualification(
    jobId: string,
    afqtScore: AFQTScore,
    allScores: Record<QuestionCategory, number>,
    branch: MilitaryBranch
  ): Promise<JobMatchResult> {
    const response = await apiClient.post('/military/jobs/qualification-check', {
      jobId,
      afqtScore,
      allScores,
      branch,
    });
    return response.data;
  }

  async getJobCategories(branch: MilitaryBranch): Promise<{
    branch: MilitaryBranch;
    categories: string[];
  }> {
    const response = await apiClient.get('/military/jobs/categories/available', {
      params: { branch },
    });
    return response.data;
  }

  // Utility functions for job analysis
  getDifficultyLevel(afqtScore: number): { level: string; color: string; description: string } {
    if (afqtScore >= 65) {
      return {
        level: 'High',
        color: '#FF4757',
        description: 'Requires top-tier ASVAB performance'
      };
    }
    if (afqtScore >= 50) {
      return {
        level: 'Medium',
        color: '#FFA502',
        description: 'Requires above-average ASVAB scores'
      };
    }
    return {
      level: 'Entry',
      color: '#2ED573',
      description: 'Entry-level position with basic requirements'
    };
  }

  getClearanceLevel(clearanceRequired?: string): {
    level: string;
    description: string;
    timeframe: string;
  } {
    if (!clearanceRequired) {
      return {
        level: 'None',
        description: 'No security clearance required',
        timeframe: 'Immediate'
      };
    }

    const clearanceMap = {
      'Secret': {
        level: 'Secret',
        description: 'Secret security clearance required',
        timeframe: '3-6 months processing'
      },
      'Top Secret': {
        level: 'Top Secret',
        description: 'Top Secret security clearance required',
        timeframe: '6-18 months processing'
      },
      'Top Secret/SCI': {
        level: 'TS/SCI',
        description: 'Top Secret with Sensitive Compartmented Information',
        timeframe: '12-24 months processing'
      }
    };

    return clearanceMap[clearanceRequired as keyof typeof clearanceMap] || {
      level: clearanceRequired,
      description: `${clearanceRequired} clearance required`,
      timeframe: 'Processing time varies'
    };
  }

  formatTrainingLength(trainingLength?: string): string {
    if (!trainingLength) return 'Not specified';
    
    // Convert various formats to consistent display
    if (trainingLength.includes('week')) {
      const weeks = parseInt(trainingLength);
      if (weeks >= 52) {
        return `${Math.round(weeks / 52 * 10) / 10} year${weeks >= 104 ? 's' : ''}`;
      }
      return trainingLength;
    }
    
    if (trainingLength.includes('month')) {
      return trainingLength;
    }
    
    return trainingLength;
  }

  // Job search and filtering utilities
  filterJobsByAFQT(jobs: MilitaryJobDetails[], minScore: number, maxScore?: number): MilitaryJobDetails[] {
    return jobs.filter(job => {
      if (maxScore) {
        return job.minAFQTScore >= minScore && job.minAFQTScore <= maxScore;
      }
      return job.minAFQTScore >= minScore;
    });
  }

  filterJobsByClearance(jobs: MilitaryJobDetails[], requiresClearance: boolean): MilitaryJobDetails[] {
    return jobs.filter(job => 
      requiresClearance ? !!job.clearanceRequired : !job.clearanceRequired
    );
  }

  searchJobs(jobs: MilitaryJobDetails[], searchTerm: string): MilitaryJobDetails[] {
    const term = searchTerm.toLowerCase();
    return jobs.filter(job =>
      job.title.toLowerCase().includes(term) ||
      job.description.toLowerCase().includes(term) ||
      job.mosCode.toLowerCase().includes(term)
    );
  }

  // Career path analysis
  getCareerProgression(job: MilitaryJobDetails): {
    entryLevel: string;
    midLevel: string;
    seniorLevel: string;
    civilianEquivalent: string[];
  } {
    // This would normally come from a comprehensive database
    // For now, providing general career progression patterns
    return {
      entryLevel: `Entry-level ${job.title}`,
      midLevel: `Senior ${job.title}`,
      seniorLevel: `${job.title} Supervisor/Manager`,
      civilianEquivalent: [
        'Related civilian positions available',
        'Transferable skills to private sector'
      ]
    };
  }

  getSimilarJobs(currentJob: MilitaryJobDetails, allJobs: MilitaryJobDetails[]): MilitaryJobDetails[] {
    // Find jobs with similar AFQT requirements and line scores
    return allJobs
      .filter(job => 
        job.id !== currentJob.id &&
        Math.abs(job.minAFQTScore - currentJob.minAFQTScore) <= 10
      )
      .slice(0, 5);
  }

  // Educational benefits analysis
  getEducationBenefits(job: MilitaryJobDetails): {
    tuitionAssistance: boolean;
    certifications: string[];
    collegeCredits: boolean;
    apprenticeships: boolean;
  } {
    // This would be job-specific data in a real implementation
    return {
      tuitionAssistance: true,
      certifications: ['Industry-standard certifications available'],
      collegeCredits: true,
      apprenticeships: job.title.toLowerCase().includes('maintenance') || 
                      job.title.toLowerCase().includes('technical')
    };
  }
}

export const militaryJobsService = new MilitaryJobsService();